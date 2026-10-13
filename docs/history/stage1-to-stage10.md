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


## 7단계 제작 1~3: 가상 복합 사건 추가 확인 (제작 당시 기록)

기준 HEAD는 `2bc1b4007fe54fbbeb1953e8eda78dd078114f1d`입니다. 6단계의 해당 커밋은 GitHub main으로 푸시 완료했으며 위 문서의 미푸시 설명은 당시 작업 기록입니다. 이번 7단계는 아직 커밋·bundle 생성·푸시·배포·실제 제출을 하지 않습니다. 설정 step도 아직 6이며 제출 준비 단계에서 따로 확인해야 합니다.

제작 1의 `inspectAccessContext()`를 사용해 `signals.source`, `region`, `network`, `hour`와 `recentEvents`의 형식을 검사합니다. 헤더·geo·클라이언트 위치는 읽지 않고, 요청 원본을 수정하거나 누락값을 정상값으로 보정하지 않습니다. `judge_fixture`는 가상 사건 출처이며 실제 위치의 증거가 아닙니다. 출처 문자열만으로 엔진 인증을 증명할 수 없으므로 판정기는 신원·기기·경로를 확인한 운영 엔진이 전달한 요청을 받는 계약을 전제로 합니다.

규칙 `step_up_required`를 `device_registered`와 함께 등록했습니다. 기기 등록이 정확히 true가 아니면 다른 조건보다 먼저 `deny / device_not_registered`를 반환합니다. 등록된 정상 가상 요청은 `allow / approved`, 다음 명시된 복합 가상 사건 또는 불명확·불완전한 가상 입력은 `step_up / step_up_required`입니다. 응답 다섯 항목과 요청 ID는 보존합니다.

복합 사건의 유일한 근거는 `scripts/fixture-7.mjs`입니다. 정확히 `hour === 3`, `network === "unusual"`, 같은 사건 항목의 `kind === "risk_signal"`, `ageSeconds === 60`, `count === 20`인 조합을 사용합니다. 일반적인 이상 시간대·횟수 임계값·기간 기준은 제공 계약에서 확인되지 않아 새로 정하지 않았습니다. `risk_signal`은 가상 위험 신호이며 실제 자료 조회 20건을 독립 측정한 기록이 아닙니다. 20 이상/60초 이내로 일반화하거나 읽기·수정 이벤트 종류를 만들어 사용하지 않습니다. 지역은 복합 판정 조건에 넣지 않으며 지역 하나의 변화는 차단하지 않습니다.

유효한 실제 경로의 `source: "none"`은 위치·네트워크 근거가 없는 상태로 유지하며 기존 등록 기기 허용을 보존합니다. 이 허용은 정상 위치가 확인됐다는 의미가 아닙니다. signals 누락·알 수 없는 출처·가상 입력의 필드 누락/잘못된 타입은 정상 사건으로 인정하지 않고 추가 확인을 요청합니다. 같은 규칙을 사용하며 이유 코드에 원본 신호나 토큰을 넣지 않습니다.

추가 인증 재판정: 문서에는 `stepUp: {verified, authAgeSeconds}`가 있고 false일 때 경과시간은 null, true일 때는 0~900초입니다. 사용자 지시에 따라 엔진이 검증한 요청만 받는 신뢰 경계 안에서 이 완료 상태를 사용합니다. `inspectAccessContext()`가 유효한 형식으로 확인한 `verified === true`인 경우에만 명시된 복합 사건을 `allow / approved`로 재판정합니다. 미등록 기기는 완료 상태가 있어도 거부하고, 출처·가상 입력이 불명확하면 완료 상태가 있어도 추가 확인을 유지합니다. 누락·잘못된 추가 인증은 복합 사건에서 step_up을 유지합니다.

초기 추가 확인 요청은 미완료 복합 사건에 반드시 step_up으로 반환하며, 엔진의 완료 확인을 모의한 새 요청에 대해서만 허용합니다. 브라우저 verified 필드·헤더·위치·토큰 갱신에서 완료 상태를 만들거나 입력을 보정하지 않습니다. 함수 자체는 호출자의 진위를 인증하지 않으므로 운영 엔진 밖에서 임의 객체를 직접 전달하는 경로에 연결해서는 안 됩니다. 토큰 갱신은 사용자 재로그인 검증으로 간주하지 않습니다.

실제 운영 엔진의 동일 사용자 재로그인·새 인증 시각 검증 절차는 여전히 미확인입니다. 제공 엔진의 `student-kit/sdp-core/decision-contract.mjs` 실제 구현은 이 저장소에 없습니다. 현재 완료 허용 검증은 해당 엔진 보장을 모델링한 로컬 시험이며, 실제 자료 차단·재로그인 성공·새 로그인 뒤 자료 허용을 실측한 것이 아닙니다.

실제 시험 결과(2026-10-13):

```text
npm run decider:test (종료 코드 0)
통과 · 등록 기기의 정상 요청
통과 · 미등록 기기의 가상 요청
통과 · 복합 이상 접속
통과 · 다시 확인한 복합 이상 접속
이 명령은 가상 요청으로 연습하며 심판 통과 증거가 아닙니다.

npm run fixture:7 (종료 코드 0)
정상 사건: allow
복합 이상 사건: step_up
```

기존 decider:test의 마지막 항목은 같은 복합 요청에 `{verified: true, authAgeSeconds: 60}`을 넣어 엔진 검증 완료를 모의하고 allow를 기대합니다. 해당 시험의 기대값·입력·파일은 변경하지 않았습니다. 수정 전에는 마지막 1건이 실패했지만, 신뢰 경계와 로컬 시험의 의도를 구분한 재판정 수정 후 4건 모두 통과했습니다. `step_up_required` 이유 코드는 기존 시험에서 기대하지만 운영 allowedReasonCodes 등록부는 로컬에 없어 독립 대조하지 못했습니다.

수정 전 별도 직접 가상 시험 17건은 통과했습니다: 정상 등록 허용, 미등록 복합/등록값 누락 거부, 명시된 복합 추가 확인, 단일 지역·시각·네트워크 변화 허용, 실제 none 출처 유지, signals/네트워크/사건 배열 누락, hour/count 타입 오류, 불명확 출처와 헤더 위조의 추가 확인, verified=true만으로 허용하지 않음, 901초의 잘못된 인증 형식 거부. 각 응답 다섯 항목·규칙 ID·요청 ID 및 입력 무변경을 확인했습니다. `git diff --check`도 통과했습니다. 인증서·개인키·서버 비밀값은 생성하지 않았습니다.

재실행: `npm run decider:test`와 `npm run fixture:7`. 화면의 실제 추가 인증 전 자료 차단은 제공 엔진 연결이 확인된 환경에서만 검증하며 이번에는 화면 작업을 수행하지 않습니다. 기존 인증·소유권 API·브라우저·XDR·자기 점검·설정 및 제공 시험 파일은 보존합니다. 변경 파일은 `src/decider.mjs`, `README.md` 두 개입니다.


추가 인증 재판정 수정 후 직접 가상 시험 21건 통과: 정상 등록 allow, 인증 전 복합 step_up, 유효 완료 복합 allow, 완료해도 미등록 deny, 단일 지역 변화 allow, 헤더/최상위 verified 위조 미사용, 출처 불명확은 완료 상태가 있어도 step_up, 인증 경과시간 0·900초 허용, 누락·null·빈 객체·배열·verified 문자열·미완료·경과시간 null/문자열/음수/901/NaN/Infinity는 복합 사건에서 step_up 유지. 응답 다섯 항목·요청 ID·입력 무변경도 확인했습니다. `git diff --check`는 통과했습니다. 정상적인 추가 인증 전후 자료의 실제 반환 여부는 미검증입니다. 커밋·bundle·푸시·실제 제출은 보류합니다.


## 7단계 저장점

6단계 기준 커밋 `2bc1b4007fe54fbbeb1953e8eda78dd078114f1d`의 이력을 보존합니다. 현재 설정 step은 숫자 7이며 자기 점검의 지원 목록에 7을 추가해 기존 HTTP 요청 7개 및 미실행 항목 3개를 유지합니다. 제출용 변경 파일은 `README.md`, `aleph.config.json`, `src/attack-check.mjs`, `src/decider.mjs` 네 개입니다. 기존 API·화면·Actions·bundle 스크립트·제공 테스트는 변경하지 않습니다. 위 제작 단계의 미커밋/step 6 설명은 당시 기록입니다.

판정기 규칙은 `device_registered`, `step_up_required`입니다. 미등록 기기는 deny, 정상 등록 요청은 allow, 명시된 복합 가상 사건은 미완료 인증에서 step_up, 엔진 검증 완료를 모의한 유효한 추가 인증에서는 allow로 재판정합니다. 신뢰 경계 밖 클라이언트 verified·헤더·위치·토큰 갱신은 근거로 쓰지 않습니다. 복합 사건의 일반 임계값을 추정하지 않고 제공 fixture의 명시적 조합을 사용합니다.

저장점 전 실제 재검증: `npm run decider:test` 4건 통과, 자기 점검은 기존 Production 설정 주소에 HTTP 요청 7건을 보내 기대 조건 모두 일치, 인증된 소유권·소유자 변경·DB 권한 3건은 미실행으로 유지했습니다. `git diff --check` 통과. 저장점 이후 재실행 순서는 `npm run decider:test` → 로컬 전용 bundle-notes.json에 작업 설명과 미검증 범위 기록 → `npm run bundle` → 제출 JSON의 숫자 step 7·HEAD 해시·규칙 2개·변경 파일 4개·점검 항목 10개를 대조하는 순서입니다. bundle-notes.json과 artifacts/submission.json은 커밋하지 않습니다.

이 HTTP 점검은 현재 배포의 기존 API에 대한 결과이며 미푸시 7단계 판정기의 운영 적용을 증명하지 않습니다. 로컬 판정기 시험은 심판 판정이 아닙니다. 실제 운영 엔진의 동일 사용자 재로그인·새 인증 시각 검증, 실제 추가 인증 전 자료 차단/완료 뒤 자료 허용, mTLS·사용자/기기 조합, 운영 이유 코드 등록부는 미검증입니다. 기존 test:package 불일치는 미해결이고 이번 범위에서 재실행하지 않습니다. 기존 Actions는 5단계 전용이며 변경하거나 실행하지 않습니다. GitHub 푸시·배포·실제 제출은 보류합니다. 인증서·개인키·서버 비밀값은 생성하지 않습니다.


## 8단계 제작 1: 자원 ID 표시 (미커밋)

기준 HEAD는 `befcc729fa0177e58ee1d18631a2a10f5c1fa65f`이며 7단계 저장점의 구현 기록과 일치합니다. 해당 커밋은 GitHub main에 푸시 완료했습니다. 위 7단계의 미푸시 설명은 당시 작업 범위 기록입니다. 이번 8단계는 커밋·bundle 생성·푸시·제출을 수행하지 않습니다.

조사 결과 기존 메모 API는 `api/notes.js`, `api/notes/[id].js`가 `src/notes-handler.mjs`를 사용하며 DB의 `a02_private_notes`에서 자료를 읽습니다. 서버 검증 identity.userId와 저장된 owner_id를 비교하고 POST/PUT owner_id 위조는 거부합니다. 저장소에는 강사 공지 테이블·자료·API·강사 권한 검증 구조가 없습니다. public/index.html의 notice 클래스는 로그인 안내 표시이며 강사 공지 자원이 아닙니다.

자원 ID는 `src/resource-ids.mjs`에서 서버가 선택한 이름 공간과 UUID로 만듭니다. 이름 공간을 분리해 같은 UUID라도 메모와 공지 ID가 다릅니다. UUID는 기존 행 ID를 변경하지 않고 표시용 ID 안에서만 소문자로 정규화합니다. ID는 소유권·강사 권한·DB 행 존재의 증명이 아닙니다.

| 자원 | 표시 ID | 구현 범위 |
| --- | --- | --- |
| 메모 목록 | private_note:collection | 기존 인증된 목록 API의 응답 헤더 |
| 개별 메모 | private_note:<기존 UUID> | 기존 인증된 상세 요청의 응답 헤더, 생성 성공 후 새 UUID 표시 |
| 강사 공지 | instructor_notice:<UUID> | 이름 공간만 예약. 실제 공지 저장소·UUID·주소가 없어 연결하지 않음 |

기존 API 응답의 `X-Aleph-Resource-Id` 헤더에 표시하며 JSON의 id/title/body 형식과 목록 배열·생성/삭제 응답은 보존합니다. 상세의 ID 형식 검사 및 기존 인증 뒤 헤더를 설정하고, 이후 기존 DB 소유권 검사는 그대로 수행합니다. 거부 응답에 표시된 요청 대상 ID가 해당 행 존재를 증명하는 것은 아닙니다. 목록의 헤더는 목록 자원 하나를 표시하며 각 행의 기존 id로 개별 표시 ID를 만들 수 있습니다. 클라이언트가 자원 종류·role·owner를 선택하도록 변경하지 않습니다.

판정기 계약은 사용자 `subjectId`, 기기 `deviceId`/`deviceRegistered`, 동작 `method`, 자원 경로 `service`/`path`/`route`를 제공합니다. 별도 resourceId·role 필드는 없습니다. 표시 ID를 엔진 요청에 덧붙이지 않으며, subjectId는 DB 사용자 UUID와 직접 비교하지 않습니다. 엔진 경로 예시 `/notes/:id`와 앱 `/api/notes/:id`의 대응, subjectId와 DB 사용자 매핑, 강사 권한의 검증된 출처는 제작 2·3 전에 확인해야 합니다.

실제 로컬 시험: 의존성 누락(jose)으로 기존 API 시험이 처음 시작하지 못해 기존 lockfile대로 `npm ci --ignore-scripts --no-audit --no-fund`를 실행했습니다. package.json/lockfile은 변경하지 않았습니다. 이후 기존 Bearer·HttpOnly 쿠키 A/B CRUD·타인 404·소유자 위조 거부·무인증 거부 시험 2건 모두 통과했습니다. 기존 시험을 저장소 밖 임시 사본에서 확장해 정상 목록·생성·상세 GET/PUT/DELETE의 자원 헤더와 원래 JSON 응답 호환성을 확인한 시험 1건도 통과했습니다. UUID 정규화·이름 공간 구분·잘못된 ID/기능명/export/헤더 삽입 거부 검사 통과, `npm run decider:test` 기존 4건 통과, `git diff --check` 통과. 기존 테스트 파일은 변경하지 않았습니다. 실제 DB·운영 배포에서 재실행한 시험이 아닙니다.

현재 변경 파일: `src/resource-ids.mjs`, `src/notes-handler.mjs`, `README.md`. 기존 DB 자료·API 주소·화면·인증·소유권 검사·6/7단계 판정 규칙은 보존합니다. 화면 메뉴·새 기능 경로·export 경로를 추가하지 않았습니다. 8단계 구역 권한 규칙·강사 공지 API 보호는 미구현이며 제작 2·3 범위입니다. 실제 강사 공지 자원 연결은 기존 자료의 저장 위치·주소·ID 계약을 확보한 뒤 진행해야 합니다.

재실행 명령: `node --test test/notes-ownership.test.mjs test/notes-cookie.test.mjs`. 화면 확인은 기존 자료실 로그인 → 메모 조회 후 개발자 도구 Network의 해당 응답 헤더 확인이며 이번 작업에서 실제 브라우저 확인은 미실행입니다.


## 8단계 저장점 — 서버 자원 선택과 소유권 회귀

제작 1의 자원 표시 ID를 유지하고, 상세 메모는 서버의 실제 요청 URL `/api/notes/<UUID>`에서 선택합니다. 프레임워크가 합친 `query.id`는 자원 선택에 사용하지 않습니다. 동일한 ID 쿼리는 허용하되 경로와 다른 ID, 중복 ID, 기능·역할·소유자 선택 쿼리는 400 INVALID_ID로 거부합니다. 목록 API에는 쿼리 필터가 없어 쿼리 ID 지정도 거부합니다. 잘못된 상세 경로와 export ID도 거부하며 기존 주소·응답 JSON·화면은 유지합니다.

실제 로그인 검증 도우미의 사용자 UUID와 DB owner_id 필터를 보존했습니다. 개별 조회·수정·삭제는 id와 검증된 owner_id를 함께 비교하고 목록은 검증된 사용자 소유 자료만 반환합니다. 요청 본문의 role/ownerId는 권한 근거로 쓰지 않고 owner_id 변경은 기존처럼 거부합니다. subjectId를 DB UUID로 비교하지 않습니다.

검증 순서: `node --test test/notes-ownership.test.mjs test/notes-cookie.test.mjs test/server-auth.test.mjs` → `npm run decider:test` → `git diff --check`. 첫 명령은 로컬 HTTP 서버와 격리된 모의 DB, 쿠키 전송, URL 검사, 기존 인증 검증을 시험합니다. A 자기 조회·수정 허용, B의 A 개별 GET/PUT/DELETE 404, B 목록에는 B 자료만 반환, 쿼리 ID 충돌·중복·기능 지정 400 및 DB 쓰기 없음, 허용되지 않은 API 메서드 405를 확인했습니다. 실제 사용자 세션이나 운영 DB 자료를 생성·수정·삭제하지 않았습니다. 시험용 서명 값은 실행 메모리 안에서만 사용하며 출력하거나 저장하지 않습니다.

6·7단계 판정 시험 4건(정상 allow, 미등록 deny/device_not_registered, 복합 step_up/step_up_required, 완료 모의 allow)은 모두 통과하고 판정기 코드는 변경하지 않았습니다. 운영 allowedReasonCodes와 `/notes/:id`↔`/api/notes/:id` 공식 매핑을 확보하지 못해 판정기 서비스·메서드·경로 규칙은 미구현입니다. 기존 이유 코드를 다른 거부에 재사용하거나 새 코드를 임의 생성하지 않았습니다. 기존 판정기는 알 수 없는 경로를 독립 거부하지 못하므로 8단계 전체 완료로 보고하지 않습니다.

강사 공지는 예약 자원 이름만 있고 실제 API·DB·검증된 강사 권한이 없어 구현하지 않았습니다. 학생의 공지 수정 차단은 실제 공지 자원으로 시험하지 못했습니다. 세 가지 메모 공격은 로컬 서버·모의 DB에서 확인했지만 운영 배포와 심판 4종 공격의 실제 통과는 미검증입니다. 경로/쿼리 처리의 Vercel 배포 검증, mTLS·사용자/기기 조합, 운영 재로그인 검증도 남아 있습니다.

설정 step을 숫자 8로 변경하고 자기 점검의 8단계 지원만 추가했습니다. 기존 HTTP 점검 7개와 미실행 점검 3개를 유지하며 판정기 경로 정책 미구현·강사 공지 미실행 항목을 추가했습니다. bundle HTTP 점검 대상은 아직 푸시하지 않은 이번 변경이 아닌 기존 Production 배포입니다. 기존 Actions·빌드·bundle 스크립트·커밋 이력은 보존합니다. GitHub 푸시·배포·실제 심판 제출은 수행하지 않습니다.


### 8단계 후속 검수 — 읽기 전용 Production 점검

기준 저장점 `5cfca78c4003958c160801d31f4990582a4b6d8b`를 보존합니다. 판정기 자원별 소유권/강사 역할 정보와 공식 서비스 경로 매핑·운영 이유 코드 등록부는 여전히 없습니다. `approved`는 문서의 allow 예시일 뿐 deny에 사용해도 된다는 명시적 근거가 아닙니다. 로컬 응답 형식 검사는 코드 문자열 모양만 검사하므로 운영 승인을 증명하지 못합니다. 모든 이유를 approved로 바꾼 메모리 내 시험에서는 미등록·복합 이상 시험이 실패했습니다. 실제 판정기·기존 기대값은 변경하지 않았고 RULE_IDS 두 개와 제출 policyRules가 일치함을 확인했습니다.

초기 Production HTTP 실패는 예외 상세를 보존하지 않아 근본 원인을 확정할 수 없습니다. Node 24.19.0의 명시적 환경 프록시 옵션으로 재조회해 `/api/notes` 비로그인 401을 확인했습니다. 읽기 전용 자기 점검에서 목록 GET·개별 GET·잘못된 토큰 목록 GET은 모두 401, `/data.json`은 404였으며 메모 자료를 감지하지 않았습니다. 이 결과는 아직 푸시하지 않은 8단계 코드나 A/B 소유권의 운영 검증이 아닙니다.

자동 승인 검토가 Production 익명 POST·PUT·DELETE 점검을 실제 자료 변경 가능성 때문에 거부했습니다. 이를 우회하지 않고 step 8의 자기 점검을 GET 전용으로 바꿨습니다. 3개 쓰기 항목은 요청 전송 없이 미실행으로 남깁니다. 1~7단계의 기존 점검 동작은 보존하고, bundle은 미실행·미구현 항목에 HTTP 실행 대상 표시를 붙이지 않습니다.

재검증: `node --test test/attack-check-readonly.test.mjs test/notes-ownership.test.mjs test/notes-cookie.test.mjs test/server-auth.test.mjs` 6건 통과, `npm run decider:test` 4건 통과, `git diff --check` 통과. 새 회귀 시험은 step 8에서 GET 4개만 전송하고 쓰기 3개는 미실행으로 표시함과 step 7의 기존 요청 7개 보존을 확인합니다.

괴물별 상태: 갓김치사량(타인 개별 읽기), 충무공김밥(타인 수정), 성주참외롭다(타인 목록)는 기존 API 소유권 보호 구현과 로컬 HTTP/모의 DB 검증이 있지만 인증된 실제 배포 A/B 재검증은 없습니다. 경주화남빵은 실제 강사 공지 자원·검증된 강사 권한이 없어 구현·모의 검증·실제 검증 모두 미완료입니다. 판정기 자원별 규칙도 미구현입니다. 운영 데이터·권한은 변경하지 않았고 푸시·배포·심판 제출은 하지 않았습니다.


### 8단계 재검증 후보 1 — 실제 심판 24점 이후 경로 정책

기준 `c92443d49657`의 실제 심판은 24/100점이며 S08_UNKNOWN_PATH_ALLOWED와 S08_OTHER_ZONE_ALLOWED를 보고했습니다. 갓김치사량은 공격 성공, 수정·목록·공지 공격은 격파 표시였습니다. 이 결과는 공지 자원 구현 완료를 뜻하지 않습니다.

첨부 ZIP의 inspectNoteRoute 경로 조합 검사와 19개 경로 시험·4개 회귀 시험을 재사용했습니다. 운영 코드 전체를 덮어쓰지 않고 기존 inspectAccessContext를 보존했습니다. service notes, 목록 GET/POST와 상세 GET/PUT/DELETE의 method·route·path를 함께 검사하며 상세 ID는 UUID로 한정하지 않습니다. demo와 안전한 단일 ASCII ID 구간을 허용하고 중첩·인코딩·역참조·쿼리/fragment 포함 경로는 거부합니다. export는 이번 로컬 정책에서 기능명으로 예약하며 공개 계약이 정한 완전한 예약어 목록이라고 주장하지 않습니다. ZIP의 다른 예약어들은 근거 없이 정상 ID를 막지 않도록 제외했습니다.

zone_grant 규칙과 zone_denied 이유 코드는 공개 2026-09-26 r1 원고에 근거한 재검증 후보입니다. 운영 등록부 독립 확인이나 이전 심판의 승인된 거부 응답 근거는 없으며 실제 재제출로 결과를 확인합니다. 현재 요청에 identity.role·ownerId를 추가하지 않고 표시 자원 ID를 소유권 증거로 쓰지 않습니다. /notes와 /api/notes의 매핑도 일반적인 공식 엔진 계약으로 단정하지 않습니다. 이 정책은 경로를 제한하지만 같은 유효 경로의 타인 소유권은 최종 API에서 확인합니다.

미등록 기기는 device_not_registered 우선 거부, 허용 경로의 복합 사건은 기존 step_up_required를 유지합니다. 추가 인증 완료도 잘못된 경로를 우회하지 못합니다. API·JWT·소유자 검사·쿼리 ID 방어·화면·설정 step 8은 변경하지 않았습니다. 별도 미커밋 실험 파일 두 개는 보존하며 운영 모듈과 연결하지 않습니다.

로컬 검증: `node --test test/stage8-routes.test.mjs test/stage6-7-regression.test.mjs test/notes-ownership.test.mjs test/notes-cookie.test.mjs test/server-auth.test.mjs test/attack-check-readonly.test.mjs` 31건 통과, `npm run decider:test` 4건 통과, `npm run fixture:7` 정상 allow·복합 step_up, `git diff --check` 통과. 로컬 통과는 운영 이유 코드나 실제 심판 성공을 보증하지 않습니다. 정상 CRUD·타인 GET/PUT/DELETE 404·소유자 목록·URL 충돌은 모의 DB/로컬 HTTP 시험입니다. 실제 공지 자원·강사 권한은 여전히 없습니다.

## 8단계 저장점 — 원문 요구사항 재대조

기준 b2203ff4af0b의 공식 결과는 48/100점, S08_OTHER_ZONE_ALLOWED입니다. 현재 수정은 경로와 같은 단일 id 쿼리만 판정기에서 허용하고, 최종 API에서 목록의 모든 owner_id 및 개별 GET의 요청 ID를 반환 전에 재대조합니다. 기존 인증·DB 소유자 필터·정상 기본 목록·demo/UUID·6/7단계 정책은 유지합니다. 강사 공지 API·DB는 저장소에 없으며 학생에게 공지 쓰기를 허용하지 않습니다. 세부 근거와 가설은 docs/STAGE8_POLICY_REVIEW.md에 기록했습니다.

재실행: node --test test/stage8-policy-regression.test.mjs test/stage8-routes.test.mjs test/stage6-7-regression.test.mjs test/notes-ownership.test.mjs test/notes-cookie.test.mjs test/server-auth.test.mjs test/attack-check-readonly.test.mjs. 관련 테스트 42개 통과, npm run decider:test 4개 통과, npm run fixture:7 정상 allow·복합 step_up, npm run build -- --local 통과. 실제 배포·심판은 커밋 후 검증하며 로컬 테스트를 공식 성공으로 표현하지 않습니다.

### 8단계 제출 전 준비 — 판정기 모듈 의존성 제거

6948aa262b80의 공식 0점(S08_OWN_BROKEN) 후 실행환경 차이를 분리하기 위해 판정기의 node:crypto import를 제거했습니다. 허용·거부 정책과 API는 유지하며 기존 ID 쿼리 SHA-256 비교를 순수 JavaScript로 대체합니다. test/decider-runtime.test.mjs에서 독립 해시 결과 및 모듈 로더/Node API 없는 VM 실행을 검증했습니다. 관련 테스트 44개, decider:test 4개, fixture:7, 로컬 빌드 통과. 공식 심판은 사용자가 직접 제출하며 이 버전의 점수는 아직 미확인입니다.

## 9단계 저장점 — 도플갱어 조회 폭주 탐지 및 회수 제안 (2026-10-13)

현재 제출 대상은 **9단계**이며 `aleph.config.json.step = 9`입니다. 기존 메모 로그인·소유권 API, 6단계 기기 규칙, 7단계 추가 확인, 8단계 자원 구역 판정 및 원본 `allowedRoutes`/서비스 발급자/원본 API 주소는 보존합니다.

- **제작 1 — 입력:** `src/detect.mjs`의 `readDetectionEvents(events)`는 공식 `docs/DETECT_EVENTS.md`에서 제공한 `at`, `method`, `identity.sub`만 읽고 `{at, method, subject}`로 정리합니다. 사건에 있는 토큰·메모 내용·실명·임의 기기/네트워크/판정 필드는 복사하거나 로그에 남기지 않습니다. 잘못된 개별 사건은 제외하며 배열이 아닌 입력은 거부합니다.
- **제작 2 — 탐지:** 동일 가명 사용자에게 속한 `GET` 사건을 시각순으로 정렬한 뒤 **10분 미만 이동 구간에서 120건 초과**일 때만 폭주로 판단합니다. 정확히 120건, 서로 다른 사용자들의 합계, 시간창 밖 사건, GET 아닌 동작은 감지하지 않습니다. 입력 순서와 무관하게 가장 먼저 임계값을 넘긴 사용자 하나를 선택합니다.
- **제작 3 — 제안:** 폭주 사건의 **별도 `detect(events)` 결과에만** `{action:'propose_revocation',reasonCode:'burst_read',subject:'가명 사용자'}`를 반환합니다. 정상 사건은 `{action:'observe'}`입니다. `decide(request)`의 기존 다섯 필드·허용/거부 형식은 변경하지 않았고, 회수 API를 만들거나 DB·세션·기기 권한을 수정하지 않았습니다.
- **9단계 원문과 공개 계약의 차이:** 단계 화면은 비정상 네트워크 및 특정 기기 한 개 회수까지 설명하지만, 제공 `docs/DETECT_EVENTS.md` 기본 사건은 **시각·메서드·가명 사용자만** 담습니다. 따라서 이 코드만으로 비정상 네트워크를 확인하거나 기기 하나를 신뢰성 있게 식별할 수 없습니다. 실제 도플갱어 기기 회수·탈취 세션 무효화·다른 자료 이동 거부·경과시간 계산은 운영 심판의 집행 범위이며 미검증입니다. 이 제한을 브라우저/요청 본문의 임의 필드로 메우지 않았습니다.
- **보안 경계:** `src/attack-check.mjs`의 9단계 자체 HTTP 점검은 공개 배포에 GET만 전송합니다. 정상 120건/폭주 121건 탐지는 **로컬 가상 사건 결과**로 별도 기록하고, 실제 회수 후 재시도 3종은 `미실행`으로 명시합니다. 로컬 성공을 실제 기기·세션 회수로 주장하지 않습니다.
- **검증:** `npm run detect:test`, `node --test test/detect-input.test.mjs test/detect-window.test.mjs test/attack-check-readonly.test.mjs`, `npm run decider:test`, `npm run fixture:7`, `npm run build -- --local`. 자동 회귀 실행은 `.github/workflows/stage8-verify.yml`에서 6~9단계를 함께 점검합니다.
- **저장점/번들:** 9단계 코드를 `main`에 반영하고 배포가 최신 HEAD의 `READY`인지 확인한 뒤 `npm run bundle`을 실행합니다. 로컬 제출 묶음 파일 `bundle-notes.json` 및 `artifacts/submission.json`은 Git에 올리지 않으며, 공식 심판 재제출은 학생이 수행합니다.

**이전 단계의 미해결 심판 문제를 구분합니다.** 8단계 공식 최근 확인 점수는 `96fc04b...`에서 **48/100, S08_OTHER_ZONE_ALLOWED**였습니다. 이후 판정기 조정 `92ed2a2...`의 공식 심판 결과는 이 저장소에 확인된 기록이 없습니다. 9단계 제출이 8단계 문제 해결을 소급 증명하지 않습니다.

## 10단계 저장점 — 검증된 사본에서 지정 자원 복원 (2026-10-13)

**현재 코드(10단계 재검증 후보):** `aleph.config.json.step = 10`. `restoreRoute = "/api/restore/:id"`. 기존 `judgeIssuer`, `identityProvider`, 원본 API, 1~9단계 로그인·메모 CRUD·기기·추가 인증·자원 구역 정책·조회 폭주 탐지 함수는 보존합니다. GitHub 공개 저장소에는 비밀값/메모 본문을 넣지 않습니다.

### 제작 1 — 정책 백업 무결성 및 차이 미리보기

- 실제 Supabase `ALEPH_Defense_02`의 기존 **메모 5건/소유자 2명**과 운영 RLS 정책 **4개**를 현재 시점에서 백업했습니다. 이 저장소에 기존 사전 백업은 없었으므로, **2026-10-13에 새로 만든 사본**이라는 한계를 명시합니다. 과거 침해 발생 전부터 보유한 백업이라고 주장하지 않습니다.
- `sql/10_verified_recovery.sql`(Supabase에 마이그레이션 이름 `stage10_verified_private_recovery_backups`로 적용됨)은 `a10_note_backups`(비공개 사본), `a10_policy_backups`(안전 정책), `a10_test_policies`(별도 시험 정책), `a10_recovery_audit`(추가 전용 감사 기록)을 만듭니다. 사본·감사 기록의 수정/삭제 트리거와 RLS, 일반 계정 직접 접근 거부를 설정했습니다.
- **시험 정책 미리보기:** 검증된 심판 JWT를 지닌 클라이언트의 `GET /api/restore/policy`. 저장된 사본의 SHA-256을 다시 계산해 검증하고 `scope: "test_only"`, `backupVersion`, 변경된 규칙 이름과 양쪽 정의 해시만 반환합니다. 정책 원문·비밀값은 반환하지 않습니다. 사본·시험 정책 누락이나 해시 불일치 시 차이 계산/복원 자체를 거부합니다. 일반 사용자나 요청 본문 role=admin은 접근할 수 없습니다.

### 제작 2 — 변경 범위 확인 후 시험 정책만 롤백

- `POST /api/restore/policy`에 `{"confirm":true,"expectedVersion":"<미리보기에서 받은 SHA-256>"}`를 보냅니다. 검증된 심판 JWT만 허용합니다. 버전 재검사와 시험 정책 변경은 DB 트랜잭션으로 실행하며 **`a10_test_policies`만 복원**합니다. 운영 `pg_policies` / `a02_private_notes` RLS 정책 정의는 변경하지 않습니다. 감사 기록은 추가만 가능하며 보존합니다.
- 실제 SQL 트랜잭션의 **합성 시험**에서 `notes_owner_select` 시험 규칙을 일부러 완화하고 미리보기 차이 1건 → 이전 안전 정의 복구 1건 → 차이 0건을 확인한 뒤 **ROLLBACK**했습니다. 운영 정책·메모·감사 내역에 이 가상 시험 변경은 남기지 않았습니다.
- 기존 `test/notes-ownership.test.mjs`는 **A 자기 자료 CRUD 성공, B의 A 자료 GET/PUT/DELETE 거부(404)**를 가상 DB로 검증합니다. 이는 시험 정책 복원의 실제 반 엔진 집행 증거가 아닙니다.

### 제작 3 — 비공개 메모 한 건만 복원

| 메서드·경로 | 인증 / 입력 | 결과 |
| --- | --- | --- |
| `GET /api/restore?id=<UUID>` | 검증된 B 사용자 로그인/JWT | 자기 소유 사본의 ID, ownerId, contentHash, titleHash, backupAt, 현재 존재 여부, 변경 여부. 본문·제목은 노출하지 않음 |
| `POST /api/restore` | 검증된 B 사용자 로그인/JWT, JSON `{"id":"<UUID>","expectedHash":"<SHA-256>"}` | ID·검증된 신원에 따른 소유자·비공개 사본 내용/제목 해시를 검증한 뒤 **그 메모 1건만** 제목/본문 또는 삭제된 행을 원자 복원. 응답에는 id, ownerId, contentHash, restored만 포함 |
| `GET /api/restore/policy` | 검증된 심판 JWT | 안전 정책/시험 정책 차이만 반환 |
| `POST /api/restore/policy` | 검증된 심판 JWT, `confirm:true`, `expectedVersion` | 검증된 버전으로 시험 정책만 복원 |

`expectedHash`는 GET 미리보기에서 확인하는 안전장치이며, 메모 복구 때 서버는 전달 여부와 무관하게 사본의 SHA-256 및 요청 신원과 사본 소유자의 일치를 검증합니다. 다른 소유자 자료는 404, 해시/현재 소유자 불일치와 손상된 사본은 실패로 중단합니다. 로그인은 기존 `createLoginVerifier`로 검증하고 권한 요청 body·header의 `owner_id`/`role`을 신뢰하지 않습니다. 쿠키 인증 POST는 동일 출처만 허용합니다. 기존 메모 CRUD의 JSON 응답은 변경하지 않았습니다.

**향후 B 계정 메모 준비:** DB `a02_private_notes`에 나중에 새 메모가 만들어질 때 `AFTER INSERT` 트리거가 동일 트랜잭션 안에서 **첫 작성본만** 비공개 사본으로 만듭니다. 이로써 심판 시험에서 B 새 메모를 먼저 만들고 변조/삭제한 경우 최초 메모를 복구할 수 있습니다. 과거 사본을 덮어쓰지 않으며, ID가 다른 소유자로 재사용되는 것도 거부합니다.

**실제 검증 범위:** 기존 메모 5건의 콘텐츠·제목 백업 해시 일치, 정책 사본 4개 무결성, 일반 권한의 백업 직접 읽기 거부, 운영 메모 건수 변경 없음 확인. 별도 합성 B 유사 메모를 SQL 트랜잭션 내 생성→변조→복원 및 삭제→복원해 ID/소유자/해시가 원본과 같음을 확인하고 트랜잭션 **ROLLBACK**. 실제 로그인된 B 계정에 대한 생산 DB 변조·삭제는 수행하지 않았으며, 심판의 공격 결과는 미확인입니다.

### 제작 4 — 1~9단계 복구 후 재실행 순서

| 순서 | 이전 단계 | 정상 확인 / 거부 확인 | 실행 증거 |
| --- | --- | --- | --- |
| 1 | 정적 메모 제거(1·2) | 공개 `/data.json` 404, 비로그인 메모 노출 없음 | Production GET 자기 점검 |
| 2 | API 인증(3) | 인증 없는 메모 GET 401; 로그인 사용자 조회 성공 | Production 익명 401, 로그인은 모의/이전 사용자 보고 |
| 3 | 메모 CRUD(3·4) | A 자기 메모 GET·POST·PUT·DELETE; B→A 상세 GET·PUT·DELETE 404 | `test/notes-ownership.test.mjs` 로컬 HTTP/모의 DB |
| 4 | 서버 로그인(5) | 로그인/로그아웃/HttpOnly 쿠키 및 교차 Origin 변경 차단 | `test/server-auth.test.mjs`·`test/notes-cookie.test.mjs` |
| 5 | 등록 기기(6) | 등록 요청 허용, 미등록 요청 거부 | `npm run decider:test` |
| 6 | 추가 확인(7) | 정상 allow, 복합 이상 step_up, 완료 재판정 | `npm run fixture:7` 및 회귀 시험 |
| 7 | 자원 구역(8) | 타인/목록/알 수 없는 경로·공지 쓰기 거부 | `test/stage8-*.test.mjs` 로컬; 공식 8단계 마지막 확인 48점, 미해결 위험 |
| 8 | 도플갱어 탐지(9) | 120회 observe / 121회 회수 **제안**; 정상 기기 비영향 | `npm run detect:test`, `test/detect-*.test.mjs` |
| 9 | 복구 안정성(10) | 사본 해시 검증·B 한 건만 복원·시험 정책 버전 복원·교차 소유자 거부 | `test/recovery-api.test.mjs` 및 DB 합성 트랜잭션 롤백 |
| 10 | 실제 심판 재공격 | 자료 복구 직후 심판의 이전 단계 전체 공격 재전송 | **미실행**, 공식 심판 제출 후에만 확인 가능 |

**재실행:** `npm run detect:test` → `npm run decider:test` → `npm run fixture:7` → `node --test test/*.test.mjs` 중 `package-starter.test.mjs`는 오래된 시작 틀 API 파일 목록과 현 구조가 달라 별도 실패 가능성이 있으므로 보안 회귀 CI에 포함하지 않음 → `npm run build -- --local` → `npm run bundle`. 보안 회귀는 GitHub Actions `.github/workflows/stage8-verify.yml`, 제출 묶음은 `.github/workflows/stage9-bundle.yml`(표시명 Stage 10 Submission Bundle)에서 실행해 아티팩트 `aleph-stage10-submission`으로 보관합니다.

**복구 경로(현재):** `restoreRoute: "/api/restore/:id"` / `POST /api/restore/<UUID>`, 기존 `POST /api/restore`(본문에 `id` 지정)도 호환으로 유지. 운영 Supabase 프로젝트에는 위 마이그레이션이 이미 적용되었으므로 중복 실행하지 마세요. 비밀값은 기존 서버 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`에서만 읽습니다. 제출은 학생만 수행하며 자동 테스트 통과를 공식 심판 점수로 바꾸어 서술하지 않습니다.

### 10단계 공식 12/100점 이후 재수정 — 아직 미제출

**공식 첫 결과:** 기준 커밋 `4a9977ab0d21`은 **12/100점**이고, 실패 코드 **`S10_BACKUP_UNVERIFIED`·`S10_RESTORE_MISMATCH`·`S10_RETEST_MISSING`**를 받았습니다. '자료 복구 완결'이나 심판 통과로 서술하지 않습니다. 당시 운영 DB의 복원 감사 기록은 0건이었고, 복구가 심판 요청에 도달했는지 단정할 수 없었습니다. Vercel 런타임 로그는 연결된 권한으로 403이어서 실제 심판 HTTP 요청 형식을 확보하지 못했습니다.

**실제 수정과 근거:**

1. **복원 경로:** 10단계 일부 조건을 통과한 공개 구현의 입력 형태를 참고하여 `api/restore/[id].js`를 새로 추가했습니다. 현재 심판 제출 경로는 `POST /api/restore/:id`이며 UUID 1개만 선택합니다. `POST /api/restore/<UUID>`는 JSON 본문이 없어도 실행하고 `{"preview":true}`를 주면 복원 전 상태를 보여줍니다. 기존 `/api/restore`도 유지하지만 본문 없이 임의 메모를 복원하지 않습니다. 경로·본문의 다른 ID, 요청한 소유자/관리자 권한 주장은 거부합니다.
2. **독립 사본 봉인:** 적용된 SQL `sql/10_versioned_seals.sql`는 `a10_note_seals`·`a10_policy_seals`에 사본 전체의 SHA-256 봉인값을 보관하고 수정·삭제를 거부합니다. 백업을 다시 읽을 때 원본 ID·소유자·제목·본문·생성시각을 독립 봉인값과 대조합니다. 사본이 새로 없으면 실패합니다. 기존 5건 사본은 **지금 새로 봉인한 것**으로, 과거 독립 오프사이트 백업을 증명하지 않습니다.
3. **미리보기→실행 직전 재검증:** `a10_preview_verified_note`는 복원 대상의 백업 버전·현재 상태 버전·변경 필드(`title`,`content`,`create`)를 반환합니다. `a10_restore_versioned_note`는 원본 메모 한 건을 잠금한 뒤 백업+봉인+버전을 다시 검증하고 한 건만 복원합니다. 최종 ID·소유자·제목·내용 해시를 읽어서 확인하며, 실패 시 트랜잭션 전체를 되돌립니다. 시험 정책 복원은 별도 `/api/restore/policy`에서만 수행하며 운영 RLS 정의는 덮어쓰지 않습니다.
4. **복원 뒤 재시험:** 실제 성공한 `POST /api/restore/<UUID>` 경로는 `src/post-restore-retest.mjs`에서 **복원 이후** 인증된 본인 GET(200), 비로그인 GET 거부(401), 알 수 없는 URL 거부(400), 확인 가능한 타인 소유 메모 GET 거부(404)를 실제 메모 API로 다시 요청합니다. 이어서 6·7단계 정상/미등록/복합 판정과 9단계 120/121건 가상 이벤트를 재시험합니다. 응답에는 상태와 통과 여부만 반환하며 타인 ID, 제목·본문·JWT는 기록하지 않습니다. 타인 시험 자료가 없으면 `not_run`으로 표시하며 **심판의 전체 1~9단계 서명 재공격/권한 회수 결과는 미실행**으로 구분합니다.

**이미 실행한 검증:** 연결된 Supabase에서 임의 가상 메모 한 건을 **트랜잭션 내부에서만** 생성→변조→미리보기→복원, 삭제→미리보기→복원, 잘못된 버전 거부, 타인 소유자 거부, 봉인 재작성 거부, 복구 감사 기록 증가를 점검하고 마지막에 `ROLLBACK`했습니다. 기존 운영 메모는 변경하지 않았습니다. 이 시험은 실제 심판 B 토큰을 사용하는 HTTP 복원과 별개입니다.

**재검증 순서:** `npm run detect:test` → `npm run decider:test` → `npm run fixture:7` → `node --test test/recovery-api.test.mjs test/post-restore-retest.test.mjs test/notes-ownership.test.mjs test/attack-check-readonly.test.mjs` → `npm run build -- --local` → `npm run bundle`. `stage8-verify.yml`과 `stage9-bundle.yml`은 각각 회귀 테스트·번들을 실행합니다.

**현재 제한:** 고쳐진 경로와 재시험 로직으로도 심판 통과를 보장할 수 없습니다. 다음 공식 재제출 전에는 새 커밋의 GitHub Actions, Vercel Production 최신 해시, 제출 JSON 최신 해시가 모두 일치하는지 확인해야 합니다.

### 10단계 두 번째 공식 12점 이후 계약 수정 및 재검증 — 다음 심판 판정 대기

**확인된 두 번째 판정:** 커밋 `2edaf1308fd5`도 공식 **12/100점**, `S10_BACKUP_UNVERIFIED`, `S10_RESTORE_MISMATCH`, `S10_RETEST_MISSING` 세 조건이 모두 실패했습니다. 자동 테스트·DB 합성 복구·배포 성공만으로는 심판 계정 B에 대한 복구 성공을 입증하지 못했습니다. 첫 재제출과 같은 점수였다는 사실을 그대로 보존합니다.

**이번 수정의 실질적 차이:**

- **허용 경로 제출 계약:** 기존 `allowedRoutes: ["GET /api/notes", ...]` 문자열 배열은 공식 샘플의 구역별 정책 형식과 불일치했습니다. `aleph.config.json`을 `schema:"aleph.config.v1"`과 각 `service`·`method`·`pathPattern`·`zone` 객체 배열로 바꿨습니다. 등록하지 않은 강사/관리자 쓰기 권한은 추가하지 않았습니다. 대상은 `notes / my-notes`의 `POST /api/restore/:id`로 한정합니다. `test/stage10-submission-contract.test.mjs`에서 잘못된 문자열 형식·범위 초과·중복 경로를 거부합니다. 이것이 공식 실패의 실제 원인이었는지는 **아직 미확정**입니다.
- **복구 경로의 실제 배포 도달:** `src/attack-check.mjs`는 이제 가짜 UUID에 대해 실제 Production의 **`GET /api/restore/<UUID>`**를 전송합니다. 비인증 요청이 `HTTP 401`로 응답하는 것을 GitHub Actions의 `npm run bundle`에서 관측했습니다. 이는 **라우터와 로그인 게이트 존재**만 입증하며, 서명된 B 계정의 POST 및 실제 복원 성공을 증명하지는 않습니다.
- **개인정보 없는 실패 단계 기록:** DB에 `sql/10_private_restore_observations.sql` 마이그레이션을 적용하고 `src/recovery-observation.mjs`을 추가했습니다. 로그인 검증 후에만 `judge`/`student` 구분과 고정 코드 `auth_verified`·`backup_verified`·`backup_rejected`·`restore_committed`·`restore_rejected`·`retest_passed`·`retest_failed`를 **추가 전용, 비공개 `a10_restore_observations`** 테이블에 기록합니다. UUID, 이메일, 토큰, IP, 메모 본문·제목·해시는 이 기록에 저장하지 않습니다. RLS를 활성화하고 익명/일반 사용자 직접 실행·읽기는 차단했습니다. 진단 기록 실패가 복구를 취소하지 않도록 했습니다. `test/recovery-observation.test.mjs`에서 입력 필터·개인정보 누락·기록 장애를 점검했습니다. 관측 기록은 **다음 실제 심판 호출이 성공적으로 로그인 게이트를 지난 경우에만 남을 수 있습니다**.
- **기존 복구 경계 유지:** 사전 확인한 백업 원본을 독립 해시와 대조, 버전·차이 미리보기, 잠금 후 사본 재검증, 특정 UUID+검증된 소유자의 메모 한 건만 복원, ID·소유자·제목·본문 해시 비교와 감사 기록, 복구 **후** API 실제 GET 및 로컬 6~9단계 회귀 순서를 유지했습니다.
- **제출 묶음 주의:** `scripts/bundle.mjs`의 `changedFiles`는 **HEAD 마지막 커밋의 파일들만** 나열합니다. 여러 커밋에 걸친 전체 10단계 변경 파일 목록이 아닙니다. 따라서 이전 `2edaf130` 묶음의 `changedFiles:["README.md"]`를 실질적인 10단계 수정 파일의 완전한 증거로 취급해서는 안 됩니다. 전체 구현은 실제 GitHub 파일/이력을 확인해야 합니다.

**다음 검증 전 현재 범위:** 비공개 백업·봉인 각각 5건, 시험 정책/봉인 각각 4건, 운영 메모 5건, 복구 감사 기록 0건, 사본 봉인 불일치 0건으로 확인했습니다. 이 값은 공식 심판 B POST가 처리되었다는 증거가 **아닙니다**. 수정본으로 재제출할 경우 실제 심판 판정 후 `a10_restore_observations`의 **집계만** 읽어 로그인 통과·백업 거부·복구 완료 중 어디에서 멈췄는지 살피고, 그 결과에 따라 문제를 좁혀야 합니다. `a10_restore_observations`의 행이나 원본 비밀값을 공개 저장소·제출물에 넣지 않습니다.

**테스트/배포:** `stage8-verify.yml`에서 기존 인증·소유권·판정기·복구 회귀에 계약/관측 기록 테스트를 포함합니다. `stage9-bundle.yml`은 실제 `npm run bundle`로 10단계 JSON을 만들고 유효성을 검증한 후 비공개 ZIP 아티팩트를 생성합니다. 최신 GitHub HEAD와 Production 배포 커밋이 같고 해당 HEAD의 두 workflow가 `SUCCESS`인 경우에만 다음 심판 제출 후보입니다.

**미완료 증거:** 실제 시험 계정 B의 서명된 요청으로 메모를 변조/삭제한 뒤 복원·검증하는 테스트와 심판의 1~9단계 대표 공격 재전송은 본인이 가진 인증/운영 심판 권한으로만 확인할 수 있어 **미실행**입니다. 자동 CI 통과를 공식 점수로 표시하지 않습니다.

### 10단계 최종 저장점과 판정 한계 (2026-10-13)

이 단락이 위의 이전 저장점 기록보다 최신입니다. 본 저장점에는 서비스별 구역을 명시한 `allowedRoutes` 객체, 실제 UUID 복원 경로 `POST /api/restore/:id`, 독립적으로 봉인한 비공개 백업, 버전·변경 범위 미리보기, 트랜잭션 안의 ID·소유자·본문 지문 검증, 복구 뒤 실제 메모 API GET 및 이전 단계 가상 판정 재시험, 선택한 메모 한 건 복구를 승인하는 웹 UI, 로그인 확인 뒤의 개인정보 없는 DB 진단 기록이 들어 있습니다. 임의 소유자 역할 부여, 운영 RLS 정책 변경, 공개 메모 업로드는 하지 않았습니다.

서버 복구 실패의 정확한 원인을 알 수 있도록 비공개 `a10_restore_observations`에는 `judge|student`와 고정된 검사 단계·사유 코드만 저장합니다. JWT, 메모 본문, 계정 ID, 메모 UUID, IP, 비밀 키를 기록하지 않습니다. 복구가 완료된 경우에는 `a10_recovery_audit`에 복구 이벤트가 추가됩니다. 둘 다 실제 심판 호출의 결과를 사후 분석할 때 확인하고 그 값을 근거 없이 README에 통과로 옮기지 않습니다.

**마지막 공식 결과는 `2edaf1308fd5`에서 12/100점, 실패 3코드 그대로입니다.** 이번 저장점은 이후에 수정된 재제출 후보일 뿐, 아직 새 공식 점수를 받지 않았습니다. 실계정 B의 실제 복구 성공, 심판이 실행한 1~9단계 전체 재공격 차단은 완료로 표시하지 않습니다.

**재현:** `npm run detect:test`, `npm run decider:test`, `npm run fixture:7`, CI `stage8-verify.yml`, `stage9-bundle.yml`, `npm run bundle`. 검증 결과, 실측 심판 결과, 미실행 항목을 구분합니다. 제출물의 `changedFiles`는 이 HEAD 저장점에서 실제 바뀐 파일들이며 전체 10단계 개발 이력은 Git 커밋 로그에서 확인합니다.

### 10단계 독립 재검증 및 HTTP 재시험 보완 (2026-10-13)

기준 커밋 `7756ddcfc4188df2bb8b6c37b1aa22d193eecaa0`의 공식 결과는 사용자 보고 기준 **12/100점**이며 `S10_BACKUP_UNVERIFIED`, `S10_RESTORE_MISMATCH`, `S10_RETEST_MISSING`이 남아 있습니다. 다음 확인은 이 실패를 공식 통과로 바꾸는 근거가 아닙니다.

**확인된 사실:** Production은 기준 커밋의 READY 배포였고 실제 `POST /api/restore/<시험 UUID>`는 비인증 요청에 401로 응답했습니다. DB에는 운영 메모·백업·봉인이 각각 5건, 복구 감사·인증 이후 관측 기록은 각각 0건이었습니다. RPC의 service_role 실행 권한, 일반 계정 실행 차단, 백업/봉인 트리거가 존재합니다. 실제 DB의 임시 시험 자료로 변조 복구·삭제 복구·복원 후 ID/소유자/내용 SHA-256 일치·타인 거부·버전 불일치 거부·성공 감사 2건 추가를 검증했습니다. 시험 변경은 예외 하위 트랜잭션에서 모두 롤백했고 운영 메모, 백업, 기존 감사 행의 전체 지문이 시험 전후 동일했습니다. 운영 RLS 정책은 수정하지 않았습니다.

**과거 실패의 정확한 중단 위치는 미확정:** 인증 이후 관측 0건은 성공한 복원 증거가 없다는 뜻입니다. 라우팅/인증 실패, 심판의 다른 호출 형식, 관측 기록 장애를 이 값만으로 구분할 수 없습니다. Vercel 실행 로그 도구는 403으로 거부됐고 인증된 심판 B 세션은 제공되지 않았습니다. 공식 시작 저장소와 공개 참고 구현의 설정/검증기/복구 경로도 대조했지만 실제 심판의 요청 본문 및 서명된 주체를 관측하지 못했으므로 소유자 매핑이나 인증 계약을 추측으로 바꾸지 않았습니다.

**실제 수정:** 이전 복구 후 검사는 메모 핸들러를 내부 호출했으며 정상 반환의 내용 해시를 검사하지 않았습니다. `src/post-restore-retest.mjs`은 이제 복구 커밋 뒤 설정에 고정된 Production 주소로 정상 GET, 익명/잘못된 토큰 거부, 알 수 없는 경로 거부, 확인 가능한 타인 GET 거부를 HTTP로 요청합니다. 리다이렉트에 토큰을 전달하지 않고 요청별 8초 제한을 적용합니다. 정상 GET의 ID와 본문 SHA-256을 검증된 백업과 대조하고 응답 본문/토큰을 증거에 넣지 않습니다. 6·7단계 판정과 9단계 탐지는 여전히 **로컬 합성 시험**으로 표시합니다. 실패/미실행을 성공으로 채우지 않습니다. `src/recovery-handler.mjs`은 고정된 `X-Aleph-Recovery-Checkpoint` 헤더로 인증 전 실패도 구분하고 잘못된 본문 ID 유형을 DB 호출 전에 400으로 거부합니다. 기존 RPC, 백업, 소유자 규칙, 운영 정책은 유지합니다.

**실행한 시험:** `npm run detect:test`, `npm run decider:test`, `npm run fixture:7`, `node --test test/*.test.mjs`(81건 통과), `npm run build -- --local` 통과. 새 시험은 HTTP 목적지/리다이렉트 차단, 내용 해시 불일치, 전송 오류의 실패 표시, 인증 게이트 진단, 잘못된 본문 ID 거부를 포함합니다. 오래된 패키징 테스트가 단계별로 추가된 메모/복구 API를 빠뜨린 오류도 수정했고 원래 시작 틀 기준표는 보존했습니다. 실제 DB 시험과 로컬 가상 HTTP/서명 시험은 구분합니다.

**미실행:** 실제 심판이 발급한 B 토큰으로 Production에서 메모를 변조/삭제한 뒤 복원하는 전체 흐름, 심판의 1~9단계 전체 재공격/회수 집행은 미실행입니다. 새 HTTP 재시험 코드의 배포 자체를 해당 B 흐름의 성공이라고 주장하지 않습니다. 심판 제출은 사용자가 직접 수행합니다. 최종 GitHub SHA/Production 일치와 `npm run bundle` 결과는 제출 준비 보고에서 별도 확인합니다.

### 10단계 후속 원인 후보 수정 — 고정 Vercel 배포 주소로 서명된 심판 토큰

이전 `src/verify-login.mjs`은 `judgeIssuer`의 ES256 서명 토큰을 검증할 때 `aud`가 공개 Production 별칭(`publicAppUrl`의 hostname) **정확히 하나**인 경우만 허용했습니다. 공식 제출은 **특정 GitHub 커밋과 Vercel 배포를 고정**하므로, 고정 배포 URL이 토큰의 `aud`로 사용되면 기존 코드는 서명이 유효해도 401로 거부했습니다. 이는 10단계의 반복된 **복구 감사 0건과 인증 이후 관측 0건**을 설명할 수 있는 근거 있는 원인 후보이나, 실제 심판 JWT/응답 로그는 확보하지 못해 단정하지 않습니다.

이번 수정은 요청 Host, Origin, 쿼리 또는 임의 클라이언트 헤더를 절대 신뢰하지 않고, **Vercel 서버 환경에서 제공하는 `VERCEL_URL`의 검증된 `.vercel.app` 도메인만** 공개 Production 별칭에 추가합니다. 다른 사이트·변형 도메인·잘못된 역할/서명은 거부하고, issuer·JWKS·ES256·만료·A/B 주체·run UUID 검사는 유지합니다. 또한 심판이 서명한 주체와 실행 ID는 일반 UUID인지 확인하며 이전의 불필요한 **v4 버전 제한을 제거**했습니다. 임의 문자열 소유자를 받아들이지 않습니다.

서명된 동일 A/B run의 Production 별칭/고정 배포 호스트 수용, 외부 audience 거부, 무효 토큰 거부, v7 UUID의 서명 검증을 별도 회귀 테스트에 추가했습니다. 이 테스트는 격리된 모의 키를 사용하므로 심판 실제 B 복원 성공과 별개입니다. 현재 단계 판정은 재제출 전까지 공식 **12/100점** 그대로입니다.

### 10단계 2차 수정 — 공개 제출 주소와 정확한 복원 경로 (2026-10-13)

**주소 차이와 최소 수정:** `aleph.config.json.publicAppUrl`은 이미 공개 Production `https://choi-bujang-secret-vault-xi.vercel.app`으로 올바릅니다. 그러나 `scripts/deployment-identity.mjs`가 `/aleph.json`의 `publicAppUrl`을 `VERCEL_URL`의 고정 배포 호스트로 덮어썼습니다. 1차 실측에서 공개 별칭의 복원 GET은 앱의 401/auth_missing이었고 고정 배포 호스트는 Vercel SSO 302였습니다. 이제 10단계 이상 배포 식별자는 검증된 설정의 공개 HTTPS 루트 주소를 유지하고, Vercel Git SHA는 계속 실제 배포 커밋을 기록합니다. Vercel SSO·JWT 검증·운영 정책 설정은 해제하거나 변경하지 않았습니다. 제출 시 공개 주소는 위 Production 별칭이며 고정 배포 주소를 제출 주소로 대체하지 않습니다.

**판정 범위:** `src/decider.mjs`는 notes 서비스의 정확한 UUID `GET /api/restore/:id`와 `POST /api/restore/:id`만 기존 인증된 엔진 범위·등록 기기·이상 접속/step-up 규칙으로 판정합니다. collection·policy·demo 복원, query·fragment·추가 경로·잘못된 서비스/메서드는 허용하지 않습니다. 실 소유자·백업·봉인 검증은 기존 recovery API와 RPC가 수행하며 판정기의 allow가 타인 복원 권한을 뜻하지 않습니다. 기존 1~9단계의 경로·기기·공지 쓰기·자원·소유권·탐지 방어를 유지합니다.

**복원 후 재조회:** 기존 정상 메모 GET와 금지 GET 재시험에 실제 공개 Production `GET /api/restore/<동일 UUID>` 미리보기를 추가했습니다. 복원 뒤에도 백업 verified, ID, 소유자, 내용 해시가 맞고 변경 항목이 비어 있어야 통과합니다. 결과에는 상태와 통과 여부만 담고 원문·JWT·타인 ID는 반환하지 않습니다. 외부 요청 실패, 소유자/해시 불일치, 남은 변경은 실패이며 `judgeFullReplay: not_run`은 유지합니다. 실제 심판의 전체 1~9단계 재공격이나 신원 회수 시험을 합성 함수 시험으로 대체했다고 주장하지 않습니다.

**이번 실행 결과:** 새 복제본에서 npm install 성공, `node --test test/*.test.mjs` 93/93 통과. decider 연습 4개와 detect 연습 6개, fixture:7 정상 allow/이상 step_up, local build 성공. 두 push CI도 전체 테스트를 실행하도록 갱신했습니다. 이 수치는 로컬 모의 HTTP/SDK/DB 및 가상 판정 시험이며 실제 심판 B Production 복원 성공이 아닙니다.

**DB 확인과 남은 시험:** 읽기 전용 실 DB 조회에서 메모/백업/봉인 각 5건, 사본 무결성·현재 본문 불일치 0건, 감사·관측 각 0건입니다. 기존 자료를 보존하는 롤백형 합성 B 변조·삭제·복원 시험을 요청했으나 Supabase 연결이 두 차례 `Invalid or expired requestState`로 실행 결과를 주지 않았습니다. 해당 SQL 시험은 성공으로 기록하지 않습니다. 현재 심판의 정확한 B 대상과 서명된 B 세션에 접근하지 못했으므로 그 대상의 공격 직전 백업 및 Production의 인증된 복원/정상 요청 전체 흐름은 미실행입니다. 기존 SQL·데이터·백업·감사를 수정하는 마이그레이션은 추가하지 않았습니다.

**재현/검수 순서:** `npm install` → `node --test test/*.test.mjs` → `npm run decider:test` → `npm run detect:test` → `npm run fixture:7` → `npm run build -- --local`. main 반영 및 Production READY 이후 공개 별칭 `/aleph.json`의 SHA·공개 URL, 익명/위조 토큰 복원 GET을 확인하고 ignored `bundle-notes.json`에 실제 결과·미실행을 기록한 뒤 `npm run bundle`을 실행합니다. 생성 JSON은 HEAD SHA와 일치해야 합니다. 심판 재제출은 아직 하지 않으며 B 실측/남은 미실행 항목은 최종 검수에서 별도로 판단합니다.


### 10단계 생성→복원 기준 연결 검증 (2026-10-13 UTC)

새 메모 POST는 기존 불변 백업에 같은 UUID가 있으면 `409 ID_CONFLICT`로 중단합니다. 삭제한 메모의 ID를 다른 내용으로 재사용해 과거 사본과 현재 생성 결과가 달라지는 경로를 막습니다. 새 INSERT 후에는 `a10_preview_verified_note`로 사본과 seal을 다시 읽고 ID·검증된 소유자·본문 SHA-256·제목 SHA-256·변경 항목 없음까지 확인해야 201을 반환합니다. 백업 부재·검증 실패는 503이며, 이미 생성된 행이나 기존 사본을 삭제하거나 덮어쓰지 않습니다. 실패 응답 이후 행이 남을 수 있으므로 새 생성 성공으로 해석하지 말고 관리자 검토가 필요합니다.

검증 순서: `npm install`, `node --test test/*.test.mjs`, `npm run decider:test`, `npm run detect:test`, Production 배포 SHA 확인, `npm run bundle`, 실제 심판 제출 및 판정 수집. 로컬 HTTP/mock DB 회귀는 UUID 재사용·백업 부재·seal 실패·소유자 불일치·본문 해시 불일치와 A/B 접근 차단을 검사합니다. 실제 Supabase 읽기 조회에서 기존 5개 백업은 preview의 ID·소유자·본문 해시가 일치했습니다. 이 5개가 실제 심판 B의 변조 대상이라는 증거는 없으며, 로컬 회귀 성공을 심판 점수 개선으로 기록하지 않습니다. 실제 심판 B의 인증·변조·복원·전체 재시험은 아직 미실행입니다.
