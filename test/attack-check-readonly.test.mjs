import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAttackChecks } from '../src/attack-check.mjs';

test('stage 8 self-check sends only GET and labels skipped writes; stage 7 preserves requests', async () => {
  const original = globalThis.fetch;
  const methods = [];
  globalThis.fetch = async (url, options) => {
    methods.push(options.method);
    return new Response('{}', { status: String(url).endsWith('/data.json') ? 404 : 401 });
  };
  try {
    const config = { publicAppUrl: 'https://local-check.vercel.app' };
    const eight = await runAttackChecks({ ...config, step: 8 });
    assert.deepEqual(methods, ['GET', 'GET', 'GET', 'GET']);
    assert.equal(eight.length, 12);
    for (const id of ['anonymous_note_create', 'anonymous_note_update', 'anonymous_note_delete']) {
      assert.match(eight.find(row => row.attackId === id).observed, /^미실행/u);
    }
    methods.length = 0;
    const nine = await runAttackChecks({ ...config, step: 9 });
    assert.deepEqual(methods, ['GET', 'GET', 'GET', 'GET']);
    assert.equal(nine.length, 17);
    for (const id of ['anonymous_note_create', 'anonymous_note_update', 'anonymous_note_delete',
      'stage9_revoked_identity_retry', 'stage9_stolen_session_retry',
      'stage9_cross_resource_retry']) {
      assert.match(nine.find(row => row.attackId === id).observed, /^미실행/u);
    }
    assert.match(nine.find(row => row.attackId === 'stage9_normal_detection').observed, /120건 결과 observe; 기대 조건 일치/u);
    assert.match(nine.find(row => row.attackId === 'stage9_burst_detection').observed,
      /121건 결과 propose_revocation; 이유 burst_read; 기대 조건 일치/u);
    methods.length = 0;
    const ten = await runAttackChecks({ ...config, step: 10 });
    assert.deepEqual(methods, ['GET', 'GET', 'GET', 'GET', 'GET', 'GET']);
    assert.equal(ten.length, 20);
    assert.match(ten.find(row => row.attackId === 'restore_route_requires_login').observed,
      /익명 HTTP 401; 위조 토큰 HTTP 401; 서버 단계 missing; 설정·인증 게이트 확인 필요/u);
    for (const id of ['stage10_backup_revalidation', 'stage10_restoration_full_replay']) {
      assert.match(ten.find(row => row.attackId === id).observed, /^미실행/u);
    }
    methods.length = 0;
    const seven = await runAttackChecks({ ...config, step: 7 });
    assert.deepEqual(methods, ['GET', 'POST', 'GET', 'PUT', 'DELETE', 'GET', 'GET']);
    assert.equal(seven.length, 10);
  } finally { globalThis.fetch = original; }
});
