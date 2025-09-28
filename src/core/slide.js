import Swiper from 'swiper';

export class SlideManager {
  initSlide() {
    if (this.mode !== 'ARTICLE') return;

    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    $('<div>', { class: 'swiper-slide main-slide' }).appendTo(
      '.swiper-wrapper',
    );

    $('<div>', { class: 'swiper-slide slide-empty' }).appendTo(
      '.swiper-wrapper',
    );

    $('.root-container').appendTo('.main-slide');

    this.swiper = new Swiper('.swiper', {
      slidesPerView: 1,
      loop: true,
      nested: true,
      touchAngle: 25,
      touchRatio: 0.5,
      threshold: 10,
      shortSwipes: false,
      longSwipesMs: 100,
      longSwipesRatio: 0.1,
      spaceBetween: window.innerWidth * 0.1,
      keyboard: { enabled: true, onlyInViewport: false },
      onAny: (e) => {
        if (e === 'slideNextTransitionEnd') {
          this.nextLink();
        }
        if (e === 'slidePrevTransitionEnd') {
          this.prevLink();
        }
      },
    });
  }
}
