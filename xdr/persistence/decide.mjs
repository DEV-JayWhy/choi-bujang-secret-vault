// Standalone pure classifier. No dependencies, file access, network or alert-ID answers.
const PATTERNS = [
  {
    "name": "unsigned_service_change",
    "condition": "서명 없음이 명시된 서비스 생성·실행 파일 변경에 임시 실행 경로, 원격 반복 등록 또는 실행 파일 변경 근거가 함께 있으면 block한다. 서명 미확인은 alert만 한다.",
    "evidence": "MITRE ATT&CK T1543 및 T1543.003: 새 서비스나 기존 서비스 실행 설정 변경을 통한 지속성. 단일 서명 부재만으로 악성 확정하지 않는다."
  },
  {
    "name": "unfamiliar_scheduled_task",
    "condition": "낯선/임의 이름 예약 작업이 임시 실행 파일을 가리키거나 시작 프로그램과 동일 임시 파일을 함께 가리키면 block한다. 평소 시각·수업 작업의 불확실한 변경은 alert만 한다.",
    "evidence": "MITRE ATT&CK T1053 및 T1053.005: 예약 작업으로 프로그램 반복 실행. 임시 경로와 이름·동일 파일의 조합은 학생 탐지 기준이다."
  },
  {
    "name": "unlisted_startup_entry",
    "condition": "평소 목록에 없다는 경보와 Startup 실행 파일 추가, 또는 미등록 서비스의 임시 실행 파일·재시작 지속성 근거가 함께 있을 때 block한다. 시작 폴더 변경 하나만으로 차단하지 않는다.",
    "evidence": "MITRE ATT&CK T1547.001은 시작 폴더 자동 실행, T1543은 서비스 지속성을 설명한다. 제공 경보의 시작 폴더 T1543 표기는 보존하고 정확한 근거를 별도 명시한다."
  },
  {
    "name": "uncertain_persistence_change",
    "condition": "서비스·예약 작업·시작 항목 관련 T1543/T1053/T1547 경보(level 5 이상) 또는 불완전한 변경 신호는 alert한다. 평소 목록 유지·정상 서명 서비스 실행·일상 이벤트는 record한다.",
    "evidence": "제공 Wazuh 경보의 변경/미확인 신호를 조사 대상으로 삼는다. 수준·0.55 점수는 학생 기준이며 ATT&CK 공식 임계값이 아니다."
  }
];
const text = value => typeof value === 'string' ? value.slice(0, 32768) : '';
export function decide(alert) {
  const description = text(alert?.rule?.description);
  const path = text(alert?.data?.path).replaceAll('\\', '/');
  const temporary = /(?:^|\/)temp\/[^/]+\.(?:exe|cmd|bat|ps1)$/iu.test(path);
  const startupPath = /\/start menu\/programs\/startup\/[^/]+/iu.test(path);
  const service = /서비스/u.test(description);
  const task = /예약 작업/u.test(description);
  const startup = /시작 (?:프로그램|폴더|항목)/u.test(description);
  const unsigned = /서명 없는|서명이 없/u.test(description);
  const unknown = /평소 목록에 없는|처음 보는|낯선|임의 문자열/u.test(description);
  const serviceChanged = /새 서비스|서비스 등록|서비스 실행 파일이 바뀌|서비스.*등록됐/u.test(description);
  const repeatedRemote = /원격 주소/u.test(description) && /등록/u.test(description)
    && /연속/u.test(description) && Number(alert?.data?.count) >= 2;
  const changedBinary = /실행 파일이 바뀌/u.test(description);
  let confidence = 0.1, name = 'no_persistence_change';
  if (service && unsigned && serviceChanged && (temporary || repeatedRemote || changedBinary)) {
    confidence = 0.96; name = PATTERNS[0].name;
  } else if (task && temporary && (unknown || (startup && /같은|함께/u.test(description)))) {
    confidence = 0.94; name = PATTERNS[1].name;
  } else if ((startup && unknown && startupPath && /추가/u.test(description))
      || (service && unknown && temporary && /다시 켜도|남도록/u.test(description))) {
    confidence = 0.92; name = PATTERNS[2].name;
  } else {
    const techniques = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
    const relevant = techniques.some(t => typeof t === 'string'
      && /^(?:T1543|T1053|T1547)(?:\.\d{3})?$/u.test(t));
    if (relevant && Number.isInteger(alert?.rule?.level) && alert.rule.level >= 5
        && (service || task || startup || temporary)) {
      confidence = 0.55; name = PATTERNS[3].name;
    }
  }
  return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence, reason: name };
}
