import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authHandler, cookieToken, sameOrigin } from '../src/server-auth.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(c) { this.code=c; return this; }, json(b) { this.body=b; return this; } });
const config=JSON.parse(readFileSync(new URL('../aleph.config.json',import.meta.url)));
const origin=config.publicAppUrl;
const user={id:'11111111-1111-4111-8111-111111111111',email:'local@example.invalid'};
test('server SDK login/session/refresh/logout; no credentials in JSON; CSRF and invalid login rejection', async () => {
  const oldFetch=globalThis.fetch, oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  const access='local.test.access', refresh='local-refresh'; let calls=0;
  try {
    process.env.SUPABASE_URL=new URL(config.identityProvider.issuer).origin;
    process.env.SUPABASE_SECRET_KEY='local-test-server-key';
    globalThis.fetch=async (input,init={}) => {
      calls++;
      const u=new URL(String(input)); const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json'}});
      if(u.pathname.endsWith('/token')) {
        const body=JSON.parse(init.body);
        if(u.searchParams.get('grant_type')==='password' && body.password==='wrong') return json({error_code:'invalid_credentials',msg:'invalid'},400);
        return json({access_token:access,refresh_token:refresh,expires_in:3600,token_type:'bearer',user});
      }
      if(u.pathname.endsWith('/user')) return json(user);
      if(u.pathname.endsWith('/logout')) return new Response(null,{status:204});
      throw new Error('unexpected endpoint');
    };
    const call=async(action,headers={},body)=>{const r=response();await authHandler(action)({method:action==='session'?'GET':'POST',headers,body},r);return r;};
    const headers={origin,'content-type':'application/json'};
    assert.equal((await call('login',{...headers,origin:'https://other.invalid'},{email:user.email,password:'local-password'})).code,403);
    assert.equal(calls,0);
    assert.equal((await call('login',headers,{email:user.email,password:'wrong'})).body.error,'invalid_credentials');
    let r=await call('login',headers,{email:user.email,password:'local-password'});
    assert.equal(r.code,200); assert.deepEqual(r.body,{user});
    assert.ok(!JSON.stringify(r.body).includes(access)); assert.ok(!JSON.stringify(r.body).includes(refresh));
    assert.equal(r.headers['Cache-Control'],'no-store');
    for(const c of r.headers['Set-Cookie']) for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/']) assert.ok(c.includes(flag));
    const cookie=r.headers['Set-Cookie'].map(x=>x.split(';')[0]).join('; ');
    assert.equal((await call('session',{cookie})).code,200);
    r=await call('session',{cookie:'__Host-vault-refresh='+refresh,'sec-fetch-site':'same-origin'});
    assert.equal(r.code,200);assert.equal(r.headers['Set-Cookie'].length,2);
    assert.equal((await call('session',{})).code,401);
    assert.equal((await call('logout',{cookie,origin:'https://other.invalid'})).code,403);
    r=await call('logout',{cookie,origin});assert.equal(r.code,200);assert.deepEqual(r.body,{user:null});
    assert.ok(r.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')));
    assert.equal(cookieToken({headers:{cookie:'__Host-vault-access=x; __Host-vault-access=y'}}),null);
    assert.equal(cookieToken({headers:{cookie:'__Host-vault-access=bad%0a'}}),null);
    assert.equal(sameOrigin({headers:{origin:'https://other.invalid'}}),false);
  } finally {
    globalThis.fetch=oldFetch;
    if(oldUrl===undefined) delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;
    if(oldKey===undefined) delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
  }
});
test('all public files contain no Supabase key, browser SDK, auth config or token storage', () => {
  const root=new URL('../public/',import.meta.url).pathname;
  function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())scan(p);else {const s=readFileSync(p,'utf8');assert.doesNotMatch(s,/sb_(?:publishable|secret)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|SUPABASE_PUBLISHABLE_KEY|window\.supabase|auth-config\.js|localStorage|sessionStorage/);}}}
  scan(root);
});
