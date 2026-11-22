import type { Swiper } from 'swiper/types';
import { afterPaint } from '@/utils/after-paint';

const uiSchedulers = new WeakMap<Swiper, (update: () => void) => void>();

/** Defer cosmetic work while Swiper is following the pointer or settling. */
export function updateAfterSwipe(
  swiper: Swiper | null,
  update: () => void,
): void {
  const schedule = swiper && uiSchedulers.get(swiper);
  if (schedule) schedule(update);
  else update();
}

/** Use Swiper's native transform while moving and release the layer at rest. */
export function installSwipeCompositing(swiper: Swiper): void {
  const { el, wrapperEl } = swiper;
  let touched = false;
  let dragging = false;
  let moving = false;
  let releaseFrame: number | undefined;
  let cancelUiFlush: (() => void) | undefined;
  const pendingUpdates = new Set<() => void>();

  uiSchedulers.set(swiper, (update) => {
    if (moving || pendingUpdates.has(update)) pendingUpdates.add(update);
    else update();
  });

  function useRestingTransform(): void {
    // Keep Swiper's computed coordinates, including RTL and rounding.
    const { style } = wrapperEl;
    if (!style.transform) return;
    style.transform = style.transform.replace(
      /^translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)$/,
      'translate($1, $2)',
    );
  }

  function useMovingTransform(): void {
    const { style } = wrapperEl;
    if (!style.transform) return;
    style.transform = style.transform.replace(
      /^translate\(([^,]+),\s*([^)]+)\)$/,
      'translate3d($1, $2, 0px)',
    );
  }

  function startMoving(): void {
    if (moving) return;
    moving = true;
    cancelUiFlush?.();
    cancelUiFlush = undefined;
    wrapperEl.classList.add('rulifeed-swiper-moving');
    useMovingTransform();
  }

  function stopMoving(): void {
    if (touched || dragging || !moving) return;
    moving = false;
    wrapperEl.classList.remove('rulifeed-swiper-moving');
    useRestingTransform();
    if (pendingUpdates.size > 0) {
      cancelUiFlush = afterPaint(() => {
        cancelUiFlush = undefined;
        for (const update of pendingUpdates) {
          if (moving) break;
          pendingUpdates.delete(update);
          try {
            update();
          } catch (error) {
            console.error('[RuliFeed] Deferred swipe UI update failed:', error);
          }
        }
      });
    }
  }

  function updateTouchAction(): void {
    el.classList.toggle('rulifeed-swipe-enabled', swiper.enabled);
  }

  updateTouchAction();
  // Swiper emits these events but omits them from its event types.
  const onAvailabilityChange = swiper.on.bind(swiper) as (
    event: 'enable' | 'disable',
    callback: () => void,
  ) => void;
  onAvailabilityChange('enable', updateTouchAction);
  onAvailabilityChange('disable', () => {
    updateTouchAction();
    touched = false;
    dragging = false;
    if (!swiper.animating) stopMoving();
  });
  // Promote the compositing layer on touchStart so the first horizontal drag
  // frame does not stall rasterizing the article or lose transition time.
  swiper.on('touchStart', () => {
    if (!swiper.enabled) return;
    touched = true;
    startMoving();
  });
  swiper.on('touchMoveOpposite', () => {
    touched = false;
    dragging = false;
    if (!swiper.animating) stopMoving();
  });
  swiper.on('sliderFirstMove', () => {
    dragging = true;
    startMoving();
  });
  swiper.on('setTransition', (_swiper, duration) => {
    if (duration > 0) startMoving();
  });
  swiper.on('setTranslate', () => {
    if (!moving) useRestingTransform();
  });
  swiper.on('touchEnd', () => {
    if (!touched && !dragging) return;
    touched = false;
    dragging = false;
    // Swiper decides whether to start a snap transition after this event.
    releaseFrame ??= requestAnimationFrame(() => {
      releaseFrame = undefined;
      if (!swiper.animating) stopMoving();
    });
  });
  swiper.on('transitionEnd', stopMoving);
  swiper.on('destroy', () => {
    if (releaseFrame !== undefined) cancelAnimationFrame(releaseFrame);
    cancelUiFlush?.();
    pendingUpdates.clear();
    uiSchedulers.delete(swiper);
    el.classList.remove('rulifeed-swipe-enabled');
    wrapperEl.classList.remove('rulifeed-swiper-moving');
  });
}

/** Honor preference changes without changing the user's swipe mode. */
export function installReducedMotion(swiper: Swiper): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const speed = swiper.params.speed ?? 300;
  const update = () => {
    swiper.params.speed = media.matches ? 0 : speed;
  };
  update();
  media.addEventListener('change', update);
  swiper.on('destroy', () => media.removeEventListener('change', update));
}
