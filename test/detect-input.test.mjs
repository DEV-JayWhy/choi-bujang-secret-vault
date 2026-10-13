import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDetectionEvents, detect } from '../src/detect.mjs';

const at = '2026-10-01T00:00:00.000Z';

test('stage 9 input projection retains only documented synthetic event fields', () => {
  const inputs = [
    { at, method: 'GET', identity: { sub: 'learner_fixture', email: 'hidden@example.invalid' },
      token: 'test-token-do-not-copy', content: 'private-note-do-not-copy',
      userName: 'real-name-do-not-copy', deviceId: 'unverified-device',
      network: 'unusual', decision: 'deny' },
    { at: '2026-10-01T00:00:01.000Z', method: 'POST', identity: { sub: 'other_fixture' } },
  ];
  const snapshot = JSON.parse(JSON.stringify(inputs));
  const actual = readDetectionEvents(inputs);
  assert.deepEqual(actual, [
    { at, method: 'GET', subject: 'learner_fixture' },
    { at: '2026-10-01T00:00:01.000Z', method: 'POST', subject: 'other_fixture' },
  ]);
  assert.deepEqual(inputs, snapshot, 'events must not be mutated');
  for (const secret of ['test-token-do-not-copy', 'private-note-do-not-copy',
    'real-name-do-not-copy', 'hidden@example.invalid', 'unverified-device', 'unusual', 'deny']) {
    assert.equal(JSON.stringify(actual).includes(secret), false,
      'no untrusted or private extra fields in the detection projection');
  }
});

test('invalid records cannot supply a synthetic owner, timestamp, or method', () => {
  const actual = readDetectionEvents([
    null, {}, [], { at: 'invalid', method: 'GET', identity: { sub: 'a' } },
    { at, method: 'get', identity: { sub: 'a' } },
    { at, method: 'GET', identity: null },
    { at, method: 'GET', identity: { sub: '' } },
    { at, method: 'GET', identity: { sub: 'learner_fixture' } },
  ]);
  assert.deepEqual(actual, [{ at, method: 'GET', subject: 'learner_fixture' }]);
  assert.throws(() => readDetectionEvents({}), { name: 'TypeError', message: 'invalid_detection_events' });
  assert.throws(() => detect(null), { name: 'TypeError', message: 'invalid_detection_events' });
});

test('stage 9 proposal contains only the contract fields and no secrets', () => {
  const events = Array.from({ length: 121 }, (_, i) => ({
    at: new Date(Date.parse(at) + 2000 * i).toISOString(),
    method: 'GET',
    identity: { sub: 'learner_fixture', email: 'hidden@example.invalid' },
    token: 'test-token-do-not-copy',
    content: 'private-note-do-not-copy',
    deviceId: 'unverified-device',
    network: 'unusual',
  }));
  const snapshot = JSON.stringify(events);
  assert.deepEqual(detect(events), {
    action: 'propose_revocation', reasonCode: 'burst_read', subject: 'learner_fixture',
  });
  assert.equal(JSON.stringify(events), snapshot, 'original events are never mutated');
  assert.deepEqual(detect(events.slice(0, 120)), { action: 'observe' });
});
