import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { runOperationsChecks } from './operations-checks.mjs';
import { cookieToken } from './server-auth.mjs';
import { createLoginVerifier } from './verify-login.mjs';
import { confirmedDevice } from './device-handler.mjs';
import { noteOwnerId } from './judge-ownership.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url)));
let verifier;
export async function readBackendSummary(db, identity) {
  const notRun = reason => ({ source: 'not_run', status: 'not_run', reason });
  const summary = {
    detector: notRun('실제 엔진 탐지 사건 전달 기록이 연결되지 않음; 0건이나 정상으로 표시하지 않음'),
    revocation: notRun('엔진의 회수 집행 상태와 재요청 기록을 확인하지 못함'),
    recovery: notRun('검증된 사용자 범위의 복원 기록 조회 전'),
  };
  if (!identity) return summary;
  const owner = noteOwnerId(identity);
  try {
    const audit = await db.from('a10_recovery_audit').select('operation,reason_code,changed_count,happened_at')
      .eq('owner_id', owner).order('happened_at', { ascending: false }).limit(20);
    const seals = await db.from('a10_note_seals').select('note_id,sealed_at')
      .eq('owner_id', owner).order('sealed_at', { ascending: false }).limit(1);
    if (audit.error || seals.error || !Array.isArray(audit.data) || !Array.isArray(seals.data)) throw Error('unavailable');
    let version = null;
    if (seals.data[0]) {
      const preview = await db.rpc('a10_preview_verified_note', { p_note_id: seals.data[0].note_id, p_owner_id: owner });
      if (!preview.error && preview.data?.verified === true && preview.data.ownerId === owner
          && /^[a-f0-9]{64}$/.test(preview.data.backupVersion ?? '')) version = preview.data.backupVersion;
    }
    summary.recovery = { source: 'server_db', status: 'observed',
      observedAt: new Date().toISOString(), auditRowsRead: audit.data.length,
      window: '이 사용자의 최신 20개 기록만 조회; 전체 누적 건수가 아님',
      backupVersion: version, backupVersionStatus: version ? 'verified_snapshot' : 'not_available',
      // Never return resource IDs, owner IDs, titles, contents or free-form reasons.
      lastRecordedAt: audit.data[0]?.happened_at ?? null,
      replayStatus: 'not_run', reason: '복원 기록과 검증 사본 버전만 조회; 이번 요청에서 복원·전체 재시험은 실행하지 않음' };
  } catch { summary.recovery = { source: 'server_db', status: 'unavailable', reason: '서버 기록 조회 실패; 수치를 추정하지 않음' }; }
  return summary;
}
export function operationsHandler(dependencies = {}) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('CDN-Cache-Control', 'no-store');
    response.setHeader('Vary', 'Authorization, Cookie');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    try {
      let db = dependencies.db, verify = dependencies.verify;
      const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
      if (!db && url && key && new URL(url).origin === new URL(config.identityProvider.issuer).origin) {
        db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      }
      const token = cookieToken(request);
      const authorization = request.headers?.authorization || (token ? `Bearer ${token}` : null);
      let identity = null, approvedDevice = false;
      if (authorization && db) {
        if (!verify) { verifier ??= createLoginVerifier({ config, supabaseSecretKey: key }); verify = verifier; }
        identity = await verify(authorization);
        // Judge requests arrive after the provided engine verifies its caller.
        if (identity?.kind === 'judge') approvedDevice = true;
        else if (identity?.kind === 'student') {
          const device = cookieToken(request, '__Host-vault-device');
          if (device && /^[a-f0-9]{64}$/.test(device)) {
            const result = await db.from('a11_device_requests').select('owner_id,state,approved_at,expires_at')
              .eq('owner_id', identity.userId).eq('token_hash', createHash('sha256').update(device).digest('hex')).maybeSingle();
            approvedDevice = !result.error && confirmedDevice(result.data, identity.userId);
          }
        }
      }
      const report = await runOperationsChecks({ config, fetcher: dependencies.fetcher,
        verifiedAuthorization: identity ? authorization : undefined, approvedDevice,
        expectedCommit: process.env.VERCEL_GIT_COMMIT_SHA });
      report.commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
      report.commitSource = report.commit ? 'vercel_runtime' : 'not_available';
      report.backend = db && approvedDevice ? await readBackendSummary(db, identity)
        : await readBackendSummary(null, null);
      report.engine = { name: 'ALEPH SDP 엔진', source: 'provided_engine',
        status: 'not_run', reason: '이 작전실의 읽기 점검은 엔진의 실제 탐지·회수·서명 집행을 대신하지 않음' };
      // Save exactly the same redacted object used by the screen. Never save auth.
      report.serverRecord = { status: 'unavailable', runId: report.runId };
      if (db) {
        const stored = { ...report, serverRecord: { status: 'stored', runId: report.runId } };
        const result = await db.from('a12_operations_runs').insert({ run_id: report.runId,
          checked_at: report.checkedAt, commit_sha: report.commit, redacted_report: stored });
        if (!result.error) report.serverRecord.status = 'stored';
      }
      return response.status(200).json(report);
    } catch { return response.status(503).json({ error: 'OPERATIONS_UNAVAILABLE' }); }
  };
}
