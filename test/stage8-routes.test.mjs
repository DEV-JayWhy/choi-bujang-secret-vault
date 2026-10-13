import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, inspectNoteRoute, RULE_IDS } from '../src/decider.mjs';
const base = {
  schema: 'aleph.decision.v1', requestId: 'test-request',
  classId: 'class_fixture', projectId: 'project_fixture', subjectId: 'learner_fixture',
  deviceId: 'aaaaaaaaaaaaaaaa', at: new Date().toISOString(), policyRevision: 1,
  deviceRegistered: true, service: 'notes', method: 'GET',
  path: '/notes/demo', route: 'GET /notes/:id', signals: { source: 'none' },
  stepUp: { verified: false, authAgeSeconds: null }, recentEvents: [],
  queryLength: 0,
  querySha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};
const allowed = [
  ['GET', '/notes/demo', 'GET /notes/:id'],
  ['PUT', '/notes/demo', 'PUT /notes/:id'],
  ['GET', '/notes/11111111-1111-4111-8111-111111111111', 'GET /notes/:id'],
  ['GET', '/api/notes/11111111-1111-4111-8111-111111111111', 'GET /api/notes/:id'],
];
const blocked = [
  ['GET', '/notes', 'GET /notes'],
  ['POST', '/notes', 'POST /notes'],
  ['DELETE', '/notes/demo', 'DELETE /notes/:id'],
  ['GET', '/notes/a/b', 'GET /notes/:id'],
  ['GET', '/notes/export', 'GET /notes/:id'],
  ['GET', '/notes/%2e%2e', 'GET /notes/:id'],
  ['GET', '/notes/demo/', 'GET /notes/:id'],
  ['GET', '/notes/demo?x=1', 'GET /notes/:id'],
  ['GET', '/notes/../admin', 'GET /notes/:id'],
  ['GET', '/NOTES/demo', 'GET /notes/:id'],
  ['GET', '/api/notes', 'GET /api/notes'],
  ['GET', '/notes/other', 'GET /notes/:id'],
  ['PUT', '/notes', 'PUT /notes'],
  ['POST', '/notes/demo', 'POST /notes/:id'],
  ['GET', '/notes/demo', 'GET /notes'],
];
for (const [method, path, route] of allowed) test(`allow ${method} ${path}`, async () => {
  const req = { ...base, method, path, route };
  assert.equal(inspectNoteRoute(req), true);
  assert.equal((await decide(req)).decision, 'allow');
});
for (const [method, path, route] of blocked) test(`deny ${method} ${path}`, async () => {
  const req = { ...base, method, path, route };
  assert.equal(inspectNoteRoute(req), false);
  const result = await decide(req);
  assert.equal(result.decision, 'deny');
  assert.equal(result.reasonCode, 'policy_denied');
  assert.deepEqual(result.ruleIds, ['resource_zone']);
});
test('deny other service', async () => assert.equal((await decide({ ...base, service: 'notices' })).decision, 'deny'));
test('registered-device rule stays in place', async () => {
  const r = await decide({ ...base, deviceRegistered: false });
  assert.equal(r.decision, 'deny'); assert.equal(r.reasonCode, 'device_not_registered');
});
test('rule IDs declared', () => assert.deepEqual(RULE_IDS, ['device_registered','step_up_required','resource_zone']));

test('encoded separators, double encoding, fragments and unknown methods are rejected', async () => {
  for (const patch of [{path:'/notes/a%2Fb'},{path:'/notes/%252e%252e'},
    {path:'/notes/demo#x'},{path:'/notes//demo'},{method:'PATCH',route:'PATCH /notes/:id'},
    {method:'LIST',route:'LIST /notes'},{path:'/notes/EXPORT'}]) {
    assert.equal((await decide({...base,...patch})).decision,'deny');
  }
});
test('unregistered device keeps priority and verified step-up cannot bypass invalid routes', async () => {
  assert.equal((await decide({...base,service:'other',deviceRegistered:false})).reasonCode,'device_not_registered');
  assert.equal((await decide({...base,path:'/other/demo',stepUp:{verified:true,authAgeSeconds:60}} )).reasonCode,'policy_denied');
});
