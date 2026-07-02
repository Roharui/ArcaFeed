import { ArcaFeed, eventBus } from '@/core';

// Guard against duplicate execution (userscript may be loaded multiple times
// by the userscript manager on SPA navigations, iframes, etc.)
const GUARD_KEY = '__arcaFeedInitialized__';

if ((window as any)[GUARD_KEY]) {
  console.log('[ArcaFeed] Already initialized, skipping duplicate execution.');
} else {
  (window as any)[GUARD_KEY] = true;

  // Ensure ArcaFeed singleton is created (registers EventBus listeners)
  new ArcaFeed();

  (function () {
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.DEVICE === 'mobile'
    ) {
      import('eruda').then((eruda) => eruda.default.init());
    }
    eventBus.emit('init');
  })();
}
