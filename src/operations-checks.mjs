import { randomUUID } from 'node:crypto';
import { RULE_IDS } from './decider.mjs';

const pending = (id, stage, kind, expected, reason) => ({
  id, stage, kind, expected, outcome: 'not_run', source: 'not_run',
  method: null, path: null, httpStatus: null, requestId: null,
  requestIdSource: null, checkedAt: null, actual: reason,
});
export function checkCounts(checks) {
  const counts = { total: checks.length, passed: 0, failed: 0, notRun: 0, unavailable: 0, allowed: 0, denied: 0 };
  for (const check of checks) {
    if (check.outcome === 'not_run') counts.notRun++;
    else if (check.outcome === 'unavailable') counts.unavailable++;
    else if (check.outcome === 'passed') {
      counts.passed++;
      if (check.kind === 'normal') counts.allowed++;
      if (check.kind === 'forbidden') counts.denied++;
    } else counts.failed++;
  }
  return counts;
}
export async function runOperationsChecks({ config, fetcher = fetch, verifiedAuthorization, approvedDevice = false, expectedCommit } = {}) {
  const app = new URL(config.publicAppUrl);
  if (app.protocol !== 'https:' || !app.hostname.endsWith('.vercel.app') || app.pathname !== '/'
      || app.username || app.password || app.port || app.search || app.hash) throw new Error('INVALID_CHECK_TARGET');
  const checks = [];
  async function probe(id, stage, kind, path, expectedStatus, authorization, inspect) {
    const check = { id, stage, kind, method: 'GET', path, source: 'production_http',
      expected: `HTTP ${expectedStatus}`, requestId: randomUUID(), requestIdSource: 'check_runner',
      checkedAt: null, httpStatus: null, outcome: 'unavailable', actual: 'HTTP 미확인' };
    try {
      const response = await fetcher(new URL(path, app), { method: 'GET', redirect: 'error',
        signal: AbortSignal.timeout(10000), cache: 'no-store',
        headers: authorization ? { Authorization: authorization } : {} });
      check.httpStatus = response.status;
      const serverId = response.headers.get('x-aleph-request-id') || response.headers.get('x-vercel-id');
      if (serverId && /^[A-Za-z0-9:._-]{1,180}$/.test(serverId)) {
        check.requestId = serverId; check.requestIdSource = 'server_response_header';
      }
      // Bodies are used only for structural validation and then discarded.
      let shape = true;
      if (inspect) { let body = null; try { body = await response.json(); } catch {} shape = inspect(body); }
      else await response.body?.cancel();
      check.outcome = response.status === expectedStatus && shape ? 'passed' : 'failed';
      check.actual = `HTTP ${response.status}; 응답 구조 ${shape ? '일치' : '불일치'}`;
    } catch { check.actual = '연결 실패 또는 시간 초과; 결과를 추정하지 않음'; }
    check.checkedAt = new Date().toISOString(); checks.push(check);
  }
  // Independent read-only probes. No writes, restoration or revocations here.
  await probe('normal_deployment_identity', 1, 'normal', '/aleph.json', 200, null,
    data => typeof data?.commit === 'string' && /^[a-f0-9]{40}$/.test(data.commit)
      && (!expectedCommit || data.commit === expectedCommit));
  await probe('public_notes_removed', 2, 'forbidden', '/data.json', 404);
  await probe('anonymous_note_list', 3, 'forbidden', '/api/notes', 401);
  await probe('invalid_token_note_list', 3, 'forbidden', '/api/notes', 401, 'Bearer invalid');
  await probe('anonymous_note_detail', 4, 'forbidden', '/api/notes/00000000-0000-4000-8000-000000000123', 401);
  await probe('anonymous_restore', 10, 'forbidden', '/api/restore/00000000-0000-4000-8000-000000000123', 401);
  await probe('normal_manifest', 11, 'normal', '/manifest.webmanifest', 200, null,
    data => typeof data?.name === 'string' && data.start_url === '/' && Array.isArray(data.icons));
  await probe('anonymous_device_status', 11, 'forbidden', '/api/device/status', 401, null,
    data => data?.approved === false);
  if (verifiedAuthorization && approvedDevice) {
    await probe('normal_owner_note_list', 4, 'normal', '/api/notes', 200, verifiedAuthorization, Array.isArray);
    await probe('invalid_resource_route', 8, 'forbidden', '/api/notes/export', 400, verifiedAuthorization);
  } else {
    checks.push(pending('normal_owner_note_list', 4, 'normal', '승인된 사용자 자신의 메모 목록 HTTP 200', '검증된 로그인·기기 승인 없음; 보호 자료 요청을 보내지 않음'));
    checks.push(pending('invalid_resource_route', 8, 'forbidden', '정상 인증 뒤 미등록 메모 경로 HTTP 400', '정상 인증·승인된 기기 컨텍스트 없음'));
  }
  for (const row of [
    ['cross_owner_note',4,'forbidden','타인 메모 GET·수정·삭제 404','독립된 A/B 사용자 세션 없음'],
    ['original_api_denied',5,'forbidden','원본 API 직접 접근 거부','실제 직접 API 권한 시험은 별도 수행'],
    ['unregistered_engine_device',6,'forbidden','미등록 기기의 엔진 접근 거부','제공 엔진의 실제 기기 요청 미실행'],
    ['normal_registered_engine_device',6,'normal','등록된 기기의 엔진 요청 허용','제공 엔진의 실제 정상 기기 요청 미실행'],
    ['step_up_and_relogin',7,'normal','추가 확인 전 거부·검증 후 허용','엔진의 실제 추가 인증 흐름 미실행'],
    ['revoked_identity_retry',9,'forbidden','회수된 신원 재접속 거부','실제 엔진 회수·재요청 미실행'],
    ['restore_then_replay',10,'normal','지정 한 건 복원 후 정상·금지 요청 재시험','이 점검은 읽기 전용; DB 변경·복원 요청을 보내지 않음'],
    ['unsigned_app_mutation',11,'forbidden','앱 서명 없는 변경 요청 거부','실제 서명·변경 요청은 공식 심판 시험과 구분'],
  ]) checks.push(pending(...row));
  return { schema: 'aleph.operations.v1', runId: randomUUID(), checkedAt: new Date().toISOString(),
    target: app.origin, rules: [...RULE_IDS], checks, counts: checkCounts(checks),
    officialSuite: { total: 41, executed: 0, passed: 0, notRun: 41, source: 'not_run',
      reason: '이번 제출 커밋의 공식 41종 총공세 원본 영수증이 연결되지 않음; 개별 단계 통과를 전체 시험으로 합산하지 않음' } };
}
