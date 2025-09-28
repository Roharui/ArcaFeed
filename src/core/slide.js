import Swiper from 'swiper';
import { Manipulation } from 'swiper/modules';

export class SlideManager {
  initSlide() {
    if (this.mode !== 'ARTICLE') return;
    if (this.slideMode == 'REFRESH') {
      this.initSlideRefresh();
      return;
    }
    if (this.slideMode == 'RENDER') {
      this.initSlideRender();
      return;
    }
  }

  initArticleToSlide() {
    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    $('<div>', { class: 'swiper-slide' }).appendTo('.swiper-wrapper');
    $('.root-container').appendTo('.swiper-slide');

    $('<div>', { class: 'swiper-slide slide-empty' }).appendTo(
      '.swiper-wrapper',
    );
    $('<div>', { class: 'custom-loader' }).appendTo('.slide-empty');
  }

  initSlideRefresh() {
    this.initArticleToSlide();

    this.swiper = new Swiper('.swiper', {
      ...this.slideOptions,
      spaceBetween: window.innerWidth * 0.1,
      onAny: (e) => {
        if (e === 'slideNextTransitionEnd') this.nextLink();
        if (e === 'slidePrevTransitionEnd') this.prevLink();
      },
    });
  }

  initSlideRender() {
    this.initArticleToSlide();

    this.swiper = new Swiper('.swiper', {
      ...this.slideOptions,
      spaceBetween: window.innerWidth * 0.1,
      loop: false,
      touchMoveStopPropagation: true,
      modules: [Manipulation],
      onAny: (e) => {
        if (e === 'slideNextTransitionEnd') this.nextLinkPageRender();
      },
    });
  }
}
