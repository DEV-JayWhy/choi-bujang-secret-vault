import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const script = readFileSync(new URL('../public/auth-ui.js',import.meta.url),'utf8');

test('restore UI provides an explicit before-and-after confirmation',()=>{
  for(const id of [
    'recovery-panel','restore-preview-form','restore-id',
    'restore-preview-button','restore-diff','restore-preview-info',
    'restore-confirm','restore-execute','restore-message',
  ]) assert.match(html,new RegExp(`id="${id}"`,'u'),id);
  assert.match(html,/id="recovery-panel" hidden/u,'no signed user has recovery UI');
  assert.match(html,/id="restore-diff" hidden/u,'verified backup version hidden before preview');
  assert.match(html,/id="restore-execute" disabled/u,'mutation blocked until preview and approval');
  assert.match(script,/restoreExecute\.disabled = !restoreConfirm\.checked \|\| !restoredPreview/u);
  assert.ok(script.includes('await notesRequest(`/api/restore/${encodeURIComponent(id)}`)'),
    'preview GET must target exactly one user-selected UUID');
  assert.match(script,/expectedVersion: preview\.backupVersion/u);
  assert.match(script,/expectedState: preview\.stateVersion/u);
  assert.match(script,/expectedHash: preview\.contentHash/u);
  assert.match(script,/resetRestorePreview\(\)/u);
  assert.match(script,/postRestoreRetest/u);
  assert.equal(script.includes('innerHTML'),false,'untrusted note content never injected as HTML');
});
