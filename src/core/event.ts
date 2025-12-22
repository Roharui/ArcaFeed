import { PromiseManager } from '@/core/promise';

import { initLink } from '@/feature/article';
import {
  initSwiper,
  initPage,
  initSlide,
  toNextLink,
  toPrevLink,
} from '@/feature/swiper';
import { initEvent, initModal, addVersionInfo, initButton } from '@/feature';
import { checkPageMode } from '@/utils';

import type { Param, VaultFull } from '@/vault';

class EventManager extends PromiseManager {
  constructor() {
    super();
  }

  init() {
    this.addNextPromise(
      addVersionInfo,
      checkPageMode,
      initSwiper,
      initLink,
      initSlide,
      initPage,
      initButton,
      initEvent,
      initModal,
    );
  }

  toNextPage() {
    this.addNextPromise(({ v }: Param) => {
      const { swiper } = v as VaultFull;
      swiper.slideNext();
      return;
    });
  }

  toPrevPage() {
    this.addNextPromise(({ v }: Param) => {
      const { swiper } = v as VaultFull;
      swiper.slidePrev();
      return;
    });
  }

  renderNextPage() {
    this.addNextPromise(toNextLink);
  }

  renderPrevPage() {
    this.addNextPromise(toPrevLink);
  }
}

export { EventManager };
