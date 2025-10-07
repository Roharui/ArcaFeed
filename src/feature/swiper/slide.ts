
import $ from 'jquery'

import type { PageMode } from "@/types";
import type { Param, Vault } from "@/vault";

import { getCurrentSlide } from "@/feature";
import { isNotNull } from '@/utils';

function initSlide({ v }: Param) {
  if (!v.isCurrentMode('ARTICLE')) return;

  return [
    ({ v }: Param) => addNewEmptySlide('NEXT', v),
    ({ v }: Param) => addNewEmptySlide('PREV', v),
    focusCurrentSlide
  ]
}

function setCurrentSlide({ v }: Param): Param {
  v.currentSlide = getCurrentSlide(v)
  return { v } as Param;
}

function focusCurrentSlide({ v }: Param) {
  v.currentSlide?.focus();
}

function removeSlide(mode: PageMode, v: Vault) {
  const { swiper } = v;

  if (swiper === null) return;

  if (swiper.slides.length > 10)
    swiper.removeSlide(
      mode === 'NEXT' ? 1 : swiper.slides.length - 2,
    );
}

function removeSlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> | void => {
    const { swiper } = v;

    if (swiper === null) return;

    if (swiper.slides.length > 10) {
      return new Promise<void>((res) => {
        v.updateFn = res;
        removeSlide(mode, v);
      })
    }
    else return Promise.resolve();
  }
}

function addNewEmptySlide(mode: PageMode, v: Vault) {
  const { swiper } = v
  const { nextArticleUrl, prevArticleUrl } = v;

  const url = mode === 'NEXT' ? nextArticleUrl : prevArticleUrl;

  if (!isNotNull(url)) {
    return
  }

  if (swiper === null) return;

  const slide = $('<div>', { class: 'swiper-slide slide-empty' });
  const loader = $('<div>', { class: 'loader-container' });

  $('<div>', { class: 'custom-loader' }).appendTo(loader);
  $('<div>', { class: 'loading-info' }).appendTo(loader);

  loader.appendTo(slide);

  const fn =
    mode === 'NEXT' ? swiper.appendSlide : swiper.prependSlide;

  fn.call(swiper, slide.get());
}

function addNewEmptySlidePromise(mode: PageMode) {
  return ({ v }: Param): Promise<void> => new Promise<void>((res) => {
    v.updateFn = res;
    addNewEmptySlide(mode, v);
  });
}

export { initSlide, setCurrentSlide, focusCurrentSlide, removeSlide, removeSlidePromise, addNewEmptySlide, addNewEmptySlidePromise }
