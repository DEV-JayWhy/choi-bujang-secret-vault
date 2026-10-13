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
    const seven = await runAttackChecks({ ...config, step: 7 });
    assert.deepEqual(methods, ['GET', 'POST', 'GET', 'PUT', 'DELETE', 'GET', 'GET']);
    assert.equal(seven.length, 10);
  } finally { globalThis.fetch = original; }
});
