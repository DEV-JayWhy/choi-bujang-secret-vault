import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { cookieToken, sameOrigin } from './server-auth.mjs';
import { createLoginVerifier } from './verify-login.mjs';
import { RESOURCE_KINDS, NOTES_COLLECTION_RESOURCE_ID, resourceId } from './resource-ids.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let verifyLogin;
const note = row => ({ id: row.id, title: row.title, body: row.content });

// Use the incoming URL, not a framework-merged query.id, to select the resource.
export function inspectNoteUrl(request, detail) {
  if (typeof request.url !== 'string') return null;
  const [path, ...search] = request.url.split('?');
  if (search.length > 1 || request.url.includes('#')) return null;
  const match = detail ? /^\/api\/notes\/([0-9a-fA-F-]+)$/u.exec(path) : null;
  const id = match?.[1];
  if (detail ? !id || !UUID.test(id) : path !== '/api/notes') return null;
  const params = new URLSearchParams(search[0] ?? '');
  // There are no query-selected functions or collection filters in this API.
  if ([...params.keys()].some(key => key !== 'id') || params.getAll('id').length > 1) return null;
  if (params.has('id') && (!detail || params.get('id')?.toLowerCase() !== id.toLowerCase())) return null;
  return { id: detail ? id.toLowerCase() : undefined };
}

export function notesHandler(detail) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    // Private note responses must never be reused across identities by a CDN.
    response.setHeader('CDN-Cache-Control', 'no-store');
    response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    response.setHeader('Vary', 'Authorization, Cookie');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const methods = detail ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST'];
    if (!methods.includes(request.method)) {
      response.setHeader('Allow', methods.join(', '));
      return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    const bearer = request.headers?.authorization;
    const token = bearer ? null : cookieToken(request);
    if (token && request.method !== 'GET' && !sameOrigin(request)) {
      return response.status(403).json({ error: 'ORIGIN_DENIED' });
    }
    const authorization = bearer || (token ? `Bearer ${token}` : undefined);
    if (typeof authorization !== 'string' || !authorization) {
      return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return response.status(503).json({ error: 'NOTES_UNAVAILABLE' });
    try {
      if (new URL(url).origin !== new URL(config.identityProvider.issuer).origin) {
        return response.status(503).json({ error: 'NOTES_UNAVAILABLE' });
      }
      verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: key });
      const identity = await verifyLogin(authorization);
      if (!identity) return response.status(401).json({ error: 'LOGIN_REQUIRED' });
      const resource = inspectNoteUrl(request, detail);
      if (!resource) {
        return response.status(400).json({ error: 'INVALID_ID' });
      }
      const { id } = resource;
      // 서버가 선택한 메모 이름 공간만 표시하며, 기존 소유권 검사는 그대로 수행합니다.
      response.setHeader('X-Aleph-Resource-Id', detail
        ? resourceId(RESOURCE_KINDS.note, id) : NOTES_COLLECTION_RESOURCE_ID);
      let payload;
      if (['POST', 'PUT'].includes(request.method)) {
        try { payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
        catch { return response.status(400).json({ error: 'INVALID_NOTE' }); }
        if (payload && Object.hasOwn(payload, 'owner_id')) {
          return response.status(400).json({ error: 'OWNER_CHANGE_NOT_ALLOWED' });
        }
        if (!payload || typeof payload.title !== 'string' || !payload.title.trim()
            || payload.title.length > 200 || typeof payload.body !== 'string' || payload.body.length > 10000
            || (request.method === 'POST' && payload.id !== undefined
                && (typeof payload.id !== 'string' || !UUID.test(payload.id)))) {
          return response.status(400).json({ error: 'INVALID_NOTE' });
        }
      }
      const db = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      if (!detail && request.method === 'GET') {
        const { data, error } = await db.from('a02_private_notes')
          .select('id,title,content,owner_id').eq('owner_id', identity.userId).order('created_at', { ascending: true }).order('id');
        if (error) return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
        // Validate the complete result before serializing any title or body.
        if (!Array.isArray(data) || data.some(row => !row || row.owner_id !== identity.userId
            || typeof row.id !== 'string' || !UUID.test(row.id))) {
          return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
        }
        return response.status(200).json(data.map(note));
      }
      if (request.method === 'POST') {
        const newId = payload.id ?? randomUUID();
        const { error } = await db.from('a02_private_notes').insert({
          id: newId, owner_id: identity.userId, title: payload.title.trim(), content: payload.body,
        });
        if (error) return response.status(error.code === '23505' ? 409 : 502)
          .json({ error: error.code === '23505' ? 'ID_CONFLICT' : 'NOTES_UNAVAILABLE' });
        response.setHeader('X-Aleph-Resource-Id', resourceId(RESOURCE_KINDS.note, newId));
        return response.status(201).json({ id: newId });
      }
      // DB가 비교하는 소유자는 기존 도우미가 검증한 ID뿐입니다.
      // PUT은 owner_id를 입력에서 받지 않고 기존 값을 보존합니다.
      let query = db.from('a02_private_notes');
      if (request.method === 'GET') query = query.select('id,title,content,owner_id').eq('id', id);
      if (request.method === 'PUT') query = query.update({ title: payload.title.trim(), content: payload.body })
        .eq('id', id).select('id,title,content,owner_id');
      if (request.method === 'DELETE') query = query.delete().eq('id', id).select('id');
      const { data, error } = await query.eq('owner_id', identity.userId).maybeSingle();
      if (error) return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
      if (!data) return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
      // Defense in depth: do not return a note unless the DB row confirms ownership.
      if (request.method === 'GET' && (data.owner_id !== identity.userId
          || typeof data.id !== 'string' || data.id.toLowerCase() !== id)) {
        return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
      }
      if (request.method === 'PUT' && data.owner_id !== identity.userId) {
        return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
      }
      return response.status(200).json(request.method === 'DELETE' ? { id: data.id } : note(data));
    } catch {
      return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
    }
  };
}
