// Self-contained: no imports, external state, I/O or network.
const PATTERNS = [
  {
    "name": "SQL 주입 요청",
    "condition": "웹 요청 인자의 SQL 연산·조회 결합 구문 또는 경보가 명시한 SQL 주입 표기를 탐지한다. 단어·따옴표만 있으면 의심으로 구분한다. 명시적 표기와 요청 반복 횟수 3회 이상이 함께 확인돼야 block 후보로 판단한다.",
    "evidence": "MITRE ATT&CK T1190: 공개 웹 애플리케이션의 SQL 주입 악용 사례를 근거로 한 학습용 탐지이며 3회 기준은 자체 기준이다."
  },
  {
    "name": "스크립트 주입 요청",
    "condition": "웹 요청 인자의 실행 가능한 script 태그·이벤트 핸들러 또는 경보가 명시한 스크립트 삽입 표기를 탐지한다. 수업 단어·단독 문자열은 공격 확정에서 제외하고 명시적 표기와 3회 이상 반복을 함께 요구한다.",
    "evidence": "MITRE ATT&CK T1190의 공개 애플리케이션 조작 입력 탐지 맥락에 연결한 학습용 스크립트 주입 신호이며 XSS만으로 초기 침입 성공을 확정하지 않는다."
  },
  {
    "name": "경로 역참조 요청",
    "condition": "웹 요청의 ../ 또는 인코딩된 역참조, 경보가 명시한 다단계 역참조·경로 이탈을 탐지한다. up 단어만으로 확정하지 않고 명시적 표기와 3회 이상 반복을 함께 요구한다.",
    "evidence": "MITRE ATT&CK T1190에 기록된 공개 애플리케이션 directory traversal 악용 사례를 근거로 하며 반복 기준은 자체 학습 기준이다."
  },
  {
    "name": "명령 주입 요청",
    "condition": "경보가 명시한 명령 구분자 주입 표기를 웹 요청 맥락에서 탐지하고 3회 이상 연속·반복 요청을 함께 요구한다. 구분 문자 하나만으로 명령 실행을 확정하지 않는다.",
    "evidence": "MITRE ATT&CK T1190의 조작 입력을 통한 공개 애플리케이션 악용 맥락과 시험 경보의 명령 구분자 연속 요청에 근거한 학습 패턴이며 실행 성공은 미확인이다."
  }
];

function positiveInteger(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9]\d*$/u.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function sourceAddress(value) {
  return typeof value === 'string' && /^(?:\d{1,3}\.){3}\d{1,3}$/u.test(value)
    && value.split('.').every(n => Number(n) <= 255);
}
function decoded(value) {
  let out = value;
  for (let i = 0; i < 2; i += 1) {
    try { const next = decodeURIComponent(out); if (next === out) break; out = next; }
    catch { break; }
  }
  return out;
}
export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string' ? alert.rule.description.slice(0, 8192) : '';
  const url = typeof alert?.data?.url === 'string' ? alert.data.url.slice(0, 8192) : '';
  const webRequest = /^(?:\/|https?:\/\/)/iu.test(url);
  const input = decoded(url).split('?').slice(1).join('?');
  const sql = /SQL\s*(?:구문|표식)|데이터베이스\s*조회를\s*이어\s*붙/iu.test(description)
    || /\bunion\s+(?:all\s+)?select\b|(?:['"]\s*|\b)or\s+\d+\s*=\s*\d+|;\s*(?:select|drop|insert|update|delete)\b/iu.test(input);
  const script = /스크립트\s*(?:삽입\s*표기|표식)/u.test(description)
    || /<script\b[^>]*>|\bon\w+\s*=\s*['"]?\s*(?:alert|fetch|eval)\s*\(/iu.test(input);
  const traversal = /경로를\s*여러\s*단계\s*거슬러|경로\s*이탈\s*표기/u.test(description)
    || /\.\.\//u.test(decoded(url));
  const command = /명령\s*구분자\s*표기/u.test(description);
  const matched = [sql, script, traversal, command].map((yes, i) => yes ? i : -1).filter(i => i >= 0);
  const describedCounts = [...description.matchAll(/(\d+)\s*(?:번|건)/gu)].map(m => positiveInteger(m[1]));
  const counts = [positiveInteger(alert?.data?.count), ...describedCounts].filter(n => n !== null);
  const count = counts.length && counts.every(n => n === counts[0]) ? counts[0] : null;
  const repeated = /반복|연속|번갈아|\d+\s*번\s*들어왔/u.test(description)
    && !/반복(?:은|이)?\s*없|반복되지/u.test(description);
  // A numeric count alone can describe visits, not repeated malicious requests.
  const clear = webRequest && sourceAddress(alert?.data?.srcip) && matched.length > 0
    && repeated && count !== null && count >= 3;
  const weak = /따옴표|select|SQL|스크립트|경로.*\bup\b|평소보다\s*(?:길|깁니다)|이상한\s*검색|주입처럼|구분\s*문자/iu.test(description);
  let confidence = 0.1;
  let why = '공격 표기와 반복 요청 근거 없음';
  if (clear) { confidence = 0.9; why = '명시적 공격 표기와 일치하는 반복 요청 횟수 확인; 악용 성공·시간 범위는 미확인'; }
  else if (webRequest && (matched.length || weak)) {
    confidence = matched.length ? 0.7 : 0.55;
    why = '요청의 의심 신호만 확인; 반복 공격을 확정할 근거 부족';
  }
  const names = matched.length ? matched.map(i => PATTERNS[i].name).join(' + ')
    : 'SQL 주입 요청 / 스크립트 주입 요청 / 경로 역참조 요청 / 명령 주입 요청';
  return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence, reason: `${names}: ${why}` };
}
