import type {
  ArticleFilterConfigImpl,
  HrefImpl,
  PageMode,
  UISettings,
} from '../types/vault';

export interface PrefetchVaultState {
  articleList: string[];
  activeIndex: number;
  searchQuery: string;
  href: HrefImpl;
  articleFilterConfig: ArticleFilterConfigImpl;
  readingRevision: number;
  uiSettings: UISettings;
}

export interface PrefetchVault {
  articleList: string[];
  activeIndex: number;
  searchQuery: string;
  href: HrefImpl;
  articleFilterConfig: ArticleFilterConfigImpl;
  uiSettings: UISettings;
  isCurrentMode(...modes: HrefImpl['mode'][]): boolean;
  getAdjacentArticleIndex(mode: PageMode): number;
  getState?(): Readonly<PrefetchVaultState>;
  subscribe(listener: (state: PrefetchVaultState) => void): () => void;
}

export interface CreateArticlePrefetchOptions<TVault extends PrefetchVault> {
  countSkippedVisited: (p: TVault, targetIndex: number) => number;
  skippedToastURL: (destination: string, count: number) => string;
}

export function createArticlePrefetch<TVault extends PrefetchVault>({
  countSkippedVisited,
  skippedToastURL,
}: CreateArticlePrefetchOptions<TVault>): (p: TVault) => void {
  const initializedVaults = new WeakSet<TVault>();

  /** Warm the browser's navigation cache for just the next article. */
  return function initArticlePrefetch(p: TVault): void {
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
      link.remove();
      if (!href || href === window.location.href) return;
      link.href = href;
      document.head.append(link);
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
  };
}
