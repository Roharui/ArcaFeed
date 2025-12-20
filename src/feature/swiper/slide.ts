import $ from 'jquery';

import type { PageMode } from '@/types';
import type { Param, Vault, VaultWithSwiper } from '@/vault';

import { getCurrentSlide } from '@/feature';
import { wrapperFunction } from '@/utils';

function initSlideFeature(_: Param) {
  return [
    initAddNewEmptyNextSlide,
    initAddNewEmptyPrevSlide,
    initFocusCurrentSlide,
  ];
}

const initSlide = wrapperFunction(['ARTICLE'], initSlideFeature);

function setCurrentSlide({ v }: Param): Param {
  v.currentSlide = getCurrentSlide(v);
  return { v } as Param;
}

function initFocusCurrentSlideFeature({ v }: Param) {
  v.currentSlide?.focus();
}

const initFocusCurrentSlide = wrapperFunction(
  ['SLIDE'],
  initFocusCurrentSlideFeature,
);

function removeSlide(mode: PageMode, v: Vault) {
  const { swiper } = v;

  if (swiper === null) return;

  if (swiper.slides.length > 10)
    swiper.removeSlide(mode === 'NEXT' ? 1 : swiper.slides.length - 2);
}

function removeSlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> | void => {
    const { swiper } = v as VaultWithSwiper;

    if (swiper.slides.length > 10) {
      return new Promise<void>((res) => {
        v.updateFn = res;
        removeSlide(mode, v);
      });
    } else return Promise.resolve();
  };
}

function initAddNewEmptySlideFeature(mode: PageMode) {
  const fn = ({ v }: Param) => addNewEmptySlide(mode, v);
  return Object.defineProperties(fn, {
    name: { value: `initAddNewEmpty${mode}SlideFeature` },
  });
}

const initAddNewEmptyNextSlide = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'NEXTURL'],
  initAddNewEmptySlideFeature('NEXT'),
);

const initAddNewEmptyPrevSlide = wrapperFunction(
  ['ARTICLE', 'SWIPER', 'PREVURL'],
  initAddNewEmptySlideFeature('PREV'),
);

function addNewEmptySlide(mode: PageMode, v: Vault) {
  const { swiper } = v as VaultWithSwiper;

  const slide = $('<div>', { class: 'swiper-slide slide-empty' });
  const loader = $('<div>', { class: 'loader-container' });

  $('<div>', { class: 'custom-loader' }).appendTo(loader);
  $('<div>', { class: 'loading-info' }).appendTo(loader);

  loader.appendTo(slide);

  const fn = mode === 'NEXT' ? swiper.appendSlide : swiper.prependSlide;

  fn.call(swiper, slide.get());
}

function addNewEmptySlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> =>
    new Promise<void>((res) => {
      v.updateFn = res;
      addNewEmptySlide(mode, v);
    });
}

export {
  initSlide,
  setCurrentSlide,
  initFocusCurrentSlide,
  removeSlide,
  removeSlidePromise,
  addNewEmptySlide,
  addNewEmptySlidePromise,
};
