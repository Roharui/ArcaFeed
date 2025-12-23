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
} from '@/utils';

import type { PageMode, PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param, VaultFull } from '@/vault';

// For Event
function nextLinkForce({ v }: Param) {
  window.location.href = (v as { nextArticleUrl: string }).nextArticleUrl;
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return ({ v, c }: Param): PromiseFuncResult => {
    const { nextArticleUrl, prevArticleUrl } = v as VaultFull;

    if (c.isSlideMode('RENDER') && mode === 'PREV') return;
    if (c.isSlideMode('RENDER') && mode === 'NEXT')
      return [linkPageRender, renderPage];

    window.location.replace(mode === 'NEXT' ? nextArticleUrl : prevArticleUrl);
  };
}

function renderPage({ v }: Param) {
  const { nextRenderSlide } = v as VaultFull;

  if (typeof nextRenderSlide !== 'undefined') {
    getCurrentSlide(v).then((currentSlide) => {
      if (!currentSlide.className.includes('slide-empty')) return;

      ArcaFeed.log('Rendering slide...');

      currentSlide.replaceWith(nextRenderSlide);
      nextRenderSlide.focus();
    });
  }
}

// 로직 정리
async function linkPageRender({ v }: Param) {
  let res;

  const { swiper, nextArticleUrl: url } = v as VaultFull;

  if (swiper.slides.length - swiper.activeIndex > 2) {
    return;
  }

  while (!res) {
    res = await fetchUrl(url);

    if (!res) {
      ArcaFeed.log('Fetch failed, no loop for development mode');
      if (ArcaFeed.isDev()) return;

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

  $newSlide.find('.loader-container').remove();
  $newSlide.removeClass('slide-empty');

  v.nextRenderSlide = $newSlide.get(0);

  return [
    { v } as Param,
    addNewEmptySlidePromise('NEXT'),
    initArticleLinkActive(currentArticleId),
  ];
}

export { nextLinkForce, toLink, linkPageRender };
