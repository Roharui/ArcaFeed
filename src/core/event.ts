import { StepRunner } from '@/core/step-runner';

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
  initEnableScrapSeries,
  initSwiperPage,
  initSeriesBtnCss,
  initUi,
  initCloseModal,
  initCheckFilterModal,
  initCheckUIModal,
} from '@/feature';
import { checkPageMode } from '@/utils';

import type { Step } from '@/core/step-runner';
import type { VaultAdapter } from '@/vault';

class EventManager {
  runner: StepRunner;

  constructor() {
    this.runner = new StepRunner();
  }

  // Init Event

  init(): Step[] {
    return [
      [addVersionInfo, checkPageMode],
      [initLink, initButton, initEvent, initSeriesContent, initUi],
      initSwiper,
    ];
  }

  // Keyboard Events

  toNextPage(): Step[] {
    return [
      (p: VaultAdapter) => {
        p.swiper!.slideNext();
      },
    ];
  }

  toPrevPage(): Step[] {
    return [
      (p: VaultAdapter) => {
        p.swiper!.slidePrev();
      },
    ];
  }

  // Page Events

  toNextLinkForce(): Step[] {
    return [nextLinkForce];
  }

  renderNextPage(): Step[] {
    return [toLink('NEXT')];
  }

  renderPrevPage(): Step[] {
    return [toLink('PREV')];
  }

  // Series Events

  enableSeries(): Step[] {
    return [initEnableSeries, [initSeriesBtnCss, initSwiperPage]];
  }

  enableScrapSeries(): Step[] {
    return [initEnableScrapSeries];
  }

  // Modal Events

  showModal(): Step[] {
    return [initModal];
  }

  checkFilterModal(): Step[] {
    return [[initCheckFilterModal, initLink, initCloseModal], initSwiperPage];
  }

  checkUIModal(): Step[] {
    return [[initCheckUIModal, initUi, initCloseModal]];
  }

  closeModal(): Step[] {
    return [initCloseModal];
  }

  // toggle Swiper

  toggleSwiper(): Step[] {
    return [
      (p: VaultAdapter) => {
        if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;

        const pageFilter = p.articleFilterConfig[p.href.channelId] || {
          tab: [],
          title: [],
          disableSwiper: false,
        };

        pageFilter.disableSwiper = !pageFilter.disableSwiper;

        p.articleFilterConfig[p.href.channelId] = pageFilter;

        p.flushSave();

        window.location.reload();
      },
    ];
  }
}

export { EventManager };
