import type { Swiper } from 'swiper/types';

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
