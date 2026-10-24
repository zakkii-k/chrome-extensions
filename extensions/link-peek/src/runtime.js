// Extension APIs may throw synchronously after a reload. A trailing .catch()
// on sendMessage cannot catch that throw, so keep both paths inside try/await.
export function createMessenger(runtime, onInvalidated = () => {}) {
  let invalidated=false;
  function invalidate() {
    if (invalidated) return;
    invalidated=true;
    onInvalidated();
  }
  function alive() {
    try { if (!invalidated && runtime.id) return true; } catch {}
    invalidate();return false;
  }
  async function send(message) {
    if (!alive()) return null;
    try { return await runtime.sendMessage(message); }
    catch (error) {
      if (/context\s+invalidated/i.test(String(error?.message || error))) invalidate();
      return null;
    }
  }
  function resource(path) {
    if (!alive()) return null;
    try { return runtime.getURL(path); }
    catch { invalidate();return null; }
  }
  return {alive,send,resource};
}
