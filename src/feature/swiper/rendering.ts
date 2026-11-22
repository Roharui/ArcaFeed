import type Swiper from 'swiper';
import { updateAfterSwipe } from './motion';

export function deferOffscreenArticleSections(swiper: Swiper): void {
  if (
    typeof ResizeObserver !== 'function' ||
    typeof CSS === 'undefined' ||
    !CSS.supports('content-visibility', 'auto') ||
    !CSS.supports('contain-intrinsic-block-size', 'auto 1px')
  )
    return;

  const sections = Array.from(
    swiper.el.querySelectorAll<HTMLElement>('#board_read #cmt, #board_list'),
  );
  if (sections.length === 0) return;

  // Keep the pages' actual section heights when the browser skips their contents.
  const heights = new Map<HTMLElement, number>();
  const applyHeights = () => {
    for (const [section, height] of heights) {
      observer.unobserve(section);
      section.style.setProperty('--rulifeed-section-height', `${height}px`);
      section.classList.add('rulifeed-deferred-section');
    }
    heights.clear();
  };
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { height } = entry.contentRect;
      const section = entry.target as HTMLElement;
      if (height > 0) heights.set(section, height);
      else heights.delete(section);
    }
    if (heights.size > 0) updateAfterSwipe(swiper, applyHeights);
  });
  for (const section of sections) observer.observe(section);
  swiper.on('destroy', () => {
    observer.disconnect();
    heights.clear();
    for (const section of sections) {
      section.classList.remove('rulifeed-deferred-section');
      section.style.removeProperty('--rulifeed-section-height');
    }
  });
}
