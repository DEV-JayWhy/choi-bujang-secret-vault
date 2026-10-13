import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentIdentity } from './deployment-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'public', 'data.json');
const config = JSON.parse(await readFile(resolve(root, 'aleph.config.json'), 'utf8'));
if (!Number.isInteger(config.step) || config.step < 2) {
  throw new Error('이 빌드는 자료를 서버로 이동한 2단계 이후 설정을 사용합니다.');
}
await mkdir(resolve(root, 'public'), { recursive: true });
// 이전 빌드에서 남은 공개 자료도 제거합니다.
await rm(output, { force: true });
await rm(resolve(root, 'public', 'auth-config.js'), { force: true });
// The live Production build must use the real service key to read a sealed
// snapshot and the test-only safe policy. Local/CI mocks are not evidence.
if (process.env.VERCEL_ENV === 'production' && !process.argv.includes('--local')
    && config.step >= 10) {
  const {createClient}=await import('@supabase/supabase-js');
  const {verifyRestoreBackend}=await import('../src/restore-readiness.mjs');
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('PREFLIGHT_RESTORE_SERVER_KEY_MISSING');
  const db=createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:(resource,options={})=>fetch(resource,{
      ...options,redirect:'error',signal:AbortSignal.timeout(12000),
    })},
  });
  await verifyRestoreBackend({db,url,config});
  console.log('STAGE10_PRODUCTION_BACKUP_AND_POLICY_PREFLIGHT_VERIFIED');
}
if (!process.argv.includes('--local')) {
  const identity = deploymentIdentity(process.env, config);
  await writeFile(resolve(root, 'public', 'aleph.json'),
    `${JSON.stringify(identity, null, 2)}\n`, 'utf8');
  console.log('배포 저장소·커밋·주소를 public/aleph.json에 기록했습니다.');
}
