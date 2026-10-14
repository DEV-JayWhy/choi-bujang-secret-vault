import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { decide } from '../xdr/persistence/decide.mjs';
import { extractAlerts } from '../xdr/persistence/read-alerts.mjs';
import { createResponder } from '../xdr/persistence/respond.mjs';
import { decide as decideAccess, RULE_IDS } from '../src/decider.mjs';
const fixture = JSON.parse(await readFile(new URL('../xdr/fixtures/persistence.json', import.meta.url)));
const request = id => ({ schema:'aleph.decision.v1',requestId:id,classId:'class-synthetic',
 projectId:'project-synthetic',subjectId:'subject-synthetic',deviceId:'0123456789abcdef',
 service:'notes',method:'GET',path:'/notes/demo',route:'GET /notes/:id',queryLength:0,
 querySha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 policyRevision:1,at:new Date().toISOString(),deviceRegistered:true,
 signals:{source:'none',region:'unknown',network:'unknown',hour:0},recentEvents:[],
 stepUp:{verified:false,authAgeSeconds:null} });

test('persistence standalone sandbox, 24 decisions, no ID-based classification', async () => {
 const source = await readFile(new URL('../xdr/persistence/decide.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bimport\s*(?:\(|["'{*\w])/u);
 const patterns = JSON.parse(await readFile(new URL('../xdr/persistence/patterns.json',import.meta.url)));
 for(const p of patterns.patterns) assert.ok(p.name && p.condition && p.evidence);
 const embedded = JSON.parse(source.match(/const PATTERNS = ([\s\S]*?);\n/)[1]);
 assert.deepEqual(embedded,patterns.patterns);
 const context=createContext({});
 runInContext(source.replace('export function decide','function decide'),context,{timeout:2000});
 const counts={block:0,alert:0,record:0};
 for(const [i,a] of fixture.alerts.entries()) {
  context.input=JSON.parse(JSON.stringify({...a,id:'changed-id'}));
  const out=runInContext('decide(input)',context,{timeout:2000});
  assert.equal(out.action,i<8?'block':i<16?'alert':'record',a.id);
  assert.ok(out.confidence>=0 && out.confidence<=1);
  assert.equal(out.action,out.confidence>=0.85?'block':out.confidence>=0.5?'alert':'record');
  assert.equal(out.reason.includes('\n'),false);
  counts[out.action]++;
 }
 assert.deepEqual(counts,{block:8,alert:8,record:8});
 for(const a of [null,{}, {data:{},rule:{level:16,description:'일반 이벤트'}}])
  assert.equal(decide(a).action,'record');
 // Single signals cannot quarantine a device; unknown signature is not unsigned.
 for(const [description,path] of [
  ['서명 없는 파일이 있습니다.','C:/Users/user01/AppData/Local/Temp/file.exe'],
  ['서명 없는 새 서비스가 있습니다.','C:/lab/service.exe'],
  ['새 서비스가 임시 폴더를 가리키며 서명은 확인되지 않았습니다.','C:/Users/user01/AppData/Local/Temp/file.exe'],
  ['임시 폴더에 실행 파일이 하나 생겼습니다. 서비스 등록은 없습니다.','C:/Users/user01/AppData/Local/Temp/file.exe'],
 ]) assert.notEqual(decide({rule:{level:16,description,mitre:['T1543']},data:{path}}).action,'block');
 assert.equal(decide({rule:{level:3,description:'기존 서명된 서비스가 실행 중입니다.',mitre:['T1543']},
   data:{path:'C:/lab/signed-service.exe'}}).action,'record');
});

test('persistence reader preserves count and redacts secrets outside selected fields',()=>{
 const rows=extractAlerts(fixture); assert.equal(rows.length,fixture.alerts.length);
 assert.deepEqual(Object.keys(rows[0]),['timestamp','srcip','srcuser','level','description']);
 const malicious=structuredClone(fixture); malicious.alerts[0].rule.description='password=synthetic-secret';
 malicious.alerts[0].data.srcuser='synthetic-secret';
 malicious.alerts[0].data.authorization='Bearer synthetic-secret';
 const safe=JSON.stringify(extractAlerts(malicious));
 assert.equal(safe.includes('synthetic-secret'),false);
 assert.equal(rows[0].srcuser,'user01');
 assert.equal(rows[17].srcuser,'svc-lab');
});

test('additive gate blocks only correlated attack, expires, preserves normal and prior denials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'persistence-'));
 try {
  let now=Date.now(); const attack=request('attack-synthetic'),normal={...request('normal-synthetic'),deviceId:'fedcba9876543210'};
  assert.equal((await decideAccess(attack)).decision,'allow');
  const gate=createResponder({logPath:join(dir,'alerts.log'),now:()=>now,
   resolveVerifiedRequest:a=>a.id==='ps-01'?attack:null});
  const registered=await gate.respond(fixture.alerts[0]); assert.equal(registered.ruleRegistered,true);
  assert.equal(gate.activeRules().length,1); assert.equal(gate.activeRules()[0].alertId,'ps-01');
  const denied=await gate.decideRequest(attack); assert.equal(denied.decision,'deny');
  assert.ok(denied.ruleIds.every(id=>RULE_IDS.includes(id)));
  assert.equal((await gate.decideRequest(normal)).decision,'allow');
  assert.equal((await gate.decideRequest({...attack,requestId:'next-request-synthetic'})).decision,'deny');
  assert.equal((await gate.decideRequest({...attack,subjectId:'other-subject-synthetic'})).decision,'deny');
  assert.equal((await gate.decideRequest({...attack,projectId:'other-project-synthetic'})).decision,'allow');
  assert.equal((await gate.decideRequest({...normal,deviceRegistered:false})).decision,'deny');
  for(const a of fixture.alerts.slice(8)) assert.equal((await gate.respond(a)).ruleRegistered,false);
  assert.equal(gate.activeRules().length,1);
  assert.equal((await gate.respond(fixture.alerts[1])).ruleRegistered,false);
  const log=await readFile(join(dir,'alerts.log'),'utf8');
  for(const field of ['srcip','srcuser','useragent','subjectId','querySha256','AppData','helper.exe']) assert.equal(log.includes(field),false);
  now+=15*60*1000; assert.equal(gate.activeRules().length,0);
  assert.equal((await gate.decideRequest(attack)).decision,'allow');
 }finally{await rm(dir,{recursive:true,force:true});}
});
