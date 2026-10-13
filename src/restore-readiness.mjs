// Read-only Production readiness check using the actual deployed service credentials.
// No note, hash, owner ID, JWT, key or SQL error is disclosed.
const SHA = /^[a-f0-9]{64}$/u;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const stop = code => { throw new Error(code); };
export async function verifyRestoreBackend({db,url,config}={}) {
  if (!db || !url || !config?.identityProvider?.issuer ||
      new URL(url).origin !== new URL(config.identityProvider.issuer).origin) {
    stop('PREFLIGHT_ORIGIN_MISMATCH');
  }
  const backups = await db.from('a10_note_backups').select('note_id,owner_id').limit(1);
  if (backups.error || backups.data?.length !== 1 ||
      !UUID.test(backups.data[0].note_id) || !UUID.test(backups.data[0].owner_id)) {
    stop('PREFLIGHT_PRIVATE_BACKUP_UNREADABLE');
  }
  const [sample] = backups.data;
  const seals = await db.from('a10_note_seals').select('note_id',{count:'exact',head:true});
  if (seals.error || !Number.isInteger(seals.count) || seals.count < 1) {
    stop('PREFLIGHT_SEALED_BACKUP_UNAVAILABLE');
  }
  const {data:preview,error:previewError}=await db.rpc('a10_preview_verified_note',{
    p_note_id:sample.note_id,p_owner_id:sample.owner_id,
  });
  if (previewError || preview?.verified !== true || preview.id !== sample.note_id ||
      preview.ownerId !== sample.owner_id || !SHA.test(preview.contentHash ?? '') ||
      !SHA.test(preview.backupVersion ?? '') || !SHA.test(preview.stateVersion ?? '') ||
      !Array.isArray(preview.changedFields)) {
    stop('PREFLIGHT_BACKUP_PREVIEW_FAILED');
  }
  const {data:policy,error:policyError}=await db.rpc('a10_policy_diff');
  if (policyError || policy?.backupVerified !== true ||
      policy.scope !== 'test_only' || !SHA.test(policy.backupVersion ?? '') ||
      !Array.isArray(policy.changes)) {
    stop('PREFLIGHT_POLICY_BACKUP_FAILED');
  }
  return Object.freeze({verified:true,privateSnapshot:true,policySnapshot:true});
}
