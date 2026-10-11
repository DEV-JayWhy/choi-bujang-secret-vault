import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import collection from '../api/notes.js';
import detail from '../api/notes/[id].js';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url)));
const response = () => ({ setHeader() {}, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; } });
test('A/B own CRUD, cross-owner denial, owner spoof denial and unauthenticated denial (mock DB)', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_SECRET_KEY;
  const userId = '11111111-1111-4111-8111-111111111111';
  const rows = new Map(); let writes = 0;
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const jwk = await exportJWK(publicKey); Object.assign(jwk, { kid: 'local-test', alg: 'ES256', use: 'sig' });
  const token = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
    .setSubject(userId).setIssuer(config.identityProvider.issuer).setAudience('authenticated')
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const headers = { authorization: `Bearer ${token}` };
  const bId = '33333333-3333-4333-8333-333333333333';
  const bToken = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
    .setSubject(bId).setIssuer(config.identityProvider.issuer).setAudience('authenticated')
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const bHeaders = { authorization: `Bearer ${bToken}` };
  async function call(handler, method, body, id, auth = headers) {
    const res = response(); await handler({ method, body, headers: auth, query: { id, userId: 'spoof', role: 'admin' } }, res); return res;
  }
  try {
    process.env.SUPABASE_URL = new URL(config.identityProvider.issuer).origin;
    process.env.SUPABASE_SECRET_KEY = 'local-test-server-key';
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.pathname.endsWith('jwks.json')) return json({ keys: [jwk] });
      assert.equal(url.pathname, '/rest/v1/a02_private_notes');
      const id = url.searchParams.get('id')?.slice(3);
      const ownerFilter = url.searchParams.get('owner_id')?.slice(3);
      const visible = rows.has(id) && rows.get(id).owner_id === ownerFilter;
      if (init.method === 'POST') {
        writes++; const row = JSON.parse(init.body); assert.ok([userId, bId].includes(row.owner_id));
        if (rows.has(row.id)) return json({ code: '23505' }, 409);
        rows.set(row.id, row); return new Response(null, { status: 201 });
      }
      if (init.method === 'PATCH') {
        writes++; const changes = JSON.parse(init.body); assert.deepEqual(Object.keys(changes).sort(), ['content', 'title']);
        if (!visible) return json(null);
        const row = { ...rows.get(id), ...changes }; rows.set(id, row); return json(row);
      }
      if (init.method === 'DELETE') { writes++; const row = visible ? rows.get(id) : undefined; if (visible) rows.delete(id); return json(row ? { id } : null); }
      if (id) return json(visible ? [rows.get(id)] : []);
      const owner = url.searchParams.get('owner_id')?.slice(3); assert.ok([userId, bId].includes(owner));
      return json([...rows.values()].filter(row => row.owner_id === owner));
    };
    for (const [handler, method] of [[collection, 'GET'], [collection, 'POST'], [detail, 'GET'], [detail, 'PUT'], [detail, 'DELETE']]) {
      const res = await call(handler, method, {}, userId, {}); assert.equal(res.code, 401); assert.ok(!res.body.notes);
    }
    assert.equal((await call(collection, 'GET', undefined, undefined, { authorization: 'Bearer invalid' })).code, 401);
    assert.equal(writes, 0);
    const added = await call(collection, 'POST', { title: 'test', body: 'test body', role: 'admin' });
    assert.equal(added.code, 201); const id = added.body.id; assert.match(id, /^[0-9a-f-]{36}$/);
    let res = await call(detail, 'GET', undefined, id); assert.deepEqual(res.body, { id, title: 'test', body: 'test body' });
    res = await call(collection, 'GET'); assert.equal(res.body.length, 1);
    res = await call(detail, 'PUT', { title: 'changed', body: 'changed body' }, id);
    assert.equal(res.code, 200); assert.equal(res.body.body, 'changed body'); assert.equal(rows.get(id).owner_id, userId);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await call(detail, method, method === 'PUT' ? {title:'intruder',body:''} : undefined, id, bHeaders)).code, 404);
    }
    assert.equal(rows.get(id).owner_id, userId);
    assert.equal(rows.get(id).title, 'changed');
    assert.equal((await call(detail, 'PUT', {title:'changed',body:'',owner_id:bId}, id)).code, 400);
    assert.equal((await call(collection, 'POST', {title:'spoof',body:'',owner_id:bId})).code, 400);
    const bAdded = await call(collection, 'POST', {title:'B test',body:''}, undefined, bHeaders);
    assert.equal(bAdded.code, 201); const bid = bAdded.body.id;
    assert.equal(rows.get(bid).owner_id, bId);
    assert.equal((await call(collection, 'GET', undefined, undefined, bHeaders)).body.length, 1);
    assert.equal((await call(collection, 'GET')).body.length, 1);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await call(detail, method, method === 'PUT' ? {title:'intruder',body:''} : undefined, bid)).code, 404);
    }
    assert.equal((await call(detail, 'GET', undefined, bid, bHeaders)).code, 200);
    assert.equal((await call(detail, 'PUT', {title:'B changed',body:'B'}, bid, bHeaders)).code, 200);
    assert.equal(rows.get(bid).owner_id, bId);
    assert.equal((await call(detail, 'DELETE', undefined, bid, bHeaders)).code, 200);
    assert.equal((await call(detail, 'GET', undefined, bid, bHeaders)).code, 404);
    assert.equal((await call(detail, 'DELETE', undefined, id)).code, 200);
    assert.equal((await call(detail, 'GET', undefined, id)).code, 404);
    assert.deepEqual((await call(collection, 'GET')).body, []);
    assert.equal((await call(collection, 'POST', { id: 'not-uuid', title: 'test', body: '' })).code, 400);
    const suppliedId = '22222222-2222-4222-8222-222222222222';
    assert.deepEqual((await call(collection, 'POST', { id: suppliedId, title: 'test', body: '' })).body, { id: suppliedId });
    assert.equal((await call(collection, 'POST', { id: suppliedId, title: 'test', body: '' })).code, 409);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = previousKey;
  }
});
