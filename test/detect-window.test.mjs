import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../src/detect.mjs';

const START = Date.UTC(2026, 9, 1, 0, 0, 0);
const record = (time, subject = 'learner_fixture', method = 'GET') => ({
  at: new Date(START + time).toISOString(), method,
  identity: { sub: subject },
});
const reads = (count, stepMs = 2000, subject = 'learner_fixture') =>
  Array.from({ length: count }, (_, i) => record(i * stepMs, subject));
const proposal = subject => ({
  action: 'propose_revocation', reasonCode: 'burst_read', subject,
});
const observe = { action: 'observe' };

test('strict 120/121 boundary and 10-minute moving window', () => {
  assert.deepEqual(detect([]), observe);
  assert.deepEqual(detect(reads(30)), observe);
  assert.deepEqual(detect(reads(120)), observe);
  assert.deepEqual(detect(reads(121)), proposal('learner_fixture'));
  assert.deepEqual(detect(reads(200)), proposal('learner_fixture'));
  // 121st GET is precisely 10m after first: first event must expire.
  assert.deepEqual(detect(reads(121, 5000)), observe);
  assert.deepEqual(detect(reads(121, 4999)), proposal('learner_fixture'));
  assert.deepEqual(detect(reads(200, 7000)), observe);
  assert.deepEqual(detect(Array.from({ length: 121 }, () => record(0))), proposal('learner_fixture'));
});

test('interleaved subjects and non-GET methods must not be aggregated as a burst', () => {
  const first = reads(100);
  const second = reads(100, 2000, 'other_fixture');
  assert.deepEqual(detect([...first, ...second]), observe);
  assert.deepEqual(detect([
    ...reads(120),
    record(200000, 'learner_fixture', 'POST'),
    record(200100, 'learner_fixture', 'PUT'),
    record(200200, 'learner_fixture', 'DELETE'),
    record(200300, 'learner_fixture', 'HEAD'),
  ]), observe);
  assert.deepEqual(detect([...first, ...second, ...reads(21, 1000, 'other_fixture')]),
    proposal('other_fixture'));
});

test('out-of-order events and separate time clusters keep their own owner and window', () => {
  const shifted = reads(121).map(event => ({
    ...event, at: new Date(Date.parse(event.at) + 6000000).toISOString(),
    identity: { sub: 'other_fixture' },
  }));
  assert.deepEqual(detect([...shifted.reverse(), ...reads(121).reverse()]),
    proposal('learner_fixture'), 'earliest threshold crossing wins');
  const separated = [
    ...reads(110),
    ...reads(110).map(event => ({
      ...event, at: new Date(Date.parse(event.at) + 86400000).toISOString(),
    })),
  ];
  assert.deepEqual(detect(separated), observe);
});

test('unverified network/device claims and malformed records cannot trigger a proposal', () => {
  const unusualNetwork = reads(30).map(event => ({
    ...event, network: 'unusual', deviceId: 'unknown',
    decision: 'deny', token: 'should-not-be-copied',
  }));
  assert.deepEqual(detect(unusualNetwork), observe);
  assert.deepEqual(detect([
    ...reads(120),
    { ...record(210000), at: 'not a timestamp', network: 'unusual' },
    { ...record(210100), method: 'get' },
    { ...record(210200), identity: { sub: '' } },
  ]), observe);
  assert.deepEqual(detect([...unusualNetwork, ...reads(121, 2000, 'other_fixture')]),
    proposal('other_fixture'));
});
