// Slide, Page

import { Vault } from './vault';

export class EventManager extends Vault {
  initEvent() {
    $(document).on('keydown', (e) => {
      if (e.key === 'ArrowRight')
        this.mode === 'ARTICLE'
          ? this.swiper.slideNext()
          : this.nextLinkForce();
      if (e.key === 'ArrowLeft') this.swiper.slidePrev();
    });
  }
}
