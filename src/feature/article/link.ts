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
    p.isSeriesMode = true;
    return initLinkScrap(p);
  }

  const filteredLinks = filterLink(p, true);

  if (filteredLinks.length === 0) {
    return initFetchArticle(p.href.articleId);
  }

  p.articleList = filteredLinks;

  return p;
}

async function initLinkScrap(p: Vault): Promise<PromiseFuncResult> {
  return initFetchArticle(p.href.articleId);
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

export { initLink, initArticleLinkActive };
