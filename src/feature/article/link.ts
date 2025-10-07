
import $ from 'jquery';

import type { Param } from '@/vault';
import type { PromiseFunc } from '@/types';

import { getCurrentSlide, filterLink, parseSearchQuery } from '@/feature';
import { fetchArticle } from '@/feature/article';

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

function initArticleLinkChannel({ v, c }: Param): Param | PromiseFunc {
  const totalLinks = $(
    'div.article-list > div.list-table.table > a.vrow.column',
  ).not('.notice');

  const filteredLinks = filterLink(totalLinks, v, c);

  if (filteredLinks.length === 0) {
    return fetchArticle('NEXT');
  }

  c.articleList = filteredLinks;
  v.nextArticleUrl = filteredLinks[0] || '';

  return { v, c }
}

function initArticleLinkActive({ v, c }: Param): Param | PromiseFunc | PromiseFunc[] {
  let { href } = v;
  const { articleList } = c;

  const $html = $(v.currentSlide || getCurrentSlide(v)) || $('.root-container');

  if (c.articleList.length === 0) {
    return fetchArticle('NEXT');
  }

  const currentArticleId =
    $html.attr('data-article-id')?.trim() || href.articleId;

  let currentArticleIndex = c.articleList.findIndex((ele: string) =>
    ele.includes(currentArticleId),
  );

  if (currentArticleIndex === -1) {
    c.articleList.push(window.location.href);
    c.articleList = c.articleList.sort().reverse();
    return [() => ({ v, c }), fetchArticle('NEXT')]
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

  // TODO: 시리즈 활성화 상태일 경우 fetch를 통해 게시글 목록 가져오지 않도록 만들기
  // nextArticleUrl, prevArticleUrl을 가져오는 부분 추가 함수로 분할하기

  href = { ...href, articleId: currentArticleId };
  v.href = href;

  const promiseFuncList = [];

  if (currentArticleIndex === c.articleList.length - 1) {
    v.prevArticleUrl = articleList[currentArticleIndex - 1] || null;

    promiseFuncList.push(fetchArticle('NEXT'));
  }
  if (currentArticleIndex === 0) {
    v.nextArticleUrl = articleList[currentArticleIndex + 1] || null;

    promiseFuncList.push(fetchArticle('PREV'));
  }

  promiseFuncList.unshift(() => ({ v, c }))

  return promiseFuncList;
}

export { initLink, initArticleLinkActive, initArticleLinkChannel };
