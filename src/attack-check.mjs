// Stage 10 final checkpoint: production HTTP checks include the dynamic recovery login gate.
import { detect } from './detect.mjs';
// Operator sample uses fetch-only metadata for sandbox evidence correlation.
// This is not an HTTP header, URL parameter, identity, or access credential.
const evidence = (config, caseId, requestKey = 'read') => config.step >= 12
  ? { alephEvidence: { caseId, requestKey } } : {};

// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
async function runFirstStageChecks(config) {
  if (config.step !== 1) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');
  const response = await fetch(new URL('/data.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let visible = false;
  if (response.ok) {
    try {
      const data = await response.json();
      visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
        && data.notes.length > 0;
    } catch {
      // A non-JSON response is a failed check, not a successful deployment.
    }
  }
  return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
    observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})` }];
}


export async function runAttackChecks(config) {
  if (config.step === 1) return runFirstStageChecks(config);
  if (![3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(config.step)) throw new Error('현재 자기 점검은 1·3·4·5·6·7·8·9·10·11·12단계에만 구현되어 있습니다.');
  const app = new URL(config.publicAppUrl);
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash || app.pathname !== '/') {
    throw new Error('실제 배포 주소를 확인해 주세요.');
  }
  const missingId = '00000000-0000-4000-8000-000000000123';
  const httpObserved = new Set();
  const cases = [
    ['anonymous_note_list', 'GET', '/api/notes'],
    ['anonymous_note_create', 'POST', '/api/notes'],
    ['anonymous_note_read', 'GET', `/api/notes/${missingId}`],
    ['anonymous_note_update', 'PUT', `/api/notes/${missingId}`],
    ['anonymous_note_delete', 'DELETE', `/api/notes/${missingId}`],
    ['invalid_token_note_list', 'GET', '/api/notes', true],
    ['public_static_notes_removed', 'GET', '/data.json'],
    ...(config.step >= 10 ? [['restore_route_requires_login', 'GET', '/api/restore/00000000-0000-4000-8000-000000000123']] : []),
  ];
  const results = await Promise.all(cases.map(async ([attackId, method, path, invalidToken]) => {
    const expected = attackId === 'public_static_notes_removed'
      ? '현재 공개 data.json은 HTTP 404이며 메모를 반환하지 않음'
      : '인증 없는 요청 또는 잘못된 토큰은 HTTP 401이며 메모를 반환하지 않음';
    if (config.step >= 8 && method !== 'GET') {
      return { attackId, expected, observed: '미실행: 8단계 이후 Production 점검은 읽기 전용; 실제 서비스 변경 위험이 있는 쓰기 요청은 전송하지 않음' };
    }
    try {
      const response = await fetch(new URL(path, app), {
        method, redirect: 'error', signal: AbortSignal.timeout(10000),
        ...evidence(config, attackId),
        headers: { ...(['POST', 'PUT'].includes(method) ? { 'Content-Type': 'application/json' } : {}),
          ...(invalidToken ? { Authorization: 'Bearer invalid' } : {}) },
        ...(['POST', 'PUT'].includes(method) ? { body: JSON.stringify({ title: 'self-check', body: '' }) } : {}),
      });
      const text = await response.text();
      httpObserved.add(attackId);
      let hasNotes = false;
      try {
        const data = JSON.parse(text);
        hasNotes = Array.isArray(data) || (data && typeof data === 'object'
          && ['notes', 'title', 'body', 'content'].some(key => Object.hasOwn(data, key)));
      } catch { hasNotes = /실습용 가상 (과제|포트폴리오|리추얼|행정) 기록/u.test(text); }
      const target = attackId === 'public_static_notes_removed' ? 404 : 401;
      if (attackId === 'restore_route_requires_login') {
        // A second read-only probe validates Production has *working* server
        // configuration, rather than a missing SUPABASE_SECRET_KEY that returns
        // 401 for anonymous requests before it checks its environment.
        let signedStatus = null, gate = 'request_failed';
        try {
          const signedProbe = await fetch(new URL(path, app), {
            method: 'GET', redirect: 'error',
            signal: AbortSignal.timeout(10000),
            ...evidence(config, attackId, 'auth_probe'),
            headers: { Authorization: 'Bearer invalid' },
          });
          signedStatus = signedProbe.status;
          gate = signedProbe.headers.get('X-Aleph-Recovery-Checkpoint') ?? 'missing';
          await signedProbe.body?.cancel();
        } catch {}
        const healthy = response.status === 401 && signedStatus === 401
          && gate === 'auth_rejected';
        return { attackId, expected: '비인증·위조 토큰은 401, 실제 서버 비밀 설정 확인 후 인증 단계에서 거부',
          observed: `익명 HTTP ${response.status}; 위조 토큰 HTTP ${signedStatus ?? '미확인'}; 서버 단계 ${gate}; ${healthy ? '설정·인증 게이트 정상' : '설정·인증 게이트 확인 필요'}` };
      }
      return { attackId, expected, observed: `HTTP ${response.status}; 메모 자료 ${hasNotes ? '감지됨' : '감지되지 않음'}; 기대 조건 ${response.status === target && !hasNotes ? '일치' : '불일치'}` };
    } catch {
      return { attackId, expected, observed: '요청 실패 또는 시간 초과: HTTP 상태·자료 반환 여부 미확인' };
    }
  }));
  if ([4, 5, 6, 7, 8, 9, 10, 11, 12].includes(config.step)) results.push(
    { attackId: 'cross_owner_note_access', expected: '타인 메모 GET·PUT·DELETE는 자료 없이 404', observed: '미실행: 이 환경에서 실제 A/B 로그인 세션으로 재검증하지 않음; 사용자 B→A 404 보고와 구분' },
    { attackId: 'owner_change_rejected', expected: 'POST·PUT 본문 owner_id 변경 시도는 400으로 거부', observed: '미실행: 실제 배포의 인증된 소유자 변경 요청은 재검증하지 않음' },
    { attackId: 'database_rls_privileges', expected: config.step >= 5 ? '기존 소유자 RLS 유지, anon·authenticated 직접 권한 없음, service_role CRUD 유지' : '소유자 RLS 4개, anon 권한 없음, authenticated CRUD만 허용, service_role 유지', observed: '미실행: DB 관리자 연결 없이 독립 조회하지 않음; 사용자 적용·검증 보고와 구분' }
  );
  if (config.step >= 8) results.push(
    { attackId: 'stage8_decider_path_policy', expected: '판정기에서 알 수 없는 서비스·메서드·경로 거부', observed: '미검증: 정확한 자원 경로에 대한 판정기 로컬 구현; 운영 엔진 구역 연결과 실제 소유권은 심판 확인 대상' },
    { attackId: 'instructor_notice_authorization', expected: '검증된 강사만 실제 강사 공지를 수정', observed: '미실행: 실제 공지 API·DB와 검증된 강사 권한 근거 없음; 공지 API를 신설하거나 권한을 부여하지 않음' }
  );
  if (config.step >= 9) {
    // Read-only local fixture checks. Never send synthetic users or tokens to
    // Production, and never describe a proposal as an actual session revocation.
    const start = Date.UTC(2026, 9, 1, 0, 0, 0);
    const reads = count => Array.from({ length: count }, (_, i) => ({
      at: new Date(start + i * 2000).toISOString(),
      method: 'GET', identity: { sub: 'synthetic_learner' },
    }));
    const normal = detect(reads(120));
    const burst = detect(reads(121));
    results.push(
      {
        attackId: 'stage9_normal_detection',
        expected: '로컬 정상 120건에는 회수 제안 없음',
        observed: `로컬 가상 점검: 120건 결과 ${normal.action}; 기대 조건 ${normal.action === 'observe' ? '일치' : '불일치'}`,
      },
      {
        attackId: 'stage9_burst_detection',
        expected: '동일 가명 주체 10분 내 GET 121건이면 burst_read 회수 제안',
        observed: `로컬 가상 점검: 121건 결과 ${burst.action}; 이유 ${burst.reasonCode ?? '없음'}; 기대 조건 ${burst.action === 'propose_revocation' && burst.reasonCode === 'burst_read' && burst.subject === 'synthetic_learner' ? '일치' : '불일치'}`,
      },
      {
        attackId: 'stage9_revoked_identity_retry',
        expected: '회수된 신원의 다음 요청 거부 (실제 회수는 심판 담당)',
        observed: '미실행: 로컬 detect는 제안만 생성하며 실제 신원 회수와 이후 API 재시도는 심판 담당',
      },
      {
        attackId: 'stage9_stolen_session_retry',
        expected: '회수 이후 기존 세션 재접속 거부 (실제 회수는 심판 담당)',
        observed: '미실행: 심판의 세션 회수 집행과 탈취 세션 재시도 관측 불가',
      },
      {
        attackId: 'stage9_cross_resource_retry',
        expected: '회수된 주체의 다른 구역 이동 요청 거부 (실제 회수는 심판 담당)',
        observed: '미실행: 심판의 회수 후 다른 자원 접근 재시험 관측 불가',
      },
    );
  }
  if (config.step >= 10) {
    // No destructive or signed-user calls in the unauthenticated production
    // smoke check: these need an actual judge B run and immutable baseline.
    results.push(
      {
        attackId: 'stage10_backup_revalidation',
        expected: '기존 사고 전 복구 기준과 현재 메모/정책 백업의 해시 재검증',
        observed: '미실행: bundle 실행기에는 서비스 키와 실제 B 복구 권한이 없음; 별도 DB 관리자 읽기 검증 결과와 혼동 금지',
      },
      {
        attackId: 'stage10_restoration_full_replay',
        expected: 'B 한 건만 복원한 뒤 1~9단계 정상/금지 공격을 실제 재검증',
        observed: '미실행: 실제 B 메모 변조/삭제·복원·심판 재전송은 수행하지 않음; DB 가상 트랜잭션 시험과 CI 회귀는 별도',
      },
    );
  }
  if (config.step >= 11) {
    // Keep the 20-item submission limit; replace redundant historical unrun
    // entries with current stage read-only probes. Never claim approval here.
    for (const id of ['database_rls_privileges', 'stage9_stolen_session_retry', 'stage9_cross_resource_retry']) {
      const index = results.findIndex(item => item.attackId === id);
      if (index >= 0) results.splice(index, 1);
    }
    for (const [attackId, path, expected] of [
      ['stage11_manifest', '/manifest.webmanifest', '앱 이름·아이콘·시작 주소가 있는 manifest HTTP 200'],
      ['stage11_unapproved_device', '/api/device/status', '로그인 없는 기기 조회는 401, approved는 true가 아님'],
    ]) {
      try {
        const response = await fetch(new URL(path, app), { redirect: 'error', signal: AbortSignal.timeout(10000), ...evidence(config, attackId) });
        httpObserved.add(attackId);
        let body; try { body = await response.json(); } catch { body = null; }
        const valid = attackId === 'stage11_manifest'
          ? response.status === 200 && typeof body?.name === 'string' && body.start_url === '/' && Array.isArray(body.icons)
          : response.status === 401 && body?.approved === false;
        results.push({ attackId, expected, observed: `HTTP ${response.status}; 기대 조건 ${valid ? '일치' : '불일치'}` });
      } catch { results.push({ attackId, expected, observed: '미확인: HTTP 요청 실패 또는 시간 초과' }); }
    }
    results.push({ attackId: 'stage11_approved_browser', expected: '서버가 승인한 기기에서 기존 자료실 조회·수정·복원 정상', observed: '미실행: 실제 승인 완료 사용자 브라우저의 자료실 실행은 별도 검증 필요; 로컬 승인 응답 모의 시험과 구분' });
  }
  if (config.step >= 12) {
    const index = results.findIndex(item => item.attackId === 'stage9_revoked_identity_retry');
    if (index >= 0) results.splice(index, 1);
    const attackId = 'stage12_server_operations';
    const expected = '현재 커밋의 HTTP 200 작전실 기록, 실제 API 결과·미실행 구분, 공식 41종을 임의 통과 처리하지 않음';
    try {
      const response = await fetch(new URL('/api/checks', app), { redirect: 'error', signal: AbortSignal.timeout(120000), ...evidence(config, attackId) });
      const report = await response.json();
      httpObserved.add(attackId);
      const counts = report?.counts;
      const match = response.status === 200 && report.schema === 'aleph.operations.v1'
        && (!config.checkedCommit || report.commit === config.checkedCommit)
        && report.serverRecord?.status === 'stored' && Array.isArray(report.checks)
        && report.officialSuite?.executed === 0 && report.officialSuite?.notRun === 41;
      results.push({ attackId, expected, observed: `HTTP ${response.status}; 정상 허용 ${counts?.allowed ?? '미확인'}; 금지 거부 ${counts?.denied ?? '미확인'}; 미실행 ${counts?.notRun ?? '미확인'}; 기대 조건 ${match ? '일치' : '불일치'}` });
    } catch { results.push({ attackId, expected, observed: '미확인: 작전실 HTTP 조회 실패; 공식 총공세를 실행했다고 기록하지 않음' }); }
  }
  if (config.step >= 12) {
    // Local fixtures and skipped requests are not HTTP evidence. Preserve their
    // separate test commands; the current submission uses the exact sentinel.
    for (const item of results) if (!httpObserved.has(item.attackId)
        || !/^(?:HTTP|익명 HTTP) /.test(item.observed)) item.observed = 'not_run';
  }
  return results;
}
