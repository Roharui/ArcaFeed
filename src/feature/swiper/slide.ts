import $ from 'jquery';

import type { PageMode } from '@/types';
import type { Param, Vault, VaultFull } from '@/vault';

import { checkNotNull } from '@/utils';

// ===

function addNewSlide(mode: PageMode, v: Vault, slideContent: HTMLElement) {
  const { swiper } = v as VaultFull;

  (mode === 'NEXT' ? swiper.appendSlide : swiper.prependSlide).call(
    swiper,
    slideContent,
  );
  swiper.updateSlides();
}

function addNewEmptySlide(mode: PageMode, v: Vault) {
  const slide = $('<div>', { class: 'swiper-slide slide-empty' });
  const loader = $('<div>', { class: 'loader-container' });

  $('<div>', { class: 'custom-loader' }).appendTo(loader);

  loader.appendTo(slide);

  addNewSlide(mode, v, checkNotNull(slide.get(0)));
}

function addNewEmptySlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> =>
    new Promise<void>((res) => {
      const { swiper } = v as VaultFull;
      swiper.once('slidesUpdated', () => res());
      addNewEmptySlide(mode, v);
    });
}

export { addNewEmptySlide, addNewEmptySlidePromise };
