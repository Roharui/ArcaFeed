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
  nextLinkForce,
  initEnableSeries,
  initDisableSeries,
  toggleArticleFilterModal,
  initCheckModal,
  initSwiperPage,
  initSeriesBtnCss,
} from '@/feature';
import { checkPageMode } from '@/utils';

import type { Vault } from '@/vault';

class EventManager extends PromiseManager {
  constructor() {
    super();
  }

  init() {
    this.addNextPromise(addVersionInfo, checkPageMode);
    this.addNextPromise(
      initLink,
      initModal,
      initButton,
      initEvent,
      initSeriesContent,
    );
    this.addNextPromise(initSwiper);
  }

  toNextPage() {
    this.addNextPromise((p: Vault) => {
      p.swiper!.slideNext();
      return;
    });
  }

  toPrevPage() {
    this.addNextPromise((p: Vault) => {
      p.swiper!.slidePrev();
      return;
    });
  }

  toNextLinkForce() {
    this.addNextPromise(nextLinkForce);
  }

  renderNextPage() {
    this.addNextPromise(toLink('NEXT'));
  }

  renderPrevPage() {
    this.addNextPromise(toLink('PREV'));
  }

  enableSeries() {
    this.addNextPromise(initEnableSeries);
    this.addNextPromise(initSeriesBtnCss, initSwiperPage);
  }

  disableSeries() {
    this.addNextPromise(initDisableSeries);
    this.addNextPromise(initSeriesBtnCss, initSwiperPage);
  }

  checkModal() {
    this.addNextPromise(initCheckModal, initLink, () =>
      toggleArticleFilterModal(),
    );
  }
}

export { EventManager };
