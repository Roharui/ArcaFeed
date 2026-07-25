import { ArcaFeed, eventBus } from '@/core';

// Guard against duplicate execution (userscript may be loaded multiple times
// by the userscript manager on SPA navigations, iframes, etc.)
if (window.__arcaFeedInitialized__) {
  console.log('[ArcaFeed] Already initialized, skipping duplicate execution.');
} else {
  window.__arcaFeedInitialized__ = true;

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
