# 8단계 경로 허용 범위 재검토 (2026-10-13)

기준 커밋 `081f239a3b63`의 공식 결과는 48/100점, `S08_OTHER_ZONE_ALLOWED`입니다. 정확한 실패 요청은 공개되지 않았으므로 아래 로컬 재현을 공식 공격 입력으로 단정하지 않습니다.

확인된 빈틈: 판정기가 영문·숫자·일부 기호로 이루어진 모든 단일 구간을 ID로 인정하여 `/notes/list`, `/notes/shared`, `/notes/instructor`, `/notes/other`도 허용했습니다. 실제 API의 ID 계약은 UUID이고, 제공된 엔진 정상 예시는 `/notes/demo`입니다. 따라서 항목 경로는 UUID 또는 문서화된 `demo`에 한정합니다. 임의 기능 이름을 끝없이 거부 목록에 추가하지 않습니다. 쿼리 원문이나 검증된 owner scope가 없으므로 쿼리가 붙은 항목·목록 요청은 거부하며 기본 목록 GET과 POST는 유지합니다.

`subjectId`는 가명 주체 ID이며 Supabase 사용자 UUID가 아닙니다. `querySha256`은 내용 지문일 뿐 소유권·기능 권한 증명이 아닙니다. 이 필드로 소유자를 만들어 추정하지 않습니다. 유효 UUID의 실제 소유권은 기존 API의 검증된 identity.userId와 DB owner_id 비교 및 GET 응답 재검사로 보호합니다. API 인증·UUID·소유권 코드는 변경하지 않았습니다. 공개 계약에는 일반 불투명 문자열 ID를 허용한다는 명시적 규칙이 없어 임의 문자열 지원을 축소했으며, 향후 운영 계약에 다른 ID 형식이 추가되면 검증 근거에 맞춰 확장해야 합니다.

검증: `node --test test/stage8-policy-regression.test.mjs test/stage8-routes.test.mjs test/stage6-7-regression.test.mjs test/notes-ownership.test.mjs test/notes-cookie.test.mjs test/server-auth.test.mjs test/attack-check-readonly.test.mjs` 40개 통과. `npm run decider:test` 4개 통과, `npm run fixture:7` 정상 allow·복합 step_up, `git diff --check` 통과. 이는 로컬 재현 결과이며 이 수정의 공식 심판 결과는 재제출 후에만 확정합니다.

## 쿼리 메타데이터 후속 검토

`e2938d145dfc`의 공식 결과도 48/100점, `S08_OTHER_ZONE_ALLOWED`로 이전 가설만으로 해결되지 않았습니다. 계약의 queryLength·querySha256 두 필드는 필수입니다. 기존 코드가 길이 누락을 빈 쿼리로 인정하고 지문을 검사하지 않는 별도 빈틈을 확인했습니다. 이제 정확한 0과 빈 문자열의 SHA-256이 함께 있을 때만 경로를 허용합니다. 지문으로 사용자나 소유권을 추론하지 않습니다. 기존 축약 로컬 테스트에 빠져 있던 쿼리 메타데이터는 공식 fixture와 동일하게 보완하고, 별도 테스트에서는 누락·모순 데이터를 거부하는지 확인합니다.

관련 테스트 41개, decider:test 4개, fixture:7 및 로컬 빌드가 통과했습니다. 정상 기본 목록 및 demo/UUID 항목은 유지됩니다. 이것이 운영 심판의 실패 요청 차이인지 여부는 공식 재검증 전까지 가설입니다.
