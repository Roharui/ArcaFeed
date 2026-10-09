import $ from 'jquery';

import '@css/swiper.css';

import Swiper from 'swiper';

import { eventBus } from '@/core';

import type { SwiperOptions } from 'swiper/types';
import type { VaultAdapter } from '@/vault';

const swiperOptions: SwiperOptions = {
  speed: 300,
  initialSlide: 1,
  slidesPerView: 1,
  loop: false,
  nested: true,
  noSwiping: true,
  noSwipingClass: 'swiper-no-swiping',
  touchAngle: 20,
  touchRatio: 0.75,
  threshold: 10,
  shortSwipes: false,
  longSwipesMs: 100,
  longSwipesRatio: 0.1,
  touchMoveStopPropagation: true,
};

// ── Mode-specific slide-next events ────────────────────

const SLIDE_NEXT_EVENT: Record<string, string> = {
  CHANNEL: 'toNextLinkForce',
  ARTICLE: 'renderNextPage',
};

// ===

function initSwiper(p: VaultAdapter): void {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;

  const swiper = `<div class="swiper">
  <div class="swiper-wrapper">
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div></div></div>
  <div class="swiper-slide slide-active"></div>
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div></div></div>
  </div>
  </div>`;

  // Insert swiper inside .root-container before the content area,
  // so footer/#bottom stay in flow. Then move content into the active slide.
  const $swiper = $(swiper);
  $('.content-wrapper').before($swiper);
  $('.content-wrapper').appendTo('.slide-active');

  initSwiperPage(p);
}

function initSwiperPage(p: VaultAdapter): void {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;

  const { disableSwiper } = p.articleFilterConfig[p.href.channelId] || {
    disableSwiper: false,
    onlyBest: false,
  };

  if (p.swiper) {
    p.swiper.allowSlideNext = p.isNextPageActive();
    p.swiper.allowSlidePrev = p.isPrevPageActive();
    if (disableSwiper) p.swiper.disable();
    else p.swiper.enable();
    p.swiper.slideTo(1, 0, false);
    return;
  }

  p.swiper = new Swiper('.swiper', {
    ...swiperOptions,
    allowSlideNext: p.isNextPageActive(),
    allowSlidePrev: p.isPrevPageActive(),
    enabled: !disableSwiper,
  });

  const nextEvent = SLIDE_NEXT_EVENT[p.href.mode] || 'renderNextPage';
  p.swiper.on('slideNextTransitionEnd', () => eventBus.emit(nextEvent));
  p.swiper.on('slidePrevTransitionEnd', () => eventBus.emit('renderPrevPage'));

  // A background fetch can unlock the next slide after initialization.
  p.subscribe((state) => {
    if (!p.swiper || p.swiper.destroyed) return;
    p.swiper.allowSlideNext = p.isNextPageActive();
    p.swiper.allowSlidePrev = p.isPrevPageActive();
    const disabled =
      state.articleFilterConfig[state.href.channelId]?.disableSwiper;
    if (disabled && p.swiper.enabled) p.swiper.disable();
    else if (!disabled && !p.swiper.enabled) p.swiper.enable();
  });
}

export { initSwiper, initSwiperPage };
