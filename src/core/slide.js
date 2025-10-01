// vault, promise, page

import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';

import { Vault } from './vault';

export class SlideManager extends Vault {
  updateFn = null;

  initSlide() {
    if (this.mode !== 'ARTICLE') return;
    this.initArticleToSlide();

    this.swiper = new Swiper('.swiper', {
      ...this.slideOptions,
      touchMoveStopPropagation: true,
      modules: [Manipulation],
    });

    this.addNewEmptySlide('next');
    this.addNewEmptySlide('prev');

    this.swiper.on('slideNextTransitionEnd', () => {
      this.toLink('next');
    });

    this.swiper.on('slidePrevTransitionEnd', () => {
      this.toLink('prev');
    });

    this.swiper.on('update', () => this.updateFn());
  }

  hideRootContainer() {
    if (this.mode !== 'ARTICLE') return;
    $('.root-container').hide();
  }

  initArticleToSlide() {
    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    const slide = $('<div>', { class: 'swiper-slide' });

    slide.attr('data-article-id', this.articleId);
    slide.attr('data-article-href', window.location.pathname);
    slide.attr('data-article-title', document.title);

    slide.appendTo('.swiper-wrapper');

    const content = this.parseContent($('body').html());
    $('.root-container').remove();

    content.appendTo(slide);
  }

  removeSlide(mode) {
    if (this.swiper.slides.length > 10)
      this.swiper.removeSlide(
        mode === 'next' ? 1 : this.swiper.slides.length - 2,
      );
  }

  removeSlidePromise(mode) {
    return this.swiper.slides.length > 10
      ? new Promise((res) => {
          this.updateFn = res;
          this.removeSlide(mode);
        })
      : Promise.resolve();
  }

  addNewEmptySlide(mode) {
    const slide = $('<div>', { class: 'swiper-slide slide-empty' });
    const loader = $('<div>', { class: 'loader-container' });

    $('<div>', { class: 'custom-loader' }).appendTo(loader);
    $('<div>', { class: 'loading-info' }).appendTo(loader);

    loader.appendTo(slide);

    const fn =
      mode === 'next' ? this.swiper.appendSlide : this.swiper.prependSlide;

    fn.call(this.swiper, slide.get());
  }

  addNewEmptySlidePromise(mode) {
    return new Promise((res) => {
      this.updateFn = res;

      this.addNewEmptySlide(mode);
    });
  }
}
