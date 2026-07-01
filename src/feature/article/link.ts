import { fetchArticle, filterLink, parseSearchQuery } from '@/feature';
import { createArticleKey } from '@/utils/article-key';
import { appendSearchParam } from '@/utils/url';

import type { VaultAdapter } from '@/vault';

// ── Link Initialization ────────────────────────────────

async function initLink(p: VaultAdapter): Promise<void> {
  if (p.isCurrentMode('ARTICLE')) {
    filterLink(p, true);
    await activateArticleLink(p, p.href.articleId);
    return;
  }

  if (p.isCurrentMode('CHANNEL', 'SCRAP')) {
    p.resetArticleList();
    parseSearchQuery(p);
    await initLinkChannel(p);
    return;
  }

  p.resetArticleList();
}

async function initLinkChannel(p: VaultAdapter): Promise<void> {
  if (p.isCurrentMode('SCRAP')) return;

  const newLinks = filterLink(p, true);
  if (newLinks.length > 0) {
    p.articleList = newLinks;
  } else {
    await fetchArticle(p, p.href.articleId);
  }
}

// ── Article Activation ─────────────────────────────────

async function activateArticleLink(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  if (p.articleList.length === 0) {
    await fetchArticle(p, articleId);
    return;
  }

  p.activeIndex = p.articleList.findIndex((link) => link.includes(articleId));

  console.log(`Current Article Id: ${articleId}`);
  console.log(`Current Article Index: ${p.activeIndex}`);

  if (p.activeIndex === -1) {
    await fetchArticle(p, articleId);
    return;
  }

  // Pre-fetch next page when nearing the end of the list
  const needsMoreArticles = p.articleList.length - p.activeIndex <= 1;
  if (needsMoreArticles && !p.isSeriesMode) {
    await fetchArticle(p, articleId);
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

  await fetchArticle(p, p.href.articleId);
}

export {
  initLink,
  initLinkChannel,
  activateArticleLink,
  initEnableScrapSeries,
};
