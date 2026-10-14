// Standalone pure classifier. No dependencies, file access or network.
const PATTERNS = [
  {
    "name": "suspicious_admin_membership",
    "condition": "administrators 그룹 추가가 원격 주소, 다계정 동시 추가, 일반 계정의 즉시 권한 명령, 비정상 시각 명령 실행, 제거 직후 재추가와 함께 명시되면 block한다. 그룹명 하나만으로 차단하지 않는다.",
    "evidence": "MITRE ATT&CK T1078 정상 계정 악용 및 T1098 계정 조작의 그룹 변경 맥락. 시간·다계정 기준은 제공 경보 근거를 조합한 학생 기준이다."
  },
  {
    "name": "new_privilege_command",
    "condition": "방금 관리자 권한을 얻은 계정의 관리자 명령 실행, 또는 다른 계정 권한으로 관리자 명령 실행이 명시되면 block한다. 실패·취소·미실행은 이 조건에서 제외한다.",
    "evidence": "MITRE ATT&CK T1068/T1078의 권한 상승과 높은 권한 계정 악용 맥락. 명령 실행만으로 소프트웨어 취약점 악용을 확정하지 않는다."
  },
  {
    "name": "unusual_privileged_session",
    "condition": "관리자 명령에 업무 시간 밖 사용과 낯선 주소가 함께 있거나, 세션의 관리자 권한 전환과 처음 보는 요청 주소가 함께 명시되면 block한다. 시각이나 주소 하나만으로 차단하지 않는다.",
    "evidence": "MITRE ATT&CK T1078의 평소와 다른 정상 계정 사용 탐지와 T1068 권한 상승 조사 맥락. 업무 시간은 임의 시각표 대신 경보의 명시적 근거만 읽는다."
  },
  {
    "name": "uncertain_privilege_signal",
    "condition": "T1068/T1078/T1098로 표시된 level 5 이상 계정·권한·그룹 경보의 불완전한 신호는 alert한다. 정상 로그인/조회/관리 작업은 record한다.",
    "evidence": "제공 Wazuh 경보의 권한 미확인·변경 의심 신호를 조사한다. 0.55 점수와 수준 기준은 학생 기준이며 ATT&CK 공식 임계값이 아니다."
  }
];
const text = value => typeof value === 'string' ? value.slice(0, 32768) : '';
export function decide(alert) {
  const description = text(alert?.rule?.description);
  const adminGroup = text(alert?.data?.group).toLowerCase() === 'administrators';
  const added = /관리자 그룹.*(?:추가|들어가|들어왔)/u.test(description);
  const command = /(?:관리자|권한) 명령.*실행|명령 실행/u.test(description);
  const uncertainOutcome = /취소|실패|명령은 없|실행은 없|실행하지 않/u.test(description);
  const unusualTime = /시간 밖|업무처럼 보이지 않는 시각/u.test(description);
  const unfamiliar = /처음 보는 주소|주소는 처음|낯선 주소/u.test(description);
  const remote = /원격 주소/u.test(description);
  const multiAccount = /계정.*개/u.test(description) && Number(alert?.data?.count) >= 3;
  const ordinary = /평범한 계정/u.test(description);
  const reinstated = /그룹에서 빠진/u.test(description) && /다시 관리자로 들어/u.test(description);
  const justElevated = /방금 관리자가 된/u.test(description);
  const otherIdentity = /다른 계정의 권한/u.test(description);
  const sessionChanged = /세션.*관리자 권한으로 바뀌/u.test(description);
  let confidence = 0.1, name = 'no_privilege_abuse';
  if (!uncertainOutcome && adminGroup && ((added && (remote || multiAccount
      || (command && (ordinary || unusualTime)))) || reinstated)) {
    confidence = 0.94; name = PATTERNS[0].name;
  } else if (!uncertainOutcome && command && (justElevated || otherIdentity)) {
    confidence = 0.96; name = PATTERNS[1].name;
  } else if (!uncertainOutcome && unfamiliar && ((command && unusualTime) || sessionChanged)) {
    confidence = 0.92; name = PATTERNS[2].name;
  } else {
    const techniques = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
    const relevant = techniques.some(t => typeof t === 'string'
      && /^(?:T1068|T1078|T1098)(?:\.\d{3})?$/u.test(t));
    if (relevant && Number.isInteger(alert?.rule?.level) && alert.rule.level >= 5
        && /권한|관리자|계정|그룹/u.test(description)) {
      confidence = 0.55; name = PATTERNS[3].name;
    }
  }
  return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence, reason: name };
}
