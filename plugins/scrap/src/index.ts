/**
 * ArcaFeed Scrap Plugin — Standalone Entry
 */
import { initScrapPlugin } from './plugin';

(function () {
  const GUARD_KEY = '__arcaFeedScrapPlugin__';

  if ((window as any)[GUARD_KEY]) return;
  (window as any)[GUARD_KEY] = true;

  console.log('[Scrap Plugin] Standalone mode.');

  function waitForArcaFeed(cb: () => void, timeoutMs = 10000): void {
    const start = Date.now();
    function check() {
      const bridge = (window as any).__arcaFeed;
      if (bridge?.eventBus) { cb(); return; }
      if (Date.now() - start > timeoutMs) {
        console.warn('[Scrap Plugin] Timed out.');
        return;
      }
      setTimeout(check, 200);
    }
    check();
  }

  waitForArcaFeed(() => {
    initScrapPlugin();
  });
})();
