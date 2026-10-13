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

// Stage 9, 제작 2/3: the published standalone detection contract is a
// 10-minute sliding window with strictly more than 120 GETs by ONE subject.
// Device/network signals are not part of this event contract; do not invent
// them or infer an individual device from the pseudonymous subject.
const WINDOW_MS = 10 * 60 * 1000;
const READ_LIMIT = 120;

export function detect(events) {
  const readsBySubject = new Map();
  for (const event of readDetectionEvents(events)) {
    if (event.method !== 'GET') continue;
    const at = Date.parse(event.at);
    let times = readsBySubject.get(event.subject);
    if (!times) {
      times = [];
      readsBySubject.set(event.subject, times);
    }
    times.push(at);
  }

  // Select the chronologically first exceeded window, independent of input
  // order. Its subject is a revocation PROPOSAL, never an actual revocation.
  let first = null;
  for (const [subject, times] of readsBySubject) {
    if (times.length <= READ_LIMIT) continue;
    times.sort((a, b) => a - b);
    let start = 0;
    for (let end = 0; end < times.length; end += 1) {
      while (times[end] - times[start] >= WINDOW_MS) start += 1;
      if (end - start + 1 > READ_LIMIT) {
        if (!first || times[end] < first.at
          || (times[end] === first.at && subject < first.subject)) {
          first = { at: times[end], subject };
        }
        break;
      }
    }
  }

  return first
    ? { action: 'propose_revocation', reasonCode: 'burst_read', subject: first.subject }
    : { action: 'observe' };
}
