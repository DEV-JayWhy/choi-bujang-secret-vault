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
  for (const url of ['/api/restore?ownerId='+ownId, '/api/restore?id='+noteId+'&id='+noteId,
    '/api/restore?id='+noteId+'&role=admin', '/api/restore/'+noteId,
    '/api/restore?noteId='+noteId, '/api/restore?id='+noteId+'#bad']) {
    assert.equal(inspectRecoveryRequest({ method: 'GET', url }, false), null);
  }
});

test('valid B restore preview and POST affect only B note; cross-owner returns 404', async () => {
  const rows = new Map([[noteId, { id: noteId, ownerId: ownId, contentHash: hash }]]);
  const calls = [];
  const client = { rpc: async (fn, args) => {
    calls.push({ fn, args });
    const current = rows.get(args.p_note_id);
    if (!current || current.ownerId !== args.p_owner_id) return { error: { code: 'P0002' } };
    if (args.p_expected_hash && args.p_expected_hash !== current.contentHash) {
      return { error: { code: '23514' } };
    }
    return { data: fn === 'a10_note_restore_preview'
      ? { ...current, verified: true, wouldRestore: true }
      : { ...current, restored: true } };
  } };
  let as = student;
  const handler = createRecoveryHandler(false, {
    verify: async () => as, makeClient: () => client,
  });
  let result = await run(handler, { url: '/api/restore?id='+noteId });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { id:noteId,ownerId:ownId,contentHash:hash,
    verified:true,wouldRestore:true });
  result = await run(handler, { method:'POST',
    body:{ id:noteId,expectedHash:hash } });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.restored, true);
  assert.deepEqual(calls.at(-1), { fn:'a10_restore_note',args:{
    p_note_id:noteId,p_owner_id:ownId,p_expected_hash:hash,
  } });
  as = otherStudent;
  result = await run(handler, { method:'POST', body:{ id:noteId } });
  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, { error:'BACKUP_NOT_FOUND' });
  assert.equal(JSON.stringify(result.body).includes(hash), false);
  as = student;
  result = await run(handler, { method:'POST', body:{ id:noteId,expectedHash:'0'.repeat(64) } });
  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error, 'BACKUP_VERIFICATION_FAILED');
  result = await run(handler, { method:'POST', body:{ id:noteId,ownerId:ownId } });
  assert.equal(result.statusCode, 400, 'caller must never set owner');
  result = await run(handler, { method:'POST', body:{ id:noteId,role:'admin' } });
  assert.equal(result.statusCode, 400, 'browser role is not trusted');
  assert.equal(rows.size, 1, 'only target exists');
});

test('missing JWT, invalid selector and cookie-origin mismatch are rejected before database writes', async () => {
  let called = 0;
  const handler = createRecoveryHandler(false, {
    verify: async () => student,
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
