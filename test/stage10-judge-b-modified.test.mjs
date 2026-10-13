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

test('signed ES256 judge B auth reaches sealed restore without owner substitution',async()=>{
  const {generateKeyPair,SignJWT}=await import('jose');
  const {createLoginVerifier}=await import('../src/verify-login.mjs');
  const {readFileSync}=await import('node:fs');
  const cfg=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url),'utf8'));
  const {privateKey,publicKey}=await generateKeyPair('ES256');
  const token=await new SignJWT({aleph_role:'judge',aleph_identity:'b',
    aleph_run:judgeB.runId})
    .setProtectedHeader({alg:'ES256'}).setSubject(judgeB.userId)
    .setIssuer(cfg.judgeIssuer).setAudience(new URL(cfg.publicAppUrl).hostname)
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const verifier=createLoginVerifier({config:cfg,judgeKeySet:async()=>publicKey,
    supabaseClient:{auth:{getClaims:async()=>({error:new Error('not-student')})}}});
  const verified=await verifier('Bearer '+token);
  assert.equal(verified.kind,'judge');
  assert.equal(noteOwnerId(verified),expectedOwner);
  const names=[];const client={rpc:async(name,params)=>{
    names.push(name);
    assert.equal(params.p_owner_id,expectedOwner);
    assert.equal(params.p_note_id,noteId);
    if(name==='a10_preview_verified_note')
      return {data:{id:noteId,ownerId:expectedOwner,verified:true,
        contentHash:hash,titleHash:hash,backupVersion,stateVersion,
        changedFields:['content']}};
    assert.equal(name,'a10_restore_versioned_note');
    return {data:{verified:true,restored:true,id:noteId,ownerId:expectedOwner,
      contentHash:hash,backupVersion,retest:{
        ownRowVerified:true,foreignOwnerSameIdNotVisible:true}}};
  }};
  const handler=createRecoveryHandler(false,{verify:verifier,
    makeClient:()=>client,observe:async()=>true,
    retest:async()=>({executedAfterRestore:true,allExecutedChecksPassed:true,
      checks:[{name:'owner_get',passed:true}],judgeFullReplay:'not_run'})});
  const responseObject=response();
  const previousUrl=process.env.SUPABASE_URL,previousKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://yugdsswjndlajydiwvwc.supabase.co';
  process.env.SUPABASE_SECRET_KEY='offline-mock-server-key';
  try {
    await handler({method:'POST',url:'/api/restore/'+noteId,
      headers:{authorization:'Bearer '+token}},responseObject);
  }finally{
    if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
    if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey;
  }
  assert.equal(responseObject.code,200);
  assert.equal(responseObject.body.restored,true);
  assert.deepEqual(names,['a10_preview_verified_note','a10_restore_versioned_note']);
});
