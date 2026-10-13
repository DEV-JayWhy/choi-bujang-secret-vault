import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide } from '../src/decider.mjs';

const source = readFileSync(new URL('../src/decider.mjs', import.meta.url), 'utf8');
const metadata = query => ({queryLength:query.length,
  querySha256:createHash('sha256').update(query).digest('hex')});

test('ID query digests agree with independent Node SHA-256 vectors', async () => {
  const ids = ['demo', '00000000-0000-0000-0000-000000000000',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', ...Array.from({length:32},()=>randomUUID())];
  for (const id of ids) {
    const request = {...fixtureRequests().normal,path:'/notes/'+id,...metadata('id='+id)};
    assert.equal((await decide(request)).decision,'allow');
    assert.equal((await decide({...request,...metadata('id='+id+'&action=export')})).decision,'deny');
    assert.equal((await decide({...request,querySha256:'0'.repeat(64)})).decision,'deny');
  }
});

test('decision source executes without a module loader or Node/browser runtime APIs', async () => {
  assert.doesNotMatch(source, /^\s*import\b/m);
  const context = createContext({}, {codeGeneration:{strings:false,wasm:false}});
  const standalone = source.replace(/^export\s+/gm,'');
  new Script(standalone+'\nglobalThis.runDecision = decide;').runInContext(context,{timeout:1000});
  assert.equal(new Script('typeof process + ":" + typeof Buffer + ":" + typeof crypto')
    .runInContext(context),'undefined:undefined:undefined');
  const {normal,suspicious} = fixtureRequests();
  for (const [request,expected] of [[normal,'allow'],[suspicious,'step_up'],
    [{...normal,deviceRegistered:false},'deny'],
    [{...normal,...metadata('id=demo')},'allow'],
    [{...normal,...metadata('action=export')},'deny']]) {
    const actual=await context.runDecision(request);
    assert.equal(actual.decision,expected);
    assert.equal(actual.requestId,request.requestId);
    assert.equal(JSON.stringify(actual),JSON.stringify(await decide(request)));
  }
});
