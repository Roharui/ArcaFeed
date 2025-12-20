// hider, regex, slide, link, hider

import $ from 'jquery';

import { ArcaFeed } from '@/core';

import { buttonAtSlide, getCurrentSlide, initSeriesContent } from '@/feature';
import {
  addNewEmptySlide,
  addNewEmptySlideAndGetSlide,
  addNewEmptySlidePromise,
  initFocusCurrentSlide,
  removeSlidePromise,
  setCurrentSlide,
} from '@/feature/swiper';
import { initArticleLinkActive } from '@/feature/article';

import type { PageMode, PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param, Vault, VaultWithSwiper } from '@/vault';

import {
  checkNotNull,
  isString,
  fetchUrl,
  sleep,
  getArticleId,
  getCurrentHTMLTitle,
  parseContent,
  wrapperFunction,
  getFirstArrayItem,
} from '@/utils';

const initPage = wrapperFunction(['ARTICLE', 'SWIPER'], initPageFeature);

const nextLinkForce = wrapperFunction(['NEXTURL'], nextLinkForceFeature);

const toNextLink = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'NEXTURL'],
  toLinkFeature('NEXT'),
);
const toPrevLink = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'PREVURL'],
  toLinkFeature('PREV'),
);

// Init
function initPageFeature({ v }: Param): void {
  if (!v.isCurrentMode('ARTICLE')) return;

  const { swiper } = v as VaultWithSwiper;

  swiper.on('slideNextTransitionEnd', () =>
    ArcaFeed.runEvent('renderNextPage'),
  );
  swiper.on('slidePrevTransitionEnd', () =>
    ArcaFeed.runEvent('renderPrevPage'),
  );
}

function toLinkFeature(mode: PageMode): PromiseFunc {
  const result = ({ v, c }: Param): void | PromiseFunc => {
    const { nextArticleUrlList, prevArticleUrlList } = v;

    const url = getFirstArrayItem(
      mode === 'NEXT' ? nextArticleUrlList : prevArticleUrlList,
    );

    if (c.isSlideMode('REFRESH')) {
      window.location.replace(url);
      return;
    } else {
      if (mode === 'PREV') return;
      return initPageRenderFeature(mode);
    }
  };

  return Object.defineProperty(result, 'name', {
    value: `toLinkFeature_${mode}`,
  });
}

// For Event
function nextLinkForceFeature({ v }: Param) {
  window.location.href = getFirstArrayItem(v.nextArticleUrlList);
}

function initPageRenderFeature(mode: PageMode): PromiseFunc {
  const result = ({ v }: Param): PromiseFuncResult => {
    v.currentSlide = getCurrentSlide(v);

    return [{ v } as Param, initFocusCurrentSlide, alertPageIsFetching(mode)];
  };
  return Object.defineProperty(result, 'name', {
    value: `initPageRenderFeature_${mode}`,
  });
}

function alertPageIsFetching(mode: PageMode) {
  const result = async ({ v }: Param) => {
    const { swiper, currentSlide } = v as VaultWithSwiper;
    const { activeIndex } = swiper;

    const $currentSlide = $(currentSlide);

    const urlList =
      mode === 'NEXT' ? v.nextArticleUrlList : v.prevArticleUrlList;

    $currentSlide
      .find('.loading-info')
      .append(
        $('<div>').text(
          `${mode === 'NEXT' ? '다음' : '이전'} 글 불러오는 중...`,
        ),
      );

    const resultsFunc = urlList.map((url, i) =>
      linkPageRender(mode, url, activeIndex + i),
    );

    resultsFunc.push(() => [setCurrentArticle, initArticleLinkActive]);

    return resultsFunc;
  };
  return Object.defineProperty(result, 'name', {
    value: `alertPageIsFetching_${mode}`,
  });
}

// 로직 정리
// 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
// 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
// 3. 블러온 글에 대한 hider 처리 진행
// 4. 슬라이드 갱신
function linkPageRender(mode: PageMode, url: string, idx: number): PromiseFunc {
  const result = async ({ v }: Param) => {
    let res;
    let currentSlide = await addNewEmptySlideAndGetSlide(
      mode,
      idx,
    )({ v } as Param);

    const $currentSlide = $(currentSlide);

    if (!$currentSlide.hasClass('slide-empty')) {
      return;
    }

    while (!res) {
      res = await fetchUrl(url);

      if (!res) {
        ArcaFeed.log('Fetch failed, no loop for development mode');
        if (ArcaFeed.isDev()) return;

        $currentSlide
          .find('.loading-info')
          .append($('<div>').text('글 불러오기 실패'));

        await sleep(5000);
        continue;
      }
    }

    const content = parseContent(res.responseText);
    const title = getCurrentHTMLTitle(res.responseText);

    const $article = $(content);

    const currentArticleId = getArticleId(url);

    $currentSlide.append($article);

    buttonAtSlide($currentSlide);

    $currentSlide.attr('data-article-id', currentArticleId);
    $currentSlide.attr('data-article-href', url);
    $currentSlide.attr('data-article-title', title);

    $currentSlide.find('.loader-container').remove();
    $currentSlide.removeClass('slide-empty');
  };

  return Object.defineProperty(result, 'name', {
    value: `linkPageRender_${mode}`,
  });
}

function setCurrentArticle({ v }: Param) {
  const currentSlide = $((v as VaultWithSwiper).currentSlide);

  const currentArticleUrl = currentSlide.attr('data-article-href');
  const currentArticleTitle = checkNotNull(
    currentSlide.attr('data-article-title'),
  );

  document.title = currentArticleTitle;
  window.history.pushState({}, currentArticleTitle, currentArticleUrl);
}

export { initPage, nextLinkForce, toNextLink, toPrevLink };
