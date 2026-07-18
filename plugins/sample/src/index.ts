/**
 * ArcaFeed Sample Plugin — Standalone Entry
 *
 * Demonstrates how to build a standalone plugin that communicates
 * with the main ArcaFeed script via `window.__arcaFeed.eventBus`.
 *
 * Usage:
 *   1. cd plugins/sample
 *   2. npm install
 *   3. npm run dev      (development, watch mode)
 *   4. npm run build    (production)
 *   5. Install dist/arcafeed-sample.user.js in Tampermonkey
 */
import { initSamplePlugin } from './plugin';

(function () {
  const GUARD_KEY = '__arcaFeedSamplePlugin__';

  if ((window as any)[GUARD_KEY]) {
    console.log('[Sample Plugin] Already initialized.');
    return;
  }
  (window as any)[GUARD_KEY] = true;

  console.log('[Sample Plugin] Standalone mode.');

  // ── Helper: wait for ArcaFeed to be ready ──────────────

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
        console.warn('[Sample Plugin] Timed out waiting for ArcaFeed.');
        return;
      }
      setTimeout(check, 200);
    }

    check();
  }

  waitForArcaFeed(() => {
    console.log('[Sample Plugin] ArcaFeed detected, plugin active!');
    initSamplePlugin();
  });
})();
