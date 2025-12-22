// hider, regex, slide, link, hider

import $, { get } from 'jquery';

import { ArcaFeed } from '@/core';

import { buttonAtSlide, getCurrentSlide } from '@/feature';
import { addNewEmptySlidePromise } from '@/feature/swiper';
import { initArticleLinkActive } from '@/feature/article';

import {
  fetchUrl,
  sleep,
  getArticleId,
  getCurrentHTMLTitle,
  parseContent,
  wrapperFunction,
} from '@/utils';

import type { PageMode, PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param, VaultFull } from '@/vault';

// ===

const toNextLink = wrapperFunction(['SWIPER', 'NEXTURL'], toLink('NEXT'));
const toPrevLink = wrapperFunction(['SWIPER', 'PREVURL'], toLink('PREV'));

// ===

// Init
function initPageFeature({ v }: Param): void {
  const { swiper } = v as VaultFull;

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

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return ({ v, c }: Param): PromiseFuncResult => {
    const { nextArticleUrl, prevArticleUrl } = v as VaultFull;

    if (c.isSlideMode('RENDER') && mode === 'PREV') return;
    if (c.isSlideMode('RENDER') && mode === 'NEXT')
      return [renderPage, linkPageRender];

    window.location.replace(mode === 'NEXT' ? nextArticleUrl : prevArticleUrl);
  };
}

const linkPageRender = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'NEXTURL'],
  linkPageRenderFeature,
);

function renderPage({ v }: Param) {
  const { swiper, nextRenderSlide } = v as VaultFull;

  if (typeof nextRenderSlide !== 'undefined') {
    swiper.once('update', () => {
      getCurrentSlide(v).replaceWith(nextRenderSlide);
      getCurrentSlide(v).focus();
    });
  }
}

// 로직 정리
async function linkPageRenderFeature({ v }: Param) {
  let res;

  const { swiper, nextArticleUrl: url } = v as VaultFull;

  if (swiper.slides.length - swiper.activeIndex > 2) {
    return;
  }

  while (!res) {
    res = await fetchUrl(url);

    if (!res) {
      ArcaFeed.log('Fetch failed, no loop for development mode');
      if (process.env.NODE_ENV === 'development') {
        return;
      }

      await sleep(5000);
      continue;
    }
  }

  ArcaFeed.log(url);

  const content = parseContent(res.responseText);
  const title = getCurrentHTMLTitle(res.responseText);
  const currentArticleId = getArticleId(url);

  const $article = $(content);
  const $newSlide = $('<div>', { class: 'swiper-slide' });

  $newSlide.append($article);

  buttonAtSlide($newSlide);

  $newSlide.attr('data-article-href', url);
  $newSlide.attr('data-article-title', title);
  $newSlide.attr('data-article-id', currentArticleId);

  $newSlide.find('.loader-container').remove();
  $newSlide.removeClass('slide-empty');

  v.nextRenderSlide = $newSlide.get(0);

  return [
    { v } as Param,
    addNewEmptySlidePromise('NEXT'),
    initArticleLinkActive(currentArticleId),
  ];
}

export { initPage, nextLinkForce, toNextLink, toPrevLink, linkPageRender };
