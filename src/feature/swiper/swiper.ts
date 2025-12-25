// vault, promise, page

import $ from 'jquery';

import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';

import type { SwiperOptions } from '@swiper/types';
import type { Param } from '@/vault';

import { ArcaFeed } from '@/core';

const swiperOptions: SwiperOptions = {
  initialSlide: 1,
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

// ===

function initSwiper({ v }: Param) {
  if (!v.isCurrentMode('ARTICLE')) return;

  const swiper = `<div class="swiper">
  <div class="swiper-wrapper">
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div><div class="loading-info"></div></div></div>
  <div class="swiper-slide slide-active"></div>
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div><div class="loading-info"></div></div></div>
  </div>
  </div>`;

  const container = document.body;
  container.insertAdjacentHTML('beforeend', swiper);

  $('.root-container').appendTo('.slide-active');

  v.swiper = new Swiper('.swiper', swiperOptions);

  v.swiper.on('slideNextTransitionEnd', () =>
    ArcaFeed.runEvent('renderNextPage'),
  );
  v.swiper.on('slidePrevTransitionEnd', () =>
    ArcaFeed.runEvent('renderPrevPage'),
  );

  return {
    v,
  } as Param;
}

export { initSwiper };
