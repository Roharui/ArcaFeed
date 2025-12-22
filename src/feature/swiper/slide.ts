import $ from 'jquery';

import type { PageMode } from '@/types';
import type { Param, Vault, VaultFull } from '@/vault';

import { wrapperFunction } from '@/utils';
import { linkPageRender } from './page';

function initSlideFeature({ c }: Param) {
  if (c.isSlideMode('RENDER')) {
    return [linkPageRender];
  }

  return [initAddNewEmptyNextSlide, initAddNewEmptyPrevSlide];
}

const initSlide = wrapperFunction(['ARTICLE'], initSlideFeature);

const initAddNewEmptyNextSlide = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'NEXTURL'],
  addNewEmptySlidePromise('NEXT'),
);

const initAddNewEmptyPrevSlide = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'PREVURL'],
  addNewEmptySlidePromise('PREV'),
);

// ===

function removeSlide(mode: PageMode, v: Vault) {
  const { swiper } = v;

  if (swiper === null) return;

  if (swiper.slides.length > 10) {
    swiper.removeSlide(mode === 'NEXT' ? 1 : swiper.slides.length - 2);
  }
  swiper.updateSlides();
}

function addNewSlide(
  mode: PageMode,
  v: Vault,
  slideContent: JQuery<HTMLElement>,
) {
  const { swiper } = v as VaultFull;

  const fn = mode === 'NEXT' ? swiper.appendSlide : swiper.prependSlide;

  fn.call(swiper, slideContent.get());
  swiper.updateSlides();
}

function addNewEmptySlide(mode: PageMode, v: Vault) {
  const slide = $('<div>', { class: 'swiper-slide slide-empty' });
  const loader = $('<div>', { class: 'loader-container' });

  $('<div>', { class: 'custom-loader' }).appendTo(loader);
  $('<div>', { class: 'loading-info' }).appendTo(loader);

  loader.appendTo(slide);

  addNewSlide(mode, v, slide);
}

function addNewEmptySlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> =>
    new Promise<void>((res) => {
      const { swiper } = v as VaultFull;
      swiper.once('slidesUpdated', () => {
        res();
      });
      addNewEmptySlide(mode, v);
    });
}

function addNewSlidePromise(mode: PageMode, slideContent: JQuery<HTMLElement>) {
  return ({ v }: Param): Promise<void> =>
    new Promise<void>((res) => {
      const { swiper } = v as VaultFull;
      swiper.once('slidesUpdated', () => {
        res();
      });
      addNewSlide(mode, v, slideContent);
    });
}

function removeSlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> | void => {
    const { swiper } = v as VaultFull;

    if (swiper.slides.length > 10) {
      return new Promise<void>((res) => {
        v.updateFn = res;
        removeSlide(mode, v);
      });
    } else return Promise.resolve();
  };
}

export {
  initSlide,
  removeSlide,
  removeSlidePromise,
  addNewEmptySlide,
  addNewEmptySlidePromise,
  addNewSlidePromise,
};
