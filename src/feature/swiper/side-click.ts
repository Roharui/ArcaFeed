import { eventBus } from '@/core/app-events';
import { isNavigating } from '@/feature/navigation';
import type { VaultAdapter } from '@/vault';
import type Swiper from 'swiper';

/** Use the empty space beside the content without covering site controls. */
export function installSideClick(p: VaultAdapter, swiper: Swiper): void {
  let press: { x: number; y: number; target: EventTarget | null } | null = null;
  const onDown = (event: PointerEvent) => {
    press =
      event.isPrimary && event.button === 0
        ? { x: event.clientX, y: event.clientY, target: event.target }
        : null;
  };
  const onMove = (event: PointerEvent) => {
    if (
      press &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10
    )
      press = null;
  };
  const cancel = () => {
    press = null;
  };
  const onClick = (event: MouseEvent) => {
    const start = press;
    press = null;
    if (
      !start ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.detail !== 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      window.innerWidth < 1024 ||
      !swiper.enabled ||
      swiper.destroyed ||
      swiper.animating ||
      isNavigating(p) ||
      document.querySelector('#dialog, .arcafeed-navigation-panel') ||
      window.getSelection()?.toString() ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
    )
      return;

    const content = swiper.el.querySelector('.slide-active .content-wrapper');
    const target = event.target;
    if (
      !content ||
      !(target instanceof Element) ||
      start.target !== target ||
      !target.contains(content) ||
      target.closest('a, button, input, textarea, select, [contenteditable]')
    )
      return;

    const rect = content.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return;
    const previous = event.clientX < rect.left;
    const next = event.clientX > rect.right;
    if (
      (!previous && !next) ||
      (previous && !swiper.allowSlidePrev) ||
      (next && !swiper.allowSlideNext)
    )
      return;
    event.preventDefault();
    void eventBus.emit(previous ? 'toPrevPage' : 'toNextPage');
  };

  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('click', onClick);
  swiper.on('destroy', () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointercancel', cancel, true);
    document.removeEventListener('click', onClick);
  });
}
