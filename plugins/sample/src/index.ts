/**
 * ArcaFeed Sample Plugin
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

(function () {
  const GUARD_KEY = '__arcaFeedSamplePlugin__';

  if ((window as any)[GUARD_KEY]) {
    console.log('[Sample Plugin] Already initialized.');
    return;
  }
  (window as any)[GUARD_KEY] = true;

  console.log('[Sample Plugin] Loaded!');

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

  // ── Plugin logic ───────────────────────────────────────

  waitForArcaFeed(() => {
    console.log('[Sample Plugin] ArcaFeed detected, plugin active!');

    const bus = (window as any).__arcaFeed.eventBus;

    // Example 1: Listen to initialization
    bus.on('init', () => {
      console.log('[Sample Plugin] ArcaFeed init event received!');
    });

    // Example 2: Listen to page navigation
    bus.on('renderNextPage', () => {
      console.log('[Sample Plugin] Next page rendered!');
    });

    // Example 3: Listen to series mode
    bus.on('enableSeries', () => {
      console.log('[Sample Plugin] Series mode enabled!');
    });

    // Example 4: Listen to modal events
    bus.on('showModal', () => {
      console.log('[Sample Plugin] Modal shown!');
    });

    bus.on('closeModal', () => {
      console.log('[Sample Plugin] Modal closed!');
    });
  });
})();
