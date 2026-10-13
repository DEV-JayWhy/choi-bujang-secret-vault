import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryHandler, inspectRecoveryRequest } from '../src/recovery-handler.mjs';
import { noteOwnerId } from '../src/judge-ownership.mjs';

const ownId = '11111111-1111-4111-8111-111111111111';
const foreignId = '22222222-2222-4222-8222-222222222222';
const noteId = '33333333-3333-4333-8333-333333333333';
const hash = 'a'.repeat(64);
const manifest = 'b'.repeat(64);
const student = Object.freeze({ kind: 'student', userId: ownId });
const otherStudent = Object.freeze({ kind: 'student', userId: foreignId });
const judgeB = Object.freeze({ kind: 'judge', userId: foreignId, runId: noteId, identity: 'b' });
const mock = () => ({
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const env = { SUPABASE_URL: 'https://yugdsswjndlajydiwvwc.supabase.co',
  SUPABASE_SECRET_KEY: 'offline-mock-server-key' };

async function run(handler, { method = 'GET', url = '/api/restore', body,
  authorization = 'Bearer signed-mock', cookie, origin, contentType = 'application/json' } = {}) {
  const request = { method, url, headers: {
    ...(authorization ? { authorization } : {}),
    ...(cookie ? { cookie } : {}),
    ...(origin ? { origin } : {}),
    'content-type': contentType,
  }, body };
  const response = mock();
  const previous = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  Object.assign(process.env, env);
  try { await handler(request, response); }
  finally {
    for (const [k, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[k]; else process.env[k] = value;
    }
  }
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.headers['X-Content-Type-Options'], 'nosniff');
  return response;
}

test('restore URL must select only exact resource and an authorized method', () => {
  assert.deepEqual(inspectRecoveryRequest({ method: 'GET', url: '/api/restore?id='+noteId }, false),
    { kind: 'note', id: noteId });
  assert.deepEqual(inspectRecoveryRequest({ method: 'POST', url: '/api/restore' }, false),
    { kind: 'note' });
  assert.deepEqual(inspectRecoveryRequest({ method: 'GET', url: '/api/restore/policy' }, true),
    { kind: 'policy' });
  assert.deepEqual(inspectRecoveryRequest({ method: 'POST', url: '/api/restore/'+noteId }, false),
    { kind: 'note', id: noteId });
  assert.deepEqual(inspectRecoveryRequest({ method: 'POST',
    url: '/api/restore/'+noteId+'?id='+noteId }, false), { kind: 'note', id: noteId });
  for (const url of ['/api/restore?ownerId='+ownId, '/api/restore?id='+noteId+'&id='+noteId,
    '/api/restore?id='+noteId+'&role=admin', '/api/restore/'+noteId+'?noteId='+ownId,
    '/api/restore?noteId='+noteId, '/api/restore?id='+noteId+'#bad']) {
    assert.equal(inspectRecoveryRequest({ method: 'GET', url }, false), null);
  }
});

test('signed B may preview and restore one matching sealed backup via path or body', async () => {
  const item = { id: noteId, ownerId: ownId, contentHash: hash,
    titleHash: hash, backupVersion: manifest, stateVersion: hash,
    changedFields: ['content'], capturedAt: '2026-10-13T00:00:00Z',
    verified: true };
  const calls = [];
  let state = 'tampered';
  let stale = false;
  const client = { rpc: async (fn, args) => {
    calls.push({ fn, args });
    if (args.p_owner_id !== ownId || args.p_note_id !== noteId) return { error: { code: 'P0002' } };
    if (fn === 'a10_preview_verified_note') return { data: {
      ...item, stateVersion: stale ? 'f'.repeat(64) : hash,
    } };
    if (fn === 'a10_restore_versioned_note') {
      if (args.p_expected_version !== manifest || args.p_expected_state !== hash || stale) {
        return { error: { code: '23514' } };
      }
      state = 'restored';
      return { data: { id:noteId,ownerId:ownId,contentHash:hash,
        backupVersion:manifest,verified:true,restored:true,
        retest:{ownRowVerified:true,foreignOwnerSameIdNotVisible:true} } };
    }
    throw new Error('unexpected_rpc');
  } };
  let as = student;
  const checksAfter = [];
  const observations = [];
  const handler = createRecoveryHandler(false, { verify: async () => as, makeClient: () => client,
    observe: async (_db, kind, checkpoint, reason) => {
      observations.push({ kind, checkpoint, reason }); return true;
    },
    retest: async input => {
      assert.equal(input.contentHash,hash,'retest must compare HTTP content to the sealed backup');
      checksAfter.push({ noteId: input.noteId, ownerId: input.ownerId });
      return { executedAfterRestore: true, checks: [
        { name: 'restored_owner_get', passed: true },
      ], allExecutedChecksPassed: true, judgeFullReplay: 'not_run' };
    },
  });
  let result = await run(handler, { url:'/api/restore?id='+noteId });
  assert.equal(result.statusCode,200);
  assert.deepEqual(result.body,item);
  result = await run(handler, { url:'/api/restore/'+noteId,method:'POST',
    body:{preview:true} });
  assert.equal(result.statusCode,200);
  assert.equal(result.body.backupVersion,manifest);
  assert.equal(state,'tampered','preview never changes data');
  result = await run(handler, { url:'/api/restore/'+noteId,method:'POST',body:undefined });
  assert.equal(result.statusCode,200,'judge may POST the UUID path with no body');
  assert.equal(result.body.restored,true);
  assert.equal(result.headers['X-Aleph-Recovery-Checkpoint'],'retest_passed');
  assert.equal(state,'restored');
  assert.deepEqual(observations.slice(-4).map(x => x.checkpoint),
    ['auth_verified', 'backup_verified', 'restore_committed', 'retest_passed']);
  assert.ok(observations.every(x => x.kind === 'student'));

  assert.equal(result.body.postRestoreRetest.executedAfterRestore, true);
  assert.deepEqual(checksAfter.at(-1), { noteId, ownerId: ownId });
  assert.equal(calls.at(-2).fn,'a10_preview_verified_note');
  assert.deepEqual(calls.at(-1), {fn:'a10_restore_versioned_note',args:{
    p_note_id:noteId,p_owner_id:ownId,p_expected_version:manifest,p_expected_state:hash,
  }});
  result=await run(handler,{method:'POST',body:{id:noteId,expectedHash:hash}});
  assert.equal(result.statusCode,200,'existing POST /api/restore JSON callers continue to work');
  as=otherStudent;
  result=await run(handler,{method:'POST',url:'/api/restore/'+noteId,body:{}});
  assert.equal(result.statusCode,404);
  assert.deepEqual(result.body,{error:'BACKUP_NOT_FOUND'});
  assert.equal(JSON.stringify(result.body).includes(hash),false);
  as=student;
  for (const bad of [
    {expectedHash:'0'.repeat(64)}, {expectedVersion:'0'.repeat(64)},
    {expectedState:'0'.repeat(64)},
  ]) {
    result=await run(handler,{method:'POST',url:'/api/restore/'+noteId,body:bad});
    assert.equal(result.statusCode,409);
  }
  stale=true;
  result=await run(handler,{method:'POST',url:'/api/restore/'+noteId,body:{}});
  assert.equal(result.statusCode,409,'changed backing state must fail atomically');
  for(const bad of [{ownerId:ownId},{role:'admin'}, {id:foreignId}, {preview:false}]) {
    result=await run(handler,{method:'POST',url:'/api/restore/'+noteId,body:bad});
    assert.equal(result.statusCode,400);
  }
  assert.equal(calls.some(x=>x.fn==='a10_restore_note'),false,
    'the old unversioned DB restore must never be called from HTTP');
});

test('missing JWT, invalid selector and cookie-origin mismatch are rejected before database writes', async () => {
  let called = 0;
  const handler = createRecoveryHandler(false, {
    verify: async () => student,
    observe: async () => true,
    makeClient: () => ({ rpc: async () => { called++; return {}; } }),
  });
  let res = await run(handler, { method:'POST',authorization:null,body:{id:noteId} });
  assert.equal(res.statusCode, 401);
  res = await run(handler, { method:'POST',url:'/api/restore?ownerId='+ownId,body:{id:noteId} });
  assert.equal(res.statusCode, 400);
  res = await run(handler, { method:'POST',body:{id:noteId},contentType:'text/plain' });
  assert.equal(res.statusCode, 400);
  res = await run(handler, { method:'POST',body:{id:noteId},
    authorization:null,cookie:'__Host-vault-access=mocktoken' });
  assert.equal(res.statusCode, 403);
  res = await run(handler, { method:'DELETE',body:{id:noteId} });
  assert.equal(res.statusCode, 405);
  assert.equal(called, 0);
});

test('test-only policy rollback requires a judge identity, preview and explicit version confirmation', async () => {
  let identity = student;
  let writes = 0;
  const client = { rpc: async (fn, args) => {
    if (fn === 'a10_policy_diff') return { data: {
      backupVerified:true,scope:'test_only',backupVersion:manifest,
      policyCount:4,changes:[{rule:'notes_owner_select',safeHash:hash,currentHash:manifest}],
    } };
    assert.equal(fn, 'a10_restore_test_policies');
    assert.equal(args.p_expected_version, manifest);
    writes++;
    return { data: { backupVersion:manifest,scope:'test_only',restoredRuleCount:1,verified:true } };
  } };
  const handler = createRecoveryHandler(true, {
    verify:async()=>identity, makeClient:()=>client,
  });
  let res = await run(handler,{url:'/api/restore/policy'});
  assert.equal(res.statusCode,403);
  identity = judgeB;
  res=await run(handler,{url:'/api/restore/policy'});
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body.changes.map(x=>x.rule), ['notes_owner_select']);
  res=await run(handler,{url:'/api/restore/policy',method:'POST',
    body:{expectedVersion:manifest} });
  assert.equal(res.statusCode,400);
  res=await run(handler,{url:'/api/restore/policy',method:'POST',
    body:{expectedVersion:manifest,confirm:true,ownerId:ownId} });
  assert.equal(res.statusCode,400);
  assert.equal(writes,0);
  res=await run(handler,{url:'/api/restore/policy',method:'POST',
    body:{expectedVersion:manifest,confirm:true} });
  assert.equal(res.statusCode,200);
  assert.equal(res.body.scope,'test_only');
  assert.equal(writes,1);
});

test('signed judge A/B identities get different note backup scopes', () => {
  const a = { kind:'judge',userId:ownId,identity:'a',runId:noteId };
  const b = { kind:'judge',userId:ownId,identity:'b',runId:noteId };
  assert.notEqual(noteOwnerId(a),noteOwnerId(b));
});

test('fixed response checkpoints expose early gate failures without caller data',async()=>{
  let calls=0;
  const handler=createRecoveryHandler(false,{verify:async()=>null,
    makeClient:()=>{calls++;throw new Error('must not access database');}});
  let res=await run(handler,{method:'POST',url:'/api/restore/'+noteId,authorization:null});
  assert.equal(res.statusCode,401);
  assert.equal(res.headers['X-Aleph-Recovery-Checkpoint'],'auth_missing');
  res=await run(handler,{method:'POST',url:'/api/restore/'+noteId});
  assert.equal(res.statusCode,401);
  assert.equal(res.headers['X-Aleph-Recovery-Checkpoint'],'auth_rejected');
  res=await run(handler,{url:'/api/restore/not-a-uuid'});
  assert.equal(res.statusCode,400);
  assert.equal(res.headers['X-Aleph-Recovery-Checkpoint'],'route_rejected');
  assert.equal(calls,0);
});

test('malformed body resource IDs cannot become server errors or reach backup RPC',async()=>{
  let calls=0;
  const handler=createRecoveryHandler(false,{verify:async()=>student,
    makeClient:()=>({rpc:async()=>{calls++;throw new Error('unexpected backup lookup');}}),
    observe:async()=>true});
  for(const id of [{},[],42,null,true]) {
    const res=await run(handler,{method:'POST',url:'/api/restore/'+noteId,body:{id}});
    assert.equal(res.statusCode,400);
  }
  assert.equal(calls,0);
});
