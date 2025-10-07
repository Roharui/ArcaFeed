// hider, regex, slide, link, hider

import $ from 'jquery'

import { Helper } from '@/core';

import { getCurrentSlide } from '@/feature';
import { addNewEmptySlidePromise, focusCurrentSlide, removeSlidePromise, setCurrentSlide } from '@/feature/swiper';
import { initArticleLinkActive } from '@/feature/article';

import type { PageMode, PromiseFunc } from "@/types";
import type { Param } from "@/vault";

import { checkNotNull, isString, fetchUrl, sleep, getArticleId, getCurrentHTMLTitle, parseContent } from "@/utils";

// Init
function initPage({ v }: Param): void {
  if (!v.isCurrentMode('ARTICLE')) return;

  const { swiper: _swiper } = v;
  const swiper = checkNotNull(_swiper);

  swiper.on('slideNextTransitionEnd', () => Helper.runPromise(toLink('NEXT')));
  swiper.on('slidePrevTransitionEnd', () => Helper.runPromise(toLink('PREV')));
}

// For Event
function nextLinkForce({ v }: Param) {
  if (!isString(v.nextArticleUrl)) {
    throw Error("No Next Article Url")
  }
  window.location.href = v.nextArticleUrl;
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return ({ v, c }: Param): void | PromiseFunc => {
    const { nextArticleUrl, prevArticleUrl } = v;
    const url = mode === 'NEXT' ? nextArticleUrl : prevArticleUrl;

    if (!isString(url)) {
      console.log("No url at toLink")
      return;
    }

    if (c.isSlideMode('REFRESH'))
      window.location.replace(url);
    else return pageRender(mode);
  }
}

function pageRender(mode: PageMode): PromiseFunc {
  return ({ v }: Param): PromiseFunc[] => {
    if (!v.swiper) {
      console.log("No Swiper Init")
      return [];
    }

    const { swiper } = v;
    const { slides, activeIndex } = swiper;

    const promiseList: PromiseFunc[] = [];

    promiseList.push(setCurrentSlide);

    if (
      (mode === 'PREV' && activeIndex === 0) ||
      (mode === 'NEXT' && activeIndex === slides.length - 1)
    ) {
      promiseList.push(() => swiper.disable());
      promiseList.push(() => { swiper.allowTouchMove = false; return; });
      promiseList.push(alertPageIsFetching(mode));
      promiseList.push(linkPageRender(mode));
      promiseList.push(showCurrentSlide);
      promiseList.push(() => swiper.enable());
      promiseList.push(removeSlidePromise(mode));
      promiseList.push(addNewEmptySlidePromise(mode));
      promiseList.push(() => { swiper.allowTouchMove = true; return; });
    }
    promiseList.push(setCurrentArticle);
    promiseList.push(focusCurrentSlide);

    promiseList.push(initArticleLinkActive);

    return promiseList;
  }
}

function alertPageIsFetching(mode: PageMode) {
  return ({ v }: Param) => {
    $(v.currentSlide || getCurrentSlide(v))
      .find('.loading-info')
      .append(
        $('<div>').text(
          `${mode === 'NEXT' ? '다음' : '이전'} 글 불러오는 중...`,
        ),
      );
  }
}

function setCurrentArticle({ v }: Param) {
  const currentSlide = $(v.currentSlide || getCurrentSlide(v))

  const currentArticleUrl = currentSlide.attr('data-article-href');
  const currentArticleTitle = checkNotNull(currentSlide.attr('data-article-title'));

  document.title = currentArticleTitle;
  window.history.pushState({}, currentArticleTitle, currentArticleUrl);
}

function showCurrentSlide({ v }: Param) {
  const currentSlide = $(v.currentSlide || getCurrentSlide(v))
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

    const url = checkNotNull(mode === 'NEXT' ? nextArticleUrl : prevArticleUrl)

    while (!res) {
      res = await fetchUrl(url);

      if (!res) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetch failed, no loop for development mode');
          return;
        }

        $(getCurrentSlide(v))
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

    const currentSlide = $(v.currentSlide || getCurrentSlide(v))

    currentSlide.append($article);

    currentSlide.attr('data-article-id', currentArticleId);
    currentSlide.attr('data-article-href', url);
    currentSlide.attr('data-article-title', title);
  }
}

export { initPage, nextLinkForce, toLink }
