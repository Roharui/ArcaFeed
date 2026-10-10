import $ from 'jquery';

import '@css/swiper.css';

import Swiper from 'swiper';

import { eventBus } from '@/core/app-events';
import type { AppEvent } from '@/core/app-events';

import type { SwiperOptions } from 'swiper/types';
import type { VaultAdapter } from '@/vault';
import { installSwiperVideoPause } from './video';

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
  // Article slides can be very tall and contain continuously updating videos.
  // Avoid forcing the whole article into a 3D compositing layer.
  maxBackfaceHiddenSlides: 0,
  on: {
    setTranslate(swiper) {
      // Preserve Swiper's RTL, rounding and large-coordinate adjustments.
      const style = swiper.wrapperEl.style;
      style.transform = style.transform.replace(
        /^translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)$/,
        'translate($1, $2)',
      );
    },
  },
};

// ── Mode-specific slide-next events ────────────────────

const SLIDE_NEXT_EVENT: Record<string, AppEvent> = {
  CHANNEL: 'toNextLinkForce',
  ARTICLE: 'renderNextPage',
};

// Article images change the container height after the first paint. Swiper's
// default observer treats those changes as resizes and resets the transition.
// Horizontal slides only need to be recalculated when their width changes.
function observeSwiperWidth(swiper: Swiper): void {
  if (typeof ResizeObserver !== 'function') return;

  let width = swiper.el.clientWidth;
  let frame: number | null = null;
  const observer = new ResizeObserver((entries) => {
    const entry = entries.find(({ target }) => target === swiper.el);
    if (!entry || swiper.destroyed) return;
    const nextWidth = Math.round(entry.contentRect.width);
    if (nextWidth === width) return;
    width = nextWidth;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!swiper.destroyed) swiper.update();
    });
  });
  observer.observe(swiper.el);
  swiper.on('destroy', () => {
    observer.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
  });
}

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
    resizeObserver: false,
    updateOnWindowResize: typeof ResizeObserver !== 'function',
    allowSlideNext: p.isNextPageActive(),
    allowSlidePrev: p.isPrevPageActive(),
    enabled: !disableSwiper,
  });
  observeSwiperWidth(p.swiper);
  installSwiperVideoPause(p.swiper);

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
