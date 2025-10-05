// vault, promise, page

import $ from 'jquery'

import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';
import { FilterManager } from '@/feature/filter';

import type { Vault, Config } from '@/vault';
import type { SwiperOptions } from '@swiper/types';
import { parseContent } from '../../utils/regex';
import { getCurrentSlide } from '../current';


class SlideManager extends FilterManager {
  updateFn: (v?: unknown) => void = () => { };

  swiperOptions: SwiperOptions;

  constructor(v: Vault, c: Config) {
    super(v, c);

    this.swiperOptions = {
      slidesPerView: 1,
      loop: false,
      nested: true,
      touchAngle: 20,
      touchRatio: 0.75,
      threshold: 10,
      shortSwipes: false,
      longSwipesMs: 100,
      longSwipesRatio: 0.1,
      touchMoveStopPropagation: true,
    };
  }

  initSlide(v?: Vault): Vault | void {
    this.v = v || this.v;

    if (this.v.isCurrentMode('CHANNEL')) return;

    this.initArticleToSlide();

    this.v.swiper = new Swiper('.swiper', {
      ...this.swiperOptions,
      touchMoveStopPropagation: true,
      modules: [Manipulation],
    });

    this.addNewEmptySlide('next');
    this.addNewEmptySlide('prev');

    this.v.swiper.on('update', () => this.updateFn());
    this.setCurrentSlide()

    return this.v;
  }

  setCurrentSlide() {
    this.v.currentSlide = getCurrentSlide(this.v)
  }


  initArticleToSlide() {
    const { articleId } = this.v.href;

    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    const slide = $('<div>', { class: 'swiper-slide' });

    slide.attr('data-article-id', articleId);
    slide.attr('data-article-href', window.location.pathname);
    slide.attr('data-article-title', document.title);

    const html = $('body').html()
    const content = $(parseContent(html));

    $(".root-container").remove()

    content.appendTo(slide);

    slide.appendTo($(".swiper-wrapper"))
  }

  removeSlide(mode: string) {
    const { swiper } = this.v;

    if (swiper === null) return;

    if (swiper.slides.length > 10)
      swiper.removeSlide(
        mode === 'next' ? 1 : swiper.slides.length - 2,
      );
  }

  removeSlidePromise(mode: string) {
    const { swiper } = this.v;

    if (swiper === null) return;

    return swiper.slides.length > 10
      ? new Promise((res) => {
        this.updateFn = res;
        this.removeSlide(mode);
      })
      : Promise.resolve();
  }

  addNewEmptySlide(mode: string) {
    const { swiper } = this.v

    if (swiper === null) return;

    const slide = $('<div>', { class: 'swiper-slide slide-empty' });
    const loader = $('<div>', { class: 'loader-container' });

    $('<div>', { class: 'custom-loader' }).appendTo(loader);
    $('<div>', { class: 'loading-info' }).appendTo(loader);

    loader.appendTo(slide);

    const fn =
      mode === 'next' ? swiper.appendSlide : swiper.prependSlide;

    fn.call(swiper, slide.get());
  }

  addNewEmptySlidePromise(mode: string) {
    return new Promise((res) => {
      this.updateFn = res;

      this.addNewEmptySlide(mode);
    });
  }
}

export { SlideManager }
