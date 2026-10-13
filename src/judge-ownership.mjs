import { createHash } from 'node:crypto';

// Only apply this namespace to a cryptographically verified judge identity.
// The signed a/b persona defines an isolated ownership zone within a run;
// the signed JWT subject alone may identify the judge, not the tested persona.
export function noteOwnerId(identity) {
  if (identity.kind !== 'judge') return identity.userId;
  const digest = createHash('sha256')
    .update('aleph.note-judge-zone.v1')
    .update(identity.runId)
    .update(':')
    .update(identity.identity)
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x40;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
