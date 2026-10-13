const installation = document.querySelector('#installation-status');
const connection = document.querySelector('#connection-status');
const install = document.querySelector('#install-app');
let installPrompt = null;
function showInstallation() {
  const installed = matchMedia('(display-mode: standalone)').matches;
  installation.textContent = `${installed ? '설치된 앱 화면' : '웹 화면'}으로 접속 중입니다. 앱 설치는 기기 승인이 아닙니다.`;
}
function showConnection() {
  connection.textContent = navigator.onLine
    ? '온라인 상태입니다. 기기 승인 여부는 별도로 서버가 확인해야 합니다.'
    : '오프라인입니다. 보호 자료를 읽거나 수정할 수 없습니다. 연결 후 서버 확인을 다시 받아 주세요.';
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; install.hidden = false;
});
install.addEventListener('click', async () => {
  const prompt = installPrompt;
  if (!prompt) return;
  installPrompt = null; install.hidden = true;
  await prompt.prompt();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null; install.hidden = true; showInstallation();
});
window.addEventListener('online', showConnection);
window.addEventListener('offline', showConnection);
showInstallation(); showConnection();
// No private API responses, credentials, or notes are put into a cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {
    connection.textContent = '오프라인 안내를 준비하지 못했습니다. 온라인에서 다시 시도해 주세요.';
  });
}
