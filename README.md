# ALEPH BYTE BACK — 12단계 탈환 작전실

현재 방어 단계는 **12**이며 보너스 **xdr-06 exfiltration**를 추가했습니다. 공개 Production은 https://choi-bujang-secret-vault-xi.vercel.app 이고 저장소는 https://github.com/DEV-JayWhy/choi-bujang-secret-vault 입니다. 현재 배포 커밋은 `GET /aleph.json`의 `commit`으로 확인합니다. 예전 단계별 작업 기록은 [보존한 이력](docs/history/stage1-to-stage10.md)에 있습니다. 이력의 과거 공개 API·단계 숫자는 현재 동작 설명이 아닙니다.

## 학생 부분 · 케셰브 13~22단계와 21단계 실행 문서

케셰브는 본인의 로그인·기기·세션, 업무 앱 접근 판정, 접속·XDR 기록을 표시하고 AI 사건 설명·조치 상태·설치 패키지 취약점 조회 결과를 구분하는 로컬 보안 Agent입니다. 현재 학생 표시 함수 8개는 `on-client/student/extension.mjs`에 구현돼 있습니다. 이 아래의 기존 12단계 설명과 배포 기록은 보존하며 케셰브 앱 실행 절차와 구분합니다.

- 실행 설명서·글로 쓴 구성도·제공/학생 구현 경계·오류 복구·검증 기록: [docs/STUDENT_RUNBOOK.md](docs/STUDENT_RUNBOOK.md)
- 앱 작업 위치: `on-client`. 구성은 브라우저 → 로컬 서버 → 설정된 접근 제어·XDR 어댑터 / 서버 AI 서비스이며 OSV 조회는 승인된 공개 패키지만 담당합니다.
- 앱 package 버전 `0.2.19`(2026-10-26 공식 제공 업데이트), Node.js 수업 기준 `24.19.0`, Windows 실행 도구의 허용 범위 22~24. 이번 직접 확인은 Linux x86_64·Node.js `v24.22.1`·npm `11.9.0`입니다. Windows PowerShell 및 실제 브라우저 동작은 미확인입니다.
- 앱 폴더에서 `npm run check`, `npm start` 또는 별도의 `npm run demo`를 사용하며 브라우저 주소는 `http://127.0.0.1:5189/`입니다. 기본은 `disconnected`, 예제는 `demo`이고 운영 연결 성공이 아닙니다. 앱 폴더에는 외부 npm 의존성이 없어 기본 실행에 별도 설치가 필요하지 않습니다.
- 실제 AI·SDP/XDR·조치 집행·OSV 외부 조회와 새 Windows 환경 재현은 미확인입니다. 실제 학생 조치 집행·효과 확인은 미완료(UNV)입니다.
- 21·22단계는 이번 공식 안내에 따라 저장소와 40자리 커밋을 직접 입력하고, 비공개 커밋은 과제 화면의 원문 도구를 사용합니다. 워크벤치 「포털 제출 준비」는 현재 13~20단계용입니다. 서버 AI의 원문 검토는 명령 실행이나 새 환경 재현을 대신하지 않습니다.

## 학생 부분 · 마지막 총공세 0.2.19 업데이트

공식 시작 틀·업데이트 도구의 이전/새 해시를 대조해 제공 파일 45개를 반영했습니다. 기존 student/extension.mjs·engine-adapter.mjs는 그대로이며, 새 appearance.json은 이름 케셰브·student-first 배치만 지정합니다. 학생 화면과 제공 「내 PC 상태」를 구분하고 PC 수집기를 중복 구현하지 않습니다. 기존 프로젝트 폴더·Git 기록·제출물은 보존합니다.

현재 package-app 명령·PC 상태 조회·학생 꾸밈 지원 코드는 준비됐습니다. R7 실행 환경 묶음도 공개 공식 경로에서 받을 수 있습니다. Windows 설치·승인 호스트·아이콘·실제 포장·바로가기·사용자 PC 실측은 별도 확인 대상입니다. AI Linux 호스트의 실행 환경 조회는 PROVIDED_RUNTIME_NOT_INSTALLED이며 우회하지 않았습니다. 구체적인 업데이트·공식 R7 설치 미리보기·포장 순서는 [실행 설명서 현재 0.2.19 절](docs/STUDENT_RUNBOOK.md)을 봅니다. 포장 성공·실제 SDP/AI 연결·공식 제출을 수행한 것으로 기록하지 않습니다.

## 학생 부분 · 7일차 시연과 정리

[시연 순서·제공/학생 기능·한계·근거 정리](docs/DEMO_HANDOFF.md)를 추가했습니다. 기준 실행 커밋은 `bed7ed3f0f80c6fe152211ce022824bb361dbaae`이고 앱 버전은 0.2.19입니다. 계정·기기·세션 → 보안 기록 → 패키지 조회 순서이며, 모의 DOM·Linux 로컬 API 리허설을 실제 브라우저 시연과 구분합니다. 동일 커밋의 [실행 기록](docs/evidence/reproduction-0.2.19.json)과 [AI Linux 환경 PC 조회 기록](docs/evidence/day7-pc-check.json)을 보존했습니다. 사용자 PC 실측 화면·Windows 설치·생성 패키지 경로·바로가기는 없거나 미확인이며 실사용 검증 중입니다. 이번 추가는 문서·증거뿐이고 앱 코드는 변경하지 않습니다.

## 학생 부분 · 22단계 최종 인수인계와 재현

최종 인수인계·버전 이력·단계별 재현·데이터 보존/복원 계획은 [docs/FINAL_HANDOFF.md](docs/FINAL_HANDOFF.md)에 있습니다. 같은 최종 커밋을 새 폴더에 복제한 뒤 [docs/verify-final.mjs](docs/verify-final.mjs)를 실행하면 그 checkout의 40자리 커밋과 검사 전후 상태·시각·모의 DOM·로컬 HTTP 결과를 프로젝트 밖 JSON에 기록합니다.

Git 최상위에서 `node docs/verify-final.mjs --output ../keshev-evidence/final-reproduction.json`으로 실행합니다. 이 도구는 Linux·Node.js v24.22.1에서 확인하며 Windows·실제 브라우저는 미확인입니다. 22단계 당시 앱은 0.2.11이었으며 기존 증거는 그 커밋의 기록입니다. 마지막 총공세 작업본은 공식 0.2.19로 업데이트됐고 검사 도구도 추가된 package-app 명령을 대조합니다. 서로 다른 버전의 검사 결과를 합쳐 전체 성공이라고 쓰지 않습니다. 실제 AI·SDP/XDR·OSV 외부 조회와 19단계 실제 집행·효과 확인은 미확인/미완료(UNV)이므로 릴리스 상태는 검증 중이며 v1.0 또는 운영 인증이 아닙니다. 공식 제출은 사용자가 수행하며 원문 검토를 실행 성공 증명으로 표현하지 않습니다.

### 22단계 실행 증거 전달 보완

실제 재현 커밋 `6d216c499d37fd80ed1fa4a54ba84ffe76e8d9f1`의 [실행 증거 JSON](docs/evidence/reproduction-6d216c499d37.json)을 저장소 원문에 포함했습니다. Linux·Node v24.22.1·npm 11.9.0·앱 0.2.11, 검사 전후 깨끗한 작업 트리, 단계 검사 9개 묶음과 HTTP 18건, 실행 시각·미확인 항목이 기록돼 있습니다. 당시 증거 보완 커밋 `5e4feee9f33b42c7dc6a86eae58815f97ecbe76f`의 앱 원문 트리는 실행 커밋과 동일했습니다. 이후 0.2.19 업데이트 작업본을 원래 실행 커밋과 혼동하지 않습니다. 자세한 결과·대조 명령은 [FINAL_HANDOFF.md](docs/FINAL_HANDOFF.md)에 있습니다.

## 12단계 작전실 · 실제 결과와 미실행

`/operations.html`에서 「읽기 전용 API 점검 실행」을 누릅니다. Vercel Hobby의 함수 12개 제한을 지키기 위해 `/api/checks`는 기존 세션 함수의 별도 operations view로 rewrite되며, 원래 세션 요청은 기존 인증 처리기로 전달합니다. `/api/checks`는 지정된 Production에 실제 GET 요청을 보내고 요청 ID·ID 출처·확인 시각·HTTP 상태·정상/금지 구분을 반환합니다. 메모 응답은 구조만 검사한 뒤 폐기하며 본문·제목·사용자 ID·토큰을 JSON에 넣지 않습니다. 확인 실패를 통과로 바꾸지 않습니다. 검사 당시 배포 SHA와 요청 대상 SHA가 다르면 일치로 기록하지 않습니다.

화면의 수치는 API의 checks로 계산한 counts입니다. 동일한 가린 JSON을 새 `a12_operations_runs`에 INSERT하고 저장 성공 여부를 반환합니다. 화면에서 JSON을 내려받아 실행 ID로 DB 기록과 대조할 수 있습니다. 테이블은 RLS 및 server 역할의 SELECT·INSERT만 사용하며 UPDATE·DELETE를 허용하지 않습니다. 기존 메모·백업·감사는 보존합니다.

| 표시 | 근거와 한계 |
|---|---|
| 판정기 규칙 | 현재 `RULE_IDS` 모듈의 목록. 실제 판정 성공 건수로 쓰지 않음 |
| 탐지 사건 | 실제 엔진 사건 전달 기록 미연결 → 미실행 |
| 회수 상태 | 실제 엔진 집행·재요청 기록 미연결 → 미실행 |
| 복구 버전 | 검증된 사용자·기기 컨텍스트가 있는 경우, 해당 소유자 범위의 DB 감사 최신 20개와 검증 preview 사본 버전만 읽음. 이번 점검의 복원/전체 재시험 성공으로 확대하지 않음 |
| 정상 요청 | 공개 배포 식별자·manifest의 HTTP 200을 실측. 보호 목록은 검증된 인증과 승인 컨텍스트에서만 시험하고, 없으면 미실행 |
| 금지 요청 | 무인증 목록·상세·복원·기기 상태 및 위조 토큰의 실제 GET 응답 |
| 공식 41종 총공세 | 이번 커밋의 공식 전체 영수증 미연결 → 실행 0·미실행 41. 과거 단계 통과와 로컬 연습을 합산하지 않음 |

`npm run ops:check`는 현재 HEAD와 Production API의 커밋을 대조하고 `artifacts/operations-result.json`에 실제 응답을 저장합니다. 인증 토큰을 CLI로 옮기지 않습니다. 정상 보호 요청은 승인된 브라우저의 작전실에서 별도로 실행합니다. `npm run bundle`은 별도의 자기 점검과 미실행 범위를 포함하며 공식 심판 결과를 대신하지 않습니다.

### 실제 1차 심판과 실행 기록 연결 수정

12단계 1차 실제 심판은 f05b48f0a77f6f4afe408f966872899cbfa8ede3에서 53/100점, S12_SCREEN_MISMATCH입니다. 「실행 기록 대조」가 attackId에 해당하는 HTTP 요청 기록을 찾지 못했다고 밝혔습니다. 화면 수치와 실제 DB 기록은 별도로 일치했지만 이것이 심판 runner의 요청별 대조를 대신하지 않습니다.

운영자 공개 표본 `ChoiTimo/byteback-sample-pass`의 src/attack-check.mjs에 근거해 실제 fetch에 `alephEvidence: {caseId, requestKey}`를 넣습니다. 이는 sandbox runner의 요청별 대조용 메타데이터이며 HTTP 헤더·URL·권한 값으로 보내지 않습니다. 요청을 보내지 않은 항목과 로컬 fixture는 이번 제출 묶음에서 observed를 정확히 `not_run`으로 남깁니다. 로컬 판정·탐지 연습 결과는 별도 테스트 로그로 보존합니다. 실제 HTTP 응답을 읽어 기록한 항목만 runner 요청 기록과 연결합니다.

2차 실제 심판은 b83e243125cb4d7735eacdedc9a442543109d5b2에서 53/100점, 같은 S12_SCREEN_MISMATCH입니다. 요청별 연결은 인식됐으나 observed의 설명 문장과 한 attackId의 복수 요청을 거부했습니다. 3차 후보는 각 실제 점검을 한 요청으로 제한하고 observed를 `HTTP <실제 상태>` 또는 `not_run`으로만 출력합니다. 자세한 수치·서버 기록·가상 시험은 작전실 JSON 및 별도 로그에서 확인합니다. 12단계의 익명 복원 GET은 한 요청의 401만 관측하며, 10~11단계의 기존 별도 설정/위조 토큰 검사 동작은 보존합니다.

## 설치·실행·중지·복구와 출처

검사 커밋은 제출 JSON의 commit과 배포 `/aleph.json`의 commit이 같은 값이어야 합니다. 11단계 작동 기준점은 `529269c50a147446a53787e8a31a465ec3bc78f4`입니다.

1. 설치: `git clone https://github.com/DEV-JayWhy/choi-bujang-secret-vault.git`, 폴더로 이동한 뒤 `git checkout <검사한-커밋>`, `npm install`. Node.js 22 이상을 사용하고 lockfile의 패키지 버전을 유지합니다.
2. 로컬 검사: `node --test test/*.test.mjs`, `npm run decider:test`, `npm run detect:test`, `npm run build -- --local`. 이 명령은 로컬 시험이며 실제 엔진 회수·심판 판정을 증명하지 않습니다.
3. 실행: 기존 Vercel 프로젝트와 같은 저장소를 배포하고 기존 서버 전용 Supabase 설정을 유지합니다. 새 운영 기록 테이블 SQL은 검토한 `sql/12_operations_runs.sql`만 추가 적용합니다. 개인키·환경변수 파일을 포장하거나 Git에 넣지 않습니다. Production READY와 `/aleph.json` SHA를 확인합니다.
4. 재현: 자료실의 작전실 링크 → 읽기 전용 점검 → 표의 정상/금지 요청과 요청 ID·시각 확인 → 가린 JSON 다운로드 → 서버의 동일 run_id 기록과 비교 → `npm run ops:check` → `npm run bundle`. 정상 보호 요청이 미실행이면 실제 승인된 사용자 컨텍스트에서 재실행합니다. 공식 총공세는 ALEPH 심판에 제출해 별도로 확인합니다.
5. 중지: Vercel 관리 화면에서 이 프로젝트의 배포를 일시 중지하거나 제공 엔진의 해당 경로 허용을 끕니다. 원본 DB·백업·감사는 삭제하지 않습니다.
6. 복구: 먼저 `git status`·`git diff`로 다른 작업을 보존합니다. Vercel에서 이전 작동 배포를 선택해 되돌리거나 별도 브랜치로 기준 커밋을 다시 배포합니다. `reset --hard`를 쓰지 않습니다. 새 기록 테이블과 기존 감사도 그대로 보존합니다. 복구 후 SHA·정상/금지 요청을 다시 시험하고 새 시각의 결과를 남깁니다.

| 출처 | 범위 |
|---|---|
| 학생 구현 | 판정기 `src/decider.mjs`, 탐지기 `src/detect.mjs`, 접속 앱 `public/`, 자료실·복원 API, 자기 점검, 이번 작전실·가린 결과 기록 |
| 제공 엔진 | **ALEPH SDP 엔진**. 엔진이 제공하는 신원·기기·경로 확인, 판정 집행, 서명 검사와 회수 상태·공식 총공세는 학생 로컬 fixture와 구분 |
| 기반 서비스 | Supabase Auth·Postgres 및 Vercel. 서비스 비밀값은 운영 설정에만 유지 |

12단계 최종 실제 심판은 `de802c6adb06b5c2b7fdc8dc4168e6c3a2d4a460`에서 100/100점입니다. 클라우드 상황실에서 누적 1,200/1,200점 및 괴물 41/41종을 확인했습니다. 앞의 53점과 로그인 502는 과정 기록이며 최종 상태가 아닙니다. 이 통과본은 보너스 작업의 보존 기준점입니다.

## 보너스 xdr-03 저장점 · 알려진 취약점

기존 판정기 `src/decider.mjs`와 1~12단계 앱/API/DB는 수정하지 않습니다. 원본 `xdr/fixtures/known-cve.json` 24건도 보존합니다. `xdr/known-cve/read-alerts.mjs`는 시각·출발 주소·가상 계정·규칙 수준·설명 다섯 항목만 읽고 비밀값 의심 필드는 가립니다. 판단 모듈은 이 읽기 모듈을 불러오지 않습니다.

`patterns.json`의 이름·조건·근거를 `decide.mjs` 맨 위 상수로 동일하게 옮겼습니다. Apache CVE-2021-44228 설명 및 MITRE ATT&CK T1190을 근거로 요청 값의 완전한 원격 JNDI 조회를 block(0.96), 불완전한 구문·점검 도구 흔적·약한 Wazuh 취약점 신호를 alert(0.55~0.7), 신호 없는 일상 이벤트를 record(0.1)로 판단합니다. CVE/jndi 단어만으로 차단하지 않습니다. 경보 ID를 정답으로 쓰지 않습니다. `decide.mjs`는 import·파일/네트워크 I/O 없이 단독 계산합니다. 악용 성공·영향받는 설치 버전·패치 완료는 이 결과로 주장하지 않습니다.

**차단 연결:** `respond.mjs`의 `createResponder({resolveVerifiedRequest})`가 서버 측 경보와 엔진 검증 요청을 연결하는 콜백을 받습니다. block만 해당 요청 범위의 15분 거부 규칙을 생성하며 근거 경보 번호와 만료 시각을 붙입니다. `decideRequest(request)`는 기존 판정기를 먼저 호출하고 기존 deny를 유지하며, 해당 추가 규칙이 있을 때만 deny를 더합니다. 기존 규칙 파일이나 RULE_IDS는 변경하지 않습니다. 다른 정상 요청·미등록 기기 거부·규칙 만료를 로컬 합성 요청으로 재시험했습니다.

출발 IP·계정만으로 검증된 신원을 만들지 않습니다. 콜백은 브라우저 입력을 받아 구현하면 안 됩니다. 기본 실행은 검증된 요청 연결이 없으므로 block을 차단 후보 알림으로 기록하고 실제 규칙을 등록하지 않습니다. **제공 ALEPH 엔진의 실제 사건-요청 연결과 운영 집행은 미연결/미실행**이며 로컬 adapter 시험과 구분합니다. 프로세스 내 규칙은 재시작 시 소멸합니다. 로그는 고정 패턴·행동·검증한 경보 번호·시각만 남기고 원본 요청·본문·토큰·IP·계정은 넣지 않습니다.

재현: `node xdr/known-cve/read-alerts.mjs` → 24줄, `npm run xdr:run -- known-cve` → `xdr/known-cve/result.json`, `node --test test/known-cve.test.mjs` → 독립 sandbox·분류·비밀값 가림·추가 거부 및 정상 허용·만료 시험, `node --test test/*.test.mjs` → 기존 회귀. 알림 기록은 `node xdr/known-cve/respond.mjs`; `xdr/alerts.log`는 커밋하지 않습니다.

로컬 시험 경보 결과는 **block 8 / alert 8 / record 8**, 일상 이벤트 8건의 block은 **0**입니다. 원본에 정답표가 없으므로 이는 경보 내용을 대조한 학생 자체 시험 결과이며 공식 심판 판정과 구분합니다. xdr-03 실제 심판은 `ef0a5cefce1d56a48547f55a8d3fd7b740958871`에서 조건 4개·가점 3개 모두 확인, 완성도 100/100 및 작전 점수 120점을 받았습니다. 저장점 작성 이후의 확정 판정입니다.

출처: https://logging.apache.org/security.html#cve-2021-44228 · https://attack.mitre.org/techniques/T1190/ · 제공 `xdr/README.md`. 패턴·분류·adapter는 학생 구현이며 ALEPH SDP 엔진은 제공 엔진입니다.

## 보너스 xdr-04 저장점 · 몰래 심어진 프로그램

원본 `xdr/fixtures/persistence.json` 24건, 기존 `src/decider.mjs` 규칙과 1~12단계 API/DB, 앞선 XDR 모듈은 보존합니다. 새 `xdr/persistence/`의 reader는 시각·출발 주소·가상 계정·규칙 수준·설명만 추출하고 비밀값 의심 필드를 가립니다. 원본 전체나 파일 경로를 출력하지 않습니다.

`patterns.json`의 네 패턴을 `decide.mjs` 맨 위에 동일하게 옮겼습니다. 명시적 서명 부재와 새 서비스/실행 파일 변경에 임시 실행 경로·원격 반복 등록 같은 근거가 함께 있는 경우, 낯선 예약 작업과 임시 실행 파일의 조합, 평소 목록에 없는 시작 폴더 프로그램 추가 등을 block(0.92~0.96)합니다. 서명 미확인·설명만 변경·임시 파일 하나·불완전한 시작 항목 변경은 alert(0.55)이며 일상 이벤트는 record(0.1)입니다. 경보 ID·계정·IP를 정답 또는 신원으로 사용하지 않습니다. 실제 PC의 평소 목록/서명 검사를 수행한 것으로 주장하지 않으며 경보에 명시된 정보만 사용합니다.

근거는 MITRE ATT&CK T1543/T1053이며, 시작 폴더는 정확한 추가 근거인 T1547.001을 명시합니다. 제공 경보의 기존 기법 표기는 바꾸지 않습니다. `decide.mjs`는 import·파일·네트워크 I/O 없는 단독 판단 파일이고 `read-alerts.mjs`를 불러오지 않습니다.

`respond.mjs`의 서버 전용 `createResponder({resolveVerifiedRequest})`는 신뢰할 수 있는 서버가 경보와 엔진 검증 요청을 연결한 경우에만 해당 반/프로젝트/기기 범위의 15분 격리 규칙을 생성합니다. 같은 기기의 새 요청도 격리하며 다른 기기/프로젝트의 정상 요청은 보존합니다. 근거 경보 번호·만료 시각을 기록하고 기존 판정기의 거부·재인증 요구를 허용으로 바꾸지 않습니다. 원본 계정·IP·경로·본문·토큰을 로그에 쓰지 않습니다. 기본 연결은 없으므로 차단 후보 알림만 기록합니다. **제공 ALEPH 엔진의 실제 기기 대응 연결·운영 격리는 미실행**입니다. 프로세스 내 규칙은 재시작하면 소멸합니다.

재현: `node xdr/persistence/read-alerts.mjs` → 24줄, `npm run xdr:run -- persistence` → `xdr/persistence/result.json`, `node --test test/persistence.test.mjs` → 독립 sandbox·분류·비밀값 가림·기기 격리/정상 허용/만료, `node --test test/*.test.mjs` → 기존 회귀. 알림 기록: `node xdr/persistence/respond.mjs` (`xdr/alerts.log`는 제외). 설치는 Node.js 22 이상에서 `npm install`입니다.

학생 자체 시험 결과는 **block 8 / alert 8 / record 8**, 일상 이벤트 8건의 block은 **0**입니다. 이는 시험 경보 내용 대조 결과이며 공식 심판 판정과 구분합니다. xdr-04 실제 심판은 저장점 작성 시 미실행입니다. 운영 DB 변경/시험은 이번 작업에서 실행하지 않습니다.

출처: https://attack.mitre.org/techniques/T1543/ · https://attack.mitre.org/techniques/T1053/ · https://attack.mitre.org/techniques/T1547/001/ · 제공 `xdr/README.md`. 패턴/분류/adapter는 학생 구현, ALEPH SDP는 제공 엔진입니다.

## 보너스 xdr-05 저장점 · 권한 가로채기

원본 `xdr/fixtures/privilege.json` 26건과 기존 판정기·앱·API·DB 및 앞선 XDR 모듈을 보존합니다. 새 reader는 시각·출발 주소·가상 계정·규칙 수준·설명 다섯 항목만 추출하고 비밀값 의심 필드를 가립니다. 판단기는 reader를 불러오지 않습니다.

`patterns.json`을 `decide.mjs` 맨 위 상수에 동일하게 옮겼습니다. 관리자 그룹 추가와 원격 주소/다계정 추가/즉시 명령 실행, 제거 직후 재추가, 방금 상승한 권한 또는 타인 권한의 명령 실행, 낯선 주소와 비정상 시각의 권한 사용 등 명확한 조합은 block(0.92~0.96)합니다. 취소·실패·그룹 조회·일반 그룹 변경·단발 관리자 명령의 불완전한 신호는 alert(0.55)이며 정상 로그인/관리 작업은 record(0.1)입니다. 경보 ID나 계정 이름으로 정답을 결정하지 않습니다. 시간/그룹 이름/높은 수준 하나만으로 차단하지 않습니다.

근거는 MITRE ATT&CK T1068/T1078이며 그룹 변경에는 T1098을 추가로 명시합니다. 경보의 권한 상승만으로 소프트웨어 취약점 악용 성공이라고 단정하지 않습니다. `decide.mjs`는 다른 파일·패키지를 불러오거나 파일·네트워크 I/O를 하지 않는 독립 함수입니다.

서버 전용 `respond.mjs`는 신뢰할 수 있는 서버의 `resolveVerifiedRequest` 연결이 있을 때만 block 대상의 엔진 검증 반/프로젝트/주체 범위에 15분 접속 거부 규칙을 만듭니다. 같은 주체의 새 요청/다른 기기 요청은 거부하고 다른 주체/프로젝트는 기존 판정 결과를 유지합니다. 기존 deny·step_up를 allow로 바꾸지 않으며 기존 판정기 규칙과 RULE_IDS는 수정하지 않습니다. 근거 경보 번호·만료 시각·고정 판단 결과만 로그에 쓰고 원본 계정·IP·그룹·본문·토큰은 제외합니다.

**실제 세션 회수 한계:** 공식 요청 계약에는 세션 ID/토큰 회수 API가 없습니다. 이 부품은 주체 범위의 임시 접근 거부이며 Supabase 토큰을 폐기한 것으로 주장하지 않습니다. 기본 실행은 신뢰할 수 있는 연결이 없어 차단 후보 알림만 기록합니다. 제공 ALEPH 엔진의 실제 주체 연결/운영 세션 회수는 미실행입니다. 프로세스 내 규칙은 재시작 시 소멸합니다.

재현: `node xdr/privilege/read-alerts.mjs` → 26줄, `npm run xdr:run -- privilege` → `xdr/privilege/result.json`, `node --test test/privilege.test.mjs` → 독립 sandbox/분류/가림/추가 거부/정상 요청/만료, `node --test test/*.test.mjs` → 기존 회귀. 알림 실행은 `node xdr/privilege/respond.mjs`; 로그는 커밋하지 않습니다. Node.js 22 이상에서 `npm install`로 설치합니다.

학생 자체 시험 결과: **block 9 / alert 8 / record 9**, 정상 이벤트 9건의 block **0**. 공식 심판은 사용자가 직접 제출하며 이 저장점 작성 시 미실행입니다. 앞선 xdr-04도 실제 판정 결과를 아직 받지 않아 통과로 기록하지 않습니다. 이번 작업은 운영 DB 변경·시험을 하지 않습니다.

출처: https://attack.mitre.org/techniques/T1068/ · https://attack.mitre.org/techniques/T1078/ · https://attack.mitre.org/techniques/T1098/ · 제공 `xdr/README.md`. 판단/접속 거부 부품은 학생 구현, ALEPH SDP는 제공 엔진입니다.

## 보너스 xdr-06 저장점 · 자료 빼돌리기

원본 `xdr/fixtures/exfiltration.json` 30건과 기존 판정기·자료실·API·DB 및 앞선 XDR 모듈은 보존합니다. 새 reader는 시각·출발 주소·가상 계정·규칙 수준·설명만 추출하며 비밀값 의심 필드는 가립니다. 목적지·전송량·원본 전체를 출력하지 않습니다. 판단기는 reader를 불러오지 않습니다.

`patterns.json`의 네 패턴은 `decide.mjs` 맨 위 동일 상수입니다. 유효 목적지로 50,000,000 bytes 이상 전송에 낯선 목적지, 비정상 시각의 압축/반복 반출, 다른 포트의 여러 자료, 짧은 시간 전체 외부 복사, 또는 명시적 대용량 5회 이상 반복이 함께 있으면 block(0.92~0.96)합니다. 작은/중간 전송·압축 생성만 확인·단발 변화·실패 경보는 alert(0.55), 평소 소량 조회/동기화는 record(0.1)입니다. 전송량/목적지/시각/규칙 수준 하나만으로 block하지 않습니다. 잘못된 수치·주소는 강한 신호로 사용하지 않습니다.

MITRE ATT&CK T1041/T1048을 근거로 삼으며 50MB/5회는 제공 fixture를 위한 **학생 학습 기준**입니다. ATT&CK 공식 임계값, 실제 업무 평균/허용 목록, 실제 C2 통로나 유출 성공을 확인한 것으로 주장하지 않습니다. 시각과 목적지의 새로움은 경보에 명시된 근거만 읽습니다. 경보 ID·계정·IP를 정답표로 사용하지 않습니다. `decide.mjs`는 import·파일·네트워크 I/O 없는 독립 함수입니다.

서버 전용 `respond.mjs`의 `createResponder({resolveVerifiedRequest, resolveRequestDestination})`는 서버 경보를 엔진 검증 요청과 연결하고, 실제 요청 목적지를 신뢰할 수 있는 서버가 확인한 경우에만 해당 반/프로젝트/목적지 IPv4 범위에 15분 거부 규칙을 적용합니다. 경보의 출발 IP로 신원을 만들지 않고 브라우저의 목적지 주장도 읽지 않습니다. 공식 18필드 요청에 목적지 필드를 추가하지 않습니다. 같은 프로젝트에서 대상 목적지 요청은 거부하고 다른 목적지/프로젝트와 기존 deny/step_up는 보존합니다. 근거 경보 번호와 만료 시각을 기록하되 원본 주소·계정·전송량·자료·토큰은 로그에 쓰지 않습니다.

**집행 한계:** 기본 실행에는 두 신뢰 연결이 없어 block은 차단 후보 알림만 기록합니다. 제공 ALEPH 엔진의 실제 목적지 확인/운영 egress 차단은 미실행이며 로컬 adapter 검증과 구분합니다. IPv4를 대상으로 하며 프로세스 내 규칙은 재시작 시 소멸합니다. 운영 네트워크 방화벽이나 DB를 수정하지 않습니다.

재현: `node xdr/exfiltration/read-alerts.mjs` → 30줄, `npm run xdr:run -- exfiltration` → `xdr/exfiltration/result.json`, `node --test test/exfiltration.test.mjs` → 독립 sandbox/분류/가림/목적지 거부/정상 요청/만료, `node --test test/*.test.mjs` → 기존 회귀. 알림 실행: `node xdr/exfiltration/respond.mjs`; 로그는 커밋하지 않습니다. Node.js 22 이상에서 `npm install`로 설치합니다.

학생 자체 시험 결과: **block 10 / alert 10 / record 10**, 정상 이벤트 10건의 block **0**. 첫 분류의 대용량 반복 한 건이 알림이어서 해당 근거 조합만 추가했습니다. 공식 심판은 사용자가 직접 제출하며 저장점 작성 시 미실행입니다. xdr-04/05의 실제 판정도 아직 받지 않아 성공으로 기록하지 않습니다.

출처: https://attack.mitre.org/techniques/T1041/ · https://attack.mitre.org/techniques/T1048/ · 제공 `xdr/README.md`. 탐지/목적지 거부 부품은 학생 구현, ALEPH SDP는 제공 엔진입니다.

## 최종 10단계 기준점과 11단계 준비

10단계 기준점은 `d2bc9e76a2c2c8dfef068074c75904409eceead8`입니다. 사용자가 이 커밋의 실제 심판 100/100 통과를 전달했고, 2026-10-14 KST 클라우드 브라우저의 실제 방어전 상황실에서도 10단계 「막아 냈습니다」를 확인했습니다. 아래 12점 기록은 이전 커밋의 과정 기록입니다. 새로 받은 main과 Vercel Production READY의 SHA도 기준점과 일치했습니다.

11단계 1차 후보 `5607aba8ca00376b2799a2ab0fd07500f9e4b99f`의 실제 심판은 40/100점입니다. `S11_DATA_BEFORE_APPROVAL`, `S11_BADGE_IS_TRUST`를 확인하고 승인 확인 전 목록·편집·복원 화면을 모두 닫도록 수정했습니다. 설치 이벤트와 승인 요청 버튼으로는 자료실을 열 수 없습니다.

## 11단계: 접속 화면과 서버 승인 상태

- `public/manifest.webmanifest`는 앱 이름·아이콘·standalone 시작 화면을 설정합니다. 설치 표시는 기기 승인을 의미하지 않습니다.
- Service Worker는 `offline.html` 안내만 저장합니다. 메모·보호 API 응답·키·로그인 토큰은 캐시하지 않습니다. 오프라인 이벤트에서도 화면의 자료를 즉시 비웁니다.
- 로그인 이후 먼저 `GET /api/device/status`를 요청합니다. HTTP 200, `approved === true`, `state === 'approved'`가 모두 맞을 때만 기존 메모·편집·복원 화면을 열고 메모를 요청합니다. 서버 오류·미등록·대기·만료·회수 상태에서는 닫힌 상태를 유지합니다.
- `POST /api/device/request`는 동일 출처의 검증된 사용자만 요청할 수 있으며 별도 `a11_device_requests`에 `pending`만 저장합니다. HttpOnly·Secure·SameSite=Strict 기기 쿠키를 쓰고 DB에는 그 값의 SHA-256만 저장합니다. 기기 식별 값·로그인 토큰·키를 JavaScript 저장소나 응답 JSON에 넣지 않습니다.
- 요청 버튼을 눌러도 승인되지 않습니다. 서버 앱의 DB 역할은 이 테이블의 SELECT·INSERT만 허용하고 UPDATE·DELETE 권한이 없습니다. 운영자가 별도로 요청과 사용자를 검토해 승인 기록을 만든 뒤 서버가 현재 로그인 소유자·기기 지문·상태·승인 시각·만료를 대조합니다. 일반 사용자·앱이 호출할 승인 API는 없습니다.
- 「서버 승인 결과 확인」을 누르면 이전 자료를 즉시 비우고 결과를 다시 읽습니다. 승인 확인 실패 뒤에는 이전 승인을 재사용하지 않습니다. 승인한 기기는 기존 자료실 UI를 사용하며 기존 메모·복원 API 및 판정기·탐지기는 보존합니다.

이 서버 상태 API는 운영자 공개 표본의 `approved` 결과 표시 구조를 참고한 이 앱의 구현입니다. 제공 SDP 엔진의 미공개 서명 헤더나 기기 승인 계약을 임의로 만들어 공식 계약이라고 주장하지 않습니다. 1차 실제 심판 화면은 경로·본문 변경 공격을 격파로 표시했고, 앱 서명 없이 보호 요청 공격에서 화면 승인 조건 두 개가 실패했습니다.

검증: 전체 로컬 테스트 102/102, 승인 전 화면 차단·승인 확인 뒤 기존 화면·재확인 실패/오프라인 자료 비움·요청의 승인 불가·소유자/만료 대조 시험 통과. 실제 DB의 RLS·역할 권한 및 pending→운영 승인 상태를 격리 트랜잭션에서 검사하고 ROLLBACK했습니다. 11단계 2차 실제 심판은 `529269c50a147446a53787e8a31a465ec3bc78f4`에서 조건 6개·완결성 가점 3개를 모두 확인해 100/100점 통과했습니다. 실제 승인 완료 학생 브라우저의 별도 실사용 시험은 미실행으로 구분합니다.

## 제작 1·2: 안전 정책 검증·차이·시험 정책 복원

서비스 `notes`, 경로 `GET /api/restore/policy`는 사전 정책 사본과 현재 **시험 정책** 차이를 반환합니다. `backupVerified`, `scope: test_only`, `backupVersion`, `changes`를 확인하고 실행할 변경 항목을 먼저 표시합니다. `POST /api/restore/policy`는 검증된 심판 인증에만 제공하며, preview 버전 및 변경 범위를 다시 확인한 뒤 시험 정책만 복원합니다. `a10_policy_backups`와 독립적인 `a10_policy_seals`의 해시를 재검증하고 사본 부재·검증 실패·버전 변경은 중단합니다. 실제 운영 RLS·다른 서비스 규칙·기존 감사 기록은 변경하지 않습니다.

구현: `src/recovery-handler.mjs`, `sql/10_versioned_seals.sql`, `sql/10_verified_recovery.sql`. 운영 인증·소유권 제한은 `src/verify-login.mjs`, `src/notes-handler.mjs`에서 유지됩니다. 시험 정책 복원은 운영 인증·기기 정책을 덮어쓰는 기능이 아닙니다.

## 제작 3: 비공개 메모 정확히 한 건 복원

제출 복원 서비스는 **notes**, 경로는 **POST /api/restore/:id**입니다. `:id`에는 정확한 메모 UUID를 넣습니다. 인증은 `Authorization: Bearer <정상 발급 토큰>` 또는 기존 HttpOnly 쿠키를 사용합니다. 쿠키 POST는 동일 출처 검사를 거칩니다. 요청 본문으로 소유자를 지정할 수 없습니다.

1. `GET /api/restore/:id`로 preview를 요청합니다. 검증된 사본의 `id`, `ownerId`, `contentHash`, `titleHash`, `backupVersion`, 현재 `stateVersion`, `changedFields`를 표시합니다.
2. `POST /api/restore/:id`를 호출합니다. 본문은 없어도 되며, 명시적 확인에는 `{expectedVersion, expectedState, expectedHash}`를 사용합니다. 값은 앞서 받은 preview의 `backupVersion`, `stateVersion`, `contentHash`입니다. `id` 또는 `noteId`를 넣는 경우 경로 ID와 정확히 같아야 합니다. 임의 소유자·역할 값은 거부합니다.
3. 서버는 POST에서도 `a10_preview_verified_note`로 **사본과 봉인을 다시 읽습니다**. 사본 ID·서버에서 검증한 소유자·본문/제목 해시·독립 seal을 검사합니다.
4. `a10_restore_versioned_note`는 트랜잭션 잠금 후 다시 preview를 읽고 사본 버전·현재 상태 버전을 비교합니다. `a10_restore_note`가 지정된 한 행만 INSERT 또는 UPDATE합니다. 삭제와 변조는 같은 검증을 사용합니다.
5. 복원 직후 DB 행을 다시 읽어 ID·소유자·제목/본문 해시를 검사하고 감사 한 건을 추가합니다. 다른 메모와 기존 감사 행은 보존합니다.

성공 응답은 HTTP 200이며 `id`, `ownerId`, `contentHash`, `backupVersion`, `verified: true`, `restored: true`, SQL `retest`, `postRestoreRetest`를 포함합니다. HTTP 401은 인증 실패, 404는 소유자 범위의 사본 부재, 409는 백업·버전 검증 실패, 503은 서버/RPC 또는 복원 후 일치 검증 실패입니다. HTTP 200의 복원 성공만으로 전체 재시험 성공을 주장하지 않습니다. `postRestoreRetest.checks`의 실제 결과를 따로 확인합니다.

사본은 최초 메모 INSERT 때 `a10_capture_new_note`로 생성되고 같은 트랜잭션에서 봉인됩니다. UPDATE는 사본을 갱신하지 않습니다. 메모 생성 API는 기존 불변 백업 UUID 재사용을 409로 거부하고, 신규 생성 후 preview를 재조회해 원본과 일치해야 201을 반환합니다. 기존 사본을 현재 변조 내용으로 덮어쓰거나 새 정상 사본으로 위장하지 않습니다. 기존 자료의 사본·봉인은 2026-10-13에 생성됐으며 그 이전 침해 전 사본이었다고 주장하지 않습니다.

## 제작 4: 복원 뒤 실제 검사와 미실행 범위

복원 커밋 이후 `src/post-restore-retest.mjs`가 아래 순서로 검사를 시작합니다. 반환 증거에는 토큰·메모 본문·타인 메모 ID를 넣지 않습니다.

| 검사 | 실행 방식과 판정 |
|---|---|
| 복원된 소유자 GET | 실제 Production HTTP 200, ID·본문 SHA-256 비교 |
| 익명 GET | 실제 HTTP 401 기대 |
| 잘못된 토큰 GET | 실제 HTTP 401 기대 |
| 미등록 메모 경로 | 실제 HTTP 400 기대 |
| 복원 후 backup preview | 실제 HTTP 200, 동일 ID·소유자·해시·변경 항목 없음 |
| 타인 메모 GET | 실제 HTTP 404 기대; 타인 fixture가 없으면 미실행 |
| 6·7단계 판정기 fixture | 로컬 가상 요청; 실제 심판 결과와 구분 |
| 9단계 폭주 fixture | 로컬 가상 사건; 실제 세션 회수와 구분 |
| 전체 심판 A/B 및 1~9단계 전체 재전송 | `judgeFullReplay: not_run`; 수행했다고 주장하지 않음 |

운영자의 실제 심판 B 요청에 대해 이 순서가 끝까지 실행됐는지는 별도 관측으로 확인해야 합니다. 복원 실패 시 복원 후 재시험이 실행되지 않을 수 있습니다. `allExecutedChecksPassed`는 실행한 검사들만 대상으로 하며 미실행을 성공으로 채우지 않습니다.

## 실제로 수행한 검증과 한계

2026-10-14 KST 실제 Supabase 격리 트랜잭션 시험을 수행하고 모두 ROLLBACK했습니다. 기존 사용자 메모를 수정·삭제하지 않았습니다.

| 실제 DB 시험 | 결과 |
|---|---|
| 최초 원본 → 백업/봉인 → DELETE → 복원 | 성공, 원본 ID·소유자·제목/본문 해시 일치 |
| 최초 원본 → 백업/봉인 → 제목·본문 UPDATE → 복원 | 성공, 사본 버전 유지·현재 상태 버전 변경·원본 해시 일치 |
| 다른 메모 전체 행 보존 | 일치 |
| 복원 감사 | 한 건 추가 확인 후 롤백 |
| 타인 소유자·사본 부재 | P0002로 중단 |
| 오래된 상태·잘못된 버전·잘못된 사본 내용 해시 | 23514로 중단 |
| 기존 백업·봉인 덮어쓰기 | 23514로 차단 |

이 DB 시험은 실제 심판 B의 인증된 HTTP 실행 성공을 대신하지 않습니다. 실제 심판에서는 e3b88bfaf082 커밋이 12/100점이며 S10_BACKUP_UNVERIFIED·S10_RESTORE_MISMATCH·S10_RETEST_MISSING이 남았습니다. 같은 커밋에 실제 DB 시험 근거를 전달한 후 UNV_AMBIGUOUS 판정도 관측했습니다. 원인이나 점수 개선을 확인했다고 주장하지 않습니다.

`a10_recovery_ingress`는 정상 서버 설정에서 인증 요청 수신·거부·성공의 고정 코드와 임의 서버 추적값만 비공개로 기록합니다. 정상 소유자 조회 이전에 메모·백업을 읽지 않습니다. 진단 실패는 기존 인증/복원 결정을 바꾸지 않습니다. 실제 Production의 잘못된 토큰 요청으로 401/auth_rejected 및 DB ingress 기록을 확인했습니다.

## 다시 실행하기

`npm install`, `node --test test/*.test.mjs`, `npm run decider:test`, `npm run detect:test`, `npm run build -- --local` 순으로 로컬 검증합니다. 최신 진단 변경의 전체 로컬 테스트는 97/97 통과했습니다. 이는 심판 통과 증거가 아닙니다. 서버 비밀 설정은 Vercel 환경변수에서만 유지합니다. `npm run bundle`은 커밋된 저장소 상태와 실제 공개 배포에 대해 수행하며 인증된 B 복원 미실행 항목을 그대로 남깁니다.

1~9단계 인증·소유권·기기·재인증·자원 경로 통제는 그대로 유지합니다. `src/decider.mjs`는 `docs/DECIDER_REQUEST.md`의 공식 필드만 읽고 등록된 RULE_IDS만 반환합니다. `aleph.config.json`의 step은 12입니다.
