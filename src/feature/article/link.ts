import {
  fetchFirstBatch,
  fetchAllBatches,
  filterLink,
  parseSearchQuery,
} from '@/feature';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';

import type { VaultAdapter } from '@/vault';

// ── Link Initialization ────────────────────────────────

async function initArticleLink(p: VaultAdapter): Promise<void> {
  filterLink(p, true);
  await activateArticleLink(p, p.href.articleId);
}

async function initChannelLink(p: VaultAdapter): Promise<void> {
  p.resetArticleList();
  parseSearchQuery(p);

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
    return;
  }

  p.activeIndex = p.articleList.findIndex((link) => link.includes(articleId));

  console.log(`Current Article Id: ${articleId}`);
  console.log(`Current Article Index: ${p.activeIndex}`);

  if (p.activeIndex === -1) {
    await fetchFirstBatch(p, articleId);
    return;
  }

  // Pre-fetch next page when nearing the end of the list
  const needsMoreArticles = p.articleList.length - p.activeIndex <= 1;
  if (needsMoreArticles && !p.isSeriesMode) {
    await fetchFirstBatch(p, articleId);
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

export { initLink, activateArticleLink, initEnableScrapSeries };
