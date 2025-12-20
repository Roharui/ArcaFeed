import $ from 'jquery';

import type { Param, VaultWithSwiper } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

import { getCurrentSlide, filterLink, parseSearchQuery } from '@/feature';
import { initFetchArticle } from '@/feature/article';
import { wrapperFunction } from '@/utils';
import { ArcaFeed } from '@/core';

function initLinkFeature({ v }: Param): PromiseFunc | PromiseFunc[] {
  const promiseFuncList = [];

  if (v.isCurrentMode('ARTICLE')) {
    return initArticleLinkActive;
  }

  promiseFuncList.push(({ c }: Param) => c.resetArticleList());

  if (v.isCurrentMode('CHANNEL')) {
    promiseFuncList.push(parseSearchQuery, initArticleLinkChannel);
  }

  return promiseFuncList;
}

const initLink = wrapperFunction(['HREF'], initLinkFeature);

function initArticleLinkChannel({ v, c }: Param): Param | PromiseFunc {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, v, c);

  if (filteredLinks.length < 3) {
    return initFetchArticle('NEXT');
  }

  c.articleList = filteredLinks.slice();

  v.nextArticleUrlList = filteredLinks.splice(0, 3);
  v.prevArticleUrlList = [];

  v.nextSearchCompleted = true;
  v.prevSearchCompleted = true;

  return { v, c };
}

function initArticleLinkActiveFeature({ v, c }: Param): PromiseFuncResult {
  let { href, currentSlide } = v as VaultWithSwiper;

  const $html = $(currentSlide);

  if (c.articleList.length === 0) {
    ArcaFeed.log(
      'Article list is empty. Initializing article list from current slide.',
    );
    v.prevArticleUrlList = [];
    v.prevSearchCompleted = true;
    return [{ v, c }, initFetchArticle('NEXT')];
  }

  const currentArticleId =
    $html.attr('data-article-id')?.trim() || href.articleId;

  let currentArticleIndex = c.articleList
    .slice()
    .findIndex((ele: string) => ele.includes(currentArticleId));

  if (currentArticleIndex === -1) {
    ArcaFeed.log(
      `Current article ID ${currentArticleId} not found in article list.`,
    );
    c.articleList = [];
    v.prevArticleUrlList = [];
    v.prevSearchCompleted = true;
    return [{ v, c }, initFetchArticle('NEXT')];
  }

  v.nextArticleUrlList = c.articleList
    .slice()
    .splice(currentArticleIndex + 1, 3);

  v.prevArticleUrlList = c.articleList
    .slice()
    .splice(
      Math.max(0, currentArticleIndex - 3),
      Math.min(3, currentArticleIndex),
    )
    .reverse();

  if (v.nextArticleUrlList.length < 3) {
    ArcaFeed.log(
      `Current article ID ${currentArticleId} not found in article list.`,
    );
    v.prevSearchCompleted = true;
    return [{ v } as Param, initFetchArticle('NEXT')];
  }

  v.nextSearchCompleted = true;
  v.prevSearchCompleted = true;

  return { v } as Param;
}

const initArticleLinkActive = wrapperFunction(
  ['SLIDE'],
  initArticleLinkActiveFeature,
);

export { initLink, initArticleLinkActive, initArticleLinkChannel };
