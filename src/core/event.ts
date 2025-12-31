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
  initSwiperPage,
  initSeriesBtnCss,
  initUi,
  initCloseModal,
  initCheckFilterModal,
} from '@/feature';
import { checkPageMode } from '@/utils';

import type { Vault } from '@/vault';

class EventManager extends PromiseManager {
  constructor() {
    super();
  }

  // Init Event

  init() {
    this.addNextPromise(addVersionInfo, checkPageMode);
    this.addNextPromise(
      initLink,
      initButton,
      initEvent,
      initSeriesContent,
      initUi,
    );
    this.addNextPromise(initSwiper);
  }

  // Keyboard Events

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

  // Page Events

  toNextLinkForce() {
    this.addNextPromise(nextLinkForce);
  }

  renderNextPage() {
    this.addNextPromise(toLink('NEXT'));
  }

  renderPrevPage() {
    this.addNextPromise(toLink('PREV'));
  }

  // Series Events

  enableSeries() {
    this.addNextPromise(initEnableSeries);
    this.addNextPromise(initSeriesBtnCss, initSwiperPage);
  }

  disableSeries() {
    this.addNextPromise(initDisableSeries);
    this.addNextPromise(initSeriesBtnCss, initSwiperPage);
  }

  // Modal Events

  showModal() {
    this.addNextPromise(initModal);
  }

  checkFilterModal() {
    this.addNextPromise(initCheckFilterModal, initLink, initCloseModal);
  }

  checkUIModal() {
    this.addNextPromise(initUi, initCloseModal);
  }

  closeModal() {
    this.addNextPromise(initCloseModal);
  }
}

export { EventManager };
