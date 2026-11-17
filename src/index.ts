import { initializeStorage } from '@/vault/indexed-storage';
import { reportFailure } from '@/utils/operation-error';
import { ArcaFeed, eventBus } from '@/core';
import { captureSkippedToast } from '@/feature/swiper/skip-toast';
import { parseHref } from '@/utils/regex';

// Guard against duplicate execution (userscript may be loaded multiple times
// by the userscript manager on SPA navigations, iframes, etc.)
const GUARD_KEY = '__arcaFeedInitialized__';

if ((window as any)[GUARD_KEY]) {
  console.log('[ArcaFeed] Already initialized, skipping duplicate execution.');
} else {
  (window as any)[GUARD_KEY] = true;
  captureSkippedToast();

  async function start(): Promise<void> {
    if (parseHref(window.location.href).mode === 'OTHER') return;
    await initializeStorage();
    new ArcaFeed();
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.DEVICE === 'mobile'
    ) {
      void import('eruda').then((eruda) => eruda.default.init());
    }
    await eventBus.emit('init');
  }
  void start().catch((error) => {
    (window as any)[GUARD_KEY] = false;
    reportFailure(error);
  });
}
