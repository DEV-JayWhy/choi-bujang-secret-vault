import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runOperationsChecks,checkCounts} from '../src/operations-checks.mjs';
import {operationsHandler,readBackendSummary} from '../src/operations-handler.mjs';
import {isOperationsView} from '../api/auth/session.js';
const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url)));
const sha='a'.repeat(40);
test('Hobby function sharing keeps the original session route and recognizes only the operations view',()=>{
 assert.equal(isOperationsView({url:'/api/auth/session'}),false);
 assert.equal(isOperationsView({url:'/api/auth/session?view=other'}),false);
 assert.equal(isOperationsView({url:'/api/checks'}),true);
 assert.equal(isOperationsView({url:'/api/auth/session?view=operations'}),true);
 assert.equal(isOperationsView({url:'/api/notes?view=operations'}),false);
 const routing=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
 assert.ok(routing.rewrites.some(r=>r.source==='/api/checks'&&r.destination==='/api/auth/session?view=operations'));
});
function transport(calls){return async(input,options)=>{
 const url=new URL(input);calls.push({path:url.pathname,options});
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','x-vercel-id':'iad1::synthetic-request'}});
 if(url.pathname==='/aleph.json')return json({commit:sha});
 if(url.pathname==='/data.json')return json({error:'not_found'},404);
 if(url.pathname==='/manifest.webmanifest')return json({name:'Test app',start_url:'/',icons:[]});
 if(url.pathname==='/api/device/status')return json({approved:false},401);
 if(options.headers.Authorization==='Bearer synthetic.verified.authorization'){
  if(url.pathname==='/api/notes')return json([{id:'PRIVATE-RESOURCE',title:'PRIVATE-TITLE',body:'PRIVATE-BODY'}]);
  if(url.pathname==='/api/notes/export')return json({error:'INVALID_ID'},400);
 }
 return json({error:'LOGIN_REQUIRED'},401);
}}
test('read-only HTTP replay separates normal/forbidden and never fabricates official suite execution',async()=>{
 const calls=[];const r=await runOperationsChecks({config,fetcher:transport(calls),expectedCommit:sha});
 assert.equal(r.checks.length,18);assert.deepEqual(r.counts,{total:18,passed:8,failed:0,notRun:10,unavailable:0,allowed:2,denied:6});
 assert.equal(r.officialSuite.executed,0);assert.equal(r.officialSuite.passed,0);assert.equal(r.officialSuite.notRun,41);
 assert.ok(calls.every(c=>c.options.method==='GET'));assert.ok(calls.every(c=>new URL(config.publicAppUrl).origin===r.target));
 for(const c of r.checks.filter(c=>c.source==='production_http')){
  assert.equal(c.requestIdSource,'server_response_header');assert.equal(c.requestId,'iad1::synthetic-request');assert.ok(!Number.isNaN(Date.parse(c.checkedAt)));
 }
 for(const c of r.checks.filter(c=>c.outcome==='not_run'))assert.equal(c.checkedAt,null);
});
test('only verified and approved context allows real normal owner probe; private response discarded',async()=>{
 for(const approvedDevice of [false,true]){
  const calls=[];const r=await runOperationsChecks({config,fetcher:transport(calls),approvedDevice,verifiedAuthorization:'Bearer synthetic.verified.authorization'});
  assert.equal(r.checks.find(c=>c.id==='normal_owner_note_list').outcome,approvedDevice?'passed':'not_run');
  assert.equal(r.counts.allowed,approvedDevice?3:2);
  assert.doesNotMatch(JSON.stringify(r),/PRIVATE-(?:RESOURCE|TITLE|BODY)|synthetic\.verified\.authorization/);
 }
});
test('network failure and deployment SHA mismatch are not successful checks',async()=>{
 const r=await runOperationsChecks({config,expectedCommit:'b'.repeat(40),fetcher:transport([])});
 assert.equal(r.checks[0].outcome,'failed');
 const failed=await runOperationsChecks({config,fetcher:async()=>{throw Error('secret-provider-message')}});
 assert.equal(failed.counts.unavailable,8);assert.equal(failed.counts.passed,0);assert.doesNotMatch(JSON.stringify(failed),/secret-provider-message/);
 await assert.rejects(()=>runOperationsChecks({config:{...config,publicAppUrl:'https://other.invalid'}}));
});
test('backend recovery is owner scoped; no note IDs, owner IDs or free text are returned',async()=>{
 const filters=[];const owner='11111111-1111-4111-8111-111111111111';
 const db={from(table){return {select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},async limit(){return {data:table==='a10_recovery_audit'?[{happened_at:'2026-10-14T00:00:00Z',reason_code:'PRIVATE-REASON'}]:[{note_id:'PRIVATE-RESOURCE',sealed_at:'2026-10-14T00:00:00Z'}]}}}},async rpc(name,args){assert.equal(args.p_owner_id,owner);return {data:{verified:true,ownerId:owner,backupVersion:'f'.repeat(64),content:'PRIVATE-BODY'}}}};
 const s=await readBackendSummary(db,{kind:'student',userId:owner});assert.equal(s.recovery.auditRowsRead,1);assert.equal(s.recovery.backupVersion,'f'.repeat(64));assert.equal(s.recovery.replayStatus,'not_run');assert.ok(filters.every(([k,v])=>k==='owner_id'&&v===owner));
 assert.doesNotMatch(JSON.stringify(s),/PRIVATE-|11111111-/);
 const noIdentity=await readBackendSummary(null,null);assert.equal(noIdentity.recovery.status,'not_run');assert.equal(noIdentity.revocation.status,'not_run');
});
test('API redacted DB record and returned screen values are identical; counts are derived',async()=>{
 let stored;const db={from(table){assert.equal(table,'a12_operations_runs');return {async insert(row){stored=row;return {error:null}}}}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(body){this.body=body;return this}};
 await operationsHandler({db,fetcher:transport([])})({method:'GET',headers:{}},res);
 assert.equal(res.code,200);assert.deepEqual(stored.redacted_report,res.body);assert.deepEqual(res.body.counts,checkCounts(res.body.checks));assert.equal(res.body.serverRecord.status,'stored');assert.equal(res.headers['Cache-Control'],'no-store');
 const serialized=JSON.stringify(res.body);assert.doesNotMatch(serialized,/Bearer|PRIVATE-|owner_id|token_hash/);
});
