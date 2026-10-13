import { notesHandler } from './notes-handler.mjs';
import { decide, RULE_IDS } from './decider.mjs';
import { detect } from './detect.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

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
  detail = notesHandler(true), decision = decide, detection = detect,
} = {}) {
  const checks = [];
  async function probe(name, url, bearer, expected) {
    const res = response();
    try {
      const req = { url, method: 'GET',
        headers: bearer ? { authorization: bearer } : {},
      };
      await detail(req, res);
      checks.push({ name, passed: res.code === expected, httpStatus: res.code });
      return res;
    } catch {
      checks.push({ name, passed: false, httpStatus: null });
      return res;
    }
  }

  const own = await probe('restored_owner_get', '/api/notes/' + noteId, authorization, 200);
  if (own.code === 200) {
    const check = checks.find(c => c.name === 'restored_owner_get');
    check.passed = own.body?.id === noteId;
    // Do not include own.body in the returned evidence.
  }
  await probe('anonymous_get_denied', '/api/notes/' + noteId, null, 401);
  await probe('unknown_route_denied', '/api/notes/export', authorization, 400);

  try {
    const { data, error } = await db.from('a02_private_notes').select('id')
      .neq('owner_id', ownerId).limit(1);
    if (error || !Array.isArray(data)) {
      checks.push({ name: 'other_owner_get_denied', passed: false, status: 'unavailable' });
    } else if (data.length !== 1 || typeof data[0]?.id !== 'string') {
      checks.push({ name: 'other_owner_get_denied', passed: null, status: 'not_run_no_foreign_fixture' });
    } else {
      await probe('other_owner_get_denied', '/api/notes/' + data[0].id, authorization, 404);
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
    scope: 'server_get_and_local_synthetic_fixtures',
    checks,
    allExecutedChecksPassed: checks.every(x => x.passed === true),
    // The judge's full signed A/B attack replay and revocation timing are
    // deliberately NOT claimed as covered by these local checks.
    judgeFullReplay: 'not_run',
  };
}
