import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryHandler } from '../src/recovery-handler.mjs';
import { noteOwnerId } from '../src/judge-ownership.mjs';

const noteId = '33333333-3333-4333-8333-333333333333';
const judgeB = Object.freeze({ kind: 'judge', userId:'22222222-2222-4222-8222-222222222222',
  runId:'11111111-1111-4111-8111-111111111111', identity:'b' });
const expectedOwner = noteOwnerId(judgeB);
const hash = 'a'.repeat(64), backupVersion = 'b'.repeat(64), stateVersion = 'c'.repeat(64);
const response = () => ({ headers:{}, setHeader(k,v){this.headers[k]=v;},
  status(n){this.code=n;return this;},json(x){this.body=x;return this;} });
async function call(handler, method) {
  const r=response(); const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://yugdsswjndlajydiwvwc.supabase.co';
  process.env.SUPABASE_SECRET_KEY='offline-mock-server-key';
  try { await handler({method,url:'/api/restore/'+noteId,
    headers:{authorization:'Bearer synthetic.test.signature'}},r); }
  finally {
    if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;
    if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
  }
  return r;
}
test('verified judge B modified note: preview reread, atomic one-ID restore and postcheck',async()=>{
  const calls=[];let changed=true;let retestCalls=0;
  const preview=()=>({id:noteId,ownerId:expectedOwner,verified:true,
    contentHash:hash,titleHash:hash,backupVersion,stateVersion,
    changedFields:changed?['content']:[]});
  const db={rpc:async(fn,p)=>{
    calls.push(fn);
    assert.equal(p.p_note_id,noteId);assert.equal(p.p_owner_id,expectedOwner);
    if(fn==='a10_preview_verified_note')return {data:preview()};
    assert.equal(fn,'a10_restore_versioned_note');
    assert.equal(p.p_expected_version,backupVersion);
    assert.equal(p.p_expected_state,stateVersion);
    changed=false;
    return {data:{verified:true,restored:true,id:noteId,ownerId:expectedOwner,
      contentHash:hash,backupVersion,retest:{ownRowVerified:true,foreignOwnerSameIdNotVisible:true}}};
  }};
  const handler=createRecoveryHandler(false,{
    verify:async()=>judgeB, makeClient:()=>db, observe:async()=>true,
    retest:async data=>{retestCalls++;assert.equal(changed,false);
      assert.equal(data.ownerId,expectedOwner);assert.equal(data.noteId,noteId);
      return {executedAfterRestore:true,checks:[{name:'owner_get',passed:true}],
        allExecutedChecksPassed:true,judgeFullReplay:'not_run'};}
  });
  const first=await call(handler,'GET');
  assert.equal(first.code,200);
  assert.deepEqual(first.body.changedFields,['content']);
  assert.equal(changed,true);
  const second=await call(handler,'POST');
  assert.equal(second.code,200);
  assert.equal(second.body.restored,true);
  assert.equal(second.headers['X-Aleph-Recovery-Checkpoint'],'retest_passed');
  assert.deepEqual(calls,['a10_preview_verified_note','a10_preview_verified_note','a10_restore_versioned_note']);
  assert.equal(retestCalls,1);
});
