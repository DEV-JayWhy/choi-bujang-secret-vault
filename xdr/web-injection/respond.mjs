// Learning-only logging. No ZTNA rule registration or access enforcement.
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

// Candidate expiry is metadata only; no ZTNA rule is created or applied.
const defaultLog = new URL('../alerts.log', import.meta.url);
const treatments = Object.freeze({
  record: { treatment: 'record', reasonCode: 'EVENT_RECORDED' },
  alert: { treatment: 'alert', reasonCode: 'REVIEW_REQUIRED' },
  block: { treatment: 'block_candidate_alert', reasonCode: 'VERIFIED_TARGET_LINK_UNAVAILABLE' },
});

// Server-side caller only; options.logPath permits isolated verification.
// A supplied result must come from decide(alert), never a browser request.
export async function respond(alert, result = decide(alert), options = {}) {
  if (!result || !Object.hasOwn(treatments, result.action)
      || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1
      || result.action !== (result.confidence >= 0.85 ? 'block'
        : result.confidence >= 0.5 ? 'alert' : 'record')) {
    throw new Error('INVALID_DECISION_RESULT');
  }
  // Only known fixture ID format is accepted. Never echo an arbitrary ID,
  // description, reason, account, source address or credential into the log.
  const alertId = typeof alert?.id === 'string' && /^wi-\d{2}$/u.test(alert.id)
    ? alert.id : null;
  const entry = {
    alertId,
    processedAt: new Date().toISOString(),
    ...treatments[result.action],
    ...(result.action === 'block' ? { expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() } : {}),
  };
  await appendFile(options.logPath ?? defaultLog, `${JSON.stringify(entry)}\n`,
    { encoding: 'utf8', mode: 0o600 });
  // Even block candidates are notification-only: no verified mapping exists.
  return { ...entry, ruleRegistered: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const fixture = JSON.parse(await readFile(new URL('../fixtures/web-injection.json', import.meta.url), 'utf8'));
    if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'web-injection'
        || !Array.isArray(fixture.alerts)) throw new Error('INVALID_FIXTURE');
    const counts = { record: 0, alert: 0, block_candidate_alert: 0 };
    for (const alert of fixture.alerts) {
      const entry = await respond(alert);
      counts[entry.treatment] += 1;
    }
    process.stdout.write(`${JSON.stringify({ counts, rulesRegistered: 0, ztnaIntegration: 'incomplete' })}\n`);
  } catch {
    // Errors may contain filesystem details or raw input; do not print them.
    process.stderr.write('경보 처리 실패: 입력 형식과 로그 기록 권한을 확인하세요.\n');
    process.exitCode = 1;
  }
}
