import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './auth-config.js';
const status = document.querySelector('#auth-status');
const message = document.querySelector('#auth-message');
const form = document.querySelector('#login-form');
const login = document.querySelector('#login-button');
const logout = document.querySelector('#logout-button');
const password = document.querySelector('#password');
let client;
const list = document.querySelector('#notes');
let generation = 0;
let currentSession = null;
let editingId = null;
const editor = document.querySelector('#note-editor');
const noteForm = document.querySelector('#note-form');
const noteTitle = document.querySelector('#note-title');
const noteBody = document.querySelector('#note-body');
const noteMessage = document.querySelector('#note-message');
const saveNote = document.querySelector('#save-note');
const cancelNote = document.querySelector('#cancel-note');
function resetEditor() {
  editingId = null; noteForm.reset(); saveNote.textContent = '추가';
  document.querySelector('#editor-heading').textContent = '메모 추가'; cancelNote.hidden = true;
}
async function notesRequest(path, method = 'GET', body) {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('로그인이 필요합니다.');
  const response = await fetch(path, {
    method, cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) throw new Error('로그인을 다시 확인해 주세요.');
  if (response.status === 404) throw new Error('메모가 없거나 삭제되었습니다.');
  if (response.status === 409) throw new Error('같은 ID의 메모가 이미 있습니다.');
  if (!response.ok) throw new Error('메모 요청을 처리하지 못했습니다.');
  return response.json();
}
async function loadNotes(session) {
  const current = ++generation;
  list.replaceChildren();
  if (!session?.access_token) { list.textContent = '로그인하면 메모를 표시합니다.'; return; }
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
  const signedIn = Boolean(session?.user);
  status.textContent = signedIn ? `로그인됨: ${session.user.email ?? '사용자'}` : '로그아웃 상태';
  form.hidden = signedIn; logout.hidden = !signedIn; editor.hidden = !signedIn; password.value = '';
  if (!signedIn || changedUser) { resetEditor(); noteMessage.textContent = ''; }
  ++generation; list.replaceChildren();
  if (!signedIn) list.textContent = '로그인하면 메모를 표시합니다.';
  setTimeout(() => { if (currentSession === session) void loadNotes(session); }, 0);
}
function reason(error) {
  const reasons = {
    invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    email_not_confirmed: '이메일 인증을 먼저 완료해 주세요.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    user_banned: '사용이 제한된 계정입니다.',
  };
  return reasons[error?.code] ?? error?.message ?? '연결을 확인한 뒤 다시 시도해 주세요.';
}
try {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('auth-config.js에 Project URL과 공개 publishable key를 입력해 주세요.');
  if (!window.supabase?.createClient) throw new Error('로그인 SDK를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  client.auth.onAuthStateChange((_event, session) => render(session));
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  render(data.session);
  login.disabled = false;
} catch (error) {
  status.textContent = '로그인 설정을 확인해 주세요.';
  message.textContent = reason(error);
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) return;
  login.disabled = true;
  message.textContent = '';
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: document.querySelector('#email').value.trim(), password: password.value,
    });
    if (error) { message.textContent = `로그인 실패: ${reason(error)}`; return; }
    render(data.session);
    message.textContent = '로그인했습니다.';
  } catch (error) { message.textContent = `로그인 실패: ${reason(error)}`; }
  finally { password.value = ''; login.disabled = false; }
});
logout.addEventListener('click', async () => {
  logout.disabled = true;
  message.textContent = '';
  try {
    const { error } = await client.auth.signOut();
    if (error) { message.textContent = `로그아웃 실패: ${reason(error)}`; return; }
    render(null);
    message.textContent = '로그아웃했습니다.';
  } catch (error) { message.textContent = `로그아웃 실패: ${reason(error)}`; }
  finally { logout.disabled = false; }
});
