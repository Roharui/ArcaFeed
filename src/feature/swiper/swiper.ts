import $ from 'jquery';

import '@css/swiper.css';

import Swiper from 'swiper';

import { eventBus } from '@/core';

import type { AppEventName } from '@/core';
import type { HrefImpl } from '@/types';
import type { SwiperOptions } from 'swiper/types';
import type { VaultAdapter } from '@/vault';

const SWIPER_OPTIONS: SwiperOptions = {
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

const SLIDE_NEXT_EVENT: Partial<Record<HrefImpl['mode'], AppEventName>> = {
  CHANNEL: 'toNextLinkForce',
  ARTICLE: 'renderNextPage',
};

// ===

function initSwiper(p: VaultAdapter): void {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;
  if ($('.arcafeed-swiper').length > 0) {
    initSwiperPage(p);
    return;
  }

  const swiper = `<div class="swiper arcafeed-swiper" role="region" aria-label="ArcaFeed 게시글 탐색">
  <div class="swiper-wrapper arcafeed-swiper-wrapper">
  <div class="swiper-slide arcafeed-slide-empty" aria-hidden="true"><div class="arcafeed-slide-loader-container"><div class="arcafeed-slide-loader"></div></div></div>
  <div class="swiper-slide arcafeed-slide-active"></div>
  <div class="swiper-slide arcafeed-slide-empty" aria-hidden="true"><div class="arcafeed-slide-loader-container"><div class="arcafeed-slide-loader"></div></div></div>
  </div>
  </div>`;

  // Insert swiper inside .root-container before the content area,
  // so footer/#bottom stay in flow. Then move content into the active slide.
  const $swiper = $(swiper);
  const $root = $('.root-container').first();
  const $content = $root.find('.body .content-wrapper').first().length
    ? $root.find('.body .content-wrapper').first()
    : $root.find('.content-wrapper').first();
  if ($content.length === 0) return;
  $content.before($swiper);
  $content.appendTo($swiper.find('.arcafeed-slide-active'));

  initSwiperPage(p);
}

function initSwiperPage(p: VaultAdapter): void {
  const swiperElement = $('.arcafeed-swiper').get(0);
  if (!swiperElement) return;
  if (p.swiper) {
    p.swiper.destroy(true, true);
    p.swiper = null;
  }

  const { disableSwiper } = p.articleFilterConfig[p.href.channelId] || {
    disableSwiper: false,
    onlyBest: false,
  };

  p.swiper = new Swiper(swiperElement, {
    ...SWIPER_OPTIONS,
    allowSlideNext: p.seriesSource === 'home' || p.isNextPageActive(),
    allowSlidePrev: p.isPrevPageActive(),
    enabled: p.isSeriesMode || !disableSwiper,
  });

  const nextEvent = SLIDE_NEXT_EVENT[p.href.mode] ?? 'renderNextPage';
  p.swiper.on('slideNextTransitionEnd', () => void eventBus.emit(nextEvent));
  p.swiper.on(
    'slidePrevTransitionEnd',
    () => void eventBus.emit('renderPrevPage'),
  );
}

export { initSwiper, initSwiperPage };
