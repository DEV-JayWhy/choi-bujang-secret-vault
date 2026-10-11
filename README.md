# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 2단계 현재 작업 상태

화면은 `GET /api/notes`를 통해 `public.a02_private_notes`의 메모를 읽습니다. 서버 함수는 `SUPABASE_URL`과 서버 전용 `SUPABASE_SECRET_KEY`를 환경변수에서 읽습니다. 브라우저 파일·응답·로그에 키를 넣지 않습니다. 서버 응답은 메모의 id·title·content만 포함하며 DB 오류 원문을 반환하지 않습니다.

**남은 약점:** `/api/notes`는 아직 인증 없는 공개 주소입니다. 서버 전용 키로 DB를 읽으므로 DB의 anon·authenticated 권한 차단만으로 이 API를 막을 수 없습니다. 로그인·사용자별 접근 제한은 후속 단계 작업입니다.

`data.json`에는 메모가 없고 `public/data.json`은 삭제했습니다. 빌드는 해당 파일을 생성하지 않으며 이전 출력도 제거합니다. 배포의 `/aleph.json`은 Vercel 저장소·커밋 정보와 현재 단계로 계속 생성됩니다. 설정의 step은 2이며 다른 API·정책·탐지 코드는 보존했습니다. 기존 1단계 자기 점검은 2단계 방어 검증을 대신하지 않습니다.

Vercel 프로젝트 Settings → Environment Variables에서 위 두 변수를 직접 입력하고 재배포하세요. 서버 전용 키를 NEXT_PUBLIC_ 또는 VITE_ 이름으로 등록하지 마세요. SQL은 공개 저장소 밖에서 SQL Editor로 실행합니다.

로컬 빌드: `npm run build -- --local`. 정상: 서버 환경변수와 DB 설정 후 화면에 4개 카드, `/aleph.json`의 step 2. 공개 `/data.json`에는 메모가 없어야 합니다(404 예상). 거부: GET 이외 메서드는 405, DB 직접 anon·authenticated 읽기는 권한 거부. 공개 API GET은 현재 단계에서 허용됩니다.

2단계 배포와 조회는 아래 최신 검증 결과로 확인했습니다. 실제 키 설정값은 열람하지 않았으며 심판 판정은 별도입니다.

## 현재 파일의 공개 메모 검색 절차

1. GitHub 저장소의 기본 브랜치 최신 커밋 SHA를 기록합니다. Code → Download ZIP으로 그 커밋의 파일을 내려받고 압축을 풉니다. 이전에 받은 ZIP이나 로컬 미커밋 파일을 최신 GitHub 파일로 간주하지 않습니다.
2. 비로그인 요청으로 현재 배포의 `/aleph.json`을 열고 step·commit·repoUrl을 확인합니다. commit이 GitHub 최신 SHA와 다르면 배포가 아직 최신 소스를 반영하지 않은 것입니다.
3. 시크릿 창에서 `/data.json`과 `/`를 확인합니다. 메인 화면의 카드 표시와 HTML 소스에 메모가 포함되는지는 별개입니다. 개발자 도구 Network에서 실제 요청 경로와 응답을 확인하고, HTML 및 HTML에서 참조하는 JS·JSON 등 정적 파일을 내려받아 검색합니다. 404도 기록하고 성공 응답으로 취급하지 않습니다.
4. 최신 GitHub ZIP을 푼 폴더와 내려받은 배포 정적 파일 폴더에서 각각 아래 명령을 실행합니다. 검색은 코드·문서·SQL·백업을 포함한 현재 파일 전체를 대상으로 합니다. `.git`과 의존성 폴더는 제외합니다. 메모가 담긴 SQL이나 이전 변경 패치를 공개 저장소에 올리지 않습니다.

```sh
rg -n --hidden -g '!.git/**' -g '!node_modules/**' '실습용 가상 (과제|포트폴리오|리추얼|행정) 기록' .
```

정상은 일치 0건입니다. rg 종료 코드 1은 일치 없음, 2는 검색 오류이므로 구분합니다. 검색어는 정규식 형태이며 메모 본문 전체를 정적 파일에 다시 넣지 않습니다. Git 사용 환경에서는 `git fetch origin` 후 `git grep -n -E '실습용 가상 (과제|포트폴리오|리추얼|행정) 기록' origin/HEAD`로 원격 기본 브랜치 파일도 확인할 수 있습니다.

5. `/api/notes`는 정적 파일 검색과 별도로 비로그인 GET 요청을 확인합니다. 메모가 반환되면 공개 API로 여전히 조회 가능한 상태입니다. 응답·검색 증거에 키를 남기지 않습니다. DB에 공개 키로 직접 요청했을 때의 거부 판정은 심판 확인과 구분하고 미확인 결과를 통과로 적지 않습니다.

## 검색 결과 기록 (2026-10-11 20:18 KST, 실제 확인 범위)

대상 GitHub: https://github.com/DEV-JayWhy/choi-bujang-secret-vault
대상 현재 배포: https://choi-bujang-secret-vault-xi.vercel.app

| 대상 | 실제 결과 | 판정 범위 |
| --- | --- | --- |
| GitHub 원격 기본 브랜치 최신 파일 전체 | git fetch 후 origin/HEAD SHA = 320183c858650331390172eb1b0fc5f74111e1dc. git grep 정규식 일치 0건(종료 코드 1) | 해당 커밋에 추적된 코드·정적 파일·문서 전체. Git 이력은 별도 |
| 최신 GitHub public 폴더 | public/index.html만 존재, public/data.json 없음 | 추적된 정적 파일 목록 확인 |
| 현재 배포 / | 비로그인 HTTP 200, HTML 본문의 메모 문장 일치 0건 | HTML에 외부 src/href 참조 없음. 인라인 JS는 /api/notes로 자료 조회 |
| 현재 배포 /data.json | 비로그인 HTTP 404 | 현재 경로에 메모 파일 없음 |
| 현재 배포 /aleph.json | 비로그인 HTTP 200, 메모 문장 0건, step 2, commit이 위 GitHub 최신 SHA와 일치 | 현재 배포와 최신 커밋 식별 대조 |
| 현재 배포 /api/notes | 인증·쿠키 없는 GET에서 HTTP 200, 메모 4건, 문장 일치 4개 | 정적 파일에는 없지만 공개 API로 메모 조회 가능 |

배포 확인은 위 경로와 메인 HTML이 참조하는 정적 파일 범위입니다. 플랫폼 내부 배포 산출물 전체·추측한 미공개 경로·모든 과거 배포를 전수 조사한 것은 아닙니다. 자료실의 카드 4개 표시와 Supabase 조회 성공은 사용자 검증 결과이며, 이번 독립 검증에서는 API 응답 4건을 확인했습니다. DB 공개 키 직접 요청의 거부 판정은 이번 작업에서 미확인이고 심판 확인과 구분합니다. 위 결과는 심판 통과 판정이 아닙니다.

## 2단계 당시 공개 API의 약점 (과거 기록)

현재 배포의 `/api/notes`는 인증 없는 GET으로 메모 4건을 반환합니다. 최신 서버 함수에도 로그인 검사와 owner_id에 따른 조회 제한이 없습니다. 서버 전용 키로 DB를 읽으므로 anon·authenticated의 DB 직접 읽기 차단만으로 이 공개 API를 막을 수 없습니다. 정적 파일의 메모 제거와 API 접근 통제는 별개입니다. 이번 작업은 문서 기록만 수정하며 기존 메모 조회 기능과 API의 현재 동작을 보존합니다.

## 과거 공개 커밋·배포의 노출 (별도 기록)

옛 공개 커밋 d876f0418d97c512ce8cf2ff93822c54064728d0의 data.json·public/data.json에서 가상 메모 문장이 남아 있음을 git grep으로 확인했습니다. 따라서 최신 파일의 검색 0건은 Git 이력의 메모 제거를 의미하지 않습니다.

옛 Vercel 배포에는 당시 메모 파일이 남아 있을 가능성이 있습니다. 이번 작업에서는 과거 배포 URL 목록·접근 상태·파일 내용을 확인하지 않았으므로 과거 배포의 현재 노출 상태는 미확인입니다. 캐시·이미 내려받은 복사본·제3자 보관 여부도 미확인입니다.

**과거 노출이 완전히 해소됐다고 표현하지 않습니다.** 옛 공개 커밋과 옛 배포가 남는 한 과거 노출은 해소됐다고 볼 수 없습니다. 이 작업은 Git 이력 재작성·과거 배포 삭제·캐시 및 제3자 복사본 회수를 수행하지 않았습니다.

## 3단계 제작 2: 자료 API 토큰 검사

api/notes.js에서 시작 틀의 src/verify-login.mjs의 createLoginVerifier를 그대로 사용합니다. 도우미는 수정하거나 대체하지 않았습니다. Authorization Bearer 토큰이 없거나 검증 실패면 HTTP 401과 LOGIN_REQUIRED만 반환하고 DB 메모를 조회하지 않습니다. 설정 오류는 자료 없이 503 또는 502로 거부합니다. 브라우저가 보낸 userId·role·쿼리·본문은 신원 판단에 사용하지 않습니다.

브라우저는 공식 SDK 세션의 access_token을 Authorization 헤더로만 보내며 화면·로그에 토큰을 출력하지 않습니다. 로그아웃하면 메모를 즉시 비우고 이전 요청이 늦게 도착해도 다시 표시하지 않습니다. 로그인 폼과 기존 보안 헤더를 보존했습니다. step은 3이고 identityProvider에는 현재 공개 Project URL의 /auth/v1 발급자, JWKS URL, audience authenticated만 기록했습니다. judgeIssuer와 검증 도우미의 심판 토큰 처리도 그대로 유지합니다.

제작 2 당시에는 신원 확인만 구현했습니다. 이후 제작 3에서 목록은 owner_id로 필터링하며 상세 GET·PUT·DELETE의 소유자 검사는 아직 없습니다. 로그아웃 화면 처리는 탈취된 기존 JWT의 즉시 무효화를 증명하지 않습니다. 이전 README의 공개 API 결과는 변경 전 시점 기록이며 과거 공개 커밋·배포의 노출도 해소됐다고 주장하지 않습니다.

실행: `npm run build -- --local`. GitHub 반영 및 Vercel 재배포 후 시크릿 창에서 메모가 안 보이는지, /api/notes를 직접 열면 401이고 notes 필드가 없는지 확인합니다. A 계정 로그인 후 4개 카드, 로그아웃 후 메모 없음 상태를 확인합니다. 잘못된 토큰도 401이어야 합니다. 실제 A 계정·배포 검증은 미실행이며 서버 전용 키는 기존 Vercel 환경변수에서만 읽습니다.

## 3단계 제작 3: 인증된 메모 CRUD

기존 제공본의 `sql/03_notes_uuid.sql`을 Supabase SQL Editor에서 실행하는 절차입니다. 해당 SQL 파일은 현재 GitHub 최신 커밋에는 없습니다. 기존 숫자 id를 결정적인 UUID로 바꾸고 기존 행·owner_id·RLS·권한을 보존합니다. UUID 전환은 기존 숫자 ID URL을 바꾸므로 이후에는 UUID URL만 사용합니다. id가 이미 UUID이면 다시 변환하지 않습니다. 기존 가상 메모 4건의 owner_id가 NULL이면 내 메모 목록에 표시되지 않으며 삭제하지 않습니다. A가 추가한 메모부터 A 목록에 표시됩니다. 실제 DB 마이그레이션은 미실행입니다.

| 메서드·경로 | 요청 | 성공 응답 |
| --- | --- | --- |
| GET /api/notes | 없음 | 로그인 사용자 owner_id의 메모 배열 [{id,title,body}] |
| POST /api/notes | {id?,title,body}, id는 UUID | 201 {id}; 생략하면 서버 UUID 생성 |
| GET /api/notes/:id | UUID 경로 | 200 {id,title,body}, 없으면 404 |
| PUT /api/notes/:id | {title,body} | 200 {id,title,body}, 없으면 404 |
| DELETE /api/notes/:id | UUID 경로 | 200 {id}, 없으면 404 |

위 경로를 aleph.config.json.allowedRoutes에 기록했습니다. Vercel의 api/notes.js와 api/notes/[id].js가 각각 목록 및 상세 경로를 담당합니다. DB의 content를 API body로 변환하며 프런트 목록도 배열 응답에 맞췄습니다. 메모 제목·본문은 textContent로 표시합니다.

모든 CRUD는 원본 src/verify-login.mjs로 토큰을 검증합니다. 도우미를 수정하지 않았습니다. 무토큰·잘못된 토큰은 자료 없이 401입니다. POST owner_id는 서버가 검증한 identity.userId만 저장하며 클라이언트 userId·role·owner_id는 사용하지 않습니다. PUT은 제목과 본문만 바꾸고 소유자·ID는 바꾸지 않습니다.

**4단계에 남긴 허점:** 목록은 로그인 사용자 소유 메모로 필터링하지만 상세 GET·PUT·DELETE는 소유자 검사를 하지 않습니다. 따라서 유효하게 로그인한 B가 A 메모의 UUID를 알면 접근·변경·삭제할 수 있는 구조입니다. 이번 단계에서는 그 검사를 구현하지 않았으며 실제 B의 타인 메모 접근 시험은 미실행, 4단계 기록 대상으로 남깁니다. 과거 노출 해소도 주장하지 않습니다.

로컬 제공본의 모의 검증 명령은 `node --test test/notes-api.test.mjs`였으나 해당 파일은 현재 GitHub 최신 커밋에 포함되지 않아 여기서 실행할 수 없습니다. 로컬 빌드: `npm run build -- --local`. DB SQL 실행 후 GitHub 반영·Vercel 재배포가 필요합니다. A 로그인 → 메모 제목·본문 입력 → 추가 → 카드의 수정 → 수정 저장 → 삭제 순서로 검증합니다. 삭제한 ID의 인증된 GET은 404여야 합니다. 시크릿 창의 무로그인 GET·POST·PUT·DELETE는 모두 401이고 메모가 없어야 합니다. 실제 A 계정·배포·DB 실행 결과는 아직 미확인입니다.


## 3단계 저장점

기준 GitHub main 커밋: f80edb16c9e44dd56c6c69e669ee7adb02fc3f71. 로그인 화면·기존 도우미의 토큰 검사·메모 CRUD는 이미 커밋되어 있으므로 중복 구현하지 않습니다. 설정의 step 3, 실제 배포 주소, identityProvider와 5개 allowedRoutes를 서버·화면과 대조했습니다. judgeIssuer와 기존 기능은 보존합니다. starter.deny는 시작 틀 판정기의 실제 기본 거부 규칙이며 아직 이후 단계 정책을 구현한 것이 아닙니다.

사용자는 A의 로그인·로그아웃·추가·수정·삭제와 무로그인 POST의 401을 확인했습니다. 이는 사용자 검증 기록이며 이 환경에서 A 계정으로 재실행하지 않았습니다. 직접 점검은 `npm run bundle`에서 현재 배포에 무로그인 GET·POST·PUT·DELETE, 잘못된 토큰 GET, 공개 data.json 요청을 보내고 HTTP 상태와 자료 감지 여부만 기록합니다. 실제 메모 본문·토큰·비밀 키는 제출 묶음에 포함하지 않습니다. 실행 실패는 미확인으로 기록하며 심판 판정으로 표현하지 않습니다.

빌드: `npm run build -- --local`. 제출: 저장점 커밋 후 로컬 전용 bundle-notes.json의 explanation에 작업 설명을 적고 `npm run bundle`을 실행합니다. bundle-notes.json과 artifacts/submission.json은 Git에 커밋하지 않습니다. 정상 로그인 CRUD는 사용자 검증과 별도이며 B의 타인 메모 접근은 4단계 미검증으로 유지합니다. 상세 소유자 검사 부재 및 과거 공개 커밋·배포 노출 한계도 유지합니다.


## 4단계 저장점

기준 GitHub main: f75c4df9226b884d929831672f8a07cbeccb85e0. 3단계 최종 저장점은 e227a482f0b0ff84578967638bef88d1f36c9381이며 위 3단계 내용은 당시 기록입니다. API 소유권 구현과 테스트는 이미 커밋되어 있으므로 중복 구현하지 않습니다. 설정 step을 4로 기록하며 발급자·5개 allowedRoutes·judgeIssuer·배포 설정은 보존합니다.

목록과 상세 GET·PUT·DELETE는 검증된 identity.userId로 owner_id를 제한합니다. POST는 확인된 ID로 소유자를 저장합니다. POST·PUT 본문 owner_id는 400으로 거부하고 PUT은 기존 소유자를 보존하며 반환된 소유자도 확인합니다. 타인 상세 접근은 404 NOTE_NOT_FOUND입니다.

사용자 실제 검증: 원본 A 메모 4건 보존, A/B 자기 메모 CRUD 확인 범위 기록, B의 A 메모 GET·PUT·DELETE 모두 404, RLS 활성화와 소유자 정책 4개, anon 권한 7종 false, authenticated CRUD만 true, service_role 기존 권한 유지. 이 환경에서 DB·로그인 계정으로 재실행한 결과가 아니며 각 CRUD 세부 증빙과 A의 B 접근은 독립 재검증하지 않았습니다.

학습 SQL은 공개 저장소 밖에서 사용자가 실행했습니다. service_role 서버 요청은 RLS를 우회하므로 API 소유권 검사도 필요합니다. 과거 공개 커밋·배포 노출이 완전히 해소되었다고 주장하지 않습니다.

재실행: `node --test test/notes-ownership.test.mjs`, `npm run build -- --local`, 저장점 커밋 후 로컬 전용 bundle-notes.json을 작성하고 `npm run bundle`. 화면에서 A/B 각각 로그인하여 자기 메모 추가·수정·삭제를 확인하고 상대 UUID 접근은 404, owner_id 변경 요청은 400인지 확인합니다. 모의 테스트와 실제 심판 판정은 별개입니다.

번들 자기 점검은 현재 배포에 무로그인 CRUD·잘못된 토큰·data.json의 7개 요청을 실제로 보냅니다. 실제 A/B 토큰이나 DB 관리자 연결이 없는 소유권·RLS 점검은 미실행으로 기록하며 사용자 검증을 독립 실행으로 바꾸지 않습니다. 로컬 저장점 커밋과 GitHub 반영·배포는 각각 별도로 확인해야 합니다.
