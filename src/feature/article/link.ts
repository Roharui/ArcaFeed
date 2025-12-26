import $ from 'jquery';

import { initFetchArticle, filterLink, parseSearchQuery } from '@/feature';

import type { Param } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

// ===

function initLink({ v, c }: Param): PromiseFuncResult {
  if (v.isCurrentMode('ARTICLE')) {
    return initArticleLinkActive(v.href.articleId);
  }

  c.resetArticleList();

  if (v.isCurrentMode('CHANNEL')) {
    return [{ v, c } as Param, parseSearchQuery, initArticleLinkChannel];
  }

  return { v, c } as Param;
}

function initArticleLinkChannel({ v, c }: Param): PromiseFuncResult {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, v, c);

  if (filteredLinks.length === 0) {
    return initFetchArticle(v.href.articleId);
  }

  c.articleList = filteredLinks;

  return { v, c };
}

function initArticleLinkActive(articleId: string): PromiseFunc {
  return function articleLinkActive({ v, c }: Param): PromiseFuncResult {
    v.activeIndex = 0;

    if (c.articleList.length === 0) {
      return [{ v, c }, initFetchArticle(articleId)];
    }

    v.activeIndex = c.articleList.findIndex((ele: string) =>
      ele.includes(articleId),
    );

    console.log(`Current Article Id: ${articleId}`);
    console.log(`Current Article Index: ${v.activeIndex}`);

    if (v.activeIndex === -1) {
      c.articleList.push(window.location.href);
      return [{ v, c }, initFetchArticle(articleId)];
    }

    if (c.articleList.length - v.activeIndex <= 1) {
      return [{ v, c }, initFetchArticle(articleId)];
    }

    return { v, c };
  };
}

export { initLink, initArticleLinkActive };
