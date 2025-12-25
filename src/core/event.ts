import { PromiseManager } from '@/core/promise';

import {
  initLink,
  initSwiper,
  toLink,
  initEvent,
  initModal,
  addVersionInfo,
  initButton,
} from '@/feature';
import { checkPageMode } from '@/utils';

import type { Param, VaultFull } from '@/vault';

class EventManager extends PromiseManager {
  constructor() {
    super();
  }

  init() {
    this.addNextPromise(addVersionInfo, checkPageMode);
    this.addNextPromise(initLink);
    this.addNextPromise(initSwiper, initButton, initEvent, initModal);
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
    this.addNextPromise(toLink('NEXT'));
  }

  renderPrevPage() {
    this.addNextPromise(toLink('PREV'));
  }
}

export { EventManager };
