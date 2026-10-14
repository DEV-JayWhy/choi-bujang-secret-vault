// Self-contained: pure alert classification, no dependencies or I/O.
const PATTERNS = [
  {
    "name": "remote_jndi_lookup",
    "condition": "요청 머리글·URL·인자에서 완전한 ${jndi:<원격 프로토콜>://<대상>} 구문을 확인한다. 단어·설명·규칙 수준만으로 차단하지 않는다.",
    "evidence": "Apache CVE-2021-44228 설명: 공격자가 제어한 로그·인자의 JNDI 원격 endpoint 조회 악용. MITRE ATT&CK T1190."
  },
  {
    "name": "incomplete_jndi_lookup",
    "condition": "요청 값에 시작된 jndi 조회 구문이 있으나 완전한 원격 조회가 확인되지 않으면 알림만 한다.",
    "evidence": "CVE-2021-44228 조회 신호의 일부만 있으므로 실행 가능한 악용이라고 확정하지 않는다."
  },
  {
    "name": "cve_scanner_trace",
    "condition": "요청 user-agent의 log4j/log4shell 점검 도구 이름은 알림 신호로만 사용한다.",
    "evidence": "MITRE ATT&CK T1190의 공개 애플리케이션 악용 탐지 맥락. 점검 도구 사용만으로 공격 성공·악의를 확정하지 않는다."
  },
  {
    "name": "weak_cve_rule_signal",
    "condition": "요청 맥락에 T1190과 level 5 이상 Wazuh 경보가 함께 있으면 약한 신호로 알림한다. 취약점 이름·문서·수업 흔적을 차단하지 않는다.",
    "evidence": "제공 known-cve Wazuh 경보의 불완전한 취약점 신호. 수준과 0.55 점수는 학생 기준이며 MITRE 공식 임계값이 아니다."
  }
];
const REMOTE_LOOKUP = /\$\{\s*jndi\s*:\s*(?:ldap|ldaps|rmi|dns):\/\/[^\s{}]+\}/iu;
const PARTIAL_LOOKUP = /\$\{\s*jndi\s*:/iu;
const SCANNER = /(?:log4j|log4shell)[-_ ]?(?:scan(?:ner)?|probe|check)/iu;
function text(value) { return typeof value === 'string' ? value.slice(0, 32768) : ''; }
function normalized(value) {
  let out = text(value);
  for (let i = 0; i < 2; i++) {
    try { const next = decodeURIComponent(out); if (next === out) break; out = next; }
    catch { break; }
  }
  return out;
}
function requestValues(data) {
  const values = ['url', 'useragent', 'user_agent', 'query', 'args'].map(key => normalized(data?.[key]));
  if (data?.headers && typeof data.headers === 'object' && !Array.isArray(data.headers)) {
    for (const value of Object.values(data.headers).slice(0, 64)) values.push(normalized(value));
  }
  return values;
}
export function decide(alert) {
  const data = alert?.data;
  const values = requestValues(data);
  let confidence = 0.1, name = 'no_known_cve_pattern';
  if (values.some(value => REMOTE_LOOKUP.test(value))) {
    confidence = 0.96; name = PATTERNS[0].name;
  } else if (values.some(value => PARTIAL_LOOKUP.test(value))) {
    confidence = 0.7; name = PATTERNS[1].name;
  } else if (SCANNER.test(text(data?.useragent ?? data?.user_agent))) {
    confidence = 0.65; name = PATTERNS[2].name;
  } else if (values.some(Boolean) && Array.isArray(alert?.rule?.mitre)
      && alert.rule.mitre.includes('T1190') && Number.isInteger(alert.rule.level)
      && alert.rule.level >= 5) {
    confidence = 0.55; name = PATTERNS[3].name;
  }
  return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence, reason: name };
}
