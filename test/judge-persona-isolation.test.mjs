import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { generateKeyPair, SignJWT } from 'jose';
import { createLoginVerifier } from '../src/verify-login.mjs';
import { noteOwnerId } from '../src/judge-ownership.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

test('a signed judge run must not conflate A and B ownership, even if JWT sub matches', async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const runId = randomUUID(), commonSubject = randomUUID();
  const verify = createLoginVerifier({
    config,
    supabaseClient: { auth: { getClaims: async () => ({ error: new Error('not student') }) } },
    judgeKeySet: async () => publicKey,
  });
  async function token(persona, run = runId, subject = commonSubject) {
    return new SignJWT({ aleph_run: run, aleph_role: 'judge', aleph_identity: persona })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject(subject)
      .setIssuer(config.judgeIssuer)
      .setAudience(new URL(config.publicAppUrl).hostname)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }
  const a = await verify('Bearer ' + await token('a'));
  const b = await verify('Bearer ' + await token('b'));
  assert.equal(a?.kind, 'judge');
  assert.equal(b?.kind, 'judge');
  assert.equal(a.userId, b.userId, 'the fixture deliberately uses the same signed subject');
  assert.match(noteOwnerId(a), UUID_V4);
  assert.match(noteOwnerId(b), UUID_V4);
  assert.notEqual(noteOwnerId(a), noteOwnerId(b), 'verified A/B personas must be separate DB owners');
  assert.equal(noteOwnerId(a), noteOwnerId(await verify('Bearer ' + await token('a', runId, randomUUID()))),
    'a new signed token for the same persona and run retains its note ownership');
  assert.notEqual(noteOwnerId(a), noteOwnerId(await verify('Bearer ' + await token('a', randomUUID()))),
    'a new run is isolated');
  assert.equal(await verify('Bearer ' + await token('instructor')), null,
    'an unrecognized judge persona is not an authenticated note owner');
});

test('real Supabase student owner identity remains unchanged', () => {
  const studentId = randomUUID();
  assert.equal(noteOwnerId({ kind: 'student', userId: studentId }), studentId);
});

test('signed judge audience accepts ONLY the configured alias or server-provided immutable production host', async () => {
  const {privateKey, publicKey} = await generateKeyPair('ES256');
  const runId = randomUUID(), subjectId = randomUUID();
  const alias = new URL(config.publicAppUrl).hostname;
  const immutable = 'choi-bujang-secret-vault-pinned-jyp13.vercel.app';
  const verify = createLoginVerifier({
    config,
    deploymentHost: immutable,
    supabaseClient:{auth:{getClaims:async()=>({error:new Error('student disallowed')})}},
    judgeKeySet: async()=>publicKey,
  });
  const token = async (aud, persona='b') => new SignJWT({
    aleph_run:runId, aleph_role:'judge', aleph_identity:persona,
  }).setProtectedHeader({alg:'ES256'}).setIssuer(config.judgeIssuer)
    .setAudience(aud).setSubject(subjectId).setIssuedAt()
    .setExpirationTime('5m').sign(privateKey);
  assert.equal((await verify('Bearer '+await token(alias)))?.kind,'judge');
  assert.equal((await verify('Bearer '+await token(immutable)))?.identity,'b');
  assert.equal(await verify('Bearer '+await token('attacker.vercel.app')),null);
  assert.equal(await verify('Bearer '+await token('http://'+immutable)),null);
  const rejectInvalid = createLoginVerifier({
    config, deploymentHost:'attacker.example.com',
    supabaseClient:{auth:{getClaims:async()=>({error:new Error('student disallowed')})}},
    judgeKeySet:async()=>publicKey,
  });
  assert.equal(await rejectInvalid('Bearer '+await token('attacker.example.com')),null);
  assert.equal((await rejectInvalid('Bearer '+await token(alias)))?.identity,'b');
  assert.equal(await verify('Bearer '+await token(immutable, 'instructor')),null);
  assert.equal(await verify('Bearer '+await token(immutable).then(x=>x.slice(0,-2)+'aa')),null);
});

test('signed run and subject IDs are bound as UUIDs, without inventing a v4-only requirement', async () => {
  const {privateKey, publicKey} = await generateKeyPair('ES256');
  const deploymentHost = 'choi-bujang-secret-vault-pinned-jyp13.vercel.app';
  const verify = createLoginVerifier({
    config, deploymentHost,
    supabaseClient:{auth:{getClaims:async()=>({error:new Error('not student')})}},
    judgeKeySet:async()=>publicKey,
  });
  const token = await new SignJWT({
    aleph_run:'018fe5a1-c33f-7e55-a28b-48fba2c53b11',
    aleph_role:'judge', aleph_identity:'b',
  }).setProtectedHeader({alg:'ES256'}).setSubject('018fe5a1-c33f-7e55-a28b-48fba2c53b12')
    .setIssuer(config.judgeIssuer).setAudience(deploymentHost)
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
  assert.equal((await verify('Bearer '+token))?.kind,'judge');
});
