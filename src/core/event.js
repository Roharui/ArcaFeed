export class EventManager {
  initEvent() {
    $(document).on('keydown', (e) => {
      if (e.key === 'ArrowRight') this.swiper.slideNext();
      if (e.key === 'ArrowLeft') this.swiper.slidePrev();
    });
  }
}
