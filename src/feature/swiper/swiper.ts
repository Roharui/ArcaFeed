import { fromTemplate } from '@/utils/dom';

import '@css/swiper.css';

import Swiper from 'swiper';

import { eventBus } from '@/core/app-events';
import type { AppEvent } from '@/core/app-events';

import type { SwiperOptions } from 'swiper/types';
import type { VaultAdapter } from '@/vault';
import { installReducedMotion, installSwipeCompositing } from './motion';
import { installSwiperVideoPause } from './video';
import { installSideClick } from './side-click';
import { deferOffscreenArticleSections } from './rendering';

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
  // Avoid keeping each tall article slide in its own compositing layer.
  maxBackfaceHiddenSlides: 0,
  on: {
    beforeInit: installSwipeCompositing,
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

  // Swiper already measured the content width. Reading clientWidth here
  // can force another layout after the constructor writes slide styles.
  let width = swiper.width;
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
  const content = document.querySelector<HTMLElement>('.content-wrapper');
  if (!content) return;

  const swiper = `<div class="swiper">
  <div class="swiper-wrapper">
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div></div></div>
  <div class="swiper-slide slide-active"></div>
  <div class="swiper-slide slide-empty"><div class="loader-container"><div class="custom-loader"></div></div></div>
  </div>
  </div>`;

  // Insert swiper inside .root-container before the content area,
  // so footer/#bottom stay in flow. Then move content into the active slide.
  const container = fromTemplate(swiper);
  content.before(container);
  const slide = container.querySelector<
    HTMLElement & {
      moveBefore?(node: Node, child: Node | null): void;
    }
  >('.slide-active')!;
  // An atomic move keeps already loaded iframes attached to their documents.
  if (typeof slide.moveBefore === 'function') slide.moveBefore(content, null);
  else slide.append(content);

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
  installReducedMotion(p.swiper);
  observeSwiperWidth(p.swiper);
  if (p.isCurrentMode('ARTICLE')) deferOffscreenArticleSections(p.swiper);
  installSwiperVideoPause(p.swiper);
  installSideClick(p, p.swiper);

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
