import $ from 'jquery';

import type { Param } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

import { filterLink, parseSearchQuery } from '@/feature';
import { initFetchArticle } from '@/feature/article';
import { ArcaFeed } from '@/core';

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

function initArticleLinkChannel({ v, c }: Param): Param | PromiseFunc {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, v, c);

  if (filteredLinks.length === 0) {
    return initFetchArticle(v.href.articleId);
  }

  c.articleList = filteredLinks;
  v.nextArticleUrl = filteredLinks[0] || '';
  v.prevArticleUrl = '';

  return { v, c };
}

function initArticleLinkActive(articleId: string): PromiseFunc {
  const result = ({ v, c }: Param): PromiseFuncResult => {
    if (c.articleList.length === 0) {
      return initFetchArticle(articleId);
    }

    const currentArticleIndex = c.articleList.findIndex((ele: string) =>
      ele.includes(articleId),
    );

    ArcaFeed.log(`Current Article Id: ${articleId}`);
    ArcaFeed.log(`Current Article Index: ${currentArticleIndex}`);

    if (currentArticleIndex === -1) {
      c.articleList.push(window.location.href);
      c.articleList = c.articleList.sort().reverse();
      return [{ v, c }, initFetchArticle(articleId)];
    }

    v.nextArticleUrl = null;
    v.prevArticleUrl = c.articleList[currentArticleIndex - 1] || 'none';

    if (c.articleList.length - currentArticleIndex > 1) {
      v.nextArticleUrl = c.articleList[currentArticleIndex + 1] || '';
      return { v, c };
    } else {
      return [{ v, c }, initFetchArticle(articleId)];
    }
  };
  return Object.defineProperty(result, 'name', {
    value: `initArticleLinkActive`,
  });
}

export { initLink, initArticleLinkActive };
