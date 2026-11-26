// Single installed-worker admission boundary. Ordinary preparation owns the
// slot until its asynchronous controller has settled. Reviewed execution owns
// it through its final result. Existing durable checkpoints block admission
// after restart; this gate never deletes or discharges them.
export function createSandboxOperationGate({ ordinaryIdle, hasReviewedCheckpoint, waitMs = 2000 }) {
  let owner = null;
  const limit = Number.isFinite(waitMs) ? Math.max(1, Math.min(2000, waitMs)) : 2000;
  async function acquire(kind, sender) {
    if (owner || !['ordinary', 'reviewed'].includes(kind)) return null;
    const token = {};
    owner = token;
    let granted = false, timer;
    const started = performance.now();
    const fresh = () => {
      const elapsed = performance.now() - started;
      return owner === token && Number.isFinite(elapsed) && elapsed >= 0 && elapsed < limit;
    };
    const release = () => { if (owner === token) owner = null; };
    try {
      const safe = await Promise.race([
        (async () => {
          if (await hasReviewedCheckpoint() !== false || !fresh()) return false;
          return kind === 'ordinary' || await ordinaryIdle(sender) === true;
        })(),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), limit); }),
      ]);
      if (safe !== true || !fresh()) return null;
      granted = true;
      return release;
    } catch { return null; }
    finally { clearTimeout(timer); if (!granted) release(); }
  }
  return Object.freeze({ acquire });
}
