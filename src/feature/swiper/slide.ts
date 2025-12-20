import $ from 'jquery';

import type { PageMode } from '@/types';
import type { Param, Vault, VaultWithSwiper } from '@/vault';

import { getCurrentSlide } from '@/feature';
import {
  conditionMaker,
  isNotNull,
  newAllPromise,
  wrapperFunction,
} from '@/utils';

function initSlide({ v }: Param) {
  if (!v.isCurrentMode('ARTICLE')) return;

  return [
    newAllPromise(
      ({ v }: Param) => addNewEmptySlide('NEXT', v),
      ({ v }: Param) => addNewEmptySlide('PREV', v),
    ),
    focusCurrentSlide,
  ];
}

function setCurrentSlide({ v }: Param): Param {
  v.currentSlide = getCurrentSlide(v);
  return { v } as Param;
}

function focusCurrentSlideFunc({ v }: Param) {
  v.currentSlide?.focus();
}

const focusCurrentSlide = wrapperFunction(
  conditionMaker('SLIDE'),
  focusCurrentSlideFunc,
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

function addNewEmptySlide(mode: PageMode, v: Vault) {
  const { swiper } = v as VaultWithSwiper;
  const { nextArticleUrl, prevArticleUrl } = v;

  const url = mode === 'NEXT' ? nextArticleUrl : prevArticleUrl;

  if (!isNotNull(url)) {
    return;
  }

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
  focusCurrentSlide,
  removeSlide,
  removeSlidePromise,
  addNewEmptySlide,
  addNewEmptySlidePromise,
};
