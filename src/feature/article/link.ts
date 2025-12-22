import $ from 'jquery';

import type { Param } from '@/vault';
import type { PromiseFunc, PromiseFuncResult } from '@/types';

import { getCurrentSlide, filterLink, parseSearchQuery } from '@/feature';
import { initFetchArticle } from '@/feature/article';
import { wrapperFunction } from '@/utils';

const initLink = wrapperFunction(['HREF'], initLinkFeature);

const initArticleLinkActive = wrapperFunction(
  ['SLIDE'],
  initArticleLinkActiveFeature,
);

// ===

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

function initArticleLinkChannel({ v, c }: Param): Param | PromiseFunc {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, v, c);

  if (filteredLinks.length === 0) {
    return initFetchArticle;
  }

  c.articleList = filteredLinks;
  v.nextArticleUrl = filteredLinks[0] || '';
  v.prevArticleUrl = '';

  return { v, c };
}

function initArticleLinkActiveFeature({ v, c }: Param): PromiseFuncResult {
  let { href } = v;

  const $html = $(v.currentSlide || getCurrentSlide(v)) || $('.root-container');

  if (c.articleList.length === 0) {
    return initFetchArticle;
  }

  const currentArticleId =
    $html.attr('data-article-id')?.trim() || href.articleId;

  let currentArticleIndex = c.articleList.findIndex((ele: string) =>
    ele.includes(currentArticleId),
  );

  if (currentArticleIndex === -1) {
    c.articleList.push(window.location.href);
    c.articleList = c.articleList.sort().reverse();
    return [{ v, c }, initFetchArticle];
  }

  v.prevArticleUrl = c.articleList[currentArticleIndex - 1] || 'none';

  if (c.articleList.length - currentArticleIndex > 1) {
    v.nextArticleUrl = c.articleList[currentArticleIndex + 1] || '';
    return { v, c };
  } else {
    return [{ v, c }, initFetchArticle];
  }

  // TODO: 시리즈 활성화 상태일 경우 fetch를 통해 게시글 목록 가져오지 않도록 만들기
  // nextArticleUrl, prevArticleUrl을 가져오는 부분 추가 함수로 분할하기

  // href = { ...href, articleId: currentArticleId };
  // v.href = href;

  // const promiseFuncList = [];

  // if (currentArticleIndex === c.articleList.length - 1) {
  //   v.prevArticleUrl = articleList[currentArticleIndex - 1] || '';

  //   promiseFuncList.push(initFetchArticle);
  // }

  // return [{ v, c }, ...promiseFuncList];
}

export { initLink, initArticleLinkActive, initArticleLinkChannel };
