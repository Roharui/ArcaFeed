import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';
import { Vault } from './vault';

export class SlideManager extends Vault {
  initSlide() {
    if (this.mode !== 'ARTICLE') return;
    this.initArticleToSlide();

    this.swiper = new Swiper('.swiper', {
      ...this.slideOptions,
      touchMoveStopPropagation: true,
      modules: [Manipulation],
    });
    this.swiper.on('slideNextTransitionEnd', () => this.nextLink());
    this.swiper.on('slidePrevTransitionEnd', () => this.prevLink());

    this.appendNewEmptySlide();
    this.prependNewEmptySlide();
  }

  initArticleToSlide() {
    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    $('<div>', { class: 'swiper-slide' }).appendTo('.swiper-wrapper');
    $('.root-container').appendTo('.swiper-slide');

    $('.swiper-slide').attr('data-article-id', this.articleId);
    $('.swiper-slide').attr('data-article-href', window.location.pathname);
    $('.swiper-slide').attr('data-article-title', document.title);
  }

  prependNewEmptySlide() {
    if (this.swiper.slides.length > 5) {
      this.swiper.removeSlide(this.swiper.slides.length - 2);
    }

    const slide = $('<div>', { class: 'swiper-slide slide-empty prev' });

    const loader = $('<div>', { class: 'loader-container' });
    $('<div>', { class: 'custom-loader' }).appendTo(loader);
    $('<div>', { class: 'loading-info' }).appendTo(loader);

    loader.appendTo(slide);

    this.swiper.prependSlide(slide.get());
  }

  appendNewEmptySlide() {
    if (this.swiper.slides.length > 5) {
      console.log('Slide before remove', this.swiper.slides);
      this.swiper.removeSlide(1);
      console.log('Slide after remove', this.swiper.slides);
    }

    const slide = $('<div>', { class: 'swiper-slide slide-empty next' });

    const loader = $('<div>', { class: 'loader-container' });
    $('<div>', { class: 'custom-loader' }).appendTo(loader);
    $('<div>', { class: 'loading-info' }).appendTo(loader);

    loader.appendTo(slide);

    this.swiper.appendSlide(slide.get());
  }
}
