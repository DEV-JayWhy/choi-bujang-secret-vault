// Private fixed-code ingress evidence. Never accept tokens or resource metadata.
const stages = new Set(['auth_received', 'auth_rejected', 'auth_verified']);
export async function recordRecoveryIngress(db, traceId, stage) {
  if (!stages.has(stage) || !/^[0-9a-f-]{36}$/u.test(traceId ?? '')) return false;
  try {
    let call = db.rpc('a10_record_recovery_ingress', {p_trace_id: traceId, p_stage: stage});
    if (typeof call?.abortSignal === 'function') call = call.abortSignal(AbortSignal.timeout(1500));
    const {error} = await call;
    return !error;
  } catch { return false; }
}
