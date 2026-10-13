import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { cookieToken, sameOrigin } from './server-auth.mjs';
import { createLoginVerifier } from './verify-login.mjs';
import { noteOwnerId } from './judge-ownership.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SHA256 = /^[0-9a-f]{64}$/u;
let cachedVerifier;

function cleanResponse(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('CDN-Cache-Control', 'no-store');
  response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  response.setHeader('Vary', 'Authorization, Cookie');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

// Never accept arbitrary resource selectors, other owners or role claims.
export function inspectRecoveryRequest(request, policy) {
  if (typeof request?.url !== 'string' || request.url.includes('#')) return null;
  const [path, ...queries] = request.url.split('?');
  if (queries.length > 1 || path !== (policy ? '/api/restore/policy' : '/api/restore')) return null;
  const params = new URLSearchParams(queries[0] ?? '');
  if (policy) return params.size === 0 ? { kind: 'policy' } : null;
  if (request.method === 'POST') return params.size === 0 ? { kind: 'note' } : null;
  if (request.method !== 'GET' || [...params.keys()].some(k => k !== 'id')
      || params.getAll('id').length !== 1) return null;
  const id = params.get('id');
  return typeof id === 'string' && UUID.test(id) ? { kind: 'note', id: id.toLowerCase() } : null;
}

function jsonBody(request) {
  if (!/^application\/json(?:;|$)/iu.test(request.headers?.['content-type'] ?? '')) return null;
  let value;
  try { value = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
  catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function mapRestoreError(error) {
  // PostgreSQL diagnostics are never shown to the caller. These are stable,
  // generic error types; owner and backup existence share a 404 response.
  if (error?.code === 'P0002') return [404, 'BACKUP_NOT_FOUND'];
  if (error?.code === '23514') return [409, 'BACKUP_VERIFICATION_FAILED'];
  return [503, 'RESTORE_UNAVAILABLE'];
}

// Test dependencies are injected only by server tests. Live endpoints use
// the verified JWT helper and a service-role DB client held server-side.
export function createRecoveryHandler(policy = false, { verify, makeClient } = {}) {
  return async (request, response) => {
    cleanResponse(response);
    if (!['GET', 'POST'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST');
      return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    const selector = inspectRecoveryRequest(request, policy);
    if (!selector) return response.status(400).json({ error: 'INVALID_RESTORE_TARGET' });

    const bearer = request.headers?.authorization;
    const cookie = bearer ? null : cookieToken(request);
    // Same-origin requirement for cookie-authenticated writes; signed Bearer
    // requests stay compatible with the official judge.
    if (cookie && request.method === 'POST' && !sameOrigin(request)) {
      return response.status(403).json({ error: 'ORIGIN_DENIED' });
    }
    const authorization = bearer || (cookie ? `Bearer ${cookie}` : undefined);
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
      // Policy rollback can only touch test records and is reserved for
      // cryptographically verified judge identities, never browser role input.
      if (policy && identity.kind !== 'judge') {
        return response.status(403).json({ error: 'POLICY_RESTORE_FORBIDDEN' });
      }
      const payload = request.method === 'POST' ? jsonBody(request) : null;
      if (request.method === 'POST' && !payload) {
        return response.status(400).json({ error: 'INVALID_RESTORE_REQUEST' });
      }
      const db = makeClient ? makeClient(url, key) : createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      if (policy) {
        if (request.method === 'GET') {
          const { data, error } = await db.rpc('a10_policy_diff');
          if (error) {
            const [code, message] = mapRestoreError(error);
            return response.status(code).json({ error: message });
          }
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
        if (error) {
          const [code, message] = mapRestoreError(error);
          return response.status(code).json({ error: message });
        }
        if (data?.scope !== 'test_only' || data.verified !== true) {
          return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
        }
        return response.status(200).json(data);
      }

      const ownerId = noteOwnerId(identity);
      const id = request.method === 'GET' ? selector.id : payload.id ?? payload.noteId;
      if (typeof id !== 'string' || !UUID.test(id)
          || (request.method === 'POST'
            && (Object.keys(payload).some(k => !['id', 'noteId', 'expectedHash'].includes(k))
              || (payload.id !== undefined && payload.noteId !== undefined)
              || (payload.expectedHash !== undefined && !SHA256.test(payload.expectedHash))))) {
        return response.status(400).json({ error: 'INVALID_RESTORE_TARGET' });
      }
      const normalizedId = id.toLowerCase();
      const [functionName, args] = request.method === 'GET'
        ? ['a10_note_restore_preview', { p_note_id: normalizedId, p_owner_id: ownerId }]
        : ['a10_restore_note', { p_note_id: normalizedId, p_owner_id: ownerId,
          p_expected_hash: payload.expectedHash ?? null }];
      const { data, error } = await db.rpc(functionName, args);
      if (error) {
        const [code, message] = mapRestoreError(error);
        return response.status(code).json({ error: message });
      }
      if (!data || data.id !== normalizedId || data.ownerId !== ownerId
          || !SHA256.test(data.contentHash ?? '')
          || (request.method === 'GET' ? data.verified !== true : data.restored !== true)) {
        return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
      }
      return response.status(200).json(data);
    } catch {
      return response.status(503).json({ error: 'RESTORE_UNAVAILABLE' });
    }
  };
}
