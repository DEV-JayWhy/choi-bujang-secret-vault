// Stage 10 final checkpoint: authenticated exact-ID preview, sealed restore, post-restore checks.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cookieToken, sameOrigin } from './server-auth.mjs';
import { createLoginVerifier } from './verify-login.mjs';
import { noteOwnerId } from './judge-ownership.mjs';
import { checkAfterRestore } from './post-restore-retest.mjs';
import { recordRecoveryObservation } from './recovery-observation.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SHA256 = /^[0-9a-f]{64}$/u;
let cachedVerifier;

function cleanResponse(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization, Cookie');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

// Backward-compatible static route AND a single UUID path target. Vercel may
// forward its dynamic route parameter as a redundant ?id=... query.
export function inspectRecoveryRequest(req, policy) {
  if (typeof req?.url !== 'string' || req.url.includes('#')) return null;
  const [path, ...queries] = req.url.split('?');
  if (queries.length > 1) return null;
  const params = new URLSearchParams(queries[0] ?? '');
  if (policy) {
    return path === '/api/restore/policy' && params.size === 0
      ? { kind: 'policy' } : null;
  }
  const match = /^\/api\/restore\/([0-9a-fA-F-]{36})$/u.exec(path);
  if (match) {
    const id = match[1].toLowerCase();
    if (!UUID.test(id) || params.size > 1
        || [...params.keys()].some(k => !['id', 'noteId'].includes(k))
        || (params.size === 1 && [...params.values()][0]?.toLowerCase() !== id)) return null;
    return { kind: 'note', id };
  }
  if (path !== '/api/restore') return null;
  if (req.method === 'POST') {
    return params.size === 0 ? { kind: 'note' } : null;
  }
  if (req.method !== 'GET' || params.size !== 1
      || [...params.keys()][0] !== 'id') return null;
  const id = params.get('id');
  return typeof id === 'string' && UUID.test(id)
    ? { kind: 'note', id: id.toLowerCase() } : null;
}

// The judge is allowed to POST a single note-id route with no JSON body.
// Require JSON when a body is present; never accept owner/role from the body.
function optionalJsonObject(req) {
  if (req.body === undefined || req.body === null || req.body === '') return {};
  const type = req.headers?.['content-type'] ?? '';
  if (!/^application\/json(?:;|$)/iu.test(type)
      && !(typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length === 0)) return null;
  try {
    const obj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

function errorResponse(res, error) {
  // Do not include SQL error text or private note metadata in HTTP responses.
  if (error?.code === 'P0002') return res.status(404).json({ error: 'BACKUP_NOT_FOUND' });
  if (error?.code === '23514') return res.status(409).json({ error: 'BACKUP_VERIFICATION_FAILED' });
  return res.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
}

function validPreview(data, id, owner) {
  return data && data.verified === true && data.id === id
    && data.ownerId === owner
    && SHA256.test(data.backupVersion ?? '')
    && SHA256.test(data.stateVersion ?? '')
    && SHA256.test(data.contentHash ?? '')
    && SHA256.test(data.titleHash ?? '')
    && Array.isArray(data.changedFields)
    && data.changedFields.every(k => ['title','content','create'].includes(k));
}

// The only real side effect is an atomic DB function acting on one verified
// owner+UUID. Runtime functions never decide actual owners from client input.
export function createRecoveryHandler(policy = false, { verify, makeClient, retest, observe } = {}) {
  return async (request, response) => {
    cleanResponse(response);
    // Emit only opaque request correlation and fixed stage/status codes. Never log
    // tokens, request bodies, note IDs, ownership, or raw database errors.
    const traceId = randomUUID();
    response.setHeader('X-Aleph-Recovery-Trace', traceId);
    const diagnostic = (stage, status) => {
      console.info('ALEPH_RECOVERY_DIAG', JSON.stringify({
        traceId, stage, ...(status === undefined ? {} : { status }),
      }));
    };
    const checkpoint = (name, status) => {
      response.setHeader('X-Aleph-Recovery-Checkpoint', name);
      diagnostic(name, status);
    };
    checkpoint('received');
    if (!['GET','POST'].includes(request.method)) {
      checkpoint('method_rejected', 405);
      response.setHeader('Allow', 'GET, POST');
      return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    const selected = inspectRecoveryRequest(request, policy);
    if (!selected) {
      checkpoint('route_rejected', 400);
      return response.status(400).json({ error: 'INVALID_RESTORE_TARGET' });
    }
    checkpoint('route_validated');

    const bearer = request.headers?.authorization;
    const cookie = bearer ? null : cookieToken(request);
    if (cookie && request.method === 'POST' && !sameOrigin(request)) {
      checkpoint('origin_rejected', 403);
      return response.status(403).json({ error: 'ORIGIN_DENIED' });
    }
    const authorization = bearer || (cookie ? `Bearer ${cookie}` : null);
    if (!authorization) {
      checkpoint('auth_missing', 401);
      return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    }
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
    checkpoint('configuration_check');
    if (!url || !key) {
      checkpoint('configuration_missing', 503);
      return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
    }

    try {
      if (new URL(url).origin !== new URL(config.identityProvider.issuer).origin) {
        checkpoint('configuration_mismatch', 503);
        return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
      }
      const verifier = verify || (cachedVerifier ??= createLoginVerifier({ config, supabaseSecretKey: key }));
      const identity = await verifier(authorization);
      if (!identity) {
        checkpoint('auth_rejected', 401);
        return response.status(401).json({ error: 'LOGIN_REQUIRED' });
      }
      checkpoint('auth_verified');
      if (policy && identity.kind !== 'judge') {
        checkpoint('policy_forbidden', 403);
        return response.status(403).json({ error: 'POLICY_RESTORE_FORBIDDEN' });
      }
      const payload = request.method === 'POST' ? optionalJsonObject(request) : {};
      if (!payload) {
        checkpoint('payload_rejected', 400);
        return response.status(400).json({ error: 'INVALID_RESTORE_REQUEST' });
      }
      const db = makeClient ? makeClient(url, key) : createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      // Forensic checkpoints describe only signed callers, never subject/data IDs.
      // Telemetry is best-effort; an observability outage must not break recovery.
      const record = async (checkpoint, reason) => {
        diagnostic(checkpoint);
        response.setHeader('X-Aleph-Recovery-Checkpoint', checkpoint);
        try {
          await (observe || recordRecoveryObservation)(db, identity.kind, checkpoint, reason);
        } catch { /* fail closed on private data, not telemetry availability */ }
      };
      if (policy) {
        if (request.method === 'GET') {
          const { data, error } = await db.rpc('a10_policy_diff');
          if (error) return errorResponse(response, error);
          if (data?.backupVerified !== true || data.scope !== 'test_only'
            || !SHA256.test(data.backupVersion ?? '') || !Array.isArray(data.changes)) {
            return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
          }
          return response.status(200).json(data);
        }
        if (payload.confirm !== true || !SHA256.test(payload.expectedVersion ?? '')
            || Object.keys(payload).some(k => !['confirm', 'expectedVersion'].includes(k))) {
          return response.status(400).json({ error: 'RESTORE_CONFIRMATION_REQUIRED' });
        }
        const { data, error } = await db.rpc('a10_restore_test_policies', {
          p_expected_version: payload.expectedVersion,
        });
        if (error) return errorResponse(response, error);
        if (data?.scope !== 'test_only' || data.verified !== true) {
          return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
        }
        return response.status(200).json(data);
      }

      await record('auth_verified', 'authenticated');
      const ownerId = noteOwnerId(identity);
      const target = selected.id ?? payload.id ?? payload.noteId;
      if (typeof target !== 'string' || !UUID.test(target) ||
          ['id','noteId'].some(k => payload[k] !== undefined &&
            (typeof payload[k] !== 'string' || !UUID.test(payload[k]))) ||
          Object.keys(payload).some(k => ![
            'id','noteId','preview','expectedVersion','expectedState','expectedHash'
          ].includes(k)) ||
          (payload.id !== undefined && payload.noteId !== undefined) ||
          (selected.id && ((payload.id && payload.id.toLowerCase() !== selected.id)
            || (payload.noteId && payload.noteId.toLowerCase() !== selected.id))) ||
          (payload.preview !== undefined && payload.preview !== true) ||
          (payload.expectedVersion !== undefined && !SHA256.test(payload.expectedVersion)) ||
          (payload.expectedState !== undefined && !SHA256.test(payload.expectedState)) ||
          (payload.expectedHash !== undefined && !SHA256.test(payload.expectedHash))
      ) {
        checkpoint('target_rejected', 400);
        return response.status(400).json({ error: 'INVALID_RESTORE_TARGET' });
      }
      const id = target.toLowerCase();
      // Read independent sealed backup and scope before every restore, even
      // if the caller skips the optional standalone preview request.
      const { data: preview, error: previewError } = await db.rpc('a10_preview_verified_note', {
        p_note_id: id, p_owner_id: ownerId,
      });
      if (previewError) {
        await record('backup_rejected', previewError.code === 'P0002' ? 'not_found'
          : previewError.code === '23514' ? 'integrity_failed' : 'unavailable');
        return errorResponse(response, previewError);
      }
      if (!validPreview(preview, id, ownerId)) {
        await record('backup_rejected', 'integrity_failed');
        return response.status(409).json({ error: 'BACKUP_VERIFICATION_FAILED' });
      }
      await record('backup_verified', 'verified_snapshot');
      if (request.method === 'GET' || payload.preview === true) {
        return response.status(200).json(preview);
      }
      if ((payload.expectedVersion && payload.expectedVersion !== preview.backupVersion)
          || (payload.expectedState && payload.expectedState !== preview.stateVersion)
          || (payload.expectedHash && payload.expectedHash !== preview.contentHash)) {
        await record('version_rejected', 'version_changed');
        return response.status(409).json({ error: 'BACKUP_VERIFICATION_FAILED' });
      }
      // Atomic DB routine locks target rows, RE-READS backup+seal/current state,
      // checks both versions, restores exactly one row, then verifies owner/hash.
      const { data, error } = await db.rpc('a10_restore_versioned_note', {
        p_note_id: id, p_owner_id: ownerId,
        p_expected_version: preview.backupVersion,
        p_expected_state: preview.stateVersion,
      });
      if (error) {
        await record('restore_rejected', error.code === '23514' ? 'version_changed' : 'db_rejected');
        return errorResponse(response, error);
      }
      if (!data || data.verified !== true || data.restored !== true
          || data.id !== id || data.ownerId !== ownerId
          || data.backupVersion !== preview.backupVersion
          || data.contentHash !== preview.contentHash
          || data.retest?.ownRowVerified !== true
          || data.retest?.foreignOwnerSameIdNotVisible !== true) {
        await record('restore_rejected', 'integrity_failed');
        return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
      }
      await record('restore_committed', 'committed');
      // These actual read-only rechecks start only after the verified DB commit.
      // Failures are explicit and do not falsify or undo a completed restore.
      let after;
      try {
        after = await (retest || checkAfterRestore)({
          noteId: id, ownerId, authorization, db, contentHash: preview.contentHash,
        });
      } catch {
        after = { executedAfterRestore: false,
          scope: 'server_get_and_local_synthetic_fixtures',
          checks: [], allExecutedChecksPassed: false,
          judgeFullReplay: 'not_run' };
      }
      await record(after.allExecutedChecksPassed === true ? 'retest_passed' : 'retest_failed',
        after.allExecutedChecksPassed === true ? 'checks_passed' : 'checks_failed');
      return response.status(200).json({ ...data, postRestoreRetest: after });
    } catch {
      checkpoint('unexpected_error', 503);
      return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
    }
  };
}
