// Stage 10 final checkpoint: require verified preview plus explicit checked approval before POST.
const status = document.querySelector('#auth-status');
const message = document.querySelector('#auth-message');
const form = document.querySelector('#login-form');
const login = document.querySelector('#login-button');
const logout = document.querySelector('#logout-button');
const password = document.querySelector('#password');

const list = document.querySelector('#notes');
let generation = 0;
let currentSession = null;
let currentDeviceApproved = false;
const protectedVault = document.querySelector('#protected-vault');
const deviceStatus = document.querySelector('#device-status');
const deviceRequest = document.querySelector('#device-request');
const deviceRefresh = document.querySelector('#device-refresh');
let editingId = null;
const editor = document.querySelector('#note-editor');
const noteForm = document.querySelector('#note-form');
const noteTitle = document.querySelector('#note-title');
const noteBody = document.querySelector('#note-body');
const noteMessage = document.querySelector('#note-message');
const saveNote = document.querySelector('#save-note');
const cancelNote = document.querySelector('#cancel-note');
const recoveryPanel = document.querySelector('#recovery-panel');
const restoreForm = document.querySelector('#restore-preview-form');
const restoreId = document.querySelector('#restore-id');
const restorePreviewButton = document.querySelector('#restore-preview-button');
const restoreDiff = document.querySelector('#restore-diff');
const restoreInfo = document.querySelector('#restore-preview-info');
const restoreConfirm = document.querySelector('#restore-confirm');
const restoreExecute = document.querySelector('#restore-execute');
const restoreMessage = document.querySelector('#restore-message');
const restoreUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let restoredPreview = null;
function resetRestorePreview() {
  restoredPreview = null;
  restoreDiff.hidden = true;
  restoreConfirm.checked = false;
  restoreExecute.disabled = true;
  restoreInfo.textContent = '';
}
function resetRecoveryPanel() {
  resetRestorePreview();
  restoreId.value = '';
  restoreMessage.textContent = '';
}
function verifyRestorePreview(preview, requestedId) {
  const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (!preview || preview.verified !== true || preview.id !== requestedId
      || typeof preview.ownerId !== 'string' || !restoreUuid.test(preview.ownerId)
      || !sha(preview.backupVersion) || !sha(preview.stateVersion)
      || !sha(preview.contentHash) || !sha(preview.titleHash)
      || !Array.isArray(preview.changedFields)
      || preview.changedFields.some(name => !['title','content','create'].includes(name))) {
    throw new Error('복구 사본의 검증 정보가 일치하지 않습니다.');
  }
  return preview;
}
restoreId.addEventListener('input', () => {
  resetRestorePreview();
  restoreMessage.textContent = '';
});
restoreConfirm.addEventListener('change', () => {
  restoreExecute.disabled = !restoreConfirm.checked || !restoredPreview;
});
restoreForm.addEventListener('submit', async event => {
  event.preventDefault();
  resetRestorePreview();
  restoreMessage.textContent = '';
  const id = restoreId.value.trim().toLowerCase();
  if (!restoreUuid.test(id) || !currentSession?.user || !currentDeviceApproved) {
    restoreMessage.textContent = '로그인 후 메모 UUID를 확인해 주세요.';
    return;
  }
  const owner = currentSession.user.id;
  const current = generation;
  restorePreviewButton.disabled = true;
  try {
    const preview = verifyRestorePreview(
      await notesRequest(`/api/restore/${encodeURIComponent(id)}`), id);
    if (generation !== current || currentSession?.user?.id !== owner) return;
    restoredPreview = preview;
    restoreInfo.textContent = `대상 ID: ${preview.id} / 소유자: ${preview.ownerId} / 사본 버전: ${preview.backupVersion} / 현재 상태 버전: ${preview.stateVersion} / 변경 항목: ${preview.changedFields.join(', ') || '변경 없음'} / 사본 내용 SHA-256: ${preview.contentHash}`;
    restoreDiff.hidden = false;
    restoreMessage.textContent = '검증된 사본 정보를 읽었습니다. 내용을 확인하고 복원을 승인하세요.';
  } catch (error) {
    if (generation === current) restoreMessage.textContent = error.message;
  } finally {
    restorePreviewButton.disabled = false;
  }
});
restoreExecute.addEventListener('click', async () => {
  const preview = restoredPreview;
  if (!preview || !restoreConfirm.checked || !currentSession?.user || !currentDeviceApproved) return;
  const user = currentSession.user.id;
  const current = generation;
  restoreExecute.disabled = true;
  restoreMessage.textContent = '지정한 한 건을 복원하고 확인하는 중입니다.';
  try {
    const result = await notesRequest(`/api/restore/${encodeURIComponent(preview.id)}`,
      'POST', {
        expectedVersion: preview.backupVersion,
        expectedState: preview.stateVersion,
        expectedHash: preview.contentHash,
      });
    if (generation !== current || currentSession?.user?.id !== user) return;
    if (result.restored !== true || result.verified !== true
        || result.id !== preview.id || result.ownerId !== preview.ownerId
        || result.contentHash !== preview.contentHash) {
      throw new Error('복원 후 ID·소유자·내용 해시가 일치하지 않습니다.');
    }
    const check = result.postRestoreRetest;
    restoreMessage.textContent = `메모 한 건 복원 완료. 복원 후 확인: ${check?.allExecutedChecksPassed === true ? '실행한 검사 통과' : '추가 확인 필요'}. 심판 전체 재공격은 별도로 검증해야 합니다.`;
    resetRestorePreview();
    await loadNotes(currentSession);
  } catch (error) {
    if (generation === current) {
      restoreMessage.textContent = error.message;
      resetRestorePreview();
    }
  }
});

function resetEditor() {
  editingId = null; noteForm.reset(); saveNote.textContent = '추가';
  document.querySelector('#editor-heading').textContent = '메모 추가'; cancelNote.hidden = true;
}
async function notesRequest(path, method = 'GET', body) {
  if (!currentDeviceApproved || !currentSession?.user || !navigator.onLine) {
    throw new Error('온라인 상태에서 서버의 기기 승인을 먼저 확인해 주세요.');
  }
  let response = await fetch(path, {
    method, cache: 'no-store', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) {
    refreshPending ??= authRequest('session').finally(() => { refreshPending = null; });
    const session = await refreshPending;
    if (!session.user) { render(null); throw new Error('다시 로그인해 주세요.'); }
    render(session);
    throw new Error('로그인 세션을 갱신했습니다. 서버의 기기 승인 결과를 다시 확인해 주세요.');
  }
  if (response.status === 404) throw new Error('메모가 없거나 삭제되었습니다.');
  if (response.status === 409) throw new Error('같은 ID의 메모가 이미 있습니다.');
  if (!response.ok) throw new Error('메모 요청을 처리하지 못했습니다.');
  return response.json();
}
async function loadNotes(session) {
  const current = ++generation;
  list.replaceChildren();
  if (!session?.user || !currentDeviceApproved) { list.textContent = '서버의 기기 승인 확인 후 메모를 표시합니다.'; return; }
  list.textContent = '메모를 불러오는 중입니다.';
  try {
    const data = await notesRequest('/api/notes');
    if (current !== generation) return;
    if (!Array.isArray(data)) throw new Error('자료 형식이 맞지 않습니다.');
    list.replaceChildren(...data.map(note => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const content = document.createElement('span');
      title.textContent = note.title; content.textContent = note.body;
      content.style.whiteSpace = 'pre-wrap';
      const edit = document.createElement('button'); edit.textContent = '수정';
      edit.addEventListener('click', async () => {
        edit.disabled = true;
        try {
          const detail = await notesRequest(`/api/notes/${encodeURIComponent(note.id)}`);
          if (current !== generation) return;
          editingId = detail.id; noteTitle.value = detail.title; noteBody.value = detail.body;
          saveNote.textContent = '수정 저장'; cancelNote.hidden = false;
          document.querySelector('#editor-heading').textContent = '메모 수정'; noteTitle.focus();
        } catch (error) { if (current === generation) noteMessage.textContent = error.message; }
        finally { edit.disabled = false; }
      });
      const remove = document.createElement('button'); remove.textContent = '삭제';
      remove.addEventListener('click', async () => {
        if (!window.confirm('이 메모를 삭제할까요?')) return;
        remove.disabled = true;
        try {
          resetRestorePreview();
          await notesRequest(`/api/notes/${encodeURIComponent(note.id)}`, 'DELETE');
          if (current !== generation) return;
          if (editingId === note.id) resetEditor();
          noteMessage.textContent = '삭제했습니다.'; await loadNotes(currentSession);
        } catch (error) { if (current === generation) noteMessage.textContent = error.message; }
        finally { remove.disabled = false; }
      });
      const actions = document.createElement('div'); actions.style.marginTop = '12px'; actions.append(edit, remove);
      item.append(title, content, actions); return item;
    }));
    if (!data.length) list.textContent = '내 메모가 없습니다. 첫 메모를 추가해 주세요.';
  } catch (error) { if (current === generation) list.textContent = error.message; }
}
noteForm.addEventListener('submit', async event => {
  event.preventDefault(); const current = generation; saveNote.disabled = true; cancelNote.disabled = true;
  try {
    resetRestorePreview();
    await notesRequest(editingId ? `/api/notes/${encodeURIComponent(editingId)}` : '/api/notes',
      editingId ? 'PUT' : 'POST', { title: noteTitle.value, body: noteBody.value });
    if (current !== generation) return;
    noteMessage.textContent = editingId ? '수정했습니다.' : '추가했습니다.';
    resetEditor(); await loadNotes(currentSession);
  } catch (error) { if (current === generation) noteMessage.textContent = error.message; }
  finally { saveNote.disabled = false; cancelNote.disabled = false; }
});
cancelNote.addEventListener('click', resetEditor);
function render(session) {
  const changedUser = currentSession?.user?.id !== session?.user?.id;
  currentSession = session;
  currentDeviceApproved = false;
  protectedVault.hidden = true;
  const signedIn = Boolean(session?.user);
  recoveryPanel.hidden = true;
  if (!signedIn || changedUser) resetRecoveryPanel();
  status.textContent = signedIn ? `로그인됨: ${session.user.email ?? '사용자'}` : '로그아웃 상태';
  form.hidden = signedIn; logout.hidden = !signedIn; editor.hidden = true; password.value = '';
  deviceRequest.disabled = !signedIn; deviceRefresh.disabled = !signedIn;
  if (!signedIn || changedUser) { resetEditor(); noteMessage.textContent = ''; }
  ++generation; list.replaceChildren();
  deviceStatus.textContent = signedIn ? '기기 승인: 서버에 확인 중입니다.' : '기기 승인: 로그인 후 서버에 확인합니다. 승인 전에는 보호 자료가 없습니다.';
  if (signedIn) void checkDevice('status');
}
async function checkDevice(action) {
  const owner = currentSession?.user?.id;
  if (!owner) return;
  // Clear old contents synchronously, including when a later recheck fails.
  const current = ++generation;
  currentDeviceApproved = false; protectedVault.hidden = true;
  editor.hidden = true; recoveryPanel.hidden = true;
  list.replaceChildren(); resetEditor(); resetRecoveryPanel(); noteMessage.textContent = '';
  deviceRequest.disabled = true; deviceRefresh.disabled = true;
  deviceStatus.textContent = action === 'request' ? '기기 승인 요청을 서버에 보내는 중입니다.' : '서버의 기기 승인 결과를 확인하는 중입니다.';
  try {
    if (!navigator.onLine) throw new Error('오프라인에서는 기기 승인을 확인할 수 없습니다.');
    const response = await fetch(`/api/device/${action}`, {
      method: action === 'request' ? 'POST' : 'GET',
      cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (current !== generation || currentSession?.user?.id !== owner) return;
    if (!response.ok) throw new Error('서버에서 기기 승인을 확인하지 못했습니다. 보호 자료는 닫혀 있습니다.');
    // Installation and request events never set this value. Only server status does.
    currentDeviceApproved = response.status === 200 && result.approved === true && result.state === 'approved';
    protectedVault.hidden = !currentDeviceApproved;
    editor.hidden = !currentDeviceApproved; recoveryPanel.hidden = !currentDeviceApproved;
    deviceStatus.textContent = currentDeviceApproved
      ? '기기 승인: 서버가 이 로그인 사용자와 기기의 등록 승인을 확인했습니다.'
      : result.state === 'pending'
        ? `기기 승인: 요청 대기 중입니다. 요청 번호 ${result.requestId ?? '-'} · 승인 전에는 보호 자료를 표시하지 않습니다.`
        : '기기 승인: 등록되지 않았습니다. 승인을 요청한 후 서버 결과를 다시 확인해 주세요.';
    if (currentDeviceApproved) await loadNotes(currentSession);
  } catch (error) {
    if (current === generation) deviceStatus.textContent = error.message;
  } finally {
    if (currentSession?.user?.id === owner) { deviceRequest.disabled = false; deviceRefresh.disabled = false; }
  }
}
deviceRequest.addEventListener('click', () => void checkDevice('request'));
deviceRefresh.addEventListener('click', () => void checkDevice('status'));
window.addEventListener('offline', () => {
  currentDeviceApproved = false; ++generation; protectedVault.hidden = true;
  list.replaceChildren(); resetEditor(); resetRecoveryPanel();
  deviceStatus.textContent = '오프라인입니다. 보호 자료를 닫았습니다. 연결 후 서버 승인 결과를 다시 확인해 주세요.';
});
function reason(error) {
  const reasons = {
    invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    email_not_confirmed: '이메일 인증을 먼저 완료해 주세요.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    user_banned: '사용이 제한된 계정입니다.',
  };
  return reasons[error?.code] ?? error?.message ?? '연결을 확인한 뒤 다시 시도해 주세요.';
}
let refreshPending;
async function authRequest(action, body) {
  const response = await fetch(`/api/auth/${action}`, {
    method: action === 'session' ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (action === 'session' && response.status === 401) return { user: null };
  if (!response.ok) throw { code: data.error };
  return data;
}
try { render(await authRequest('session')); login.disabled = false; }
catch { status.textContent = '로그인 서버에 연결하지 못했습니다.'; login.disabled = false; }
form.addEventListener('submit', async event => {
  event.preventDefault(); login.disabled = true; message.textContent = '';
  try {
    render(await authRequest('login', { email: document.querySelector('#email').value.trim(), password: password.value }));
    message.textContent = '로그인했습니다.';
  } catch (error) { message.textContent = `로그인 실패: ${reason(error)}`; }
  finally { password.value = ''; login.disabled = false; }
});
logout.addEventListener('click', async () => {
  logout.disabled = true; message.textContent = '';
  try { await authRequest('logout'); render(null); message.textContent = '로그아웃했습니다.'; }
  catch (error) { render(null); message.textContent = `로그아웃 처리 확인 필요: ${reason(error)}`; }
  finally { logout.disabled = false; }
});
