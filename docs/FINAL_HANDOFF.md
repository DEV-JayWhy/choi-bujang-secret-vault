# 케셰브 22단계 최종 인수인계·재현 기록

작성일: 2026-10-26(KST). 릴리스 상태는 **검증 중**입니다. 실제 학생 계정의 19단계 집행·효과 확인 연결은 미완료(UNV)이며, 운영 인증이나 v1.0 인증을 주장하지 않습니다. 6d216c499d37 제출의 공식 피드백은 2026-10-26 10:36 KST에 reproduction_record_consistency 실패였습니다. 이번 보완본은 아직 제출하지 않았습니다.

## 1. 인수인계 대상과 버전

| 항목 | 값과 근거 |
|---|---|
| 저장소 | `https://github.com/DEV-JayWhy/choi-bujang-secret-vault` |
| 원본 브랜치 | `main` |
| 새 복제의 최초 고정 커밋 | `74ebcf5a9869d603ff675e832bcb498860695b8a` — 21단계 문서 포함 버전 |
| 실제 실행을 확인한 커밋 | `6d216c499d37fd80ed1fa4a54ba84ffe76e8d9f1` — 새 clone의 깨끗한 checkout에서 실행 |
| 이번 증거 보완 커밋 | 현재 HEAD. 이전 실행 기록을 저장소 원문 안에 포함하고 문서만 보완. 실행 커밋과 보완 커밋을 같은 SHA라고 적지 않음 |
| 포함된 실행 증거 | [evidence/reproduction-6d216c499d37.json](evidence/reproduction-6d216c499d37.json), 7,126바이트 |
| 앱 package 버전 | `on-client/package.json`의 `0.2.11` 유지. v1.0으로 올리지 않음 |
| 동일 앱 원문 식별 | `git rev-parse HEAD:on-client` = `1ba586a69f3d40500ecef8c1ca154d7459626916`. 이번 단계는 루트 README·학생 문서·검사 도구만 추가/수정하며 앱 코드는 변경하지 않음 |
| 실제 확인 환경 | Linux x86_64, Node.js `v24.22.1`, npm `11.9.0`. 수업 기준 `24.19.0`과 실제 실행 버전을 구분 |
| 실행 설명서 | [STUDENT_RUNBOOK.md](STUDENT_RUNBOOK.md) — 경로·명령·구성도·지원 환경·제공/학생 경계 |
| 재현 도구 | [verify-final.mjs](verify-final.mjs) — Node 내장 모듈만 사용, 결과는 프로젝트 밖의 새 JSON 파일로 생성 |

실제 실행 JSON을 이 커밋의 `docs/evidence/`에 포함했습니다. 외부 파일이 추후 전달될 예정이라는 설명으로 대신하지 않습니다. JSON의 실행 커밋은 `6d216c499d37fd80ed1fa4a54ba84ffe76e8d9f1`이고, 관측은 그 커밋에서 수행한 결과입니다. 이번 문서·증거 보완은 별도 커밋이며 이를 같은 커밋 실행이라고 바꾸어 기록하지 않습니다.

검토자는 JSON의 `onClientTree`와 이번 HEAD의 `git rev-parse HEAD:on-client`를 비교할 수 있습니다. 두 값은 `1ba586a69f3d40500ecef8c1ca154d7459626916`이고, 앱 전체 파일이 동일합니다. 재현 도구 `docs/verify-final.mjs`와 21단계 설명서도 변경하지 않습니다. 아래 읽기 전용 대조가 빈 차이를 반환해야 하며, 차이가 있으면 이전 실행 결과를 적용하지 않고 그 새 버전을 다시 실행해야 합니다.

```powershell
git diff 6d216c499d37fd80ed1fa4a54ba84ffe76e8d9f1 HEAD -- on-client docs/verify-final.mjs docs/STUDENT_RUNBOOK.md
git rev-parse HEAD:on-client
```

포함된 JSON의 SHA-256은 `f5e705d9ff67bf1b9fa785c2d9fdd3b78bb0a1170c1a600b02c49869ded86a44`입니다. 새 커밋 해시를 JSON 안에 허위로 바꾸거나, 예비 검사 결과를 최종 실행 결과로 바꾸지 않았습니다.

## 2. 원래 작업 보존과 새 폴더 받기

이번 작업에서는 기존 `repo`와 `runbook-check` 폴더를 수정·삭제하지 않고 새 `keshev-stage22-repro` 폴더에 GitHub 저장소를 실제 `git clone --no-checkout`으로 받았습니다. 기준 커밋으로 detached checkout한 직후 `git status --short` 출력이 비어 있었습니다. 기존 폴더의 인증·설정 파일을 복사하지 않았습니다. 이것은 AI 작업 환경의 관측이며, 사용자의 PC 폴더 보존 여부를 원격으로 확인한 진술은 아닙니다.

사용자는 기존 프로젝트 밖의 부모 폴더에서 아래 절차를 수행할 수 있습니다. `keshev-final`이 이미 있으면 다른 **새 폴더 이름**을 선택합니다. 기존 폴더를 지우거나 `git reset --hard`, `git clean`으로 비우지 않습니다. Windows 명령은 안내이며 이번에 실제 Windows에서 실행하지 않았습니다.

```powershell
$releaseCommit = Read-Host '제출할 최종 40자리 커밋을 입력하세요'
if ($releaseCommit -notmatch '^[0-9a-f]{40}$') { throw '40자리 커밋을 확인하세요' }
git clone --no-checkout https://github.com/DEV-JayWhy/choi-bujang-secret-vault.git keshev-final
if ($LASTEXITCODE -ne 0) { throw '새 폴더 복제 결과를 확인하세요' }
Set-Location .\keshev-final
git switch --detach $releaseCommit
if ($LASTEXITCODE -ne 0) { throw '커밋을 받지 못했습니다' }
if ((git rev-parse HEAD) -ne $releaseCommit) { throw '다른 커밋입니다' }
git status --short
```

원래 폴더와 새 폴더의 작업 상태를 별도로 확인합니다. 이 명령은 새 checkout에 대해 수행하며 원본의 미커밋 작업을 가져오거나 덮어쓰지 않습니다. 비공개 저장소는 본인의 정상 Git 인증으로 접근하고 비밀번호·토큰을 명령·문서·채팅에 넣지 않습니다. 원격에 없는 커밋의 로컬 복제나 수료 내보내기는 공식 도구 절차를 따르며, 이번에는 GitHub에 올라간 커밋을 사용했습니다.

## 3. 이동에 필요한 파일·설정·실행

전체 저장소의 최종 커밋을 받으면 기존 이력·학생 코드·README·설정 견본·제공 모듈이 함께 보존됩니다. `on-client` 일부 파일만 복사한 폴더를 Git clone 재현이라고 부르지 않습니다.

| 준비물 | 처리 원칙 |
|---|---|
| `on-client/src`, `public`, `student`, `vendor`, `tools` | 같은 최종 커밋의 파일을 사용. 제공 서버·인증·판정 코드는 수정하지 않음 |
| `on-client/package.json` | 외부 npm 의존성 없음. 앱 폴더에 `package-lock.json`이 없으므로 기본 실행에 `npm install`·`npm ci` 불필요 |
| 저장소 최상위 package·lock | 이전 방어전 의존성. 앱 실행·검사 때문에 변경·다운그레이드하지 않음 |
| `.env.example` | 비밀 없는 견본만 이동. 자동 로드 기능이 있다고 가정하지 않음 |
| 개인 호스트·자격·인증 설정 | 저장소 밖에서 담당자 절차로 준비. 기존 PC 설정·키를 무작정 복사하지 않음 |
| 실서비스 데이터·개인 SQLite | Git 코드와 별개. 아래 데이터 보존 계획에 따라 담당자가 관리 |

새 checkout의 `on-client`에서 21단계 설명서를 따라 확인합니다.

```powershell
Set-Location .\on-client
node --version
npm --version
npm run check
npm start
```

정상 시작 로그는 `케셰브 연결 확인: http://127.0.0.1:5189`입니다. 브라우저 주소는 `http://127.0.0.1:5189/`입니다. 기본 엔진은 `disconnected`이므로 시작 로그의 “연결 확인”을 실제 엔진·AI 연결 성공으로 적지 않습니다. 확인 후 실행 창에서 `Ctrl+C`, 같은 폴더에서 `npm start`로 재실행합니다. 예제 확인은 기본 서버를 종료한 후 `npm run demo`로 수행하고, 예제도 종료합니다. Windows 제공 실행 도구와 포트 변경은 21단계 설명서를 따릅니다.

Linux에서 직접 확인한 절차는 Node 진입점 실행, GET 응답, 프로세스 종료, 예제, 기본 재시작입니다. Windows PowerShell·새 Windows 설치·브라우저 메뉴/키보드 조작은 미확인입니다. 클라우드 브라우저가 이 실행 환경의 loopback 주소에 접속하지 못해 `ERR_CONNECTION_REFUSED`가 관측됐습니다. 이를 앱의 화면 성공이나 봇 차단으로 기록하지 않습니다.

## 4. 최종 커밋 실행 증거 생성

최종 커밋으로 고정한 **Git 최상위 폴더**에서 실행합니다. 이미 실행한 앱이 있으면 자기 앱 실행 창에서 먼저 정상 종료합니다. 다른 프로세스의 포트를 빼앗거나 종료하지 않습니다.

```powershell
node .\docs\verify-final.mjs --output ..\keshev-evidence\final-reproduction.json
```

위 명령의 도구는 이 저장소에 포함됩니다. 실제 검증은 Linux의 `node docs/verify-final.mjs --output ../keshev-evidence/final-reproduction.json` 형태로 수행합니다. Windows 실행은 미확인입니다. 도구는 출력 폴더를 만들지만 기존 JSON을 덮어쓰지 않으므로 재실행할 때는 프로젝트 밖의 새 파일명을 선택합니다.

도구의 작업과 한계:

- 실행 checkout의 40자리 `commit`과 `onClientTree`, 런타임·앱 버전·시각을 기록합니다.
- `git status --porcelain`으로 검사 전후의 추적/미추적 변경을 확인합니다. 제외된 개인 파일까지 없다고 보증하는 검사가 아닙니다.
- package의 실행 진입점을 대조하고 `node --check student/extension.mjs`를 실행합니다.
- 실제 `createStudentView`의 13~20단계 함수를 합성 자료·모의 DOM으로 검사하고, 21단계 설명서 원문을 확인합니다. 화면 렌더링 엔진·실제 클릭·운영 데이터 검사가 아닙니다.
- 기본·예제·기본 재시작마다 6개 로컬 GET을 수행합니다. `node src/server.mjs`와 `node src/server.mjs --demo`는 현재 package의 `start`·`demo` 진입점과 같습니다. 별도 의존성을 설치하지 않습니다.
- 자식 서버에는 PATH와 고정 로컬 포트만 전달하며 개인 AI·호스트 자격을 복사하지 않습니다. AI 요청·OSV 외부 요청·조치 POST·단계 제출은 하지 않습니다.
- 검사마다 자기 자식 서버만 종료합니다. 앞 단계 결과를 합산해 실제 운영 전체 성공이라고 쓰지 않습니다.

`result: passed_within_scope`는 이 도구가 수행한 범위만 통과했다는 뜻입니다. `cleanBefore`·`cleanAfter`가 false이면 `candidate_dirty_worktree_only`로 기록해 최종 깨끗한 checkout의 증거와 구분합니다. 실제 집행 미완료가 남으므로 `releaseState`는 계속 `verification_in_progress`입니다.

## 5. 실제 최종 실행 기록과 13~21단계 관찰

이 절은 예비 검사가 아니라 포함된 [실행 증거 JSON](evidence/reproduction-6d216c499d37.json)의 실제 기록입니다.

| 항목 | 실제 값 |
|---|---|
| 실행 커밋 | `6d216c499d37fd80ed1fa4a54ba84ffe76e8d9f1` |
| 실행 시각 | 2026-10-26 10:15:08.048~10:15:08.548 KST (`2026-10-26T01:15:08.048Z`~`2026-10-26T01:15:08.548Z`) |
| 환경·버전 | Linux x64, Node.js v24.22.1, npm 11.9.0, 앱 0.2.11 |
| 작업 트리 | `cleanBefore: true`, `cleanAfter: true` |
| 실행 절차 | 새 Git clone → 정확한 커밋 detached checkout → `node docs/verify-final.mjs --output ../keshev-evidence/final-reproduction.json` |
| 범위 내 결과 | `passed_within_scope`, 문법 검사 통과, 13~21단계 검사 9개 묶음, 로컬 GET 18건 |
| 운영 상태 | `verification_in_progress`, 실제 집행 연결 미완료(UNV) |

다음 시각은 JSON의 `stages[].checkedAt` 원문(UTC)입니다. 모의 DOM 결과는 실제 브라우저·운영 연결 성공이 아닙니다.

| 단계 | 기능·관찰 결과 | 근거 종류 | 확인 시각(UTC) | 실제 사용 미확인 원인 |
|---|---|---|---|---|
| 13 | 본인·기기·세션 표시 및 원래 상태 코드 | mock_dom | `2026-10-26T01:15:08.215Z` | 실제 본인 계정·기기 연결 없음 |
| 14 | unknown은 접근 허용이 아님 | mock_dom | `2026-10-26T01:15:08.215Z` | 실제 업무 앱 판정 요청 미실행 |
| 15 | 원본 불변·최신순 목록·버튼 상세 근거·규칙 | mock_dom | `2026-10-26T01:15:08.216Z` | 실제 접속·XDR 원천 연결 없음 |
| 16 | 빈 목록·loading·미조회 진단 구분 | mock_dom | `2026-10-26T01:15:08.216Z` | 실제 기기·세션·브라우저 복사 미확인 |
| 17 | test/verified·설명 미실행·idle 초기화 | mock_dom | `2026-10-26T01:15:08.217Z` | 실제 앱 승인·모델 점검 미실행 |
| 18 | 현재 사건 근거·규칙·unknown·잘못된 ID 거절·event null 오류 | mock_dom | `2026-10-26T01:15:08.218Z` | 유료 설명·브라우저 비동기 경쟁 미확인 |
| 19 | 11상태·ACK와 효과 구분·효과 true만 확인·학생 실행 버튼 없음 | mock_dom | `2026-10-26T01:15:08.219Z` | 실제 집행기 연결 미완료(UNV) |
| 20 | 정확한 버전·partial ID 보존·전체 상태·loading 초기화 | mock_dom | `2026-10-26T01:15:08.220Z` | 실제 승인 대상 OSV·설치 버전 대조 미실행 |
| 21 | 현재 원문의 설명서·명령·구성도·제한 확인 | source_review | `2026-10-26T01:15:08.220Z` | 새 Windows·실제 브라우저 미확인 |

HTTP 증거는 JSON의 `http` 배열에 실행 구분·경로·응답 코드·모드·시각으로 포함돼 있습니다. 기본·예제·기본 재시작 각 6건이며, `/`와 학생 모듈은 HTTP 200, 기본 엔진 조회는 HTTP 503/ENGINE_NOT_CONNECTED, 예제 기록은 HTTP 200/demo/1건, 진단은 HTTP 200, 패키지는 not_configured였습니다. 앱 시작을 실제 엔진·AI·OSV 성공으로 해석하지 않습니다.

이전 문서의 21단계 기준 커밋 예비 검사(10:10:26 KST)는 개발 이력이며 이 표의 근거가 아닙니다. 서로 다른 커밋의 통과 결과를 합산하지 않았습니다. 실제 브라우저·Windows·운영 연결·유료 AI·실제 집행·OSV 외부 조회·공식 통과는 JSON의 unverified 및 boundaries대로 미확인입니다. 서버의 원문 검토는 이 JSON의 명령을 실행해 검증한 것이 아닙니다.

## 6. 데이터 보존·백업·복원 계획

이 절은 **계획**이며 학생 데이터·운영 DB의 실제 백업/복원은 이번에 수행하지 않았습니다. 코드의 재실행 성공을 데이터 복원 성공으로 확대하지 않습니다.

| 데이터 | 보존·백업 | 복원·검증과 제한 |
|---|---|---|
| 코드·학생 문서·Git 기록 | 기존 작업 폴더와 이력 보존. 최종 커밋을 별도 폴더에 복제해 버전을 고정. 미커밋 작업은 원래 폴더에서 별도 확인 | 새 폴더에서 정확한 커밋을 checkout하고 파일·버전 대조. 원본 reset/clean/덮어쓰기 없이 복원. 미커밋 작업은 clone만으로 백업되지 않음 |
| 개인 설정·자격·보관함 | `.env`류·호스트 설정·키는 Git/원문 JSON에 포함하지 않음. 담당자 보안 절차로 원본 권한·저장 위치 보존 | 기존 비밀 파일을 새 폴더에 무작정 복사하지 않음. Windows 계정/PC에 묶인 보관함의 이식성을 가정하지 않고 공식 계정·앱 승인 절차로 재확인. 비밀값 열람·출력 금지 |
| 로그인·기기·세션·접속/XDR 원천 기록 | 클라이언트 표시와 원천 데이터 구분. 원천 시스템 소유자가 접근권한에 맞게 일관된 백업·감사 기록 관리 | 학생이 운영 DB를 초기화/복원하지 않음. 담당자가 격리된 복원본에서 사용자·프로젝트·대상 범위와 조회 결과 대조. 실제 권한·효과 복원은 별도 운영 확인 |
| 조치 SQLite·intent·receipt·audit | `src/actions/store.mjs`는 명시된 기존 SQLite에 추가 테이블과 이력 보존 트리거를 사용. 실제 설정된 DB가 있을 때만 담당자가 정합성 있는 SQLite 백업 또는 쓰기 중지 후 안전한 사본을 준비 | 현재 기본 실행은 실제 DB 연결 없음. 복원 시 집행을 열지 않은 격리 환경에서 requestId/receiptId/version·audit 및 원천 효과를 대조. 과거 DB로 되돌려 소비된 확인 티켓이나 조치를 재실행하지 않음. 진행 중 DB 파일 하나만 복사해 완전한 백업이라고 주장하지 않음 |
| 패키지·lock·설치 목록 | 코드 커밋의 package/lock 보존. 승인 공개 목록은 담당자 관리. node_modules를 비밀·운영 설정과 함께 무작정 이동하지 않음 | 정확한 lock·설치 메타데이터 대조를 다시 수행. 예전 lockfileHash·OSV 결과를 현재 안전 판정으로 재사용하지 않음. 앱 폴더의 현재 외부 의존성 없음과 루트 의존성 구분 |
| 브라우저 표시·필터·AI/조치 상태 | 일시 표시이며 영구 원천 기록의 백업이 아님. 학생 함수는 입력마다 새 DOM 표시 | 새로고침 후 현재 신원으로 다시 조회. 이전 성공·대상·티켓을 복원하지 않음. 조치 화면 취소는 서버 효과 취소가 아님 |
| 재현 JSON | 프로젝트 밖에 새 파일로 저장. 전체 오류·환경변수·토큰·사건 원문 없이 허용 메타데이터만 기록 | 전달받은 `commit`과 실제 checkout, 환경·시각·검사 종류를 대조. 파일을 다시 커밋한 새 버전에 이전 실행 결과를 붙이지 않음 |

원천 데이터가 있는 학생의 실제 저장 위치·백업 시스템·보관 기간은 확인하지 않았습니다. 학생에게 운영자 자격이나 집행기 구축을 요구하지 않습니다. 실제 데이터 복원 연습은 이 문서만으로 수행하지 않으며 담당자의 승인된 절차가 필요합니다.

## 7. 릴리스 변경 이력과 미해결 항목

| 코드 이력 | 목적 | 이번 최종 재현에서의 취급 |
|---|---|---|
| `097bdc59b50fbcf05ed70113ae5a52741d6484ed` | 17단계 연결 점검/설명 구분 | 기능 유래 식별만. 당시 검사 결과를 최종 통과에 합산하지 않음 |
| `077e3f3506abf2032d28e99632e44741c941312f` | 18단계 근거 연결 설명 | 동일 |
| `5a4da5d121502ce57cfeb8e83efebaf36a689e0a` | 19단계 조치 상태 표시 | 동일. 실제 집행 연결은 계속 미완료 |
| `a729088c618f00a25de15a9ec9fa4e7a56c01552` | 20단계 패키지·OSV 표시 | 동일. 실제 외부 조회 성공을 주장하지 않음 |
| `74ebcf5a9869d603ff675e832bcb498860695b8a` | 21단계 실행 설명서·구성도 | 새 Git clone의 최초 기준. 최종 커밋과 동일한 on-client 트리 |
| `6d216c499d37fd80ed1fa4a54ba84ffe76e8d9f1` | 22단계 최초 제출본·실제 최종 재현 | 이번에 포함한 JSON의 실행 대상. 원문 검토에서는 증거 전달 누락으로 실패 |
| 증거 보완 커밋(현재 HEAD) | 실제 실행 JSON 포함·문서 보완 | 앱·재현 도구·21단계 설명서 동일성 대조. 기존 JSON의 실행 SHA를 보완 커밋 SHA로 변경하지 않음 |

예비 검사 도구의 결과 요약 출력에서 변수명 오류가 한 번 발생했습니다. 학생 앱 코드는 수정하지 않고 도구의 출력 참조를 고친 뒤 재실행했습니다. 이 실패를 성공으로 바꾸지 않으며 수정된 도구가 포함된 최종 커밋에서 다시 확인합니다.

미해결/미확인: Windows PowerShell 실행, 실제 브라우저·키보드·취소 경쟁, 실제 사용자/프로젝트 권한·SDP/XDR 연결, 실제 유료 AI 설명, 실제 조치 집행·원천 효과, 승인 패키지 OSV 외부 조회, 실제 데이터 백업·복원, 공식 22단계 판정입니다. `passed_within_scope`나 22단계 원문 검토 수료를 실제 운영 인증·전체 완성·v1.0으로 표현하지 않습니다.

## 8. 공식 제출과 다음 직접 확인

21단계 문서의 제출 안내를 따릅니다. 현재 워크벤치 「포털 제출 준비」는 13~20단계용입니다. 22단계 과제 화면에 저장소 URL과 최종 40자리 커밋을 직접 입력합니다. 비공개 커밋은 해당 화면의 「비공개 저장소 원문 준비 방법」「원문 전달 도구 받기」를 사용하고, ZIP 압축 해제 및 JSON 출력 위치를 프로젝트 밖에 둡니다.

`student-source-cli.mjs`의 전체 명령·사용자 PC 경로는 확인하지 않았으므로 임의 옵션/경로를 만들지 않습니다. 과제 화면의 명령에서 도구·출력 경로와 `--commit`만 실제 값으로 확인합니다. 원문 전달 완료와 판정 통과는 다르며, 원문 전달만 실패하면 「원문만 다시 보내기」를 사용합니다. 이번에 임의 제출하지 않았습니다.

사용자의 첫 직접 확인은 새 제출 원문에 `docs/evidence/reproduction-6d216c499d37.json`이 포함돼 있는지 확인하는 것입니다. 원래 폴더와 Git 기록도 보존합니다. JSON의 실행 커밋과 이번 보완 커밋은 구분하며, Windows·브라우저 확인은 실행 설명서 순서대로 이어 갑니다. 실제 조치를 시험 삼아 집행하지 않습니다.
