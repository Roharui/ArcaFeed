import {
  fetchFirstBatch,
  fetchAllBatches,
  fetchChannelArticles,
  filterLink,
  parseSearchQuery,
  showFetchLoader,
  hideFetchLoader,
} from '@/feature';
import { createArticleKey } from '@/utils/article-key';
import { getArticleId } from '@/utils/regex';
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

  showFetchLoader();
  try {
    const existingUrls = new Set(p.articleList);
    const allArticles: { url: string; articleId: number }[] = [];

    for (const channelId of homeSeriesChannels) {
      const channelFilter = p.articleFilterConfig[channelId];
      const articles = await fetchChannelArticles(channelId, channelFilter, existingUrls);

      for (const url of articles) {
        const articleIdNum = parseInt(getArticleId(url));
        if (!isNaN(articleIdNum)) {
          allArticles.push({ url, articleId: articleIdNum });
          existingUrls.add(url);
        }
      }
    }

    if (allArticles.length === 0) return;

    allArticles.sort((a, b) => b.articleId - a.articleId);
    p.articleList = [...p.articleList, ...allArticles.map((a) => a.url)];
    p.flushSave();
  } finally {
    hideFetchLoader();
  }
}

export { initLink, activateArticleLink, initEnableScrapSeries };
