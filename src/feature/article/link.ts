import {
  captureNavigationState,
  restoreNavigationState,
} from '@/feature/navigation';
import { fetchFirstBatch, fetchAllBatches } from './fetch';
import { loadMoreHomeSeriesArticles } from './subscription-feed';
import { filterLink } from '@/feature/filter';
import { parseSearchQuery } from '@/feature/search';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';
import { captureArticleSession } from '@/vault/article-session';
import {
  compactNavigationArticles,
  findArticleIndex,
} from '@/vault/article-window';

import type { VaultAdapter } from '@/vault';

// ── Link Initialization ────────────────────────────────

async function initArticleLink(p: VaultAdapter): Promise<void> {
  parseSearchQuery(p);
  const links = filterLink(p, true);
  if (
    !p.isSeriesMode &&
    p.articleList.length === 0 &&
    links.length > 0 &&
    !p.articleFilterConfig[p.href.channelId]?.onlyBest
  ) {
    p.articleList = links;
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

  p.articleList = newLinks.length > 0 ? newLinks : [];
  if (newLinks.length === 0) {
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
  const currentPath = `/b/${p.href.channelId}/${articleId}`;
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
    console.error('[ArcaFeed] Background article load failed:', error);
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
  p.updateState({
    articleKey,
    href: { ...p.href, articleKey },
    searchQuery: appendSearchParam(p.searchQuery, 'articleKey', articleKey),
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
        restoreNavigationState(p, previous);
      } catch (recovery) {
        console.error(
          '[ArcaFeed] Scrap recovery persistence failed:',
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
