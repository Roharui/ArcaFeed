import { updateAfterSwipe } from './motion';
import type { SwiperLike } from './types';

export interface OffscreenSectionDeferrerOptions {
  selector: string;
  classPrefix: string;
}

export function createOffscreenSectionDeferrer({
  selector,
  classPrefix,
}: OffscreenSectionDeferrerOptions): (swiper: SwiperLike) => void {
  const heightVar = `--${classPrefix}-section-height`;
  const deferredClass = `${classPrefix}-deferred-section`;

  return function deferOffscreenArticleSections(swiper: SwiperLike): void {
    if (
      typeof ResizeObserver !== 'function' ||
      typeof CSS === 'undefined' ||
      !CSS.supports('content-visibility', 'auto') ||
      !CSS.supports('contain-intrinsic-block-size', 'auto 1px')
    )
      return;

    const sections = Array.from(
      swiper.el.querySelectorAll<HTMLElement>(selector),
    );
    if (sections.length === 0) return;

    // Keep the pages' actual section heights when the browser skips their contents.
    const heights = new Map<HTMLElement, number>();
    const applyHeights = () => {
      for (const [section, height] of heights) {
        observer.unobserve(section);
        section.style.setProperty(heightVar, `${height}px`);
        section.classList.add(deferredClass);
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
        section.classList.remove(deferredClass);
        section.style.removeProperty(heightVar);
      }
    });
  };
}
