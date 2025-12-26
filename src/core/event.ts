import { PromiseManager } from '@/core/promise';

import {
  initLink,
  initSwiper,
  toLink,
  initEvent,
  initModal,
  addVersionInfo,
  initButton,
  initSeriesContent,
} from '@/feature';
import { checkPageMode } from '@/utils';

import type { Vault } from '@/vault';

class EventManager extends PromiseManager {
  constructor() {
    super();
  }

  init() {
    this.addNextPromise(addVersionInfo, checkPageMode);
    this.addNextPromise(initLink);
    this.addNextPromise(initSwiper, initEvent, initModal);
    this.addNextPromise(initButton, initSeriesContent);
  }

  toNextPage() {
    this.addNextPromise((p: Vault) => {
      const { swiper } = p;
      swiper!.slideNext();
      return;
    });
  }

  toPrevPage() {
    this.addNextPromise((p: Vault) => {
      const { swiper } = p;
      swiper!.slidePrev();
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
