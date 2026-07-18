/**
 * ArcaFeed Series Plugin — Standalone Entry
 *
 * In standalone mode, the plugin loads after the core's init event.
 * We detect ArcaFeed, run initSeriesPlugin (registers metadata + CSS),
 * then execute the content directly.
 */
import { initSeriesPlugin } from './plugin';

(function () {
  const GUARD_KEY = '__arcaFeedSeriesPlugin__';
  console.log('[Series Plugin] Standalone mode.');

  if ((window as any)[GUARD_KEY]) return;
  (window as any)[GUARD_KEY] = true;

  console.log('[Series Plugin] Standalone mode.');

  function waitForArcaFeed(cb: () => void, timeoutMs = 10000): void {
    const start = Date.now();
    function check() {
      const bridge = (window as any).__arcaFeed;
      if (bridge?.eventBus) { cb(); return; }
      if (Date.now() - start > timeoutMs) {
        console.warn('[Series Plugin] Timed out.');
        return;
      }
      setTimeout(check, 200);
    }
    check();
  }

  waitForArcaFeed(() => {
    console.log('[Series Plugin] ArcaFeed detected.');
    initSeriesPlugin();
  });
})();
