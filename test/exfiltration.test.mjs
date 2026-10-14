import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { decide } from '../xdr/exfiltration/decide.mjs';
import { extractAlerts } from '../xdr/exfiltration/read-alerts.mjs';
import { createResponder } from '../xdr/exfiltration/respond.mjs';
import { decide as decideAccess, RULE_IDS } from '../src/decider.mjs';
const fixture=JSON.parse(await readFile(new URL('../xdr/fixtures/exfiltration.json',import.meta.url)));
const request=id=>({schema:'aleph.decision.v1',requestId:id,classId:'class-synthetic',
 projectId:'project-synthetic',subjectId:'subject-synthetic',deviceId:'0123456789abcdef',
 service:'notes',method:'GET',path:'/notes/demo',route:'GET /notes/:id',queryLength:0,
 querySha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 policyRevision:1,at:new Date().toISOString(),deviceRegistered:true,
 signals:{source:'none',region:'unknown',network:'unknown',hour:0},recentEvents:[],
 stepUp:{verified:false,authAgeSeconds:null}});

test('exfiltration standalone sandbox and evidence classification without alert IDs',async()=>{
 const source=await readFile(new URL('../xdr/exfiltration/decide.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bimport\s*(?:\(|["'{*\w])/u);
 const patterns=JSON.parse(await readFile(new URL('../xdr/exfiltration/patterns.json',import.meta.url)));
 for(const p of patterns.patterns)assert.ok(p.name&&p.condition&&p.evidence);
 assert.deepEqual(JSON.parse(source.match(/const PATTERNS = ([\s\S]*?);\n/)[1]),patterns.patterns);
 const context=createContext({});
 runInContext(source.replace('export function decide','function decide'),context,{timeout:2000});
 const counts={block:0,alert:0,record:0};
 for(const [i,a] of fixture.alerts.entries()){
  context.input=JSON.parse(JSON.stringify({...a,id:'changed-id'}));
  const out=runInContext('decide(input)',context,{timeout:2000});
  assert.equal(out.action,i<10?'block':i<20?'alert':'record',a.id);
  assert.ok(out.confidence>=0&&out.confidence<=1);
  assert.equal(out.action,out.confidence>=0.85?'block':out.confidence>=0.5?'alert':'record');
  assert.equal(out.reason.includes('\n'),false);counts[out.action]++;
 }
 assert.deepEqual(counts,{block:10,alert:10,record:10});
 for(const a of [null,{}, {data:{},rule:{level:16,description:'일상 이벤트'}}])assert.equal(decide(a).action,'record');
 // A single volume/address/time signal or failed/absent transfer is never a block.
 for(const [description,data] of [
  ['대용량 전송이 한 번입니다.',{dstip:'203.0.113.99',bytes:'100000000'}],
  ['처음 보는 목적지로 전송입니다.',{dstip:'203.0.113.99',bytes:'1000'}],
  ['업무 시간 밖에 전송입니다.',{dstip:'203.0.113.99',bytes:'100000000'}],
  ['처음 보는 목적지 전송은 실패했습니다.',{dstip:'203.0.113.99',bytes:'100000000'}],
  ['압축 파일 생성이고 외부 전송은 아직 없습니다.',{dstip:'203.0.113.99',bytes:'100000000'}],
  ['처음 보는 목적지로 전송입니다.',{dstip:'not-an-address',bytes:'100000000'}],
  ['처음 보는 목적지로 전송입니다.',{dstip:'203.0.113.99',bytes:'Infinity'}],
 ])assert.notEqual(decide({rule:{level:16,description,mitre:['T1048']},data}).action,'block');
});

test('exfiltration reader yields 30 redacted rows, no transfer values',()=>{
 const rows=extractAlerts(fixture);assert.equal(rows.length,30);
 assert.deepEqual(Object.keys(rows[0]),['timestamp','srcip','srcuser','level','description']);
 assert.equal(rows[22].srcuser,'svc-lab');
 const changed=structuredClone(fixture);
 changed.alerts[0].rule.description='password=synthetic-secret';
 changed.alerts[0].data.srcuser='synthetic-secret';
 changed.alerts[0].data.authorization='Bearer synthetic-secret';
 assert.equal(JSON.stringify(extractAlerts(changed)).includes('synthetic-secret'),false);
 assert.equal(JSON.stringify(rows).includes('dstip'),false);
 assert.equal(JSON.stringify(rows).includes('240000000'),false);
});

test('destination denial preserves other destinations and existing access policy, expires safely',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'exfiltration-'));
 try{
  let now=Date.now();const attack=request('attack-synthetic'),normal=request('normal-synthetic');
  assert.equal((await decideAccess(attack)).decision,'allow');
  const gate=createResponder({logPath:join(dir,'alerts.log'),now:()=>now,
   resolveVerifiedRequest:a=>a.id==='ex-01'?attack:null,
   resolveRequestDestination:r=>r.requestId==='normal-synthetic'?'203.0.113.99':
    r.requestId==='unmapped-synthetic'?null:'203.0.113.50'});
  assert.equal((await gate.respond(fixture.alerts[0])).ruleRegistered,true);
  assert.equal(gate.activeRules().length,1);
  const denied=await gate.decideRequest(attack);assert.equal(denied.decision,'deny');
  assert.ok(denied.ruleIds.every(id=>RULE_IDS.includes(id)));
  assert.equal((await gate.decideRequest(normal)).decision,'allow');
  assert.equal((await gate.decideRequest({...attack,subjectId:'other-subject-synthetic'})).decision,'deny');
  assert.equal((await gate.decideRequest({...attack,deviceId:'fedcba9876543210'})).decision,'deny');
  assert.equal((await gate.decideRequest({...attack,projectId:'other-project-synthetic'})).decision,'allow');
  assert.equal((await gate.decideRequest({...attack,requestId:'unmapped-synthetic'})).decision,'allow');
  assert.equal((await gate.decideRequest({...normal,deviceRegistered:false})).decision,'deny');
  for(const a of fixture.alerts.slice(10))assert.equal((await gate.respond(a)).ruleRegistered,false);
  assert.equal((await gate.respond(fixture.alerts[1])).ruleRegistered,false);
  const log=await readFile(join(dir,'alerts.log'),'utf8');
  for(const value of ['srcip','dstip','subjectId','querySha256','203.0.113.50','user01','240000000'])
   assert.equal(log.includes(value),false);
  now+=15*60*1000;assert.equal(gate.activeRules().length,0);
  assert.equal((await gate.decideRequest(attack)).decision,'allow');
 }finally{await rm(dir,{recursive:true,force:true});}
});
