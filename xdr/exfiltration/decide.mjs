// Standalone pure classifier. No dependencies, file access or network.
const PATTERNS = [
  {
    "name": "large_unfamiliar_destination",
    "condition": "유효한 목적지 IP로 50,000,000 bytes 이상 전송되고 경보가 처음 보는 목적지/주소임을 명시하면 block한다. 크기나 낯선 주소 하나만으로 차단하지 않는다.",
    "evidence": "MITRE ATT&CK T1041/T1048 유출 탐지 맥락의 목적지·전송량 조합. 50MB는 이 수업용 fixture의 학생 기준이며 MITRE 공식 수치나 실제 평소 전송량이 아니다."
  },
  {
    "name": "off_hours_bulk_transfer",
    "condition": "유효한 목적지로 대용량 전송이 업무/수업 시간 밖에 발생하고 압축 파일 또는 반복 전송 3회 이상이 함께 확인되면 block한다.",
    "evidence": "MITRE ATT&CK T1048 대체 프로토콜 유출 맥락과 제공 경보의 비정상 시각·압축/반복 근거. 시각표를 임의 생성하지 않는다."
  },
  {
    "name": "unusual_protocol_or_full_export",
    "condition": "유효한 목적지로 대용량 전송에 평소 쓰지 않던 포트 및 여러 자료, 짧은 시간의 자료실 전체 외부 복사, 또는 명시적 대용량 전송의 5회 이상 반복이 함께 있으면 block한다.",
    "evidence": "MITRE ATT&CK T1048의 다른 프로토콜, T1041의 반복 대량 유출 조사 맥락. 5회는 학생 학습 기준이며 표시만으로 C2 연결이나 실제 유출 성공을 확정하지 않는다."
  },
  {
    "name": "uncertain_exfiltration_signal",
    "condition": "T1041/T1048 level 5 이상 경보의 중간/소량 전송, 압축 생성만 확인, 실패/불완전한 반출 신호는 alert한다. 평소의 소량 조회·동기화는 record한다.",
    "evidence": "제공 Wazuh 경보의 부분적 전송 신호를 조사 대상으로 삼는다. 수준과 0.55 점수는 학생 기준이며 ATT&CK 공식 임계값이 아니다."
  }
];
const LARGE_BYTES = 50_000_000;
const text = value => typeof value === 'string' ? value.slice(0, 32768) : '';
function number(value) {
  if (typeof value === 'string' && !/^\d+$/u.test(value)) return 0;
  if (typeof value !== 'string' && typeof value !== 'number') return 0;
  const out = Number(value);
  return Number.isSafeInteger(out) && out >= 0 ? out : 0;
}
function destination(value) {
  if (typeof value !== 'string') return false;
  const octets = value.split('.');
  return octets.length === 4 && octets.every(part => /^(?:0|[1-9]\d{0,2})$/u.test(part)
    && Number(part) <= 255);
}
export function decide(alert) {
  const description = text(alert?.rule?.description);
  const bytes = number(alert?.data?.bytes), files = number(alert?.data?.files);
  const count = number(alert?.data?.count);
  const hasDestination = destination(alert?.data?.dstip);
  const unfamiliar = /처음 보는 (?:목적지|주소)/u.test(description)
    && !/처음 보는.*(?:아닙|아니)/u.test(description);
  const outsideHours = /(?:업무|수업) 시간 밖/u.test(description);
  const archive = /압축 파일/u.test(description);
  const unusualPort = /평소에 쓰지 않던 포트/u.test(description);
  const wholeExport = /짧은 시간/u.test(description) && /자료실 전체/u.test(description)
    && /외부 주소/u.test(description);
  const failedOrAbsent = /실패|외부 전송은 아직 없|전송은 없/u.test(description);
  let confidence = 0.1, name = 'no_exfiltration_signal';
  if (!failedOrAbsent && hasDestination && bytes >= LARGE_BYTES && unfamiliar) {
    confidence = 0.96; name = PATTERNS[0].name;
  } else if (!failedOrAbsent && hasDestination && bytes >= LARGE_BYTES && outsideHours
      && (archive || count >= 3)) {
    confidence = 0.94; name = PATTERNS[1].name;
  } else if (!failedOrAbsent && hasDestination && bytes >= LARGE_BYTES
      && ((unusualPort && files >= 2) || wholeExport
        || (count >= 5 && /대용량|큰 파일/u.test(description)))) {
    confidence = 0.92; name = PATTERNS[2].name;
  } else {
    const techniques = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
    const relevant = techniques.some(t => typeof t === 'string'
      && /^(?:T1041|T1048)(?:\.\d{3})?$/u.test(t));
    if (relevant && Number.isInteger(alert?.rule?.level) && alert.rule.level >= 5
        && /전송|압축|자료|파일|목적지/u.test(description)) {
      confidence = 0.55; name = PATTERNS[3].name;
    }
  }
  return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence, reason: name };
}
