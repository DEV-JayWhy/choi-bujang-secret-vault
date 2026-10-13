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
  if (![3, 4, 5, 6, 7, 8].includes(config.step)) throw new Error('현재 자기 점검은 1·3·4·5·6·7·8단계에만 구현되어 있습니다.');
  const app = new URL(config.publicAppUrl);
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash || app.pathname !== '/') {
    throw new Error('실제 배포 주소를 확인해 주세요.');
  }
  const missingId = '00000000-0000-4000-8000-000000000123';
  const cases = [
    ['anonymous_note_list', 'GET', '/api/notes'],
    ['anonymous_note_create', 'POST', '/api/notes'],
    ['anonymous_note_read', 'GET', `/api/notes/${missingId}`],
    ['anonymous_note_update', 'PUT', `/api/notes/${missingId}`],
    ['anonymous_note_delete', 'DELETE', `/api/notes/${missingId}`],
    ['invalid_token_note_list', 'GET', '/api/notes', true],
    ['public_static_notes_removed', 'GET', '/data.json'],
  ];
  const results = await Promise.all(cases.map(async ([attackId, method, path, invalidToken]) => {
    const expected = attackId === 'public_static_notes_removed'
      ? '현재 공개 data.json은 HTTP 404이며 메모를 반환하지 않음'
      : '인증 없는 요청 또는 잘못된 토큰은 HTTP 401이며 메모를 반환하지 않음';
    try {
      const response = await fetch(new URL(path, app), {
        method, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { ...(['POST', 'PUT'].includes(method) ? { 'Content-Type': 'application/json' } : {}),
          ...(invalidToken ? { Authorization: 'Bearer invalid' } : {}) },
        ...(['POST', 'PUT'].includes(method) ? { body: JSON.stringify({ title: 'self-check', body: '' }) } : {}),
      });
      const text = await response.text();
      let hasNotes = false;
      try {
        const data = JSON.parse(text);
        hasNotes = Array.isArray(data) || (data && typeof data === 'object'
          && ['notes', 'title', 'body', 'content'].some(key => Object.hasOwn(data, key)));
      } catch { hasNotes = /실습용 가상 (과제|포트폴리오|리추얼|행정) 기록/u.test(text); }
      const target = attackId === 'public_static_notes_removed' ? 404 : 401;
      return { attackId, expected, observed: `HTTP ${response.status}; 메모 자료 ${hasNotes ? '감지됨' : '감지되지 않음'}; 기대 조건 ${response.status === target && !hasNotes ? '일치' : '불일치'}` };
    } catch {
      return { attackId, expected, observed: '요청 실패 또는 시간 초과: HTTP 상태·자료 반환 여부 미확인' };
    }
  }));
  if ([4, 5, 6, 7, 8].includes(config.step)) results.push(
    { attackId: 'cross_owner_note_access', expected: '타인 메모 GET·PUT·DELETE는 자료 없이 404', observed: '미실행: 이 환경에서 실제 A/B 로그인 세션으로 재검증하지 않음; 사용자 B→A 404 보고와 구분' },
    { attackId: 'owner_change_rejected', expected: 'POST·PUT 본문 owner_id 변경 시도는 400으로 거부', observed: '미실행: 실제 배포의 인증된 소유자 변경 요청은 재검증하지 않음' },
    { attackId: 'database_rls_privileges', expected: config.step >= 5 ? '기존 소유자 RLS 유지, anon·authenticated 직접 권한 없음, service_role CRUD 유지' : '소유자 RLS 4개, anon 권한 없음, authenticated CRUD만 허용, service_role 유지', observed: '미실행: DB 관리자 연결 없이 독립 조회하지 않음; 사용자 적용·검증 보고와 구분' }
  );
  if (config.step === 8) results.push(
    { attackId: 'stage8_decider_path_policy', expected: '판정기에서 알 수 없는 서비스·메서드·경로 거부', observed: '미구현: 공식 경로 매핑과 경로 거부용 allowedReasonCodes 미확인; 기존 6·7단계 규칙 보존' },
    { attackId: 'instructor_notice_authorization', expected: '검증된 강사만 실제 강사 공지를 수정', observed: '미실행: 실제 공지 API·DB와 검증된 강사 권한 근거 없음; 공지 API를 신설하거나 권한을 부여하지 않음' }
  );
  return results;
}
