// Server-side adapter. Keep the established ZTNA decision module unchanged.
import { appendFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide as decideAccess } from '../../src/decider.mjs';
import { decide as decideCve } from './decide.mjs';

const defaultLog = new URL('../alerts.log', import.meta.url);
const TTL = 15 * 60 * 1000;
const scopeFields = ['schema', 'requestId', 'classId', 'projectId', 'subjectId', 'deviceId',
  'service', 'method', 'path', 'route', 'queryLength', 'querySha256', 'policyRevision', 'at'];
function scopeKey(request) {
  if (request?.schema !== 'aleph.decision.v1'
      || !scopeFields.every(key => typeof request[key] === 'string'
        || Number.isFinite(request[key]))) return null;
  return createHash('sha256').update(JSON.stringify(scopeFields.map(key => request[key]))).digest('hex');
}

// The caller must correlate trusted server alerts with engine-verified requests.
// Never expose this resolver/adapter to browser input. IP/account names are not identity.
// Without that integration, candidates are logged but cannot register deny rules.
export function createResponder({ resolveVerifiedRequest = () => null,
  logPath = defaultLog, now = () => Date.now(), accessDecider = decideAccess } = {}) {
  const rules = new Map();
  function purge() {
    const at = now();
    for (const [key, rule] of rules) if (rule.expires <= at) rules.delete(key);
  }
  return {
    async respond(alert) {
      purge();
      const result = decideCve(alert);
      const alertId = typeof alert?.id === 'string' && /^kc-\d{2,}$/u.test(alert.id) ? alert.id : null;
      let key = null;
      if (result.action === 'block' && alertId) {
        const verifiedRequest = await resolveVerifiedRequest(alert);
        key = scopeKey(verifiedRequest);
      }
      const registered = key !== null && rules.size < 5000;
      const expires = now() + TTL;
      const ruleId = registered ? `known_cve:${alertId}` : null;
      const entry = { alertId, processedAt: new Date(now()).toISOString(),
        action: result.action, confidence: result.confidence, pattern: result.reason,
        treatment: result.action === 'block' ? registered ? 'deny_rule' : 'block_candidate_alert'
          : result.action,
        ruleRegistered: registered,
        ...(result.action === 'block' ? { expiresAt: new Date(expires).toISOString() } : {}),
        ...(registered ? { ruleId } : {}) };
      // Log only fixed classifier outputs and validated identifiers, never raw alerts.
      await appendFile(logPath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
      if (registered) rules.set(key, { ruleId, alertId, expires });
      return entry;
    },
    async decideRequest(request) {
      purge();
      // The original decision always runs. This layer can deny but cannot grant access.
      const base = await accessDecider(request);
      if (base.decision === 'deny') return base;
      const key = scopeKey(request);
      if (!key || !rules.has(key)) return base;
      return { ...base, decision: 'deny', reasonCode: 'policy_denied',
        ruleIds: [...new Set([...base.ruleIds, 'resource_zone'])] };
    },
    activeRules() {
      purge();
      return [...rules.values()].map(rule => ({ ruleId: rule.ruleId, alertId: rule.alertId,
        expiresAt: new Date(rule.expires).toISOString() }));
    },
  };
}
const responder = createResponder();
export const respond = alert => responder.respond(alert);
export const decideRequest = request => responder.decideRequest(request);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const fixture = JSON.parse(await readFile(new URL('../fixtures/known-cve.json', import.meta.url), 'utf8'));
    if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'known-cve'
        || !Array.isArray(fixture.alerts)) throw new Error('INVALID_FIXTURE');
    const counts = { block: 0, alert: 0, record: 0 };
    for (const alert of fixture.alerts) { const entry = await respond(alert); counts[entry.action]++; }
    process.stdout.write(`${JSON.stringify({ counts, rulesRegistered: 0,
      engineIntegration: 'not_run_no_verified_request_resolver' })}\n`);
  } catch {
    process.stderr.write('경보 처리 실패: 입력 형식과 로그 기록 권한을 확인하세요.\n');
    process.exitCode = 1;
  }
}
