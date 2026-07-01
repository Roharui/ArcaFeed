import { initFetchArticle, filterLink, parseSearchQuery } from '@/feature';
import { sleep } from '@/utils';

import type { Vault } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

// ===

function initLink(p: Vault): PromiseFuncResult {
  if (p.isCurrentMode('ARTICLE')) {
    filterLink(p, true);

    return initArticleLinkActive(p.href.articleId);
  }

  if (p.isCurrentMode('CHANNEL', 'SCRAP')) {
    p.resetArticleList();

    return [p, parseSearchQuery, initLinkChannel];
  }

  p.resetArticleList();

  return p;
}

async function initLinkChannel(p: Vault): Promise<PromiseFuncResult> {
  if (p.isCurrentMode('SCRAP')) {
    return p;
  }

  const filteredLinks = filterLink(p, true);

  if (filteredLinks.length === 0) {
    return initFetchArticle(p.href.articleId);
  }

  p.articleList = filteredLinks;

  return p;
}

async function initEnableScrapSeries(p: Vault): Promise<PromiseFuncResult> {
  if (!p.articleKey) {
    const nextArticleKey = createArticleKey();
    p.articleKey = nextArticleKey;
    p.href.articleKey = nextArticleKey;
  }

  parseSearchQuery(p);
  p.searchQuery = appendArticleKeyToSearchQuery(p.searchQuery, p.articleKey);
  p.isSeriesMode = true;

  return initFetchArticle(p.href.articleId);
}

function createArticleKey(): string {
  return (
    window.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) ||
    Math.random().toString(36).slice(2, 10)
  );
}

function appendArticleKeyToSearchQuery(searchQuery: string, articleKey: string): string {
  if (!articleKey) {
    return searchQuery;
  }

  const searchParams = new URLSearchParams(
    searchQuery.startsWith('?') ? searchQuery.slice(1) : searchQuery,
  );

  searchParams.set('articleKey', articleKey);

  const normalizedSearch = searchParams.toString();

  return normalizedSearch ? `?${normalizedSearch}` : '';
}

function initArticleLinkActive(articleId: string): PromiseFunc {
  return function articleLinkActive(p: Vault): PromiseFuncResult {
    p.activeIndex = 0;

    if (p.articleList.length === 0) {
      return [p, initFetchArticle(articleId)];
    }

    p.activeIndex = p.articleList.findIndex((ele: string) =>
      ele.includes(articleId),
    );

    console.log(`Current Article Id: ${articleId}`);
    console.log(`Current Article Index: ${p.activeIndex}`);

    if (p.activeIndex === -1) {
      return [p, initFetchArticle(articleId)];
    }

    if (p.articleList.length - p.activeIndex <= 1) {
      if (p.isSeriesMode) {
        return p;
      }

      return [p, initFetchArticle(articleId)];
    }

    return p;
  };
}

export { initLink, initArticleLinkActive, initEnableScrapSeries };
