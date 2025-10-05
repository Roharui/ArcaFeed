
import $ from 'jquery';

import type { Param } from '@/vault';

import { getCurrentSlide } from '../current';
import type { PromiseFunc } from '@/types';
import { filterLink } from '../filter';
import { fetchFromCurrentSlide } from './fetch';
import { parseSearchQuery } from '../search';


function initLink({ v }: Param): PromiseFunc[] {
  const promiseFuncList = []

  if (v.isCurrentMode('CHANNEL')) {
    promiseFuncList.push(({ c }: Param) => c.resetArticleList());
    promiseFuncList.push(parseSearchQuery);
    promiseFuncList.push(initArticleLinkChannel);
  }
  if (v.isCurrentMode('ARTICLE')) {
    promiseFuncList.push(initArticleLinkActive);
  }

  return promiseFuncList;
}

function initArticleLinkChannel({ v, c }: Param): Param | void {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, v, c);


  if (filteredLinks.length === 0) {
    return;
  }

  c.articleList = filteredLinks;
  v.nextArticleUrl = filteredLinks[0] || '';

  return { v, c }
}

function initArticleLinkActive({ v, c }: Param): PromiseFunc[] | void | Param {
  let { href } = v;
  const { articleList } = c;

  const $html = $(v.currentSlide || getCurrentSlide(v)) || $('.root-container');

  if (c.articleList.length === 0) {
    return;
  }

  const currentArticleId =
    $html.attr('data-article-id')?.trim() || href.articleId;

  let currentArticleIndex = c.articleList.findIndex((ele: string) =>
    ele.includes(currentArticleId),
  );

  if (currentArticleIndex === -1) {
    return;
  }

  if (
    c.articleList.length > 0 &&
    currentArticleIndex >= 0 &&
    currentArticleIndex !== c.articleList.length - 1 &&
    currentArticleIndex !== 0
  ) {
    v.nextArticleUrl =
      c.articleList[currentArticleIndex + 1] || null;
    v.prevArticleUrl =
      c.articleList[currentArticleIndex - 1] || null;

    return { v, c };
  }

  href = { ...href, articleId: currentArticleId };
  v.href = href;

  if (currentArticleIndex === c.articleList.length - 1) {
    v.nextArticleUrl = null;
    v.prevArticleUrl = articleList[currentArticleIndex - 1] || null;

    return [() => ({ v, c }), fetchFromCurrentSlide('NEXT')]
  } else if (currentArticleIndex === 0) {
    v.prevArticleUrl = null;
    v.nextArticleUrl = articleList[currentArticleIndex + 1] || null;

    return [() => ({ v, c }), fetchFromCurrentSlide('PREV')]
  }

  return { v, c };
}

export { initLink, initArticleLinkActive, initArticleLinkChannel };
