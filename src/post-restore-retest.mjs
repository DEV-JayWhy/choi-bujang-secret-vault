// Stage 10 final checkpoint: run actual signed GET checks only after a verified restore.
import { decide, RULE_IDS } from './decider.mjs';
import { detect } from './detect.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const production = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url))).publicAppUrl;

// These checks run AFTER a successful signed-user note restore. They do not
// impersonate a different person or claim to reproduce the operator's judge.
// Never output, log, or persist note body, JWT, or another owner's note ID.
function response() {
  return {
    code: 0, body: null,
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

export async function checkAfterRestore({
  noteId, ownerId, authorization, db,
  contentHash, detail, fetcher = fetch, decision = decide, detection = detect,
} = {}) {
  const checks = [];
  async function probe(name, url, bearer, expected) {
    const res = response();
    try {
      const req = { url, method: 'GET',
        headers: bearer ? { authorization: bearer } : {},
      };
      if (detail) {
        await detail(req, res);
      } else {
        // Never derive the destination from Host or caller input. Do not forward
        // the signed token through a redirect to another host.
        const reply = await fetcher(new URL(url, production), {
          method: 'GET', headers: req.headers, redirect: 'error',
          cache: 'no-store', signal: AbortSignal.timeout(8000),
        });
        res.code = reply.status;
        if (reply.status === 200) res.body = await reply.json();
        else await reply.body?.cancel();
      }
      return { res, check: { name, passed: res.code === expected, httpStatus: res.code,
        scope: detail ? 'local_handler' : 'production_http' } };
    } catch {
      return { res, check: { name, passed: false, httpStatus: null,
        scope: detail ? 'local_handler' : 'production_http' } };
    }
  }

  // All probes are read-only and start after the restore transaction commits.
  // Parallel transport keeps one slow request from multiplying the timeout.
  const probes = await Promise.all([
    probe('restored_owner_get', '/api/notes/' + noteId, authorization, 200),
    probe('anonymous_get_denied', '/api/notes/' + noteId, null, 401),
    probe('invalid_token_get_denied', '/api/notes/' + noteId, 'Bearer invalid', 401),
    probe('unknown_route_denied', '/api/notes/export', authorization, 400),
  ]);
  checks.push(...probes.map(p => p.check));
  const own = probes[0].res;
  if (own.code === 200) {
    const check = checks.find(c => c.name === 'restored_owner_get');
    check.passed = own.body?.id === noteId && typeof own.body?.body === 'string'
      && typeof contentHash === 'string'
      && createHash('sha256').update(own.body.body, 'utf8').digest('hex') === contentHash;
    // Do not include own.body in the returned evidence.
  }

  // Re-read the deployed preview route AFTER commit as well as the live note.
  // This is a real HTTP check; never turn a transport/verification failure into
  // a synthetic success or include private preview metadata in the evidence.
  const backup = await probe('restored_backup_preview', '/api/restore/' + noteId, authorization, 200);
  backup.check.passed = backup.check.passed && backup.res.body?.verified === true
    && backup.res.body.id === noteId && backup.res.body.ownerId === ownerId
    && backup.res.body.contentHash === contentHash
    && Array.isArray(backup.res.body.changedFields) && backup.res.body.changedFields.length === 0;
  checks.push(backup.check);

  try {
    const { data, error } = await db.from('a02_private_notes').select('id')
      .neq('owner_id', ownerId).limit(1);
    if (error || !Array.isArray(data)) {
      checks.push({ name: 'other_owner_get_denied', passed: false, status: 'unavailable' });
    } else if (data.length !== 1 || typeof data[0]?.id !== 'string') {
      checks.push({ name: 'other_owner_get_denied', passed: null, status: 'not_run_no_foreign_fixture' });
    } else {
      const foreign = await probe('other_owner_get_denied', '/api/notes/' + data[0].id, authorization, 404);
      checks.push(foreign.check);
    }
  } catch {
    checks.push({ name: 'other_owner_get_denied', passed: false, status: 'unavailable' });
  }

  try {
    const { normal, suspicious } = fixtureRequests();
    const allow = await decision(normal);
    const unknown = await decision({ ...normal, requestId: normal.requestId,
      deviceRegistered: false });
    const challenge = await decision(suspicious);
    checks.push({
      name: 'stage6_7_decision_fixtures',
      passed: RULE_IDS.includes('device_registered')
        && allow.decision === 'allow'
        && unknown.decision === 'deny' && challenge.decision === 'step_up',
      scope: 'local_synthetic_decision',
    });
    const start = Date.UTC(2026, 9, 1);
    const reads = count => Array.from({ length: count }, (_, index) => ({
      at: new Date(start + index * 2000).toISOString(),
      method: 'GET', identity: { sub: 'synthetic_post_restore' },
    }));
    checks.push({ name: 'stage9_burst_fixture',
      passed: detection(reads(120)).action === 'observe'
        && detection(reads(121)).action === 'propose_revocation',
      scope: 'local_synthetic_detection',
    });
  } catch {
    checks.push({ name: 'stage6_9_synthetic_fixtures', passed: false,
      status: 'unavailable' });
  }

  return {
    executedAfterRestore: true,
    scope: detail ? 'local_handler_and_synthetic_fixtures' : 'production_http_and_local_synthetic_fixtures',
    checks,
    // Explicitly unrun checks are not fictional failures or fictional successes.
    // A completed check must still pass; transport failures remain false.
    allExecutedChecksPassed: checks.some(x => x.passed !== null)
      && checks.filter(x => x.passed !== null).every(x => x.passed === true),
    // The judge's full signed A/B attack replay and revocation timing are
    // deliberately NOT claimed as covered by these local checks.
    judgeFullReplay: 'not_run',
  };
}
