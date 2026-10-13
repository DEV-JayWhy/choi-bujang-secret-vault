import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deviceHandler,confirmedDevice} from '../src/device-handler.mjs';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url)));
const owner='11111111-1111-4111-8111-111111111111';
const reply=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}});
test('device request cannot grant approval; hashed registry binds owner and HttpOnly cookie',async()=>{
 const rows=[]; let currentOwner=owner;
 const db={from(name){assert.equal(name,'a11_device_requests');const filters={};return{
  select(){return this},eq(k,v){filters[k]=v;return this},async maybeSingle(){return {data:rows.find(r=>Object.entries(filters).every(([k,v])=>r[k]===v))??null}},
  async insert(row){rows.push({...row,approved_at:null});return {error:null}},
 }}};
 const deps={db,verify:async()=>({kind:'student',userId:currentOwner})};
 const call=async(action,cookie='__Host-vault-access=synthetic.access.token',headers={})=>{
  const res=reply();await deviceHandler(action,deps)({method:action==='status'?'GET':'POST',headers:{cookie,origin:config.publicAppUrl,...headers},body:{approved:true,state:'approved',owner_id:'spoof'}},res);return res;
 };
 let r=await call('request');assert.equal(r.code,202);assert.equal(r.body.approved,false);assert.equal(rows[0].state,'pending');
 const cookie=r.headers['Set-Cookie'].split(';')[0];const device=cookie.split('=')[1];
 assert.ok(r.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Strict'));assert.notEqual(rows[0].token_hash,device);
 assert.ok(!JSON.stringify(r.body).includes(device));
 const both='__Host-vault-access=synthetic.access.token; '+cookie;
 r=await call('status',both);assert.equal(r.body.approved,false);assert.equal(r.body.state,'pending');
 r=await call('request',both);assert.equal(r.body.approved,false);assert.equal(rows.length,1);
 rows[0].state='approved';rows[0].approved_at=new Date().toISOString();
 r=await call('status',both);assert.equal(r.body.approved,true);
 currentOwner='22222222-2222-4222-8222-222222222222';
 r=await call('status',both);assert.equal(r.body.approved,false);assert.equal(r.body.requestId,undefined);
 assert.equal((await call('request',both,{origin:'https://other.invalid'})).code,403);
 assert.equal((await call('status',both,{'sec-fetch-site':'cross-site'})).code,403);
 assert.equal((await call('status','')).code,401);
});
test('revoked, expired, unconfirmed and wrong-owner registry states never approve',()=>{
 const row={owner_id:owner,state:'approved',approved_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+10000).toISOString()};
 assert.equal(confirmedDevice(row,owner),true);
 for(const change of [{state:'pending'},{state:'revoked'},{approved_at:null},{approved_at:'bad'},{expires_at:new Date(Date.now()-1).toISOString()},{owner_id:'spoof'}])assert.equal(confirmedDevice({...row,...change},owner),false);
});
async function screen(statusResult,{requestResult,failStatus=false}={}){
 const controls=new Map();const events={};const calls=[];
 const make=()=>({hidden:false,disabled:false,checked:false,value:'',textContent:'',children:[],listeners:{},addEventListener(k,f){this.listeners[k]=f},replaceChildren(...c){this.children=c},reset(){},append(...c){this.children.push(...c)},focus(){},style:{}});
 const document={querySelector(k){if(!controls.has(k))controls.set(k,make());return controls.get(k)},createElement:make};
 const window={addEventListener(k,f){events[k]=f},confirm(){return false}};
 const user={id:owner};let nextStatus=statusResult;
 const fetch=async(path,options={})=>{calls.push(path);const response=(body,status=200)=>({ok:status>=200&&status<300,status,async json(){return body}});
  if(path==='/api/auth/session')return response({user});
  if(path==='/api/device/status'){if(failStatus)throw Error('offline');return response(nextStatus)}
  if(path==='/api/device/request')return response(requestResult??{approved:false,state:'pending'},202);
  if(path==='/api/notes')return response([]);
  throw Error('Unexpected protected request '+path);
 };
 const code=readFileSync(new URL('../public/auth-ui.js',import.meta.url),'utf8');
 await new (Object.getPrototypeOf(async function(){}).constructor)('document','window','fetch','navigator',code)(document,window,fetch,{onLine:true});
 const settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};await settle();
 return {controls,calls,events,settle,setStatus(value){nextStatus=value}};
}
test('pending or failed server check never opens editor/recovery or requests notes',async()=>{
 for(const [data,opts] of [[{approved:false,state:'pending'},{}],[{approved:true,state:'pending'},{}],[{approved:true,state:'approved'},{failStatus:true}]]){
  const s=await screen(data,opts);assert.equal(s.controls.get('#protected-vault').hidden,true);assert.equal(s.controls.get('#note-editor').hidden,true);assert.equal(s.controls.get('#recovery-panel').hidden,true);assert.equal(s.calls.includes('/api/notes'),false);
 }
});
test('only confirmed server approval opens existing vault; recheck and offline clear it',async()=>{
 const s=await screen({approved:true,state:'approved'});
 assert.equal(s.controls.get('#protected-vault').hidden,false);assert.ok(s.calls.includes('/api/notes'));
 s.setStatus({approved:false,state:'revoked'});s.controls.get('#device-refresh').listeners.click();await s.settle();
 assert.equal(s.controls.get('#protected-vault').hidden,true);assert.equal(s.controls.get('#notes').children.length,0);
 const t=await screen({approved:true,state:'approved'});t.events.offline();assert.equal(t.controls.get('#protected-vault').hidden,true);
});
test('approval request with HTTP 202 never unlocks even if a response says approved',async()=>{
 const s=await screen({approved:false,state:'pending'},{requestResult:{approved:true,state:'approved'}});
 s.controls.get('#device-request').listeners.click();await s.settle();assert.equal(s.controls.get('#protected-vault').hidden,true);assert.equal(s.calls.includes('/api/notes'),false);
});
