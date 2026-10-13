import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAfterRestore } from '../src/post-restore-retest.mjs';
import { createHash } from 'node:crypto';

const self='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const token='Bearer offline-signed-judge-fixture';
const contentHash=createHash('sha256').update('SECRET_B').digest('hex');

test('after-restore checks actually invoke authorized GET, foreign denial and real fixture functions',async()=>{
  const invoked=[];
  const detail=async(req,res)=>{
    invoked.push({url:req.url,authenticated:!!req.headers.authorization});
    const code=!req.headers.authorization||req.headers.authorization==='Bearer invalid'?401:req.url==='/api/notes/export'?400
      :req.url==='/api/notes/'+self?200:404;
    return res.status(code).json(code===200?{id:self,title:'not exposed',body:'SECRET_B'}:{error:'denied'});
  };
  const db={from(table){
    assert.equal(table,'a02_private_notes');
    return {select(column){
      assert.equal(column,'id');
      return {neq(key,id) {
        assert.equal(key,'owner_id');
        assert.equal(id,self);
        return {limit:async n=> {
          assert.equal(n,1);
          return {data:[{id:foreign}],error:null};
        }};
      }};
    }};
  }};
  const result=await checkAfterRestore({noteId:self,ownerId:self,authorization:token,db,detail,contentHash});
  assert.equal(result.executedAfterRestore,true);
  assert.equal(result.allExecutedChecksPassed,true);
  assert.equal(result.judgeFullReplay,'not_run');
  assert.deepEqual(result.checks.map(x=>x.name),[
    'restored_owner_get','anonymous_get_denied','invalid_token_get_denied','unknown_route_denied',
    'other_owner_get_denied','stage6_7_decision_fixtures','stage9_burst_fixture',
  ]);
  assert.equal(result.checks.length,7);
  assert.deepEqual(invoked.map(x=>x.authenticated),[true,false,true,true,true]);
  assert.equal(JSON.stringify(result).includes('SECRET_B'),false);
  assert.equal(JSON.stringify(result).includes(token),false);
  assert.equal(JSON.stringify(result).includes(foreign),false);
});

test('when foreign fixture is absent, missing attack is explicitly not_run',async()=>{
  const detail=async(req,res)=>res.status(req.headers.authorization?200:401).json({id:self});
  const db = {
    from() {
      return {
        select() {
          return {
            neq() {
              return { limit: async () => ({ data: [], error: null }) };
            },
          };
        },
      };
    },
  };
  const result=await checkAfterRestore({noteId:self,ownerId:self,authorization:token,db,detail});
  const foreignTest=result.checks.find(x=>x.name==='other_owner_get_denied');
  assert.equal(foreignTest.passed,null);
  assert.equal(foreignTest.status,'not_run_no_foreign_fixture');
  assert.equal(result.allExecutedChecksPassed,false);
});

test('production HTTP transport binds destination, denies redirects, and verifies returned content hash',async()=>{
  const calls=[];
  const fetcher=async(url,options)=>{
    calls.push({url:String(url),options});
    assert.equal(url.origin,'https://choi-bujang-secret-vault-xi.vercel.app');
    assert.equal(options.redirect,'error');
    assert.equal(options.cache,'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    const auth=options.headers.authorization;
    const code=!auth||auth==='Bearer invalid'?401:url.pathname==='/api/notes/export'?400
      :url.pathname==='/api/notes/'+self?200:404;
    return new Response(JSON.stringify(code===200?{id:self,body:'SECRET_B'}:{error:'denied'}),
      {status:code,headers:{'content-type':'application/json'}});
  };
  const db={from:()=>({select:()=>({neq:()=>({limit:async()=>({data:[{id:foreign}]})})})})};
  const result=await checkAfterRestore({noteId:self,ownerId:self,authorization:token,db,contentHash,fetcher});
  assert.equal(result.allExecutedChecksPassed,true);
  assert.equal(result.scope,'production_http_and_local_synthetic_fixtures');
  assert.equal(calls.length,5);
  assert.equal(JSON.stringify(result).includes('SECRET_B'),false);
  assert.equal(JSON.stringify(result).includes(token),false);
  const mismatch=await checkAfterRestore({noteId:self,ownerId:self,authorization:token,db,
    contentHash:'0'.repeat(64),fetcher});
  assert.equal(mismatch.checks[0].passed,false,'matching ID cannot conceal incorrect restored content');
  assert.equal(mismatch.allExecutedChecksPassed,false);
});

test('transport failures remain failed checks instead of fabricated HTTP results',async()=>{
  const db={from:()=>({select:()=>({neq:()=>({limit:async()=>({data:[]})})})})};
  const result=await checkAfterRestore({noteId:self,ownerId:self,authorization:token,db,contentHash,
    fetcher:async()=>{throw new Error('network unavailable');}});
  assert.equal(result.allExecutedChecksPassed,false);
  assert.equal(result.checks[0].httpStatus,null);
  assert.equal(result.checks[0].passed,false);
  assert.equal(result.judgeFullReplay,'not_run');
});
