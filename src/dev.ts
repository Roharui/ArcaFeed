/**
 * ArcaFeed Development Entry Point
 *
 * Bundles the core ArcaFeed engine together with all plugins
 * into a single userscript for development convenience.
 *
 * Architecture:
 *   1. Plugins register their Step functions on `window.__arcaFeed.pluginSteps`
 *   2. Core reads pluginSteps and executes them in its init pipeline
 */

import { ArcaFeed, eventBus } from '@/core';
import { initSeriesPlugin } from '@plugins/series/src/plugin';
import { initScrapPlugin } from '@plugins/scrap/src/plugin';
import { initSamplePlugin } from '@plugins/sample/src/plugin';

// ── Bridge setup ───────────────────────────────────────

window.__arcaFeed = {
  eventBus,
  pluginSteps: [],
  pluginStepsAfter: [],
  plugins: [],
};

// ── Plugins register their steps ───────────────────────

initSeriesPlugin();
initScrapPlugin();
initSamplePlugin();

// ── Core init ──────────────────────────────────────────

const GUARD_KEY = '__arcaFeedInitialized__';

if ((window as any)[GUARD_KEY]) {
  console.log('[ArcaFeed] Already initialized, skipping duplicate execution.');
} else {
  (window as any)[GUARD_KEY] = true;

  new ArcaFeed();

  if (process.env.NODE_ENV === 'development' && process.env.DEVICE === 'mobile') {
    import('eruda').then((eruda) => eruda.default.init());
  }

  eventBus.emit('init');
}
