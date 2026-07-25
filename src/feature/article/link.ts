import {
  fetchAllBatches,
  fetchChannelArticleBatch,
  fetchFirstBatch,
  filterLink,
  hideFetchLoader,
  openScrapSeriesArticle,
  parseSearchQuery,
  showFetchLoader,
} from '@/feature';
import { createArticleKey } from '@/utils/article-key';
import { mapWithConcurrency } from '@/utils/async';
import { extractChannelId, getArticleId } from '@/utils/regex';
import { appendSearchParam } from '@/utils/url';
import { showToast } from '@/utils/toast';

import type { HrefImpl } from '@/types';
import type { VaultAdapter } from '@/vault';

const CHANNEL_FETCH_CONCURRENCY = 4;

function findArticleIndex(
  articleList: readonly string[],
  articleId: string,
): number {
  return articleList.findIndex((url) => getArticleId(url) === articleId);
}

function sortAndDedupeArticleUrls(urls: readonly string[]): string[] {
  return [...new Set(urls)]
    .filter((url) => getArticleId(url) !== '')
    .sort(
      (left, right) =>
        Number.parseInt(getArticleId(right), 10) -
        Number.parseInt(getArticleId(left), 10),
    );
}

async function initArticleLink(p: VaultAdapter): Promise<void> {
  parseSearchQuery(p);
  filterLink(p, true);
  await activateArticleLink(p, p.href.articleId);
}

async function initChannelLink(p: VaultAdapter): Promise<void> {
  p.resetArticleList();
  parseSearchQuery(p);

  const channelFilter = p.articleFilterConfig[p.href.channelId];
  if (channelFilter?.onlyBest) {
    await fetchFirstBatch(p, '');
    return;
  }

  p.articleList = filterLink(p, true);
  if (p.articleList.length === 0) {
    await fetchFirstBatch(p, '');
  }
}

async function initScrapLink(p: VaultAdapter): Promise<void> {
  p.resetArticleList();
  parseSearchQuery(p);
}

const LINK_HANDLERS: Partial<
  Record<HrefImpl['mode'], (p: VaultAdapter) => Promise<void>>
> = {
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

async function activateArticleLink(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  let attemptedRegularFetch = false;
  let loadedMoreHomeSeries = false;

  if (p.articleList.length === 0) {
    if (p.seriesSource === 'home') {
      await loadMoreHomeSeriesArticles(p);
      loadedMoreHomeSeries = true;
    } else if (!p.isSeriesMode) {
      await fetchFirstBatch(p, articleId);
      attemptedRegularFetch = true;
    }
  }

  p.activeIndex = findArticleIndex(p.articleList, articleId);
  if (p.activeIndex === -1 && !attemptedRegularFetch && !p.isSeriesMode) {
    const added = await fetchFirstBatch(p, articleId);
    attemptedRegularFetch = true;
    if (added > 0) {
      p.activeIndex = findArticleIndex(p.articleList, articleId);
    }
  }

  if (p.activeIndex === -1 && articleId) {
    const currentUrl = `/b/${p.href.channelId}/${articleId}`;
    p.articleList = [currentUrl, ...p.articleList];
    p.activeIndex = 0;
  }

  if (p.activeIndex === -1) return;

  const needsMoreArticles = p.articleList.length - p.activeIndex <= 3;
  if (!needsMoreArticles) return;

  if (p.seriesSource === 'home' && !loadedMoreHomeSeries) {
    await loadMoreHomeSeriesArticles(p);
  } else if (!p.isSeriesMode && !attemptedRegularFetch) {
    await fetchFirstBatch(p, articleId);
  }
}

async function initEnableScrapSeries(p: VaultAdapter): Promise<void> {
  if (!p.articleKey) {
    p.articleKey = createArticleKey();
  }

  parseSearchQuery(p);
  p.searchQuery = appendSearchParam(p.searchQuery, 'articleKey', p.articleKey);

  await fetchAllBatches(p, p.href.articleId);
  if (p.articleList.length === 0) return;

  p.seriesSource = 'scrap';
  p.homeSeriesState = {
    channels: [],
    cursors: {},
    exhaustedChannels: [],
  };
  openScrapSeriesArticle(p);
}

function getOldestArticleIds(
  articleList: readonly string[],
): Map<string, number> {
  const oldestByChannel = new Map<string, number>();

  for (const url of articleList) {
    const channelId = extractChannelId(url);
    const articleId = Number.parseInt(getArticleId(url), 10);
    if (!channelId || !Number.isSafeInteger(articleId)) continue;

    const currentOldest = oldestByChannel.get(channelId);
    if (currentOldest === undefined || articleId < currentOldest) {
      oldestByChannel.set(channelId, articleId);
    }
  }

  return oldestByChannel;
}

async function loadMoreHomeSeriesArticles(p: VaultAdapter): Promise<void> {
  if (p.seriesSource !== 'home') return;

  const state = p.homeSeriesState;
  const exhaustedChannels = new Set(state.exhaustedChannels);
  const channels = state.channels.filter(
    (channelId) => !exhaustedChannels.has(channelId),
  );
  if (channels.length === 0) return;

  const oldestByChannel = getOldestArticleIds(p.articleList);
  const existingUrls = new Set(p.articleList);
  const currentUrl = p.articleList[p.activeIndex];
  const cursors = { ...state.cursors };
  let failedChannels = 0;

  showFetchLoader();
  try {
    const batches = await mapWithConcurrency(
      channels,
      CHANNEL_FETCH_CONCURRENCY,
      async (channelId) => {
        try {
          const filter = p.articleFilterConfig[channelId];
          const cursor =
            cursors[channelId] ?? oldestByChannel.get(channelId) ?? 0;
          return {
            channelId,
            batch: await fetchChannelArticleBatch(
              channelId,
              cursor,
              filter,
              existingUrls,
            ),
          };
        } catch (error) {
          failedChannels += 1;
          console.warn(
            `[ArcaFeed] Failed to load more articles from "${channelId}".`,
            error,
          );
          return null;
        }
      },
    );

    const newLinks: string[] = [];
    for (const result of batches) {
      if (!result) continue;
      const { channelId, batch } = result;
      newLinks.push(...batch.links);
      if (batch.cursor > 0) cursors[channelId] = batch.cursor;
      if (batch.exhausted) exhaustedChannels.add(channelId);
    }

    p.homeSeriesState = {
      channels: state.channels,
      cursors,
      exhaustedChannels: [...exhaustedChannels],
    };

    const nextList = sortAndDedupeArticleUrls([...p.articleList, ...newLinks]);
    if (nextList.length > p.articleList.length) {
      p.articleList = nextList;
      if (currentUrl) {
        p.activeIndex = nextList.indexOf(currentUrl);
      }
    }

    if (failedChannels > 0) {
      showToast(`${failedChannels}개 채널을 불러오지 못했습니다.`);
    }
  } finally {
    hideFetchLoader();
  }
}

export {
  activateArticleLink,
  findArticleIndex,
  initEnableScrapSeries,
  initLink,
  loadMoreHomeSeriesArticles,
  sortAndDedupeArticleUrls,
};
