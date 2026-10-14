import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('aleph.config.json', root)));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
try {
  const response = await fetch(new URL('/api/checks', config.publicAppUrl), {
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw Error(`OPERATIONS_HTTP_${response.status}`);
  const report = await response.json();
  if (report.schema !== 'aleph.operations.v1' || report.commit !== commit) throw Error('OPERATIONS_COMMIT_MISMATCH');
  await mkdir(new URL('artifacts/', root), { recursive: true });
  await writeFile(new URL('artifacts/operations-result.json', root), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`실제 API 관측 저장: artifacts/operations-result.json · 커밋 ${commit.slice(0, 12)}`);
  console.log(`정상 허용 ${report.counts.allowed} · 금지 거부 ${report.counts.denied} · 미실행 ${report.counts.notRun} · 확인 실패 ${report.counts.unavailable}`);
  console.log('인증된 사용자·기기 세션을 이 CLI로 가져오지 않습니다. 정상 보호 요청은 승인된 브라우저에서 별도 실행합니다. 공식 41종과 별개의 읽기 점검입니다.');
} catch (error) { console.error(`첫 오류: ${error.message}`); process.exitCode = 1; }
