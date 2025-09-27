import Swiper from 'swiper';

export class SlideManager {
  initSlide() {
    if (this.mode !== 'ARTICLE') return;

    $('<div>', { class: 'swiper' }).appendTo('body');
    $('<div>', { class: 'swiper-wrapper' }).appendTo('.swiper');

    $('<div>', { class: 'swiper-slide main-slide' }).appendTo(
      '.swiper-wrapper',
    );

    $('<div>', { class: 'swiper-slide swiper-empty' }).appendTo(
      '.swiper-wrapper',
    );

    $('.root-container').appendTo('.main-slide');

    new Swiper('.swiper', {
      direction: 'vertical',
      slidesPerView: 1,
      loop: true,
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
