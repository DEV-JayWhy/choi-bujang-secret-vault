import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));

test('official allowedRoutes use scoped route objects, not unchecked string literals', () => {
  assert.equal(config.schema,'aleph.config.v1');
  assert.equal(config.step,10);
  assert.ok(Array.isArray(config.allowedRoutes));
  assert.ok(config.allowedRoutes.length >= 8);
  const seen=new Set();
  for (const r of config.allowedRoutes) {
    assert.equal(Object.keys(r).sort().join(','),'method,pathPattern,service,zone');
    assert.match(r.method,/^(GET|POST|PUT|DELETE)$/u);
    assert.match(r.service,/^(notes|auth)$/u);
    assert.match(r.pathPattern,/^\/api\/[a-z0-9/:]+$/u);
    assert.match(r.zone,/^(my-notes|authentication)$/u);
    assert.equal(r.pathPattern.includes('*'),false);
    assert.equal(r.pathPattern.includes('..'),false);
    const key=r.method+' '+r.pathPattern;
    assert.equal(seen.has(key),false,'no duplicate or conflicting route');
    seen.add(key);
    if (r.method!=='GET' && /\/announcements|\/instructor|\/materials/u.test(r.pathPattern)) {
      assert.fail('no unverified instructor write grants');
    }
  }
  for(const key of [
    'GET /api/notes','POST /api/notes',
    'GET /api/notes/:id','PUT /api/notes/:id','DELETE /api/notes/:id',
    'GET /api/restore/:id','POST /api/restore/:id',
    'POST /api/auth/login','POST /api/auth/logout',
  ]) assert.equal(seen.has(key),true,key);
  assert.equal(config.restoreRoute,'/api/restore/:id');
  const restoreRule=config.allowedRoutes.find(r=>r.method==='POST'
    && r.pathPattern===config.restoreRoute);
  assert.equal(restoreRule.service,'notes');
  assert.equal(restoreRule.zone,'my-notes');
  assert.ok(existsSync(new URL('../api/restore/[id].js',import.meta.url)));
  assert.ok(existsSync(new URL('../sql/10_verified_recovery.sql',import.meta.url)));
  assert.ok(existsSync(new URL('../sql/10_versioned_seals.sql',import.meta.url)));
});
test('identity, origin and original API remain aligned',()=>{
  assert.equal(new URL(config.identityProvider.issuer).origin,
    new URL(config.originalApiUrl).origin);
  assert.equal(config.identityProvider.issuer+'/.well-known/jwks.json',
    config.identityProvider.jwksUrl);
  assert.equal(new URL(config.publicAppUrl).protocol,'https:');
  assert.equal(new URL(config.repoUrl).hostname,'github.com');
});
