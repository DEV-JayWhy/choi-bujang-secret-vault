import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

const id = '11111111-1111-4111-8111-111111111111';
function request(overrides = {}) {
  return { ...fixtureRequests().normal, service: 'notes', method: 'POST',
    path: '/api/restore/' + id, route: 'POST /api/restore/:id',
    at: new Date().toISOString(), ...overrides };
}
test('only exact UUID recovery GET/POST reaches existing device and step-up rules', async () => {
  for (const method of ['GET', 'POST']) {
    const out = await decide(request({ method, route: method + ' /api/restore/:id' }));
    assert.equal(out.decision, 'allow');
    assert.deepEqual(Object.keys(out).sort(), ['decision','reasonCode','requestId','ruleIds','schema']);
    assert.ok(out.ruleIds.every(id => RULE_IDS.includes(id)));
  }
  assert.equal((await decide(request({deviceRegistered:false}))).reasonCode,'device_not_registered');
  const suspicious = fixtureRequests().suspicious;
  assert.equal((await decide(request({ signals:suspicious.signals,
    recentEvents:suspicious.recentEvents, stepUp:suspicious.stepUp }))).decision,'step_up');
  assert.equal((await decide(request({schema:'untrusted'}))).decision,'deny');
  assert.equal((await decide(request({at:'2000-01-01T00:00:00Z'}))).decision,'deny');
});
test('recovery does not widen collection, query, service, method or route policy', async () => {
  for (const path of ['/api/restore', '/api/restore/policy', '/api/restore/demo',
    '/restore/'+id, '/api/restore/'+id+'/', '/api/restore/'+id+'/extra',
    '/api/restore/'+id+'?owner=a', '/api/restore/'+id+'#fragment']) {
    assert.equal((await decide(request({path}))).decision,'deny',path);
  }
  for (const method of ['PUT','PATCH','DELETE','HEAD','OPTIONS']) {
    assert.equal((await decide(request({method,route:method+' /api/restore/:id'}))).decision,'deny');
  }
  for (const overrides of [{service:'auth'}, {route:'POST /api/restore'},
    {route:'POST /api/notes/:id'}, {queryLength:1}, {querySha256:'0'.repeat(64)}]) {
    assert.equal((await decide(request(overrides))).decision,'deny');
  }
  for (const path of ['/api/notes','/api/notes/export','/api/announcements/'+id]) {
    assert.equal((await decide(request({path,route:'POST /api/notes/:id'}))).decision,'deny');
  }
});
