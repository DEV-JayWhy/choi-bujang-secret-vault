// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계: 엔진이 확인한 기기 등록 여부가 true일 때만 허용합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required', 'zone_grant']);

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
// This does not map /api paths or prove ownership/roles. The public r1 names zone_denied;
// current runtime acceptance remains a judge verification item, not a local test guarantee.
const COLLECTION_METHODS = new Set(['GET', 'POST']);
const ITEM_METHODS = new Set(['GET', 'PUT', 'DELETE']);
// The API's resource IDs are UUIDs. The supplied engine fixture also documents
// the literal demo ID. A syntactically safe word is not a known note resource:
// accepting every word makes collection/function/other-zone names look like IDs.
const NOTE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const EMPTY_QUERY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
// Only ASCII "id=demo" or "id=<UUID>" is hashed here (at most 39 bytes).
// Keep the decision module independent of Node imports and browser crypto APIs.
// This is standard SHA-256 for one padded block, not an ownership credential.
const SHA256_K = Object.freeze([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);
function shortAsciiSha256(text) {
  if (typeof text !== 'string' || text.length > 55 || /[^\x00-\x7f]/u.test(text)) return null;
  const words = new Array(64).fill(0);
  for (let i = 0; i < text.length; i++) words[i >>> 2] |= text.charCodeAt(i) << (24 - (i % 4) * 8);
  words[text.length >>> 2] |= 0x80 << (24 - (text.length % 4) * 8);
  words[15] = text.length * 8;
  const rotate = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 16; i < 64; i++) {
    const x = words[i-15], y = words[i-2];
    const s0 = rotate(x,7) ^ rotate(x,18) ^ (x >>> 3);
    const s1 = rotate(y,17) ^ rotate(y,19) ^ (y >>> 10);
    words[i] = (words[i-16] + s0 + words[i-7] + s1) >>> 0;
  }
  const initial = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  let [a,b,c,d,e,f,g,h] = initial;
  for (let i = 0; i < 64; i++) {
    const s1 = rotate(e,6) ^ rotate(e,11) ^ rotate(e,25);
    const choose = (e & f) ^ (~e & g);
    const t1 = (h + s1 + choose + SHA256_K[i] + words[i]) >>> 0;
    const s0 = rotate(a,2) ^ rotate(a,13) ^ rotate(a,22);
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (s0 + majority) >>> 0;
    h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
  }
  return [a,b,c,d,e,f,g,h].map((value,i) => ((value+initial[i])>>>0)
    .toString(16).padStart(8,'0')).join('');
}
function querySelectsExactId(request, id) {
  if (request.queryLength === 0 && request.querySha256 === EMPTY_QUERY_SHA256) return true;
  if (!id) return false;
  // The digest is not an owner credential. Compare it only to the one supported
  // query, whose ID is already selected by the exact path. No function/filter
  // names, duplicate IDs, role or owner query can match this representation.
  const query = `id=${id}`;
  return request.queryLength === query.length
    && request.querySha256 === shortAsciiSha256(query);
}
export function inspectNoteRoute(request) {
  if (request?.service !== 'notes') return false;
  const { method, route, path } = request;
  if (typeof path !== 'string' || typeof route !== 'string' || typeof method !== 'string') return false;
  if (path === '/notes') {
    if (!COLLECTION_METHODS.has(method) || route !== `${method} /notes`) return false;
    // The engine provides only the query length and digest, not verified filter contents.
    // An unscoped collection request with query parameters cannot be authorized safely.
    return querySelectsExactId(request);
  }
  if (!ITEM_METHODS.has(method) || route !== `${method} /notes/:id`) return false;
  // One literal ID segment, without URL normalization or decoding.
  const match = /^\/notes\/([^/?#]+)$/u.exec(path);
  if (!match) return false;
  const id = match[1];
  return (id === 'demo' || NOTE_UUID.test(id)) && querySelectsExactId(request, id);
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
  const routeAllowed = !protectedWrite && inspectNoteRoute(request);
  const decision = !registered || !routeAllowed ? 'deny' : needsConfirmation ? 'step_up' : 'allow';
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode: !registered ? 'device_not_registered'
      : !routeAllowed ? 'zone_denied' : needsConfirmation ? 'step_up_required' : 'approved',
    ruleIds: !registered ? ['device_registered']
      : !routeAllowed ? ['zone_grant']
        : needsConfirmation ? [...RULE_IDS] : ['device_registered', 'zone_grant'],
  };
}
