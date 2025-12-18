// vault, promise, page

import $ from 'jquery'

import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';

import type { SwiperOptions } from '@swiper/types';
import type { Param } from '@/vault';

import { parseContent } from '@/utils';
import { setCurrentSlide } from './slide';

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

function initSwiper({ v }: Param) {
  if (!v.isCurrentMode('ARTICLE')) return;

  return [
    initArticleToSlide,
    initSwiperObject,
    setCurrentSlide,
  ]
}

function initSwiperObject({ v }: Param) {
  v.swiper = new Swiper('.swiper', swiperOptions);

  v.swiper.on('update', () => v.updateFn());

  return {
    v
  } as Param;
}

function initArticleToSlide({ v }: Param) {
  const { articleId } = v.href;

  const $body = $('body');
  const $swiper = $('<div>', { class: 'swiper' }).appendTo($body);
  $('<div>', { class: 'swiper-wrapper' }).appendTo($swiper);

  const slide = $('<div>', { class: 'swiper-slide' });

  slide.attr('data-article-id', articleId);
  slide.attr('data-article-href', window.location.pathname);
  slide.attr('data-article-title', document.title);

  const html = $body.html();
  const content = $(parseContent(html));

  $(".root-container").remove();

  content.appendTo(slide);

  slide.appendTo($(".swiper-wrapper"));
}

export { initSwiper, initSwiperObject, initArticleToSlide }
