import type { Swiper } from 'swiper/types';

/** Use Swiper's native transform while moving and release the layer at rest. */
export function installSwipeCompositing(swiper: Swiper): void {
  const { el, wrapperEl } = swiper;
  let dragging = false;
  let moving = false;
  let releaseFrame: number | undefined;

  function useRestingTransform(): void {
    // Keep Swiper's computed coordinates, including RTL and rounding.
    const { style } = wrapperEl;
    style.transform = style.transform.replace(
      /^translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)$/,
      'translate($1, $2)',
    );
  }

  function startMoving(): void {
    if (moving) return;
    moving = true;
    wrapperEl.classList.add('arcafeed-swiper-moving');
  }

  function stopMoving(): void {
    if (dragging || !moving) return;
    moving = false;
    wrapperEl.classList.remove('arcafeed-swiper-moving');
    useRestingTransform();
  }

  function updateTouchAction(): void {
    el.classList.toggle('arcafeed-swipe-enabled', swiper.enabled);
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
    if (!dragging) return;
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
    el.classList.remove('arcafeed-swipe-enabled');
    wrapperEl.classList.remove('arcafeed-swiper-moving');
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
