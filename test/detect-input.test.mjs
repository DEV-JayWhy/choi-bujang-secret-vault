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

test('production detect result remains observe for normal or suspicious inputs at step 1', () => {
  for (const input of [
    [{ at, method: 'GET', identity: { sub: 'learner_fixture' } }],
    Array.from({ length: 121 }, (_, i) => ({ at: new Date(Date.parse(at) + 2000*i).toISOString(),
      method: 'GET', identity: { sub: 'learner_fixture' } })),
  ]) {
    assert.deepEqual(detect(input), { action: 'observe' });
  }
});
