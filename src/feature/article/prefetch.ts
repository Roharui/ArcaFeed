import { countSkippedVisited } from '@/vault/navigation-context';
import { skippedToastURL } from '@/feature/swiper/skip-toast';
import type { VaultAdapter } from '@/vault';

const initializedVaults = new WeakSet<VaultAdapter>();

function supportsSpeculationRules(): boolean {
  return (
    typeof HTMLScriptElement === 'function' &&
    typeof HTMLScriptElement.supports === 'function' &&
    HTMLScriptElement.supports('speculationrules')
  );
}

/** Warm the browser's navigation cache for just the next article. */
export function initArticlePrefetch(p: VaultAdapter): void {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE') || initializedVaults.has(p))
    return;

  const useSpeculationRules = supportsSpeculationRules();
  let link: HTMLLinkElement | undefined;
  let speculationScript: HTMLScriptElement | undefined;

  if (!useSpeculationRules) {
    link = document.createElement('link');
    if (!link.relList.supports('prefetch')) return;
    link.rel = 'prefetch';
    link.as = 'document';
    link.setAttribute('fetchpriority', 'low');
  }

  initializedVaults.add(p);

  let currentUrl = '';
  const update = () => {
    const nextIndex = p.getAdjacentArticleIndex('NEXT');
    const next = p.articleList[nextIndex];
    const enabled = !p.articleFilterConfig[p.href.channelId]?.disableSwiper;
    const skipped = next ? countSkippedVisited(p, nextIndex) : 0;
    const destination = next
      ? skippedToastURL(`${next}${p.searchQuery}`, skipped)
      : '';
    const url =
      enabled && destination
        ? new URL(destination, window.location.origin)
        : null;
    const href = url?.origin === window.location.origin ? url.href : '';
    if (href === currentUrl) return;
    currentUrl = href;

    if (useSpeculationRules) {
      speculationScript?.remove();
      speculationScript = undefined;
      if (!href || href === window.location.href) return;
      speculationScript = document.createElement('script');
      speculationScript.type = 'speculationrules';
      speculationScript.textContent = JSON.stringify({
        prefetch: [{ source: 'list', urls: [href] }],
      });
      document.head.append(speculationScript);
      return;
    }

    link!.remove();
    if (!href || href === window.location.href) return;
    link!.href = href;
    document.head.append(link!);
  };

  let previousList = p.articleList;
  let previousIndex = p.activeIndex;
  let previousQuery = p.searchQuery;
  let previousHref = p.href;
  let previousFilter = p.articleFilterConfig;
  let previousReading = p.getState?.().readingRevision;
  let previousSettings = p.uiSettings;
  update();
  p.subscribe((state) => {
    const nextList = state?.articleList ?? p.articleList;
    const nextIndex = state?.activeIndex ?? p.activeIndex;
    const nextQuery = state?.searchQuery ?? p.searchQuery;
    const nextHref = state?.href ?? p.href;
    const nextFilter = state?.articleFilterConfig ?? p.articleFilterConfig;
    const nextReading = state?.readingRevision;
    const nextSettings = state?.uiSettings ?? p.uiSettings;
    if (
      nextList === previousList &&
      nextIndex === previousIndex &&
      nextQuery === previousQuery &&
      nextHref === previousHref &&
      nextFilter === previousFilter &&
      nextReading === previousReading &&
      nextSettings === previousSettings
    )
      return;
    previousList = nextList;
    previousIndex = nextIndex;
    previousQuery = nextQuery;
    previousHref = nextHref;
    previousFilter = nextFilter;
    previousReading = nextReading;
    previousSettings = nextSettings;
    update();
  });
}
