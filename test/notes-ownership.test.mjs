import { test } from 'node:test';
import { createServer, request as httpRequest } from 'node:http';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import collection from '../api/notes.js';
import detail from '../api/notes/[id].js';
import { inspectNoteUrl } from '../src/notes-handler.mjs';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url)));
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; } });
test('A/B own CRUD, cross-owner denial, owner spoof denial and unauthenticated denial (local HTTP server, mock DB)', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_SECRET_KEY;
  const userId = '11111111-1111-4111-8111-111111111111';
  const rows = new Map(); let writes = 0; let forceForeignGetRow = false;
  let forceWrongGetId = false; let forceForeignListRow = false;
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
  const server = createServer(async (req, res) => {
    const parsed = new URL(req.url, 'http://127.0.0.1');
    const route = /^\/api\/notes\/([^/]+)$/u.exec(parsed.pathname);
    if (parsed.pathname !== '/api/notes' && !route) {
      res.writeHead(404); res.end('{}'); return;
    }
    const parts = [];
    for await (const part of req) parts.push(part);
    req.body = Buffer.concat(parts).toString() || undefined;
    req.query = { id: route?.[1], ...Object.fromEntries(parsed.searchParams) };
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res; };
    await (route ? detail : collection)(req, res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  async function call(handler, method, body, id, auth = headers, suffix = '') {
    const path = `${handler === detail ? `/api/notes/${id}` : '/api/notes'}${suffix}`;
    const encoded = body === undefined ? undefined : JSON.stringify(body);
    const result = await new Promise((resolve, reject) => {
      const req = httpRequest({host:'127.0.0.1', port:server.address().port, path, method,
        headers:{...auth, 'Content-Type':'application/json', ...(encoded === undefined ? {} : {'Content-Length':Buffer.byteLength(encoded)})}}, res => {
        const parts=[]; res.on('data', part => parts.push(part));
        res.on('end', () => resolve({code:res.statusCode, headers:res.headers,
          body:JSON.parse(Buffer.concat(parts).toString())}));
      });
      req.on('error',reject); req.end(encoded);
    });
    assert.equal(result.headers['x-content-type-options'],'nosniff'); return result;
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
      if (id) return json(forceForeignGetRow && rows.has(id)
        ? [{ ...rows.get(id), owner_id: bId }]
        : forceWrongGetId && rows.has(id) ? [{ ...rows.get(id), id: bId }]
        : visible ? [rows.get(id)] : []);
      const owner = url.searchParams.get('owner_id')?.slice(3); assert.ok([userId, bId].includes(owner));
      const list = [...rows.values()].filter(row => row.owner_id === owner);
      if (forceForeignListRow && list.length) list.push({ ...list[0], id: bId, owner_id: bId });
      return json(list);
    };
    for (const [handler, method] of [[collection, 'GET'], [collection, 'POST'], [detail, 'GET'], [detail, 'PUT'], [detail, 'DELETE']]) {
      const res = await call(handler, method, {}, userId, {}); assert.equal(res.code, 401); assert.ok(!res.body.notes);
      assert.equal(res.headers['x-aleph-resource-id'], undefined);
    }
    assert.equal((await call(collection, 'GET', undefined, undefined, { authorization: 'Bearer invalid' })).code, 401);
    assert.equal(writes, 0);
    for (const [handler, method] of [[collection, 'PUT'], [detail, 'POST'], [detail, 'PATCH']]) {
      assert.equal((await call(handler, method, {}, userId)).code, 405);
    }
    assert.equal((await call(detail, 'GET', undefined, 'export')).code, 400);
    assert.equal(writes, 0);

    const added = await call(collection, 'POST', { title: 'test', body: 'test body', role: 'admin' });
    assert.equal(added.code, 201); const id = added.body.id; assert.match(id, /^[0-9a-f-]{36}$/);
    let res = await call(detail, 'GET', undefined, id); assert.deepEqual(res.body, { id, title: 'test', body: 'test body' });
    assert.equal(res.headers['x-aleph-resource-id'], 'private_note:' + id);
    // Even if an upstream query returns another owner's row, never disclose it.
    forceForeignGetRow = true;
    res = await call(detail, 'GET', undefined, id);
    assert.equal(res.code, 404);
    assert.deepEqual(res.body, { error: 'NOTE_NOT_FOUND' });
    assert.equal(res.headers['x-aleph-resource-id'], undefined);
    forceForeignGetRow = false;
    forceWrongGetId = true;
    res = await call(detail, 'GET', undefined, id);
    assert.equal(res.code, 404);
    assert.deepEqual(res.body, { error: 'NOTE_NOT_FOUND' });
    assert.equal(res.headers['x-aleph-resource-id'], undefined);
    forceWrongGetId = false;
    forceForeignListRow = true;
    res = await call(collection, 'GET');
    assert.equal(res.code, 502);
    assert.deepEqual(res.body, { error: 'NOTES_UNAVAILABLE' });
    assert.equal(res.headers['x-aleph-resource-id'], undefined);
    forceForeignListRow = false;
    res = await call(collection, 'GET'); assert.equal(res.body.length, 1);
    assert.equal(res.headers['x-aleph-resource-id'], 'private_note:collection');
    res = await call(detail, 'PUT', { title: 'changed', body: 'changed body' }, id);
    assert.equal(res.code, 200); assert.equal(res.body.body, 'changed body'); assert.equal(rows.get(id).owner_id, userId);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const denied = await call(detail, method, method === 'PUT' ? {title:'intruder',body:''} : undefined, id, bHeaders);
      assert.equal(denied.code, 404);
      assert.equal(denied.headers['x-aleph-resource-id'], undefined);
    }
    assert.equal(rows.get(id).owner_id, userId);
    assert.equal(rows.get(id).title, 'changed');
    assert.equal((await call(detail, 'GET', undefined, id, headers, `?id=${id}`)).code, 200);
    for (const suffix of [`?id=${bId}`, `?id=${id}&id=${id}`, '?action=export', '?role=admin', '?ownerId=spoof']) {
      const before = writes;
      for (const method of ['GET', 'PUT', 'DELETE']) {
        assert.equal((await call(detail, method, {title:'intruder',body:''}, id, headers, suffix)).code, 400);
      }
      assert.equal(writes, before);
    }
    assert.equal((await call(collection, 'GET', undefined, undefined, bHeaders, `?id=${id}`)).code, 400);

    assert.equal((await call(detail, 'PUT', {title:'changed',body:'',owner_id:bId}, id)).code, 400);
    assert.equal((await call(collection, 'POST', {title:'spoof',body:'',owner_id:bId})).code, 400);
    const bAdded = await call(collection, 'POST', {title:'B test',body:''}, undefined, bHeaders);
    assert.equal(bAdded.code, 201); const bid = bAdded.body.id;
    assert.equal(rows.get(bid).owner_id, bId);
    assert.deepEqual((await call(collection, 'GET', undefined, undefined, bHeaders)).body.map(row => row.id), [bid]);
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
    await new Promise(resolve => server.close(resolve));
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = previousKey;
  }
});

test('exact note URL parsing cannot be replaced by query IDs, headers or normalization', () => {
  const id='11111111-1111-4111-8111-111111111111';
  assert.deepEqual(inspectNoteUrl({url:`/api/notes/${id}`,query:{id:'spoof'}},true),{id});
  for (const url of [undefined, '/notes/'+id, '/api/notes/export', '/api/notes/'+id+'/',
    '/api/notes/%31'+id.slice(1), '/API/notes/'+id, '/api/notes/../notes/'+id,
    '/api/notes/'+id+'#fragment', '/api/notes/'+id+'?id='+id+'&id='+id]) {
    assert.equal(inspectNoteUrl({url,query:{id},headers:{'x-original-url':'/api/notes/'+id}},true),null);
  }
  assert.equal(inspectNoteUrl({url:'/api/notes?operation=export'},false),null);
  assert.deepEqual(inspectNoteUrl({url:'/api/notes'},false),{id:undefined});
});
