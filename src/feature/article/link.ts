import {
  fetchFirstBatch,
  fetchAllBatches,
  fetchChannelArticlesBefore,
  fetchChannelFirstPage,
  filterLink,
  parseSearchQuery,
  showFetchLoader,
  hideFetchLoader,
} from '@/feature';
import { createArticleKey } from '@/utils/article-key';
import { extractChannelId, getArticleId } from '@/utils/regex';
import { appendSearchParam } from '@/utils/url';

import type { VaultAdapter } from '@/vault';

// ── Link Initialization ────────────────────────────────

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
    await fetchFirstBatch(p, p.href.articleId);
    return;
  }

  const newLinks = filterLink(p, true);
  p.articleList = newLinks.length > 0 ? newLinks : [];
  if (newLinks.length === 0) {
    await fetchFirstBatch(p, p.href.articleId);
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
  if (p.articleList.length === 0) {
    await fetchFirstBatch(p, articleId);
    p.activeIndex = p.articleList.findIndex((link) => link.includes(articleId));
    return;
  }

  p.activeIndex = p.articleList.findIndex((link) => link.includes(articleId));

  console.log(`Current Article Id: ${articleId}`);
  console.log(`Current Article Index: ${p.activeIndex}`);

  if (p.activeIndex === -1) {
    await fetchFirstBatch(p, articleId);
    p.activeIndex = p.articleList.findIndex((link) => link.includes(articleId));
    return;
  }

  // Pre-fetch next page when nearing the end of the list
  const needsMoreArticles = p.articleList.length - p.activeIndex <= 3;
  if (needsMoreArticles && !p.isSeriesMode) {
    await fetchFirstBatch(p, articleId);
  } else if (needsMoreArticles && p.isSeriesMode) {
    await loadMoreHomeSeriesArticles(p);
  }
}

// ── Scrap Series ───────────────────────────────────────

async function initEnableScrapSeries(p: VaultAdapter): Promise<void> {
  if (!p.articleKey) {
    const newKey = createArticleKey();
    p.articleKey = newKey;
    p.href.articleKey = newKey;
  }

  parseSearchQuery(p);
  p.searchQuery = appendSearchParam(p.searchQuery, 'articleKey', p.articleKey);
  p.isSeriesMode = true;

  await fetchAllBatches(p, p.href.articleId);
}

// ── Home Series ─────────────────────────────────────────

async function loadMoreHomeSeriesArticles(p: VaultAdapter): Promise<void> {
  const { homeSeriesChannels } = p.uiSettings;
  if (homeSeriesChannels.length === 0) return;

  const channelCounts = new Map<string, { minId: number; count: number }>();

  for (const url of p.articleList) {
    const chId = extractChannelId(url);
    const artId = parseInt(getArticleId(url));
    if (!chId || isNaN(artId)) continue;

    const entry = channelCounts.get(chId);
    if (!entry) {
      channelCounts.set(chId, { minId: artId, count: 1 });
    } else {
      if (artId < entry.minId) entry.minId = artId;
      entry.count++;
    }
  }

  for (const channelId of homeSeriesChannels) {
    const entry = channelCounts.get(channelId);
    if (!entry || entry.count <= 3) {
      const minId = entry?.minId ?? 0;
      await fetchMoreFromChannel(p, channelId, minId);
    }
  }
}

async function fetchMoreFromChannel(
  p: VaultAdapter,
  channelId: string,
  afterId: number,
): Promise<void> {
  const channelFilter = p.articleFilterConfig[channelId];
  const existingUrls = new Set(p.articleList);

  showFetchLoader();
  try {
    const articles = afterId > 0
      ? await fetchChannelArticlesBefore(channelId, afterId, channelFilter, existingUrls)
      : await fetchChannelFirstPage(channelId, channelFilter);

    if (articles.length === 0) return;

    const combined = [
      ...p.articleList.map((url) => ({
        url,
        articleId: parseInt(getArticleId(url)) || 0,
      })),
      ...articles.map((url) => ({
        url,
        articleId: parseInt(getArticleId(url)) || 0,
      })),
    ];
    combined.sort((a, b) => b.articleId - a.articleId);
    p.articleList = combined.map((a) => a.url);
    p.flushSave();
  } finally {
    hideFetchLoader();
  }
}

export { initLink, activateArticleLink, initEnableScrapSeries };
