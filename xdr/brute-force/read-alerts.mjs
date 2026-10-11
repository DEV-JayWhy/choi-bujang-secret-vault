// Confirmation reader only. XDR decide.mjs must remain independent of this module.
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureUrl = new URL('../fixtures/brute-force.json', import.meta.url);
const redacted = '[REDACTED]';
// Redact the whole field rather than risk retaining part of a credential.
const sensitive = /(?:password|passwd|pwd|비밀번호|암호|access[_ -]?token|refresh[_ -]?token|token|토큰|secret|api[_ -]?key|authorization|cookie|쿠키)\s*[=:：]|\bBearer\s+\S+|\beyJ[\w-]+\.[\w-]+\.[\w-]+|\bsb_(?:secret|publishable)_[\w-]+|\bsk-[\w-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9+/_=-]{32,}/iu;

function safeText(value) {
  if (typeof value !== 'string') return null;
  return sensitive.test(value) ? redacted : value;
}

export function extractAlerts(fixture) {
  if (fixture?.schema !== 'aleph.xdr.fixture.v1'
      || fixture.moduleKey !== 'brute-force' || !Array.isArray(fixture.alerts)) {
    throw new Error('INVALID_BRUTE_FORCE_FIXTURE');
  }
  return fixture.alerts.map(alert => {
    const timestamp = safeText(alert?.timestamp);
    const srcip = safeText(alert?.data?.srcip);
    const account = safeText(alert?.data?.srcuser);
    return {
      timestamp: timestamp === redacted ? redacted
        : typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(timestamp)
          && Number.isFinite(Date.parse(timestamp)) ? timestamp : null,
      srcip: srcip === redacted ? redacted : typeof srcip === 'string' && isIP(srcip) ? srcip : null,
      srcuser: account === redacted ? redacted
        : typeof account === 'string' && /^user\d{2,}$/u.test(account) ? account : account === null ? null : redacted,
      level: Number.isInteger(alert?.rule?.level) && alert.rule.level >= 0 && alert.rule.level <= 16
        ? alert.rule.level : null,
      description: safeText(alert?.rule?.description),
    };
  });
}

export async function readAlerts() {
  return extractAlerts(JSON.parse(await readFile(fixtureUrl, 'utf8')));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const rows = await readAlerts();
    for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  } catch {
    // Never echo input, raw JSON parse errors or filesystem contents.
    process.stderr.write('경보 읽기 실패: 원본 파일과 경보 형식을 확인하세요.\n');
    process.exitCode = 1;
  }
}
