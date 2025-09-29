import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';

export class SlideManager {
  initSlide() {
    if (this.mode !== 'ARTICLE') return;
    this.initArticleToSlide();

    this.swiper = new Swiper('.swiper', {
      ...this.slideOptions,
      touchMoveStopPropagation: true,
      modules: [Manipulation],
      onAny: (e) => {
        if (e === 'slideNextTransitionEnd') this.nextLink();
        if (e === 'slidePrevTransitionEnd') this.prevLink();
      },
    });

    this.appendNewEmptySlide();
    this.prependNewEmptySlide();
  }

  initArticleToSlide() {
    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    $('<div>', { class: 'swiper-slide' }).appendTo('.swiper-wrapper');
    $('.root-container').appendTo('.swiper-slide');

    $('.swiper-slide').attr('data-article-id', this.articleId);
    $('.swiper-slide').attr('data-article-href', window.location.href);
    $('.swiper-slide').attr('data-article-title', document.title);
  }

  prependNewEmptySlide() {
    const slide = $('<div>', { class: 'swiper-slide slide-empty prev' });

    const loader = $('<div>', { class: 'loader-container' });
    $('<div>', { class: 'custom-loader' }).appendTo(loader);
    $('<div>', { class: 'loading-info' }).appendTo(loader);

    loader.appendTo(slide);

    this.swiper.prependSlide(slide.get());
  }

  appendNewEmptySlide() {
    const slide = $('<div>', { class: 'swiper-slide slide-empty next' });

    const loader = $('<div>', { class: 'loader-container' });
    $('<div>', { class: 'custom-loader' }).appendTo(loader);
    $('<div>', { class: 'loading-info' }).appendTo(loader);

    loader.appendTo(slide);

    this.swiper.appendSlide(slide.get());
  }
}
