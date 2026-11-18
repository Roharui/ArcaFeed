import { afterPaint } from '@/utils/after-paint';
import { parseHref } from '@/utils/regex';

const GUARD_KEY = '__arcaFeedInitialized__';

function waitForHead(): Promise<void> | undefined {
  if (document.head) return;
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.head) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
}

async function start(): Promise<void> {
  // style-loader needs a head. Storage can open while the rest of the DOM parses.
  await waitForHead();
  const ready =
    document.readyState === 'loading'
      ? new Promise<void>((resolve) => {
          window.addEventListener('DOMContentLoaded', () => resolve(), {
            capture: true,
            once: true,
          });
        })
      : undefined;
  const { initializeStorage } = await import(
    /* webpackMode: "eager" */ '@/vault/indexed-storage'
  );
  await Promise.all([
    initializeStorage(),
    import(/* webpackMode: "eager" */ '@css/arcalive.css'),
    ready,
  ]);
  const { ArcaFeed, eventBus } = await import(
    /* webpackMode: "eager" */ '@/core'
  );
  const { captureSkippedToast } = await import(
    /* webpackMode: "eager" */ '@/feature/swiper/skip-toast'
  );
  captureSkippedToast();
  new ArcaFeed();
  await eventBus.emit('init');
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEVICE === 'mobile'
  ) {
    afterPaint(() => {
      const page = window as Window & {
        eruda?: typeof import('eruda').default;
      };
      if (page.eruda) {
        page.eruda.init();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.4.3';
      script.onload = () => page.eruda?.init();
      script.onerror = () => console.error('[ArcaFeed] Eruda failed to load.');
      document.head.append(script);
    });
  }
}

if ((window as any)[GUARD_KEY]) {
  console.log('[ArcaFeed] Already initialized, skipping duplicate execution.');
} else if (parseHref(window.location.href).mode !== 'OTHER') {
  (window as any)[GUARD_KEY] = true;
  void start().catch(async (error) => {
    (window as any)[GUARD_KEY] = false;
    const { reportFailure } = await import(
      /* webpackMode: "eager" */ '@/utils/operation-error'
    );
    reportFailure(error);
  });
}
