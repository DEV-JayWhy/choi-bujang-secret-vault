import { test } from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide, inspectNoteRoute } from '../src/decider.mjs';

const base = () => ({ ...fixtureRequests().normal, signals: { source: 'none', region: 'unknown', network: 'unknown', hour: 14 } });
const withRoute = (method, path, route, service = 'notes') => ({ ...base(), method, path, route, service });
const queryMetadata = query => ({ queryLength: query.length,
  querySha256: createHash('sha256').update(query).digest('hex') });
async function expectDecision(request, expected) {
  const result = await decide(request);
  assert.equal(result.decision, expected, JSON.stringify({ method: request.method, path: request.path, route: request.route, result }));
  assert.equal(result.requestId, request.requestId);
  assert.deepEqual(Object.keys(result).sort(), ['decision', 'reasonCode', 'requestId', 'ruleIds', 'schema']);
}

test('preserve legitimate note item GET and own collection GET', async () => {
  await expectDecision(withRoute('GET', '/notes/demo', 'GET /notes/:id'), 'allow');
  await expectDecision(withRoute('GET', '/notes', 'GET /notes'), 'allow');
  await expectDecision(withRoute('POST', '/notes', 'POST /notes'), 'allow');
  await expectDecision(withRoute('PUT', '/notes/demo', 'PUT /notes/:id'), 'allow');
});

test('reject query-filtered collection reads while preserving unfiltered own list', async () => {
  await expectDecision({ ...withRoute('GET', '/notes', 'GET /notes'), queryLength: 0 }, 'allow');
  await expectDecision({ ...withRoute('GET', '/notes', 'GET /notes'), queryLength: 19 }, 'deny');
});

test('missing or contradictory query metadata cannot authorize an item or collection', async () => {
  for (const [path, route] of [['/notes', 'GET /notes'], ['/notes/demo', 'GET /notes/:id']]) {
    const normal = withRoute('GET', path, route);
    for (const patch of [
      { queryLength: undefined }, { querySha256: undefined },
      { querySha256: '' }, { querySha256: '0'.repeat(64) },
      { queryLength: 1 }, { queryLength: null },
    ]) await expectDecision({ ...normal, ...patch }, 'deny');
    await expectDecision(normal, 'allow');
  }
});

test('reject unknown and bulk note paths', async () => {
  for (const path of ['/notes/export', '/notes/all', '/notes/bulk', '/notes/search', '/notes/admin', '/notes/../demo', '/notes/%64emo', '/notes/demo/extra']) {
    await expectDecision(withRoute('GET', path, 'GET /notes/:id'), 'deny');
  }
  await expectDecision(withRoute('PATCH', '/notes/demo', 'PATCH /notes/:id'), 'deny');
});

test('safe-looking words cannot select other zones or collection functions', async () => {
  for (const id of ['list', 'collection', 'shared', 'other', 'instructor', 'notice',
    'materials', 'arbitrary-note', 'demo.json', 'DEMO', 'not-a-uuid']) {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      await expectDecision(withRoute(method, '/notes/' + id, method + ' /notes/:id'), 'deny');
    }
  }
});

test('production UUID CRUD and documented demo remain available', async () => {
  for (const id of ['demo', '11111111-1111-4111-8111-111111111111',
    'ABCDEF12-3456-4789-ABCD-0123456789AB']) {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      await expectDecision(withRoute(method, '/notes/' + id, method + ' /notes/:id'), 'allow');
    }
  }
});

test('item queries cannot change resource scope or bypass a verified step-up', async () => {
  const request = withRoute('GET', '/notes/demo', 'GET /notes/:id');
  for (const queryLength of [1, 19, -1, '0', null]) {
    await expectDecision({ ...request, queryLength,
      stepUp: { verified: true, authAgeSeconds: 60 } }, 'deny');
  }
  await expectDecision({ ...request, queryLength: 0 }, 'allow');
});

test('only the path-selected ID query is permitted, never functions or another owner scope', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const req = withRoute('GET', '/notes/' + id, 'GET /notes/:id');
  await expectDecision({ ...req, ...queryMetadata('id=' + id) }, 'deny');
  await expectDecision(req, 'allow');
  for (const query of ['id=22222222-2222-4222-8222-222222222222',
    'action=export', 'owner_id=another', 'role=instructor', 'id='+id+'&id='+id,
    'id='+id+'&action=export']) {
    await expectDecision({ ...req, ...queryMetadata(query) }, 'deny');
  }
  await expectDecision({ ...withRoute('GET', '/notes', 'GET /notes'),
    ...queryMetadata('id=' + id) }, 'deny');
});

test('reject instructor announcements and materials writes regardless of role', async () => {
  for (const service of ['announcements', 'instructor', 'materials']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      await expectDecision(withRoute(method, '/announcements/demo', method + ' /announcements/:id', service), 'deny');
    }
  }
});

test('registered device and step-up fixture behavior preserved', async () => {
  const { normal, suspicious } = fixtureRequests();
  await expectDecision(normal, 'allow');
  await expectDecision(suspicious, 'step_up');
  await expectDecision({ ...normal, deviceRegistered: false }, 'deny');
});

test('ownership cannot be inferred from the engine contract alone', () => {
  const a = withRoute('GET', '/notes/demo', 'GET /notes/:id');
  const b = { ...a, subjectId: 'another_subject' };
  assert.equal(inspectNoteRoute(a), inspectNoteRoute(b));
  // The request has no trusted resource owner field. Ownership must be checked by the API.
});
