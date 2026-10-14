import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { decide } from '../xdr/known-cve/decide.mjs';
import { extractAlerts } from '../xdr/known-cve/read-alerts.mjs';
import { createResponder } from '../xdr/known-cve/respond.mjs';
import { decide as decideAccess, RULE_IDS } from '../src/decider.mjs';
const fixture = JSON.parse(await readFile(new URL('../xdr/fixtures/known-cve.json', import.meta.url)));
const request = id => ({ schema:'aleph.decision.v1',requestId:id,classId:'class-synthetic',
 projectId:'project-synthetic',subjectId:'subject-synthetic',deviceId:'0123456789abcdef',
 service:'notes',method:'GET',path:'/notes/demo',route:'GET /notes/:id',queryLength:0,
 querySha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 policyRevision:1,at:new Date().toISOString(),deviceRegistered:true,
 signals:{source:'none',region:'unknown',network:'unknown',hour:0},recentEvents:[],
 stepUp:{verified:false,authAgeSeconds:null} });

test('known-cve standalone sandbox, 24 decisions, no ID-based classification', async () => {
 const source = await readFile(new URL('../xdr/known-cve/decide.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bimport\s*(?:\(|["'{*\w])/u);
 const patterns = JSON.parse(await readFile(new URL('../xdr/known-cve/patterns.json',import.meta.url)));
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
 for(const a of [null,{}, {data:{},rule:{level:16,description:'CVE-2021-44228'}}])
  assert.equal(decide(a).action,'record');
 // A literal security term alone is not a block signal.
 assert.equal(decide({data:{url:'/search?q=CVE-2021-44228'}}).action,'record');
 assert.equal(decide({data:{url:'/notes?q=jndi'}}).action,'record');
 assert.equal(decide({data:{useragent:'log4j-scanner'}}).action,'alert');
});

test('known-cve reader preserves count and redacts secrets outside selected fields',()=>{
 const rows=extractAlerts(fixture); assert.equal(rows.length,fixture.alerts.length);
 assert.deepEqual(Object.keys(rows[0]),['timestamp','srcip','srcuser','level','description']);
 const malicious=structuredClone(fixture); malicious.alerts[0].rule.description='password=synthetic-secret';
 malicious.alerts[0].data.srcuser='synthetic-secret';
 malicious.alerts[0].data.authorization='Bearer synthetic-secret';
 const safe=JSON.stringify(extractAlerts(malicious));
 assert.equal(safe.includes('synthetic-secret'),false);
 assert.equal(rows[0].srcuser,null);
});

test('additive gate blocks only correlated attack, expires, preserves normal and prior denials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'known-cve-'));
 try {
  let now=Date.now(); const attack=request('attack-synthetic'),normal=request('normal-synthetic');
  assert.equal((await decideAccess(attack)).decision,'allow');
  const gate=createResponder({logPath:join(dir,'alerts.log'),now:()=>now,
   resolveVerifiedRequest:a=>a.id==='kc-01'?attack:null});
  const registered=await gate.respond(fixture.alerts[0]); assert.equal(registered.ruleRegistered,true);
  assert.equal(gate.activeRules().length,1); assert.equal(gate.activeRules()[0].alertId,'kc-01');
  const denied=await gate.decideRequest(attack); assert.equal(denied.decision,'deny');
  assert.ok(denied.ruleIds.every(id=>RULE_IDS.includes(id)));
  assert.equal((await gate.decideRequest(normal)).decision,'allow');
  assert.equal((await gate.decideRequest({...normal,deviceRegistered:false})).decision,'deny');
  for(const a of fixture.alerts.slice(8)) assert.equal((await gate.respond(a)).ruleRegistered,false);
  assert.equal(gate.activeRules().length,1);
  assert.equal((await gate.respond(fixture.alerts[1])).ruleRegistered,false);
  const log=await readFile(join(dir,'alerts.log'),'utf8');
  for(const field of ['srcip','srcuser','useragent','subjectId','querySha256','jndi:']) assert.equal(log.includes(field),false);
  now+=15*60*1000; assert.equal(gate.activeRules().length,0);
  assert.equal((await gate.decideRequest(attack)).decision,'allow');
 }finally{await rm(dir,{recursive:true,force:true});}
});
