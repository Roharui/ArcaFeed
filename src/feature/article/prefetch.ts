import type { VaultAdapter } from '@/vault';

const initializedVaults = new WeakSet<VaultAdapter>();

/** Warm the browser's navigation cache for just the next article. */
export function initArticlePrefetch(p: VaultAdapter): void {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE') || initializedVaults.has(p))
    return;
  const link = document.createElement('link');
  if (!link.relList.supports('prefetch')) return;
  initializedVaults.add(p);
  link.rel = 'prefetch';
  link.as = 'document';
  link.setAttribute('fetchpriority', 'low');

  let currentUrl = '';
  const update = () => {
    const next = p.articleList[p.activeIndex + 1];
    const enabled = !p.articleFilterConfig[p.href.channelId]?.disableSwiper;
    const url =
      enabled && next
        ? new URL(`${next}${p.searchQuery}`, window.location.origin)
        : null;
    const href = url?.origin === window.location.origin ? url.href : '';
    if (href === currentUrl) return;
    currentUrl = href;
    link.remove();
    if (!href || href === window.location.href) return;
    link.href = href;
    document.head.append(link);
  };
  update();
  p.subscribe(update);
}
