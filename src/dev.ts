/**
 * ArcaFeed Development Entry Point
 *
 * Bundles the core ArcaFeed engine together with all plugins
 * into a single userscript for development convenience.
 *
 * Initialization order is critical:
 *   1. Set up `window.__arcaFeed` bridge (plugins need it to register)
 *   2. Load all plugins (they register their event listeners)
 *   3. Initialize core (VaultAdapter + event wiring)
 *   4. Emit `init` event (triggers all registered handlers)
 */

import { ArcaFeed, eventBus } from '@/core';

// ── Step 1: Expose EventBus globally for plugins ───────

window.__arcaFeed = { eventBus };

// ── Step 2: Load and initialize all plugins ────────────
// Eager-mode imports bundle plugins inline and allow us to
// call their init functions before core initialization.

async function initPlugins(): Promise<void> {
  const { initSeriesPlugin } = await import(
    /* webpackMode: "eager" */
    '@plugins/series/src/plugin'
  );
  const { initScrapPlugin } = await import(
    /* webpackMode: "eager" */
    '@plugins/scrap/src/plugin'
  );
  const { initSamplePlugin } = await import(
    /* webpackMode: "eager" */
    '@plugins/sample/src/plugin'
  );

  initSeriesPlugin();
  initScrapPlugin();
  initSamplePlugin();
}

// ── Step 3–4: Init core and emit init ──────────────────

async function init(): Promise<void> {
  await initPlugins();

  const GUARD_KEY = '__arcaFeedInitialized__';

  if ((window as any)[GUARD_KEY]) {
    console.log('[ArcaFeed] Already initialized, skipping duplicate execution.');
    return;
  }
  (window as any)[GUARD_KEY] = true;

  // Initialize core engine (VaultAdapter + event wiring)
  new ArcaFeed();

  // Load eruda debug console for mobile dev
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEVICE === 'mobile'
  ) {
    const eruda = await import('eruda');
    eruda.default.init();
  }

  // Emit init — triggers all plugin and core handlers
  eventBus.emit('init');
}

init();
