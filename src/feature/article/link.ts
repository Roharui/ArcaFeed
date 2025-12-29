import { initFetchArticle, filterLink, parseSearchQuery } from '@/feature';

import type { Vault } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

// ===

function initLink(p: Vault): PromiseFuncResult {
  if (p.isCurrentMode('ARTICLE')) {
    filterLink(p, true);

    if (p.isSeriesMode()) return initArticleSeriesLink(p.href.articleId);

    return initArticleLinkActive(p.href.articleId);
  }

  p.resetArticleList();

  if (p.isCurrentMode('CHANNEL')) {
    return [p, parseSearchQuery, initLinkChannel];
  }

  return p;
}

function initLinkChannel(p: Vault): PromiseFuncResult {
  const filteredLinks = filterLink(p, true);

  if (filteredLinks.length === 0) {
    return initFetchArticle(p.href.articleId);
  }

  p.articleList = filteredLinks;

  return p;
}

function initArticleSeriesLink(articleId: string): PromiseFunc {
  return function initSeriesLink(p: Vault) {
    p.seriesIndex = p.seriesList.findIndex((ele: string) =>
      ele.includes(articleId),
    );

    return p;
  };
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
      return [p, initFetchArticle(articleId)];
    }

    return p;
  };
}

export { initLink, initArticleLinkActive };
