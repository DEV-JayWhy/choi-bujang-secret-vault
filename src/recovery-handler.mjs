import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { cookieToken, sameOrigin } from './server-auth.mjs';
import { createLoginVerifier } from './verify-login.mjs';
import { noteOwnerId } from './judge-ownership.mjs';

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
  if (typeof req.body === 'string' && !/^application\/json(?:;|$)/iu.test(type)) return null;
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
export function createRecoveryHandler(policy = false, { verify, makeClient } = {}) {
  return async (request, response) => {
    cleanResponse(response);
    if (!['GET','POST'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST');
      return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    const selected = inspectRecoveryRequest(request, policy);
    if (!selected) return response.status(400).json({ error: 'INVALID_RESTORE_TARGET' });

    const bearer = request.headers?.authorization;
    const cookie = bearer ? null : cookieToken(request);
    if (cookie && request.method === 'POST' && !sameOrigin(request)) {
      return response.status(403).json({ error: 'ORIGIN_DENIED' });
    }
    const authorization = bearer || (cookie ? `Bearer ${cookie}` : null);
    if (!authorization) return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });

    try {
      if (new URL(url).origin !== new URL(config.identityProvider.issuer).origin) {
        return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
      }
      const verifier = verify || (cachedVerifier ??= createLoginVerifier({ config, supabaseSecretKey: key }));
      const identity = await verifier(authorization);
      if (!identity) return response.status(401).json({ error: 'LOGIN_REQUIRED' });
      if (policy && identity.kind !== 'judge') {
        return response.status(403).json({ error: 'POLICY_RESTORE_FORBIDDEN' });
      }
      const payload = request.method === 'POST' ? optionalJsonObject(request) : {};
      if (!payload) return response.status(400).json({ error: 'INVALID_RESTORE_REQUEST' });
      const db = makeClient ? makeClient(url, key) : createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

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

      const ownerId = noteOwnerId(identity);
      const target = selected.id ?? payload.id ?? payload.noteId;
      if (!UUID.test(target ?? '') ||
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
      ) return response.status(400).json({ error: 'INVALID_RESTORE_TARGET' });
      const id = target.toLowerCase();
      // Read independent sealed backup and scope before every restore, even
      // if the caller skips the optional standalone preview request.
      const { data: preview, error: previewError } = await db.rpc('a10_preview_verified_note', {
        p_note_id: id, p_owner_id: ownerId,
      });
      if (previewError) return errorResponse(response, previewError);
      if (!validPreview(preview, id, ownerId)) {
        return response.status(409).json({ error: 'BACKUP_VERIFICATION_FAILED' });
      }
      if (request.method === 'GET' || payload.preview === true) {
        return response.status(200).json(preview);
      }
      if ((payload.expectedVersion && payload.expectedVersion !== preview.backupVersion)
          || (payload.expectedState && payload.expectedState !== preview.stateVersion)
          || (payload.expectedHash && payload.expectedHash !== preview.contentHash)) {
        return response.status(409).json({ error: 'BACKUP_VERIFICATION_FAILED' });
      }
      // Atomic DB routine locks target rows, RE-READS backup+seal/current state,
      // checks both versions, restores exactly one row, then verifies owner/hash.
      const { data, error } = await db.rpc('a10_restore_versioned_note', {
        p_note_id: id, p_owner_id: ownerId,
        p_expected_version: preview.backupVersion,
        p_expected_state: preview.stateVersion,
      });
      if (error) return errorResponse(response, error);
      if (!data || data.verified !== true || data.restored !== true
          || data.id !== id || data.ownerId !== ownerId
          || data.backupVersion !== preview.backupVersion
          || data.contentHash !== preview.contentHash
          || data.retest?.ownRowVerified !== true
          || data.retest?.foreignOwnerSameIdNotVisible !== true) {
        return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
      }
      // Local SQL post-restore checks are distinguishable from judge replay.
      return response.status(200).json(data);
    } catch {
      return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
    }
  };
}
