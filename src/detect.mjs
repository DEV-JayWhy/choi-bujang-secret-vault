// Stage 9, 제작 1: projection of engine-attested synthetic events only.
// The published contract provides at, method, identity.sub. It DOES NOT
// provide a verified device ID, network, or access decision in these events.
// Do not copy token, note contents, real name, or arbitrary extra fields.
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export function readDetectionEvents(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');
  const safeEvents = [];
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
    const { at, method, identity } = event;
    if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))
      || typeof method !== 'string' || !METHODS.has(method)
      || !identity || typeof identity !== 'object' || Array.isArray(identity)
      || typeof identity.sub !== 'string' || !identity.sub.trim()) continue;
    // Fresh objects with ONLY published, non-secret detection fields.
    safeEvents.push({ at, method, subject: identity.sub });
  }
  return safeEvents;
}

// Stage 9, 제작 1 only: keep the original observe behavior.
// The 10-minute threshold and revocation proposal belong to 제작 2/3.
export function detect(events) {
  readDetectionEvents(events);
  return { action: 'observe' };
}
