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

## 5단계 가점용 별도 브랜치: 서버 로그인

기준 커밋은 `808002445276e35676abeef644e844a004743c37`이며 `stage5-server-auth`에서만 작업합니다. main 병합과 운영 배포 전환은 하지 않습니다. 이전 단계 기록은 당시 결과이며, 3576932 Preview의 사용자 실제 검증은 아래에 기록하며 보완 후 새 배포의 실제 계정 검증과 구분합니다.

브라우저의 Supabase 공개 키 설정 파일과 CDN SDK를 제거했습니다. 로그인은 `POST /api/auth/login`, 세션 확인·만료 시 SDK 갱신은 `GET /api/auth/session`, 로그아웃은 `POST /api/auth/logout`을 사용합니다. 서버는 기존 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`만 사용합니다. Preview에도 두 변수가 설정되어 있어야 하며 값 자체를 공유하지 않습니다. SDK `signInWithPassword`, `getUser`, `refreshSession`, `admin.signOut`을 사용하고, 응답 JSON에는 사용자 ID·이메일만 포함합니다. 토큰은 Secure·HttpOnly·SameSite=Strict·Path=/인 호스트 전용 쿠키에 저장합니다.

메모 API는 쿠키 토큰을 기존 `src/verify-login.mjs`로 검증합니다. 기존 Bearer 요청·심판 토큰 검증·소유자 필터·RLS·서버 DB 설정은 유지합니다. 쿠키를 사용하는 변경 요청과 로그인·로그아웃은 현재 배포 호스트의 Origin을 검사합니다. Vercel의 `VERCEL_URL`과 `VERCEL_BRANCH_URL`을 Preview 허용 호스트로 사용합니다.

실행: `node --test test/server-auth.test.mjs test/notes-cookie.test.mjs test/notes-ownership.test.mjs test/r5.test.mjs` 및 `npm run build -- --local`. 모의 SDK 로그인 실패·로그인·세션 갱신·로그아웃, 쿠키 보안 속성, 응답 토큰 미포함, 교차 Origin 거부, A/B CRUD·타인 메모 404·소유자 위조 거부, public 전체 키/토큰/SDK/저장소 문자열 검사는 통과했습니다. 이 결과는 실제 계정·실제 DB 검증이 아닙니다. `npm run test:package`의 시작 틀 API 목록 검사는 기준 커밋에서도 `api/notes.js` 때문에 실패함을 재현했으며 이번 범위에서 수정하지 않았습니다.

Preview에서 직접 확인할 항목: A/B 로그인 후 각자 메모 조회·추가·수정·삭제, 로그아웃 후 자료 거부, 새로고침·토큰 만료 후 세션 갱신, B의 A 메모 GET/PUT/DELETE 404. 브라우저 Network에서 자료 요청이 같은 호스트 `/api/notes`로만 가고 공개 키가 없는지 확인합니다. `/auth-config.js`와 `/data.json`은 404여야 합니다.

남은 위험: 과거 공개 커밋·과거 배포의 공개 키는 삭제되지 않습니다. 공개 키 제거는 DB 권한·소유자 검사에 대한 대체 수단이 아닙니다. 인증 함수는 공개 주소이며 별도의 앱 로그인 요청 제한을 추가하지 않았습니다. HttpOnly는 토큰 읽기를 제한하지만 XSS가 같은 출처 요청을 보내는 위험은 남습니다. SDK 로그아웃이 갱신 세션을 회수해도 이미 발급된 JWT는 만료까지 유효할 수 있습니다. 여러 탭의 동시 갱신·실제 A/B 계정·Preview 환경변수 설정은 실제 환경에서 별도로 확인해야 합니다. 100점 여부는 심판 평가 미확인입니다.

### 최종 검수 후 최소 보완

사용자 실제 Preview 검증(커밋 `35769329d5e492065190aa0918531991ca189e0b`, `https://choi-bujang-secret-vault-7mlo0idyu-jyp13.vercel.app`):
1. A 계정 로그인 성공
2. A 기존 메모 4개 조회 성공
3. 시험 메모 추가·수정·삭제 성공
4. B 로그인 시 B 메모만 표시
5. 로그아웃 후 새로고침 시 메모 미표시
6. `/auth-config.js` 404
7. `/data.json` 404

2026-10-12 최종 검수의 독립 읽기 전용 DB 조회: RLS enabled=true, forced=false, 소유자 CRUD 정책 4개와 USING/WITH CHECK 조건 정상. PUBLIC 테이블 ACL 없음. anon·authenticated 테이블 권한 7종 모두 false, 직접 열 SELECT/INSERT/UPDATE/REFERENCES 권한도 없음. service_role 권한 7종 모두 true. 기존 결과와 일치하지만 이번 조회에서 적용 전후 비교나 DB 변경을 수행한 것은 아닙니다.

보완: access 쿠키가 없거나 로그아웃에 사용할 수 없으면 refresh 쿠키로 SDK 갱신 후 세션 회수를 시도합니다. 갱신 토큰이 무효이면 쿠키를 지우고, 서버 장애·요청 제한이면 실패를 알립니다. 세션 GET의 cross-site/same-site 또는 잘못된 Origin 요청은 쿠키 변경 전에 403으로 거부합니다. Vercel 전체 경로와 메모·인증 API 응답에 nosniff를 적용합니다.

제출 검증 대상: `aleph.config.json.publicAppUrl`은 기존 Production 주소로 보존합니다. 별도 주소 검수 시 `ALEPH_CHECK_APP_URL` 또는 Actions의 `check_app_url`에 해당 Preview 루트 HTTPS 주소를 지정합니다. stage5-server-auth Actions에서는 주소를 반드시 입력합니다. 각 observed와 설명에 실제 HTTP 요청 대상을 기록합니다. changedFiles는 계속 HEAD 한 커밋의 변경 파일이며 임의 합산하지 않습니다. 워크플로 기준 SHA는 실행한 브랜치의 이력에 포함되어야 합니다. Preview 실행 성공은 Production 검증·최종 제출 성공을 의미하지 않습니다. 이번 작업에서는 bundle과 최종 제출을 실행하지 않았습니다.

### fa8ff72 Preview 추가 실제 검증 (사용자 확인)

대상 커밋: `fa8ff72ca74ec6633ba03030f93ca5371745588c`.
대상 Preview: https://choi-bujang-secret-vault-1a4w0gmgm-jyp13.vercel.app/

- `auth-ui.js`와 메모 `notes` API의 실제 응답에 `X-Content-Type-Options: nosniff` 확인.
- A 계정에서 B 소유 메모 ID에 직접 GET·PUT·DELETE 요청 시 모두 404 확인. B 재로그인 후 원본 제목·본문 보존 확인.
- 로그인·메모 조회·F5 후 세션 유지·로그아웃 후 F5 시 메모 미표시·계정별 메모 분리 확인. A의 기존 메모 4건 조회 확인.

위 결과는 사용자가 실제 Preview에서 확인한 기록이며 도구가 독립 재실행한 결과나 Production 검증이 아닙니다. 이전 3576932의 시험 메모 CRUD와 두 정적 경로 404는 해당 이전 커밋 결과로 유지합니다.

모의 회귀 테스트는 SDK·DB 대역으로 쿠키 보안 속성, 만료/refresh 전용 세션 처리, 교차 출처 거부와 쿠키 미변경, Bearer 호환성, 소유권 검사를 확인합니다. 실제 교차 출처 세션 GET의 403·쿠키 미변경과 실제 만료 세션 갱신·회수는 미검증입니다. 인증 API 전체 및 메모 상세/모든 오류 응답의 실제 nosniff 헤더, 새 Preview 정적 파일 전체의 키 검색, 배포 로그 비밀값 검사, 인증 사용자 원본 REST 직접 차단도 미검증입니다. 독립 DB 권한 조회는 위 기록 시점 결과이며 DB를 변경하거나 재검증하지 않았습니다.

`test:package`는 시작 틀 기준표가 최상위 API를 `api/ai.js`, `api/threat-intel.js`로 제한하지만 실제 목록에 `api/notes.js`가 있어 실패합니다. 기준 main 8080024에서도 같은 실패가 발생하며 이번 문서 변경에서 비롯된 실패가 아닙니다. 인증·상세 API 하위 폴더는 이 검사가 재귀 검사하지 않습니다. package.json과 제출 워크플로는 이 검사를 bundle 선행 조건으로 실행하지 않으므로 직접적인 번들 생성 차단 원인은 아닙니다. 다만 전체 테스트 통과로 보고할 수 없으며 심판의 패키징 규칙 수용 여부는 미확인입니다. 이번 작업에서는 bundle·최종 제출을 실행하지 않습니다.

## 보너스 xdr-02 저장점: 웹 주입 경보

기준 main은 `f096a8775459f901a3156d02fc0312917fbcc2ad`입니다. `xdr/web-injection/`의 읽기 모듈·MITRE T1190 기반 패턴 4개·독립 판단 모듈·후보 알림 모듈·결과 파일을 추가했습니다. 반복 3회는 자체 학습 기준이며 MITRE 공식 수치가 아닙니다. 문서용 요청 표기와 원본 경보 설명을 근거로 판단하며 시간 범위·실제 악용 성공을 추정하지 않습니다.

실제 로컬 검증: 원본 26건과 읽기 출력 26줄 및 각 행의 5개 필드 일치, 패턴별 이름·조건·한 줄 근거 확인, 비밀값 모의 입력의 출력 제외 확인. 독립 named export `decide(alert)`, 반환 형식·0~1 확신도·행동 임계값·한 줄 이유·경보 ID 독립성을 확인했습니다. `npm run xdr -- web-injection` 재실행 결과 block 8 / alert 9 / record 9, 결과 ID·순서 26건 일치 및 형식 오류 0건입니다. 명확한 반복 공격 8건은 block, 애매한 요청 9건은 alert, 정상 이벤트 9건은 record이며 정상 오차단·알림 오분류는 0건입니다. wi-13의 요청 길이 의심은 웹 요청 맥락에서 alert로만 처리합니다.

알림 검증은 임시 로그 파일에서 수행했습니다. alert는 알림, record는 기록, block은 만료 시각(처리 후 15분)·경보 번호를 가진 알림 후보로만 남깁니다. 로그에는 고정 사유 코드와 처리 정보만 쓰며 원본 요청·계정·IP·비밀값을 기록하지 않습니다. 실제 `xdr/alerts.log`를 생성하거나 커밋하지 않았습니다. 직접 알림 실행은 `node xdr/web-injection/respond.mjs`입니다.

**실제 ZTNA 연동은 미완료입니다.** 기존 `starter.deny`는 모든 요청을 거부하고 확장 규칙 등록·만료 적용 계약과 검증된 사용자·장치 연결 기능이 없습니다. 정상·공유 IP 사용자를 안전하게 제외할 수 없으므로 거부 규칙은 등록하지 않습니다. 만료 시각은 후보 메타데이터이며 실제 차단·해제 효과를 증명하지 않습니다. 정상 요청 통과 검증도 불가능한 상태로 유지합니다.

기존 로그인·CRUD 모의 회귀 및 실행기 테스트 9개 통과, `npm run build -- --local` 성공. 기존 xdr-01 파일·결과(10/9/9), 원본 경보, ZTNA·앱·배포 설정을 변경하지 않았습니다. 기존 `test:package` API 목록 불일치 실패는 미해결이며 이번 작업에서 재실행하지 않았습니다. 실제 로그인·운영 배포·DB·심판 검증은 이번 작업 범위에서 미실행입니다. GitHub 푸시·배포·심판 제출은 하지 않습니다.

## 6단계 제작 2·3: 기기 등록 조건 (당시 기록)

기준 커밋: `27c03a9a532da89a155baa8e8a5ffa8d4293e960`. 2026-10-13 로컬에서 `docs/DECIDER_REQUEST.md`의 요청·응답 계약을 확인한 뒤 `src/decider.mjs`에 `device_registered`를 구현했습니다. `request.deviceRegistered === true`일 때만 `allow / approved`, 그 외에는 `deny / device_not_registered`를 반환합니다. 응답 다섯 항목과 요청 ID를 보존합니다.

`starter.deny`는 기존 인증·권한 규칙이 아니라 모든 요청을 거부하는 미구현 시작 틀입니다. 정상 등록 요청도 차단하므로 해당 기본 응답과 규칙 ID를 새 기기 등록 규칙으로 교체했습니다. API의 인증·소유권 검사와 브라우저 화면은 변경하지 않았습니다. 위 xdr-02의 `starter.deny` 설명은 당시 기록이며, 이번 변경으로 XDR 자동 차단·만료 적용이나 운영 연동이 구현된 것은 아닙니다.

실제 검증 순서:

1. `git status --short`로 기존 미커밋 변경이 없음을 확인했습니다.
2. 요청 계약과 기존 판정기·시험용 가상 요청을 읽고 기기 등록 규칙만 구현했습니다.
3. `npm run decider:test`를 실행하여 종료 코드 0과 아래 출력을 확인했습니다.

```text
통과 · 등록 기기의 정상 요청
통과 · 미등록 기기의 가상 요청
이 명령은 가상 요청으로 연습하며 심판 통과 증거가 아닙니다.
```

4. 추가로 아래 명령을 실행해 정상·미등록·누락·잘못된 타입의 전체 응답 다섯 항목을 단언했습니다. 모두 통과했습니다.

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { decide, RULE_IDS } from './src/decider.mjs';
import { fixtureRequests } from './scripts/fixture-7.mjs';
const { normal } = fixtureRequests();
assert.deepEqual(RULE_IDS, ['device_registered']);
for (const [label, value, expected] of [['true', true, 'allow'], ['false', false, 'deny'], ['누락', undefined, 'deny'], ['문자열 true', 'true', 'deny'], ['숫자 1', 1, 'deny'], ['null', null, 'deny']]) {
  const input = { ...normal, deviceRegistered: value };
  if (value === undefined) delete input.deviceRegistered;
  const response = await decide(input);
  assert.deepEqual(response, {schema:'aleph.decision.v1', requestId:input.requestId, decision:expected, reasonCode:expected === 'allow' ? 'approved' : 'device_not_registered', ruleIds:['device_registered']});
  process.stdout.write(`${label}: ${response.decision} · ${response.reasonCode}\n`);
}
JS
```

추가 시험 결과: true는 `allow / approved`, false·누락·문자열 true·숫자 1·null은 모두 `deny / device_not_registered`였습니다. npm의 기존 환경 설정 `http-proxy`에 관한 경고가 출력됐지만 시험은 정상 종료했습니다.

이 검증은 로컬 가상 요청 연습입니다. 실제 등록 기기의 브라우저 접속, 인증서 없는 mTLS 요청 거부, 다른 사용자 토큰과 기기의 조합 거부는 이번 작업에서 확인하지 않았으며 운영 엔진·심판의 검증 대상입니다. 브라우저가 직접 보낸 등록 상태를 신뢰하는 기능을 추가하지 않았습니다. 재실행 명령은 `npm run decider:test`이며 실제 화면 확인은 기존 자료실에서 로그인 후 메모 목록을 여는 순서입니다. 인증서·CA·개인키·서명 키는 생성하지 않았습니다. 기존 `test:package` 불일치는 이번 범위에서 재실행하거나 수정하지 않았습니다. 설정 step은 5로 보존했으며 커밋·bundle 생성·푸시·배포·심판 제출은 수행하지 않았습니다.

## 6단계 저장점 후속: 제출 단계 정합성 수정

기존 `6단계 저장점`은 `ec415dd14c87b73721bb6391f18092d15d182828`이며 이 커밋은 보존합니다. 해당 저장점 후 `bundle-notes.json` 누락을 해결하고 bundle을 생성했지만, 설정이 5여서 제출 JSON에도 숫자 5가 기록되었습니다. 위 제작 2·3의 미커밋·미생성 설명은 해당 작업 당시 기록입니다.

원인: `scripts/bundle.mjs`는 `git show HEAD:aleph.config.json`으로 커밋된 설정을 읽고 `step: config.step`을 출력합니다. `src/attack-check.mjs`는 기존 1·3·4·5단계만 지원했습니다. 설정만 6으로 바꾸면 자기 점검에서 실패하므로 설정과 지원 범위를 함께 수정해야 합니다.

최소 변경: `aleph.config.json`의 step만 5에서 6으로 변경하고, 자기 점검의 지원 목록·소유권/DB 미실행 결과 목록에 6을 추가했습니다. 6단계 DB 기대 조건은 기존 5단계와 동일합니다. 기기 등록 규칙·기존 HTTP 요청 7개·미실행 항목 3개·발급자·judgeIssuer·배포 주소·허용 경로·원본 API 주소는 보존합니다. 기존 API 인증·권한·화면·XDR 기능과 테스트 파일은 변경하지 않았습니다.

실제 로컬 검증: `npm run decider:test`의 정상 등록 기기 허용·미등록 기기 거부 2건 통과. 기준 저장점의 자기 점검 함수와 수정본에 동일한 모의 HTTP 응답을 공급해 1·3·4·5단계 결과 및 요청 경로·메서드·헤더·본문이 동일함을 확인했습니다. 2단계의 기존 미지원 상태도 유지하며, 6단계 점검 10개는 기존 5단계 결과와 동일합니다. 이는 모의 HTTP 회귀 검증이며 실제 심판 판정이 아닙니다. `git diff --check`도 통과했습니다.

재실행 순서: `npm run decider:test` → `git diff --check` → 후속 저장점 커밋 → 로컬 전용 `bundle-notes.json`에 단계 수정 및 미검증 범위를 기록 → `npm run bundle` → `artifacts/submission.json`의 step이 숫자 6, commit이 후속 HEAD, policyRules가 `["device_registered"]`, attackAttempts가 10개인지 확인합니다. changedFiles는 마지막 후속 커밋만 나타내므로 이전 저장점의 `src/decider.mjs`가 이 목록에 없어도 규칙은 현재 HEAD에 보존됩니다. bundle-notes.json과 제출 JSON은 커밋하지 않습니다.

남은 범위: 실제 등록 기기 화면·mTLS·사용자/기기 조합에 대한 운영 엔진·심판 검증, 인증된 A/B 소유권·소유자 변경·DB 권한 재검증은 미실행입니다. 기존 `test:package` 불일치는 이번 범위에서 수정하거나 재실행하지 않았습니다. `.github/workflows/main.yml`은 여전히 5단계 전용이며 이번 로컬 bundle 수정에는 포함하지 않습니다. 추후 Actions로 생성할 때는 단계 단언·설명·산출물 이름을 별도로 맞춰야 합니다. GitHub 푸시·배포·실제 제출은 수행하지 않습니다. 인증서·CA·개인키·서명 키를 생성하지 않습니다.
