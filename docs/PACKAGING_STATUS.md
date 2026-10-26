# 케셰브 총공세 포장 상태와 이어서 실행하는 방법

기록일: 2026-10-26(KST). **정식 포장 미완료·최종 제출 미실시.** 이 문서·캡처·아이콘은 필수 네 파일을 대신하지 않습니다.

## 실제 확인한 범위

| 확인 | 결과 | 근거·한계 |
|---|---|---|
| 최신 소스 | `9ebd2b95a0df0904e999063093e49b28ac7f2a51`, main의 깨끗한 별도 작업본 | 기존 작업본·미커밋 파일·기존 제출물을 보존 |
| 제공 도구 | on-client/package.json의 `package-app` 존재, 버전 0.2.19 | 새 포장 도구를 만들거나 제공 파일을 수정하지 않음 |
| 아이콘 | 제공 WebP를 256×256 RGBA PNG로 변환, 제공 `pngIcon` 검사 통과 | [PNG](assets/keshev-package-icon.png). 제공 그림의 형식 변환이며 새 학생 창작 그림이 아님. 독립적인 사용 승인 판정은 미확인 |
| R7 배포 묶음 | 이미 받은 0.2.19 R7 runtime.zip을 제공 검증기로 검사, 공식 설치기의 공개키로 서명 확인 | 파일 무결성·해당 공개키와의 일치 확인. 설치·운영 승인·Windows 실행 성공이 아님 |
| 정식 포장 | `--finish-materials` 실행, 종료 코드 1, `PROVIDED_RUNTIME_NOT_INSTALLED` | AI Linux 환경의 고정 host 캐시에 실행 환경 없음. 출력 폴더도 생성되지 않음 |
| 네 파일 | 모두 없음 | finish.commit.raw · finish.archive.tar.gz · app.zip · APP_PACKAGE_MANIFEST.json |
| 실제 화면 | 예제 모드 없이 실제 브라우저 실행·「내 PC 확인」 클릭·PNG 캡처 | AI Linux 환경 실측. 사용자 Windows PC와 설치 패키지는 미확인 |
| 설치·바로가기 | 미실시 | 승인 host 및 Windows 실행 환경에서 후속 확인 필요 |

실행 출력 원문은 [packaging-attempt.json](evidence/packaging-attempt.json), 서명·아이콘 검사는 [packaging-preflight.json](evidence/packaging-preflight.json)에 있습니다. 오류는 현재 AI 환경에 관한 결과이며 사용자 PC에도 같은 문제가 있다고 단정하지 않습니다. R7 파일은 확보했으므로 단순히 ‘담당자에게 도구를 달라’고 요청할 상황과 구분합니다.

## 화면 근거

- [실제 앱 첫 화면](evidence/screenshots/keshev-actual-linux.png): SDP 미연결과 학생 영역 오류·확인 불가 표시.
- [PC 상태 실측 화면](evidence/screenshots/keshev-pc-status-linux.png): CPU %, 메모리·디스크 GB, 측정 시각. 네트워크 실패와 Windows 항목 미지원도 그대로 표시.
- [브라우저 관찰 기록](evidence/browser-capture.json): 실제 브라우저에서 읽은 문구와 캡처 도구의 시각 원문. 기계별 시계·시간대는 서로 대조해 운영 시각으로 보증하지 않음.

PC 조회 성공은 SDP·XDR·AI·실제 집행 연결 성공이 아닙니다. 예시값으로 바꾸거나 DOM을 조작해 성공 화면을 만들지 않았습니다. 이 화면을 사용자 Windows 실측 또는 설치형 앱 실행 근거라고 제출하면 안 됩니다.

## AI 환경에서 실행한 명령

작업 위치는 별도 복제본의 `on-client`였습니다. 입력 PNG는 프로젝트 밖, 출력 상위 폴더는 존재하며 출력 폴더 자체는 없는 상태였습니다.

```bash
npm run package-app -- --source . --out /workspace/scratch/7380a671d71a/keshev-packaging-output/keshev-0.2.19-finish --iconPath /workspace/scratch/7380a671d71a/keshev-packaging-inputs/keshev-icon.png --finish-materials
```

결과: `PROVIDED_RUNTIME_NOT_INSTALLED`. `--app-only-v1` 사용, 승인 키 생성, host 캐시 수동 조립, runtime.zip 재압축은 하지 않았습니다. 제공 Windows 설치기를 Linux에 맞게 개조하지 않았습니다.

## Windows에서 나중에 이어서 확인할 순서

아래는 **아직 실행하지 않은 후속 절차**입니다. 사용자의 실제 폴더·설치 여부는 미확인입니다. Git·Node.js·Windows PowerShell이 필요하며 제공 기준 Node는 on-client/package.json의 24.19.0입니다. 현재 Linux의 v24.22.1 확인을 Windows 확인으로 바꾸지 않습니다.

1. 공식 `ALEPH_KESHEV_0.2.19_R7.zip`을 받은 위치를 확인합니다. 압축 안에 `runtime/install-alekov-runtime-0.2.19.ps1`, R7 ZIP과 catalog.json이 함께 있습니다. 받은 묶음의 project 시작 틀로 기존 학생 프로젝트를 덮어쓰지 않습니다.
2. 원래 작업과 다른 새 폴더에서 아래 PowerShell 준비 명령을 실행합니다. main은 이동하므로 복제 직후 40자리 SHA를 기록하며 그 작업본을 계속 사용합니다. 보존할 제출 커밋이 정해져 있으면 해당 SHA를 명시해 별도 복제합니다. 미커밋 변경이 있으면 내용을 확인해 보존하고 멈춥니다.

```powershell
$ErrorActionPreference = 'Stop'
$workRoot = Join-Path $env:USERPROFILE ('Keshev-Finish-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $workRoot) { throw '이미 있는 경로입니다. 새 경로를 선택하세요.' }
New-Item -ItemType Directory -Path $workRoot | Out-Null
$repo = Join-Path $workRoot 'source'
git clone --branch main https://github.com/DEV-JayWhy/choi-bujang-secret-vault.git $repo
if ($LASTEXITCODE -ne 0) { throw '복제 실패. 기존 작업은 변경하지 마세요.' }
Set-Location $repo
$selectedCommit = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $selectedCommit -notmatch '^[0-9a-f]{40}$') { throw '커밋 확인 실패' }
$selectedCommit | Set-Content -LiteralPath (Join-Path $workRoot 'selected-commit.txt') -Encoding ascii
if (git status --porcelain) { throw '미커밋 변경이 있습니다. 먼저 보존·확인하세요.' }
node --version
npm --version
```

3. 공식 묶음을 **프로젝트 밖의 새 폴더**에 압축 해제합니다. 아래 `$runtimeSetup`에는 압축 해제한 실제 `runtime` 폴더 경로를 넣습니다. 가정한 사용자 PC 경로를 실제 확인한 경로라고 기록하지 않습니다.

```powershell
$runtimeSetup = Read-Host '공식 묶음을 압축 해제한 runtime 폴더의 전체 경로'
$installer = Join-Path $runtimeSetup 'install-alekov-runtime-0.2.19.ps1'
$runtimeZip = Join-Path $runtimeSetup 'alekov-runtime-0.2.19-r7.zip'
$catalog = Join-Path $runtimeSetup 'alekov-runtime-0.2.19-r7.catalog.json'
foreach ($file in @($installer, $runtimeZip, $catalog)) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "필수 파일 없음: $file" }
}
powershell.exe -NoProfile -File $installer -ZipPath $runtimeZip -CatalogPath $catalog
if ($LASTEXITCODE -ne 0) { throw '공식 설치기 미리보기 실패. 오류 코드를 보존하세요.' }
```

공식 설치기의 기본 실행은 미리보기입니다. 표시 결과와 공식 설치 안내를 확인한 뒤 허용된 경우 같은 명령에 `-Apply`를 붙입니다. 이 문서를 작성하면서 해당 설치나 승인 host 실행을 수행하지 않았습니다. 운영 앱 승인·서명·지원 환경 오류가 나오면 그 결과를 남기며 우회하지 않습니다. 관리자 권한을 추가로 요청해 실행하지 않습니다.

```powershell
powershell.exe -NoProfile -File $installer -ZipPath $runtimeZip -CatalogPath $catalog -Apply
if ($LASTEXITCODE -ne 0) { throw '공식 실행 환경 설치 실패. 포장을 진행하지 마세요.' }
Set-Location (Join-Path $repo 'on-client')
if (git status --porcelain) { throw '미커밋 변경이 있습니다. 먼저 보존·확인하세요.' }
if ((git rev-parse HEAD).Trim() -ne $selectedCommit) { throw '선택한 커밋이 바뀌었습니다.' }
$out = Join-Path $workRoot 'package'
if (Test-Path -LiteralPath $out) { throw '출력 폴더가 이미 있습니다. 다른 새 경로를 쓰세요.' }
npm run package-app -- --source . --out "$out" --iconPath "..\docs\assets\keshev-package-icon.png" --finish-materials
if ($LASTEXITCODE -ne 0) { throw '포장 실패. 오류 출력과 원본을 보존하세요.' }
foreach ($name in @('finish.commit.raw','finish.archive.tar.gz','app.zip','APP_PACKAGE_MANIFEST.json')) {
  $file = Join-Path $out $name
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "출력 누락: $name" }
  Get-FileHash -LiteralPath $file -Algorithm SHA256
}
Get-Content -LiteralPath (Join-Path $out 'APP_PACKAGE_MANIFEST.json')
Get-Content -LiteralPath (Join-Path $out 'INSTALL.md')
```

위 명령은 이 문서에 포함한 PNG 경로를 사용합니다. 실행 환경이 없다는 오류가 나면 `--app-only-v1`로 바꾸지 않습니다. 실제 출력 경로·manifest의 source.git.head·선택 SHA를 대조하고, **생성된 INSTALL.md의 해시 포함 설치 명령**을 그대로 따릅니다. 생성 전에는 설치 명령의 manifest 해시를 만들 수 없습니다. 설치도 원래 폴더와 다른 새 경로에서 하고 승인 host 바로가기로 실행해 확인합니다. Linux의 npm start 확인으로 이 절차를 대신하지 않습니다.

## 제출할 때

한 번 성공한 포장 명령의 같은 출력 폴더에서 네 파일을 고릅니다. 압축을 풀거나 재압축하지 않으며 다른 커밋의 파일을 섞지 않습니다. 사진은 안내받은 다중 캡처 화면에서만 첨부하며 기존 네 파일 칸에 넣지 않습니다. 문서·캡처 등록과 평가 요청·공식 접수 완료는 각각 별개입니다. 이 기록을 작성하거나 GitHub에 올린 행위는 제출이 아닙니다.
