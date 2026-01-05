// vault, promise, page

import $ from 'jquery';

import '@css/swiper.css';

import Swiper from 'swiper';

import { ArcaFeed } from '@/core';

import type { SwiperOptions } from '@swiper/types';
import type { Vault } from '@/vault';

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
};

// ===

function initSwiper(p: Vault) {
  if (!p.isCurrentMode('ARTICLE')) return;

  const swiper = `<div class="swiper">
  <div class="swiper-wrapper">
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div></div></div>
  <div class="swiper-slide slide-active"></div>
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div></div></div>
  </div>
  </div>`;

  $('body').append($(swiper));
  $('.root-container').appendTo('.slide-active');

  return initSwiperPage;
}

function initSwiperPage(p: Vault) {
  if (p.swiper) p.swiper.destroy(true, true);

  p.swiper = new Swiper(
    '.swiper',
    Object.assign(swiperOptions, {
      allowSlidePrev: p.isPrevPageActive(),
      allowSlideNext: p.isNextPageActive(),
    }),
  );

  p.swiper.on('slideNextTransitionEnd', () =>
    ArcaFeed.runEvent('renderNextPage'),
  );
  p.swiper.on('slidePrevTransitionEnd', () =>
    ArcaFeed.runEvent('renderPrevPage'),
  );

  return p;
}

export { initSwiper, initSwiperPage };
