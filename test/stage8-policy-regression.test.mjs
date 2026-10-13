import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide, inspectNoteRoute } from '../src/decider.mjs';

const base = () => ({ ...fixtureRequests().normal, signals: { source: 'none', region: 'unknown', network: 'unknown', hour: 14 } });
const withRoute = (method, path, route, service = 'notes') => ({ ...base(), method, path, route, service });
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

test('reject unknown and bulk note paths', async () => {
  for (const path of ['/notes/export', '/notes/all', '/notes/bulk', '/notes/search', '/notes/admin', '/notes/../demo', '/notes/%64emo', '/notes/demo/extra']) {
    await expectDecision(withRoute('GET', path, 'GET /notes/:id'), 'deny');
  }
  await expectDecision(withRoute('PATCH', '/notes/demo', 'PATCH /notes/:id'), 'deny');
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
