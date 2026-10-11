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
async function loadNotes(session) {
  const current = ++generation;
  list.replaceChildren();
  if (!session?.access_token) { list.textContent = '로그인하면 메모를 표시합니다.'; return; }
  list.textContent = '메모를 불러오는 중입니다.';
  try {
    const response = await fetch('/api/notes', {
      cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (current !== generation) return;
    if (response.status === 401) throw new Error('로그인을 다시 확인해 주세요.');
    if (!response.ok) throw new Error('메모를 불러올 수 없습니다.');
    const data = await response.json();
    if (current !== generation) return;
    if (!Array.isArray(data.notes)) throw new Error('자료 형식이 맞지 않습니다.');
    const items = data.notes.map(note => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const content = document.createElement('span');
      title.textContent = note.title; content.textContent = note.content;
      item.append(title, content); return item;
    });
    list.replaceChildren(...items);
    if (!items.length) list.textContent = '저장된 메모가 없습니다.';
  } catch (error) {
    if (current === generation) list.textContent = error.message;
  }
}
function render(session) {
  const signedIn = Boolean(session?.user);
  status.textContent = signedIn ? `로그인됨: ${session.user.email ?? '사용자'}` : '로그아웃 상태';
  form.hidden = signedIn;
  logout.hidden = !signedIn;
  password.value = '';
  void loadNotes(session);
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
