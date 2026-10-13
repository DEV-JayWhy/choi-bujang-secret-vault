# ALEPH BYTE BACK — 10단계 검증된 사본 복원

현재 후보 단계는 **11**입니다. 공개 Production은 https://choi-bujang-secret-vault-xi.vercel.app 이고 저장소는 https://github.com/DEV-JayWhy/choi-bujang-secret-vault 입니다. 현재 배포 커밋은 `GET /aleph.json`의 `commit`으로 확인합니다. 예전 단계별 작업 기록은 [보존한 이력](docs/history/stage1-to-stage10.md)에 있습니다. 이력의 과거 공개 API·단계 숫자는 현재 동작 설명이 아닙니다.

## 최종 10단계 기준점과 11단계 준비

10단계 기준점은 `d2bc9e76a2c2c8dfef068074c75904409eceead8`입니다. 사용자가 이 커밋의 실제 심판 100/100 통과를 전달했고, 2026-10-14 KST 클라우드 브라우저의 실제 방어전 상황실에서도 10단계 「막아 냈습니다」를 확인했습니다. 아래 12점 기록은 이전 커밋의 과정 기록입니다. 새로 받은 main과 Vercel Production READY의 SHA도 기준점과 일치했습니다.

11단계 1차 후보는 접속 화면 준비 상태이며 실제 심판 결과로 승인·서명 요구사항을 추가 확인합니다. manifest, 설치 여부 표시, 보호 자료를 저장하지 않는 오프라인 안내만 로컬에 추가했습니다. 공식 승인 요청과 요청 서명 계약은 미확보입니다. 현재 준비 화면의 기기 상태는 「확인되지 않음」이며 이를 승인으로 취급하지 않습니다. 기존 인증·메모·복원 API는 변경하지 않았습니다. 자세한 조사 범위는 [11단계 계약 조사](docs/STAGE11_CONTRACT_REVIEW.md)에 있습니다.

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

1~9단계 인증·소유권·기기·재인증·자원 경로 통제는 그대로 유지합니다. `src/decider.mjs`는 `docs/DECIDER_REQUEST.md`의 공식 필드만 읽고 등록된 RULE_IDS만 반환합니다. `aleph.config.json`의 step은 11입니다.
