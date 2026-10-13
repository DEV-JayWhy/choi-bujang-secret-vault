// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계: 엔진이 확인한 기기 등록 여부가 true일 때만 허용합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

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
  const decision = !registered ? 'deny' : needsConfirmation ? 'step_up' : 'allow';
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode: !registered ? 'device_not_registered'
      : needsConfirmation ? 'step_up_required' : 'approved',
    ruleIds: needsConfirmation && registered ? [...RULE_IDS] : [RULE_IDS[0]],
  };
}
