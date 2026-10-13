import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordRecoveryIngress} from '../src/recovery-ingress.mjs';
const trace='11111111-1111-4111-8111-111111111111';
test('ingress stores only server trace and fixed stage, with no caller metadata',async()=>{
 const calls=[];
 const db={rpc(name,args){calls.push({name,args});return Promise.resolve({error:null});}};
 assert.equal(await recordRecoveryIngress(db,trace,'auth_received'),true);
 assert.deepEqual(calls,[{name:'a10_record_recovery_ingress',args:{p_trace_id:trace,p_stage:'auth_received'}}]);
 assert.equal(await recordRecoveryIngress(db,trace,'caller-provided-data'),false);
 assert.equal(calls.length,1);
});
test('diagnostic outage never throws or invents successful evidence',async()=>{
 assert.equal(await recordRecoveryIngress({rpc(){throw Error('unavailable');}},trace,'auth_received'),false);
 assert.equal(await recordRecoveryIngress({rpc:async()=>({error:{code:'42501'}})},trace,'auth_rejected'),false);
});
