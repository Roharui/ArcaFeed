// vault, promise, page

import $ from 'jquery';

import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';

import type { SwiperOptions } from '@swiper/types';
import type { Param } from '@/vault';

import { parseContent, wrapperFunction } from '@/utils';

const swiperOptions: SwiperOptions = {
  slidesPerView: 1,
  loop: false,
  nested: true,
  touchAngle: 20,
  touchRatio: 0.75,
  threshold: 10,
  shortSwipes: false,
  longSwipesMs: 100,
  longSwipesRatio: 0.1,
  touchMoveStopPropagation: true,
  modules: [Manipulation],
};

const initSwiper = wrapperFunction(['ARTICLE'], initSwiperFeature);

// ===

function initSwiperFeature(_: Param) {
  return [initArticleToSlide];
}

function initArticleToSlide({ v }: Param) {
  const { articleId } = v.href;

  const $body = $('body');

  const $swiper = $('<div>', { class: 'swiper' });
  const $swiperWrapper = $('<div>', { class: 'swiper-wrapper' });
  const $slide = $('<div>', { class: 'swiper-slide' });

  $slide.attr('data-article-id', articleId);
  $slide.attr('data-article-href', window.location.pathname);
  $slide.attr('data-article-title', document.title);

  const html = $body.html();
  const $content = $(parseContent(html));

  $content.appendTo($slide);
  $slide.appendTo($swiperWrapper);
  $swiperWrapper.appendTo($swiper);

  $('.root-container').replaceWith($swiper);

  v.swiper = new Swiper('.swiper', swiperOptions);

  return {
    v,
  } as Param;
}

export { initSwiper, initArticleToSlide };
