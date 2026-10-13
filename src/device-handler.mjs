import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cookieToken, sameOrigin } from './server-auth.mjs';
import { createLoginVerifier } from './verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url)));
const DEVICE_COOKIE = '__Host-vault-device';
const digest = value => createHash('sha256').update(value).digest('hex');
let verifyLogin;
export function confirmedDevice(row, userId, now = Date.now()) {
  return row?.owner_id === userId && row?.state === 'approved'
    && typeof row.approved_at === 'string' && Number.isFinite(Date.parse(row.approved_at))
    && Date.parse(row.approved_at) <= now && Date.parse(row.expires_at) > now;
}
export function deviceHandler(action, dependencies = {}) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('CDN-Cache-Control', 'no-store');
    response.setHeader('Vary', 'Cookie');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const method = action === 'request' ? 'POST' : 'GET';
    if (request.method !== method) return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    if ((method === 'POST' && !sameOrigin(request))
        || ['cross-site', 'same-site'].includes(request.headers?.['sec-fetch-site'])
        || (request.headers?.origin && !sameOrigin(request))) {
      return response.status(403).json({ error: 'ORIGIN_DENIED' });
    }
    const token = cookieToken(request);
    if (!token) return response.status(401).json({ approved: false, reason: 'login_required' });
    try {
      let db = dependencies.db, verify = dependencies.verify;
      if (!db || !verify) {
        const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
        if (!url || !key || new URL(url).origin !== new URL(config.identityProvider.issuer).origin) {
          return response.status(503).json({ approved: false, reason: 'device_status_unavailable' });
        }
        db ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: key });
        verify ??= verifyLogin;
      }
      const identity = await verify(`Bearer ${token}`);
      if (!identity || identity.kind !== 'student') {
        return response.status(401).json({ approved: false, reason: 'login_required' });
      }
      let device = cookieToken(request, DEVICE_COOKIE);
      if (device && !/^[a-f0-9]{64}$/.test(device)) device = null;
      let row = null;
      if (device) {
        const result = await db.from('a11_device_requests')
          .select('request_id,owner_id,state,approved_at,expires_at')
          .eq('token_hash', digest(device)).eq('owner_id', identity.userId).maybeSingle();
        if (result.error) throw new Error('unavailable');
        row = result.data;
      }
      const approved = confirmedDevice(row, identity.userId);
      const pending = row?.owner_id === identity.userId && row.state === 'pending'
        && Date.parse(row.expires_at) > Date.now();
      if (action === 'request' && !approved && !pending) {
        device = randomBytes(32).toString('hex');
        const requestId = randomUUID();
        const expires = new Date(Date.now() + 7 * 86400000).toISOString();
        const result = await db.from('a11_device_requests').insert({
          request_id: requestId, token_hash: digest(device), owner_id: identity.userId,
          state: 'pending', expires_at: expires,
        });
        if (result.error) throw new Error('unavailable');
        response.setHeader('Set-Cookie', `${DEVICE_COOKIE}=${device}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);
        // A request only creates pending state. No client-callable approval API exists.
        return response.status(202).json({ approved: false, state: 'pending', requestId, reason: 'device_approval_pending' });
      }
      return response.status(200).json({
        approved, state: approved ? 'approved' : pending ? 'pending' : 'unregistered',
        ...(row?.owner_id === identity.userId ? { requestId: row.request_id } : {}),
        reason: approved ? 'device_registered' : pending ? 'device_approval_pending' : 'device_not_registered',
      });
    } catch {
      return response.status(503).json({ approved: false, reason: 'device_status_unavailable' });
    }
  };
}
