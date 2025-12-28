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
    this.addNextPromise(initEnableSeries, () => window.location.reload());
  }

  disableSeries() {
    this.addNextPromise(initDisableSeries, () => window.location.reload());
  }

  checkModal() {
    this.addNextPromise(initCheckModal, initLink, () =>
      toggleArticleFilterModal(),
    );
  }
}

export { EventManager };
