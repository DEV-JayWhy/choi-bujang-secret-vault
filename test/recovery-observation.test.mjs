import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordRecoveryObservation } from '../src/recovery-observation.mjs';

test('signed restore audit writes only bounded, non-identifying checkpoint attributes', async () => {
  const calls = [];
  const db = { rpc: async (method, args) => {
    calls.push({ method, args }); return { data: null, error: null };
  }};
  assert.equal(await recordRecoveryObservation(db, 'judge', 'auth_verified', 'authenticated'), true);
  assert.equal(await recordRecoveryObservation(db, 'student', 'backup_verified', 'verified_snapshot'), true);
  assert.equal(await recordRecoveryObservation(db, 'judge', 'restore_committed', 'committed'), true);
  assert.equal(await recordRecoveryObservation(db, 'judge', 'retest_failed', 'checks_failed'), true);
  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.equal(call.method,'a10_record_restore_observation');
    assert.deepEqual(Object.keys(call.args).sort(),
      ['p_checkpoint','p_identity_kind','p_reason']);
    assert.equal(JSON.stringify(call).includes('note_id'), false);
    assert.equal(JSON.stringify(call).includes('owner_id'), false);
    assert.equal(JSON.stringify(call).includes('token'), false);
  }
});
test('untrusted identity kinds, markers and arbitrary text never reach SQL', async () => {
  let invoked = false;
  const db = { rpc: async () => { invoked=true; return {}; }};
  const invalid=[
    ['unknown','auth_verified','authenticated'],
    ['judge','free_form','authenticated'],
    ['student','auth_verified','note:private'],
    ['judge','backup_verified','Bearer XYZ'],
  ];
  for (const args of invalid) {
    assert.equal(await recordRecoveryObservation(db, ...args), false);
  }
  assert.equal(invoked,false);
});
test('diagnostic outage is not a restoration failure',async()=>{
  const db = { rpc:async()=>{ throw new Error('simulated_trace_outage'); }};
  assert.equal(await recordRecoveryObservation(db,'judge','backup_rejected','not_found'),false);
});
