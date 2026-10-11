// Learning-only thresholds; not MITRE official cutoffs or a production block action.
const PATTERNS = [
  {
    "name": "같은 출발 IP의 단시간 로그인 실패 반복",
    "technique": "T1110",
    "condition": "로그인 실패임이 확인되고 data.srcip가 같은 요청이 3분 이내 30건 이상 누적된 경우 후보로 찾는다. 집계 경보는 data.count와 rule.description에 명시된 같은 IP·실패·시간 범위를 함께 확인한다. 시간 범위가 없으면 단시간 반복으로 확정하지 않는다.",
    "evidence": "MITRE ATT&CK T1110은 반복적인 비밀번호 추측과 다수 인증 실패의 상관 분석을 설명한다: https://attack.mitre.org/techniques/T1110/",
    "limitations": "공유 IP와 사용자 실수 등 다른 원인이 가능하며 높은 rule.level 또는 MITRE 태그만으로 공격을 확정하지 않는다."
  },
  {
    "name": "같은 계정에 대한 반복 비밀번호 추측 의심",
    "technique": "T1110.001",
    "condition": "같은 data.srcip와 data.srcuser에 로그인 실패가 3분 이내 30건 이상 누적되거나 설명에 반복 비밀번호 추측이 명시된 경우 후보로 찾는다. 비밀번호 값이 없는 경보에서는 서로 다른 비밀번호를 시도했는지 직접 확인할 수 없으므로 추측 의심으로만 기록한다.",
    "evidence": "MITRE ATT&CK T1110.001 Password Guessing은 알려지지 않은 계정 비밀번호를 반복 추측하는 형태를 설명한다: https://attack.mitre.org/techniques/T1110/001/",
    "limitations": "첫 패턴과 중복될 수 있다. 시간·횟수 정보가 부족하면 수치 조건 충족을 주장하지 않으며 실제 비밀번호를 수집하거나 출력하지 않는다."
  },
  {
    "name": "여러 계정 대상 Password Spraying 의심",
    "technique": "T1110.003",
    "condition": "같은 출발 IP가 5분 이내 서로 다른 계정 5개 이상에 로그인 실패를 발생시킨 경우 후보로 찾는다. data.accounts가 있으면 빈 항목과 중복을 제외한 계정 수를 사용한다. rule.description에 여러 계정에 같은 비밀번호를 넣었다고 적혀 있으면 경보 설명에 따른 spraying 의심으로 기록하되 독립 확인으로 표현하지 않는다.",
    "evidence": "MITRE ATT&CK T1110.003 Password Spraying은 하나 또는 소수의 비밀번호를 여러 계정에 시도하는 형태를 설명한다: https://attack.mitre.org/techniques/T1110/003/",
    "limitations": "현재 경보에는 비밀번호 값이 없어 동일 비밀번호 사용 여부를 직접 검증할 수 없다. 계정 수·시간 범위가 불명확하면 수치 조건 충족은 미확인으로 둔다. 낮은 빈도의 spraying도 가능하므로 이 자체 기준을 충족하지 않는다고 공격이 없다고 판단하지 않는다."
  }
];
const THRESHOLD_BASIS = "아래 시간·횟수·계정 수는 학습용 자체 판단 기준이며 MITRE 공식 임계값이 아니다. 단일 경보 timestamp는 집계 구간이 아니므로 설명 또는 집계 메타데이터로 시간 범위를 확인해야 한다. count와 개별 이벤트를 중복 합산하지 않는다.";

// Only explicit IPv4 source addresses are supported by this learning fixture.
function validSource(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value)) return false;
  return value.split('.').every(part => Number(part) <= 255 && String(Number(part)) === part);
}

function positiveInteger(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (!/^\d+$/u.test(String(value))) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string'
    ? alert.rule.description.slice(0, 10000) : '';
  const source = validSource(alert?.data?.srcip);
  const account = typeof alert?.data?.srcuser === 'string' && alert.data.srcuser.trim().length > 0;
  const failure = /실패/u.test(description)
    && /로그인|비밀번호|계정|잠금|(?:같은|한)\s*주소/u.test(description);
  const spraying = /(?:여러|서로 다른)\s*계정[^。\n]*같은 비밀번호/u.test(description)
    || /같은 비밀번호[^。\n]*(?:여러|서로 다른)\s*계정/u.test(description);
  const sameSource = /(?:같은|한)\s*주소/u.test(description);
  const sameAccount = /(?:같은|한)\s*계정/u.test(description);
  const changingAccounts = /계정\s*이름을\s*바꿔\s*가며/u.test(description);
  const systematicGuessing = /비밀번호를\s*한 글자씩\s*바꿔/u.test(description);
  const guessing = /비밀번호를\s*한 글자씩\s*바꿔/u.test(description)
    || /비밀번호[^。\n]*(?:반복 추측|반복 대입)/u.test(description);

  const counts = [...description.matchAll(/(\d+)\s*건/gu)].map(m => positiveInteger(m[1]));
  const dataCount = positiveInteger(alert?.data?.count);
  const explicitCounts = [...counts, ...(dataCount === null ? [] : [dataCount])];
  const consistentCount = explicitCounts.length > 0 && explicitCounts.every(n => n === explicitCounts[0]);
  const count = consistentCount ? explicitCounts[0] : null;
  // timestamp is deliberately never used to invent an aggregation window.
  const windows = [...description.matchAll(/(\d+)\s*분\s*(?:안|이내|동안)/gu)].map(m => positiveInteger(m[1]));
  const minutes = windows.length === 1 ? windows[0] : null;
  const accounts = typeof alert?.data?.accounts === 'string'
    ? new Set(alert.data.accounts.split(',').map(s => s.trim()).filter(Boolean)).size : 0;

  const describedAccounts = [...description.matchAll(/계정\s*(\d+)\s*개/gu)]
    .map(m => positiveInteger(m[1]));
  const accountCount = describedAccounts.length === 1 ? describedAccounts[0] : accounts;
  const continuous = /연속|이어/u.test(description);
  const noSuccess = /성공은\s*없/u.test(description);

  let confidence = 0.1;
  let pattern = PATTERNS[0];
  let rationale = '일치 근거 부족 또는 정상 이벤트';
  if (source && account && spraying && continuous && accountCount >= 5
      && (failure || /넣었|대입|시도/u.test(description))) {
    pattern = PATTERNS[2];
    confidence = 0.9;
    rationale = '설명상 연속 다계정 동일 비밀번호 시도와 계정 수 일치; 동일 비밀번호 독립 확인은 미완료';
  } else if (source && failure && sameSource && accountCount >= 10
      && /같은 간격/u.test(description)) {
    confidence = 0.9;
    rationale = '같은 주소의 다계정 실패와 일정한 간격 결합; 총 시간은 미확인';
  } else if (source && account && failure && count !== null && count >= 50
      && ((sameSource && sameAccount && continuous) || noSuccess)) {
    pattern = PATTERNS[1];
    confidence = 0.9;
    rationale = '고횟수 실패와 동일 주소·계정 연속성 또는 성공 없음 결합; 시간은 미확인';
  } else if (source && spraying) {
    pattern = PATTERNS[2];
    confidence = 0.75;
    rationale = '경보 설명상 의심; 동일 비밀번호 독립 확인 불가';
  } else if (source && failure && accounts >= 5 && minutes !== null && minutes <= 5) {
    pattern = PATTERNS[2];
    confidence = 0.7;
    rationale = '여러 계정 실패; 동일 비밀번호 사용 여부 미확인';
  } else if (source && failure && changingAccounts && count !== null && count >= 30
      && minutes !== null && minutes <= 3) {
    confidence = 0.9;
    rationale = '단시간 다수 실패와 계정 이름 변경의 결합; 반복 출발 주소는 미확인';
  } else if (source && account && failure && sameAccount && count !== null && count >= 30
      && minutes !== null && minutes <= 3 && /성공은\s*없/u.test(description)) {
    pattern = PATTERNS[1];
    confidence = 0.9;
    rationale = '한 계정의 단시간 다수 실패와 성공 없음의 결합';
  } else if (source && account && failure && systematicGuessing && count !== null && count >= 30) {
    pattern = PATTERNS[1];
    confidence = 0.9;
    rationale = '경보에 명시된 체계적 비밀번호 변경과 다수 실패; 시간 범위는 미확인';
  } else if (source && failure && sameSource && count !== null && count >= 30
      && minutes !== null && minutes <= 3) {
    confidence = 0.9;
    rationale = '같은 주소·단시간·실패 횟수의 자체 기준 일치';
  } else if (source && account && failure && sameAccount && count !== null && count >= 30
      && minutes !== null && minutes <= 3) {
    pattern = PATTERNS[1];
    confidence = 0.75;
    rationale = '계정 반복 실패 의심; 같은 주소 반복 명시 부족';
  } else if (source && account && failure && guessing) {
    pattern = PATTERNS[1];
    confidence = 0.75;
    rationale = '설명상 반복 추측 의심; 비밀번호·집계 조건 독립 확인 불가';
  } else if (source && failure) {
    confidence = count !== null && count >= 3 ? 0.55 : count === null ? 0.5 : 0.2;
    rationale = confidence >= 0.5 ? '실패 신호는 있으나 단시간 반복 조건 부족' : '소수 실패; 반복 공격 근거 부족';
  }
  return {
    action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence,
    // Fixed text only: never echo source input or credential-like values.
    reason: `${pattern.name}: ${rationale}`,
  };
}
