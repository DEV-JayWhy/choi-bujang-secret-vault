# 11단계 계약 조사 · 구현 준비

2026-10-14 KST. 기준점: d2bc9e76a2c2c8dfef068074c75904409eceead8.

## 직접 확인한 출처

- 실제 로그인된 https://aleph-omega.vercel.app/defense 의 11단계 제작 1·2 및 제출 전 확인 문구.
- https://github.com/ChoiTimo/aleph-defense-starter 의 main 2cd777b452525b95e29f12f2c76d9190a594ec23, docs/DECIDER_REQUEST.md.
- https://github.com/ChoiTimo/byteback-sample-pass 의 README.md, public/app.js, api/device/status.js.

공식 시작 틀의 판정기는 엔진이 검증한 deviceRegistered만 받습니다. 앱 서명 헤더·서명 대상 정규화·알고리즘·기기 공개키 출처·승인 요청 API는 이 문서에 없습니다.

운영자 공개 표본은 GET /api/device/status의 HTTP 200 및 approved === true를 확인한 뒤 자료를 요청합니다. 하지만 서버 파일은 실제 등록 세션이 없다고 명시하며 항상 approved: false를 반환합니다. README도 로그인 세션·기기 등록·집행은 제공 SDP 엔진이 맡고 엔진 코드는 이 저장소에 없다고 명시합니다. 이는 상태 표시의 참고이며 실제 승인·서명 검증 계약을 대신하지 않습니다.

## 준비한 변경과 검증

public/index.html 및 manifest.webmanifest, app-ui.js, service-worker.js, offline.html, PNG 아이콘을 추가했습니다. 설치 여부와 기기 승인 상태를 분리했습니다. Service Worker는 offline.html만 캐시하며 API·토큰·메모를 캐시하지 않습니다. 기존 auth-ui.js, 판정기, 보호 API, 복원 SQL·원본·백업·감사는 변경하지 않았습니다.

- 새 clone의 npm install: 성공.
- 기준점 로컬 node --test test/*.test.mjs: 97/97 통과.
- 새 app-ui.js 및 service-worker.js의 node --check: 통과.
- npm run build -- --local, git diff --check: 통과.
- 실제 승인 요청·승인 기기의 보호 자료 정상 조회: 미실행.
- 실제 서명 없는 요청·경로 변조·본문 변조의 11단계 검증: 미실행.
- 11단계 실제 DB 시험·배포·bundle·심판 제출: 미실행.

## 연결 전 필요한 공식 정보

기기 승인 요청·상태 조회 API와 엔진에서 검증한 기기 세션의 전달 방식, 앱 요청 서명의 정확한 헤더·알고리즘·서명 대상(메서드/경로/쿼리/본문/시각/nonce) 및 검증 공개키 출처가 필요합니다. 제공 엔진 또는 공식 통합 문서에서 확인해야 합니다. 임의 헤더나 브라우저 승인 상수, 서버에서 사후 서명하여 원래 요청이 검증된 것처럼 만드는 기능은 구현하지 않습니다.

사용자는 별도 계약 문서가 없으며 실제 심판 결과를 받아 수정하도록 지시했습니다. 설정 step은 1차 후보 제출을 위해 11로 올립니다. 미구현 승인·서명 기능을 완성했다고 기록하지 않습니다.
