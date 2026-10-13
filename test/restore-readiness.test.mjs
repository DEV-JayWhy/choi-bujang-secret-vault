import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyRestoreBackend} from '../src/restore-readiness.mjs';
const id='11111111-1111-4111-8111-111111111111';
const owner='22222222-2222-4222-8222-222222222222';
const hash='a'.repeat(64),url='https://yugdsswjndlajydiwvwc.supabase.co';
const config={identityProvider:{issuer:url+'/auth/v1'}};
const healthy=()=>({
 from(name){
  if(name==='a10_note_backups')return{select:()=>({limit:async()=>({data:[{note_id:id,owner_id:owner}],error:null})})};
  if(name==='a10_note_seals')return{select:async()=>({count:1,error:null})};
  throw Error('unexpected_table');
 },
 rpc:async name=>name==='a10_preview_verified_note'
 ?{data:{id,ownerId:owner,contentHash:hash,backupVersion:hash,stateVersion:hash,changedFields:['content'],verified:true},error:null}
 :name==='a10_policy_diff'
 ?{data:{backupVerified:true,scope:'test_only',backupVersion:hash,changes:[]},error:null}
 :{data:null,error:{code:'42883'}},
});
test('private snapshot, seal, RPC preview and test-only policy are ready',async()=>{
 const result=await verifyRestoreBackend({db:healthy(),url,config});
 assert.deepEqual(result,{verified:true,privateSnapshot:true,policySnapshot:true});
 assert.equal(JSON.stringify(result).includes(id),false);
 assert.equal(JSON.stringify(result).includes(hash),false);
});
test('invalid service credential or missing backup blocks production',async()=>{
 const db=healthy();db.from=()=>({select:()=>({limit:async()=>({data:[],error:{code:'42501'}})})});
 await assert.rejects(verifyRestoreBackend({db,url,config}),/PREFLIGHT_PRIVATE_BACKUP_UNREADABLE/u);
});
test('missing independent seal blocks production',async()=>{
 const db=healthy(),old=db.from;db.from=n=>n==='a10_note_seals'?{select:async()=>({count:0,error:null})}:old(n);
 await assert.rejects(verifyRestoreBackend({db,url,config}),/PREFLIGHT_SEALED_BACKUP_UNAVAILABLE/u);
});
test('RPC preview that did not verify the backup blocks production',async()=>{
 const db=healthy(),old=db.rpc;db.rpc=async n=>n==='a10_preview_verified_note'?{data:{verified:false},error:null}:old(n);
 await assert.rejects(verifyRestoreBackend({db,url,config}),/PREFLIGHT_BACKUP_PREVIEW_FAILED/u);
});
test('damaged safe policy backup blocks production',async()=>{
 const db=healthy(),old=db.rpc;db.rpc=async n=>n==='a10_policy_diff'?{data:null,error:{code:'PGRST202'}}:old(n);
 await assert.rejects(verifyRestoreBackend({db,url,config}),/PREFLIGHT_POLICY_BACKUP_FAILED/u);
});
test('a mismatched Supabase project cannot be used for recovery',async()=>{
 await assert.rejects(verifyRestoreBackend({db:healthy(),url:'https://other.example.com',config}),/PREFLIGHT_ORIGIN_MISMATCH/u);
});
