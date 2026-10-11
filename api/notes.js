import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createLoginVerifier } from '../src/verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
let verifyLogin;


export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const authorization = request.headers?.authorization;
  if (typeof authorization !== 'string' || !authorization) {
    return response.status(401).json({ error: 'LOGIN_REQUIRED' });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return response.status(503).json({ error: 'NOTES_UNAVAILABLE' });
  }
  try {
    if (new URL(url).origin !== new URL(config.identityProvider.issuer).origin) {
      return response.status(503).json({ error: 'NOTES_UNAVAILABLE' });
    }
    verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: key });
    const identity = await verifyLogin(authorization);
    if (!identity) return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    // 브라우저가 보낸 userId·role은 사용하지 않습니다.
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await db.from('a02_private_notes')
      .select('id,title,content').order('id', { ascending: true });
    if (error) return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
    return response.status(200).json({ notes: data });
  } catch {
    return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
  }
}
