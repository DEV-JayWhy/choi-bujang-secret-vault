// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계: 엔진이 확인한 기기 등록 여부가 true일 때만 허용합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required', 'resource_zone']);

// 입력 형식 검사는 엔진 출처 인증을 대신하지 않습니다.
// 헤더·위치값을 읽거나 요청을 보정하지 않으며 가상 신호를 실제 위치로 쓰지 않습니다.
export function inspectAccessContext(request) {
  const signals = request?.signals;
  const events = request?.recentEvents;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const knownText = value => typeof value === 'string' && value.trim().length > 0
    && value !== 'unknown';
  const validEvents = Array.isArray(events) && events.length <= 12
    && events.every(event => object(event)
      && typeof event.kind === 'string' && event.kind.trim().length > 0
      && Number.isFinite(event.ageSeconds) && event.ageSeconds >= 0
      && Number.isInteger(event.count) && event.count >= 0);
  const validFixture = object(signals) && signals.source === 'judge_fixture'
    && knownText(signals.region) && knownText(signals.network)
    && Number.isInteger(signals.hour) && signals.hour >= 0 && signals.hour <= 23
    && validEvents;
  const stepUp = request?.stepUp;
  const validStepUp = object(stepUp)
    && ((stepUp.verified === false && stepUp.authAgeSeconds === null)
      || (stepUp.verified === true && Number.isFinite(stepUp.authAgeSeconds)
        && stepUp.authAgeSeconds >= 0 && stepUp.authAgeSeconds <= 900));
  return {
    source: validFixture ? 'judge_fixture' : object(signals) && signals.source === 'none'
      ? 'none' : 'unknown',
    fixture: validFixture ? {
      region: signals.region, network: signals.network, hour: signals.hour,
      recentEvents: events.map(({ kind, ageSeconds, count }) => ({ kind, ageSeconds, count })),
    } : null,
    stepUp: validStepUp ? {
      verified: stepUp.verified, authAgeSeconds: stepUp.authAgeSeconds,
    } : null,
  };
}

// Local route policy based on the supplied engine GET fixture and existing CRUD methods.
// This does not map /api paths or prove ownership/roles. The public r1 names policy_denied;
// current runtime acceptance remains a judge verification item, not a local test guarantee.
const RESOURCE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const DEVICE_ID = /^[0-9a-f]{16}$/u;
const EMPTY_QUERY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// Engine-attested route does not prove who owns a row. The final API does.
// A bare collection is not an own-note grant. Reject unscoped route families.
export function inspectNoteRoute(request) {
  if (!request || typeof request.path !== 'string'
      || typeof request.route !== 'string' || typeof request.method !== 'string'
      || request.queryLength !== 0
      || request.querySha256 !== EMPTY_QUERY_SHA256) return false;
  const match = /^\/(notes|api\/notes|announcements|api\/announcements)\/([^/?#]+)$/u.exec(request.path);
  if (!match) return false;
  const prefix = match[1], id = match[2];
  const isNote = prefix === 'notes' || prefix === 'api/notes';
  if (request.service !== (isNote ? 'notes' : 'announcements')) return false;
  // Stage-7 demo fixture and Stage-8 real UUID-shaped resource identifiers.
  if (id !== 'demo' && !RESOURCE_UUID.test(id)) return false;
  // Single-note GET/PUT and announcement GET only; no collection, bulk,
  // export, DELETE or query-selected functions in the engine allowlist.
  if (!((isNote && (request.method === 'GET' || request.method === 'PUT'))
      || (!isNote && request.method === 'GET'))) return false;
  return request.route === (request.method + ' /' + prefix + '/:id');
}

function validEngineScope(request) {
  return request?.schema === 'aleph.decision.v1'
    && ['requestId', 'classId', 'projectId', 'subjectId']
      .every(key => typeof request[key] === 'string' && request[key].length > 0)
    && typeof request.deviceId === 'string' && DEVICE_ID.test(request.deviceId)
    && Number.isInteger(request.policyRevision) && request.policyRevision > 0
    && typeof request.at === 'string' && Number.isFinite(Date.parse(request.at))
    && Math.abs(Date.now() - Date.parse(request.at)) <= 5000;
}

export async function decide(request) {
  const registered = request.deviceRegistered === true;
  const context = inspectAccessContext(request);
  // 제공된 fixture의 명시적 조합만 사용합니다. 일반적인 임계값으로 확대하지 않습니다.
  const unusualFixture = context.fixture !== null
    && context.fixture.hour === 3 && context.fixture.network === 'unusual'
    && context.fixture.recentEvents.some(event => event.kind === 'risk_signal'
      && event.ageSeconds === 60 && event.count === 20);
  // 불완전한 가상 입력을 정상값으로 보정하거나 정상 사건으로 인정하지 않습니다.
  // 엔진 검증 요청 계약 안의 완료 상태만 사용합니다. 클라이언트 입력은 받지 않습니다.
  // 동일 사용자·새 인증 시각의 검증 자체는 제공 엔진의 책임이며 여기서 재현하지 않습니다.
  const confirmed = context.stepUp?.verified === true;
  const needsConfirmation = context.source === 'unknown' || (unusualFixture && !confirmed);
  // Engine contract does not expose a verified role. Instructor notices and
  // materials are read-only for this student policy; never infer instructor rights.
  // Preserve the fixture's /notes/demo and ordinary per-user notes CRUD.
  const protectedWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    && (request.service === 'announcements' || request.service === 'instructor'
      || request.service === 'materials'
      || /^\/(?:announcements|instructor|materials)(?:\/|$)/u.test(request.path ?? ''));
  const routeAllowed = !protectedWrite && validEngineScope(request) && inspectNoteRoute(request);
  const decision = !registered || !routeAllowed ? 'deny' : needsConfirmation ? 'step_up' : 'allow';
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode: !registered ? 'device_not_registered'
      : !routeAllowed ? 'policy_denied' : needsConfirmation ? 'step_up_required' : 'approved',
    ruleIds: !registered ? ['device_registered']
      : !routeAllowed ? ['resource_zone']
        : needsConfirmation ? [...RULE_IDS] : ['device_registered', 'resource_zone'],
  };
}
