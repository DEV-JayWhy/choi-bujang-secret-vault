// Minimal persistent diagnostics after a cryptographically verified login.
// No note ID, owner ID, token, body, hash, IP, email or unbounded text.
const CHECKPOINTS = new Set(['auth_verified','backup_verified','backup_rejected',
  'version_rejected','restore_committed','restore_rejected',
  'retest_passed','retest_failed']);
const REASONS = new Set(['authenticated','verified_snapshot','not_found','integrity_failed',
  'version_changed','db_rejected','committed','checks_passed',
  'checks_failed','unavailable']);

export async function recordRecoveryObservation(db, identityKind, checkpoint, reason) {
  if (!['judge','student'].includes(identityKind)
    || !CHECKPOINTS.has(checkpoint) || !REASONS.has(reason)) return false;
  try {
    const { error } = await db.rpc('a10_record_restore_observation', {
      p_identity_kind: identityKind,
      p_checkpoint: checkpoint,
      p_reason: reason,
    });
    return !error;
  } catch {
    return false;
  }
}
