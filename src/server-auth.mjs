import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url)));
const ACCESS = '__Host-vault-access';
const REFRESH = '__Host-vault-refresh';
export function cookieToken(request, name = ACCESS) {
  const raw = request.headers?.cookie;
  if (typeof raw !== 'string' || raw.length > 20000) return null;
  const matches = raw.split(';').map(x => x.trim()).filter(x => x.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9._~-]{1,8192}$/.test(token) ? token : null;
}
export function sameOrigin(request) {
  const origin = request.headers?.origin;
  const hosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, new URL(config.publicAppUrl).host].filter(Boolean);
  const host = request.headers?.host || process.env.VERCEL_URL || new URL(config.publicAppUrl).host;
  return hosts.includes(host) && origin === `https://${host}`;
}
function client() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || new URL(url).origin !== new URL(config.identityProvider.issuer).origin) throw new Error('unavailable');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function cookies(response, session) {
  const cookie = (name, token, age) => `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
  response.setHeader('Set-Cookie', session ? [
    cookie(ACCESS, session.access_token, Math.max(0, Math.min(86400, session.expires_at - Math.floor(Date.now()/1000)))),
    cookie(REFRESH, session.refresh_token, 60*60*24*7),
  ] : [cookie(ACCESS, '', 0), cookie(REFRESH, '', 0)]);
}
const publicSession = user => ({ user: { id: user.id, email: user.email } });
export function authHandler(action) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const method = action === 'session' ? 'GET' : 'POST';
    if (request.method !== method) { response.setHeader('Allow', method); return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' }); }
    if (method === 'POST' && !sameOrigin(request)) return response.status(403).json({ error: 'ORIGIN_DENIED' });
    try {
      const auth = client().auth;
      if (action === 'login') {
        if (!/^application\/json(?:;|$)/i.test(request.headers?.['content-type'] ?? '')) return response.status(415).json({ error: 'JSON_REQUIRED' });
        let body;
        try { body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; } catch { return response.status(400).json({ error: 'INVALID_LOGIN' }); }
        if (typeof body?.email !== 'string' || body.email.length > 320 || typeof body.password !== 'string' || !body.password || body.password.length > 4096) return response.status(400).json({ error: 'INVALID_LOGIN' });
        const { data, error } = await auth.signInWithPassword({ email: body.email.trim(), password: body.password });
        if (error || !data.session) {
          const allowed = ['invalid_credentials','email_not_confirmed','over_request_rate_limit','user_banned'];
          return response.status(error?.status === 429 ? 429 : 401).json({ error: allowed.includes(error?.code) ? error.code : 'LOGIN_FAILED' });
        }
        cookies(response, data.session);
        return response.status(200).json(publicSession(data.user));
      }
      const token = cookieToken(request);
      if (action === 'logout') {
        cookies(response, null);
        if (token) { const { error } = await auth.admin.signOut(token, 'local'); if (error && ![401,403,404].includes(error.status)) return response.status(502).json({ error: 'LOGOUT_FAILED' }); }
        return response.status(200).json({ user: null });
      }
      if (token) { const { data, error } = await auth.getUser(token); if (!error && data.user) return response.status(200).json(publicSession(data.user)); }
      const refresh = cookieToken(request, REFRESH);
      // Session GET can rotate cookies only for same-origin browser requests.
      if (refresh && (request.headers?.['sec-fetch-site'] === 'same-origin' || sameOrigin(request))) {
        const { data, error } = await auth.refreshSession({ refresh_token: refresh });
        if (!error && data.session && data.user) { cookies(response, data.session); return response.status(200).json(publicSession(data.user)); }
      }
      cookies(response, null);
      return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    } catch { return response.status(503).json({ error: 'AUTH_UNAVAILABLE' }); }
  };
}
