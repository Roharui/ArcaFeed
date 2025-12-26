import $ from 'jquery';

import { initFetchArticle, filterLink, parseSearchQuery } from '@/feature';

import type { Vault } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

// ===

function initLink(p: Vault): PromiseFuncResult {
  if (p.isCurrentMode('ARTICLE') && p.seriesList.length > 0) {
    return initArticleSeriesLink(p.href.articleId);
  }

  if (p.isCurrentMode('ARTICLE')) {
    return initArticleLinkActive(p.href.articleId);
  }

  p.resetArticleList();

  if (p.isCurrentMode('CHANNEL')) {
    return [p, parseSearchQuery, initArticleLinkChannel];
  }

  return p;
}

function initArticleLinkChannel(p: Vault): PromiseFuncResult {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, p, true);

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
      p.articleList.push(window.location.href);
      return [p, initFetchArticle(articleId)];
    }

    if (p.articleList.length - p.activeIndex <= 1) {
      return [p, initFetchArticle(articleId)];
    }

    return p;
  };
}

export { initLink, initArticleLinkActive };
