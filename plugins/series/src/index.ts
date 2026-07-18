/**
 * ArcaFeed Series Plugin — Standalone Entry
 *
 * IIFE wrapper for standalone userscript builds.
 * Uses waitForArcaFeed polling to detect the main ArcaFeed script.
 */
import { initSeriesPlugin } from './plugin';

(function () {
  const GUARD_KEY = '__arcaFeedSeriesPlugin__';

  if ((window as any)[GUARD_KEY]) {
    console.log('[Series Plugin] Already initialized.');
    return;
  }
  (window as any)[GUARD_KEY] = true;

  console.log('[Series Plugin] Standalone mode.');

  // ── Helper: wait for ArcaFeed to be ready ────────────
  function waitForArcaFeed(
    cb: () => void,
    timeoutMs: number = 10000,
  ): void {
    const start = Date.now();

    function check() {
      const bridge = (window as any).__arcaFeed;
      if (bridge?.eventBus) {
        cb();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        console.warn('[Series Plugin] Timed out waiting for ArcaFeed.');
        return;
      }
      setTimeout(check, 200);
    }

    check();
  }

  waitForArcaFeed(() => {
    console.log('[Series Plugin] ArcaFeed detected, plugin active!');
    initSeriesPlugin();
  });
})();
