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
import type { Param, VaultWithSwiper } from '@/vault';

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

  renderNextPage() {
    this.addNextPromise(toNextLink);
  }

  renderPrevPage() {
    this.addNextPromise(toPrevLink);
  }
}

export { EventManager };
