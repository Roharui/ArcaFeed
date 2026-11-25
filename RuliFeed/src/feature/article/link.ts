import {
  captureNavigationState,
  restoreNavigationState,
} from '@/feature/navigation';
import { fetchFirstBatch, fetchAllBatches } from './fetch';
import { extractNextPageUrl } from './listing';
import { loadMoreHomeSeriesArticles } from './subscription-feed';
import { filterLink } from '@/feature/filter';
import { parseSearchQuery } from '@/feature/search';
import {
  createArticleKey,
  handoffTabArticleKey,
  setTabArticleKey,
} from '@/utils/article-key';
import { extractChannelId, normalizeArticlePath } from '@/utils/regex';
import { captureArticleSession } from '@feed/core/vault/article-session';
import { articlePath } from '@/vault/navigation-context';
import {
  compactNavigationArticles,
  findArticleIndex,
} from '@/vault/article-window';

import type { VaultAdapter } from '@/vault';

const handoffInstalled = new WeakSet<VaultAdapter>();

function currentDocumentNextPageUrl(channelId: string): string {
  if (typeof document === 'undefined' || !channelId) return '';
  return extractNextPageUrl(document, `/${channelId}`) ?? '';
}

function installNavigationHandoff(p: VaultAdapter): void {
  if (handoffInstalled.has(p)) return;
  handoffInstalled.add(p);
  if (
    typeof document !== 'undefined' &&
    typeof document.addEventListener === 'function'
  ) {
    document.addEventListener(
      'click',
      (event) => {
        if (!p.articleKey || !p.isCurrentMode('CHANNEL', 'ARTICLE')) return;
        const target = event.target as Element | null;
        const anchor = target?.closest?.<HTMLAnchorElement>('a[href]');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href) return;
        const articleTarget = normalizeArticlePath(href);
        if (!articleTarget) return;
        if (
          !p.isSeriesMode &&
          extractChannelId(articleTarget) !== p.href.channelId
        )
          return;
        handoffTabArticleKey(p.articleKey, articleTarget);
        try {
          p.flushSave();
        } catch {
          // Best-effort flush before browser-initiated navigation.
        }
      },
      true,
    );
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    window.addEventListener('pagehide', () => {
      if (!p.articleKey || !p.isCurrentMode('CHANNEL', 'ARTICLE')) return;
      handoffTabArticleKey(p.articleKey);
    });
  }
}

// ── Link Initialization ────────────────────────────────

async function initArticleLink(p: VaultAdapter): Promise<void> {
  parseSearchQuery(p);
  const currentPath = articlePath(p.href.channelId, p.href.articleId);
  if (!p.isSeriesMode && p.articleList.length) {
    if (!p.articleList.includes(currentPath)) {
      p.resetArticleList();
    } else {
      const links = [...new Set(p.articleList)].filter(
        (path) => extractChannelId(path) === p.href.channelId,
      );
      if (links.length !== p.articleList.length) p.articleList = links;
    }
  }
  const links = filterLink(p, true);
  if (
    !p.isSeriesMode &&
    p.articleList.length === 0 &&
    links.includes(currentPath) &&
    !p.articleFilterConfig[p.href.channelId]?.onlyBest
  ) {
    const nextPageUrl = currentDocumentNextPageUrl(p.href.channelId);
    p.updateState({
      articleList: links,
      ...(nextPageUrl ? { nextPageUrl } : {}),
    });
  }
  await activateArticleLink(p, p.href.articleId);
}

async function initChannelLink(p: VaultAdapter): Promise<void> {
  p.resetArticleList();
  parseSearchQuery(p);

  const channelFilter = p.articleFilterConfig[p.href.channelId];
  const newLinks = filterLink(p, true);

  if (channelFilter?.onlyBest) {
    startBackgroundLoad(p, () => fetchFirstBatch(p, p.href.articleId));
    return;
  }

  if (newLinks.length > 0) {
    const nextPageUrl = currentDocumentNextPageUrl(p.href.channelId);
    p.updateState({
      articleList: newLinks,
      ...(nextPageUrl ? { nextPageUrl } : {}),
    });
    p.flushSave();
  } else {
    p.articleList = [];
    startBackgroundLoad(p, () => fetchFirstBatch(p, p.href.articleId));
  }
}

async function initScrapLink(p: VaultAdapter): Promise<void> {
  p.resetArticleList();
  parseSearchQuery(p);
}

const LINK_HANDLERS: Record<string, (p: VaultAdapter) => Promise<void>> = {
  ARTICLE: initArticleLink,
  CHANNEL: initChannelLink,
  SCRAP: initScrapLink,
};

async function initLink(p: VaultAdapter): Promise<void> {
  installNavigationHandoff(p);
  const handler = LINK_HANDLERS[p.href.mode];
  if (handler) {
    await handler(p);
  } else {
    p.resetArticleList();
  }
}

// ── Article Activation ─────────────────────────────────

async function activateArticleLink(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  const currentPath = articlePath(p.href.channelId, articleId);
  p.articleList = compactNavigationArticles(
    p.articleList,
    currentPath,
    p.lastActiveIndex,
    p.seriesChannels,
    p.isSeriesMode && (p.isScrapMode || p.seriesChannels.length === 0),
  );
  const findCurrentIndex = () =>
    findArticleIndex(p.articleList, currentPath, p.lastActiveIndex);
  p.activeIndex = findCurrentIndex();
  if (p.articleList.length === 0) {
    const isCurrent = captureArticleSession(p);
    startBackgroundLoad(p, async () => {
      await fetchFirstBatch(p, articleId);
      if (isCurrent()) p.activeIndex = findCurrentIndex();
    });
    return;
  }

  // Pre-fetch next page when nearing the end of the list
  let remaining = 0;
  const skipVisited = p.skipVisitedArticles;
  for (let index = p.activeIndex + 1; index < p.articleList.length; index++) {
    const path = p.articleList[index]!;
    if (path === currentPath || (skipVisited && p.reading.hasVisited(path)))
      continue;
    if (++remaining === 3) break;
  }
  const needsMoreArticles = remaining < 3;
  if (needsMoreArticles) {
    const loadMore = () =>
      p.isSeriesMode
        ? loadMoreHomeSeriesArticles(p)
        : fetchFirstBatch(p, articleId);
    // Navigation is unlocked by the Swiper subscription when links arrive.
    startBackgroundLoad(p, loadMore);
  }
}

const backgroundLoads = new WeakMap<
  VaultAdapter,
  {
    isCurrent: () => boolean;
    request: Promise<void>;
  }
>();

function startBackgroundLoad(p: VaultAdapter, load: () => Promise<void>): void {
  void getArticleLoad(p, load).catch((error) => {
    console.error('[RuliFeed] Background article load failed:', error);
  });
}

function getArticleLoad(
  p: VaultAdapter,
  load: () => Promise<void>,
): Promise<void> {
  const pending = backgroundLoads.get(p);
  if (pending?.isCurrent()) {
    return pending.request;
  }
  const isCurrent = captureArticleSession(p);
  const request = load().finally(() => {
    if (backgroundLoads.get(p)?.request === request) backgroundLoads.delete(p);
    if (isCurrent()) {
      if (p.articleFilterConfig[p.href.channelId]?.onlyBest)
        filterLink(p, true);
      p.flushSave();
    }
  });
  backgroundLoads.set(p, {
    isCurrent,
    request,
  });
  return request;
}

// ── Scrap Series ───────────────────────────────────────

async function initEnableScrapSeries(p: VaultAdapter): Promise<void> {
  const previous = captureNavigationState(p);
  parseSearchQuery(p);
  const articleKey = p.articleKey || createArticleKey();
  setTabArticleKey(articleKey);
  p.updateState({
    articleKey,
    href: { ...p.href, articleKey },
    isSeriesMode: true,
    isScrapMode: true,
    seriesChannels: [],
  });

  const isCurrent = captureArticleSession(p);
  try {
    await fetchAllBatches(p, p.href.articleId);
  } catch (error) {
    if (isCurrent()) {
      try {
        await restoreNavigationState(p, previous);
      } catch (recovery) {
        console.error(
          '[RuliFeed] Scrap recovery persistence failed:',
          recovery,
        );
      }
    }
    throw error;
  }
}

/** Refill the feed after changing which visited articles are skipped. */
function refreshUnvisitedNavigation(p: VaultAdapter): void {
  if (p.isCurrentMode('ARTICLE')) {
    void activateArticleLink(p, p.href.articleId);
  } else if (p.isCurrentMode('CHANNEL') && !p.isNextPageActive()) {
    startBackgroundLoad(p, () => fetchFirstBatch(p, p.href.articleId));
  }
}

export {
  initLink,
  activateArticleLink,
  initEnableScrapSeries,
  refreshUnvisitedNavigation,
};
