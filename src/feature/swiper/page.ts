// hider, regex, slide, link, hider

import $ from 'jquery';

import { ArcaFeed } from '@/core';

import { buttonAtSlide, getCurrentSlide, initSeriesContent } from '@/feature';
import {
  addNewEmptySlidePromise,
  removeSlidePromise,
  setCurrentSlide,
} from '@/feature/swiper';
import { initArticleLinkActive } from '@/feature/article';

import type { PageMode, PromiseFunc } from '@/types';
import type { Param, VaultWithSwiper } from '@/vault';

import {
  checkNotNull,
  isString,
  fetchUrl,
  sleep,
  getArticleId,
  getCurrentHTMLTitle,
  parseContent,
  wrapperFunction,
} from '@/utils';

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

const initPage = wrapperFunction(['ARTICLE', 'SWIPER'], initPageFeature);

// For Event
function nextLinkForceFeature({ v }: Param) {
  window.location.href = (v as { nextArticleUrl: string }).nextArticleUrl;
}

const nextLinkForce = wrapperFunction(['NEXTURL'], nextLinkForceFeature);

const toNextLink = wrapperFunction(['NEXTURL'], toLink('NEXT'));
const toPrevLink = wrapperFunction(['PREVURL'], toLink('PREV'));

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return ({ v, c }: Param): void | PromiseFunc => {
    const { nextArticleUrl, prevArticleUrl } = v;
    const url = mode === 'NEXT' ? nextArticleUrl : prevArticleUrl;

    if (c.isSlideMode('REFRESH')) window.location.replace(url || '');
    else return pageRender(mode);
  };
}

// function pageRender(mode: PageMode): PromiseFunc {
//   return ({ v }: Param): PromiseFunc[] => {
//     const { swiper } = v;
//     const { slides, activeIndex } = swiper;

//     const promiseList: PromiseFunc[] = [];

//     promiseList.push(setCurrentSlide);

//     if (
//       (mode === 'PREV' && activeIndex === 0) ||
//       (mode === 'NEXT' && activeIndex === slides.length - 1)
//     ) {
//       promiseList.push(
//         newAllPromise(
//           alertPageIsFetching(mode),
//         ),
//       );
//       promiseList.push(linkPageRender(mode));
//       promiseList.push(
//         newAllPromise(
//           showCurrentSlide,
//           removeSlidePromise(mode),
//           addNewEmptySlidePromise(mode),
//         ),
//       );
//     }
//     promiseList.push(
//       newAllPromise(
//         initArticleLinkActive,
//       ),
//     );
//     promiseList.push(initSeriesContent);

//     return promiseList;
//   };
// }

function alertPageIsFetching(mode: PageMode) {
  return ({ v }: Param) => {
    const currentSlide = $((v as VaultWithSwiper).currentSlide);
    currentSlide
      .find('.loading-info')
      .append(
        $('<div>').text(
          `${mode === 'NEXT' ? '다음' : '이전'} 글 불러오는 중...`,
        ),
      );
  };
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

function showCurrentSlide({ v }: Param) {
  const currentSlide = $((v as VaultWithSwiper).currentSlide);
  currentSlide.find('.loader-container').remove();
  currentSlide.removeClass('slide-empty');
}

// 로직 정리
// 1. 다음 슬라이드가 빈 슬라이드면 다음 글 불러오기
// 2. 다음 글을 불러온 후 빈 슬라이드에 추가 (display: none)
// 3. 블러온 글에 대한 hider 처리 진행
// 4. 슬라이드 갱신
function linkPageRender(mode: PageMode): PromiseFunc {
  return async ({ v }: Param) => {
    let res;

    const { nextArticleUrl, prevArticleUrl } = v;

    const url = checkNotNull(mode === 'NEXT' ? nextArticleUrl : prevArticleUrl);

    while (!res) {
      res = await fetchUrl(url);

      if (!res) {
        ArcaFeed.log('Fetch failed, no loop for development mode');
        if (process.env.NODE_ENV === 'development') {
          return;
        }

        const currentSlide = $(getCurrentSlide(v));
        currentSlide
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

    const $currentSlide = $(v.currentSlide || getCurrentSlide(v));
    const $newSlide = $currentSlide.clone();

    $currentSlide.append($article);

    buttonAtSlide($currentSlide);

    $currentSlide.attr('data-article-id', currentArticleId);
    $currentSlide.attr('data-article-href', url);
    $currentSlide.attr('data-article-title', title);

    $currentSlide.find('.loader-container').remove();
    $currentSlide.removeClass('slide-empty');

    $currentSlide.replaceWith($newSlide);
  };
}

export { initPage, nextLinkForce };
