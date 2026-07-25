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
  initCheckSubscribeModal,
  initStartHomeSeries,
  loadMoreHomeSeriesArticles,
} from '@/feature';
import { createDefaultArticleFilter } from '@/vault/schema';

import type { Step } from '@/core/step-runner';
import type { VaultAdapter } from '@/vault';

class EventManager {
  readonly runner: StepRunner;

  constructor() {
    this.runner = new StepRunner();
  }

  // Init Event

  init(): Step[] {
    return [
      addVersionInfo,
      [initLink, initButton, initEvent, initSeriesContent, initUi],
      initSwiper,
    ];
  }

  // Keyboard Events

  toNextPage(): Step[] {
    return [
      (p: VaultAdapter) => {
        p.swiper?.slideNext();
      },
    ];
  }

  toPrevPage(): Step[] {
    return [
      (p: VaultAdapter) => {
        p.swiper?.slidePrev();
      },
    ];
  }

  // Page Events

  toNextLinkForce(): Step[] {
    return [nextLinkForce];
  }

  renderNextPage(): Step[] {
    const navigateNext = toLink('NEXT');
    return [
      async (p: VaultAdapter) => {
        if (p.seriesSource === 'home' && !p.isNextPageActive()) {
          await loadMoreHomeSeriesArticles(p);
        }

        if (!p.isNextPageActive()) {
          navigateNext(p);
          initSwiperPage(p);
          return;
        }

        await navigateNext(p);
      },
    ];
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
    return [initCheckFilterModal, [initLink, initCloseModal], initSwiperPage];
  }

  checkUIModal(): Step[] {
    return [initCheckUIModal, [initUi, initCloseModal]];
  }

  checkSubscribeModal(): Step[] {
    return [initCheckSubscribeModal, initCloseModal, initStartHomeSeries];
  }

  closeModal(): Step[] {
    return [initCloseModal];
  }

  // toggle Swiper

  toggleSwiper(): Step[] {
    return [
      (p: VaultAdapter) => {
        if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;

        const existingFilter =
          p.articleFilterConfig[p.href.channelId] ??
          createDefaultArticleFilter();

        const pageFilter = {
          ...existingFilter,
          disableSwiper: !existingFilter.disableSwiper,
        };

        p.articleFilterConfig = {
          ...p.articleFilterConfig,
          [p.href.channelId]: pageFilter,
        };

        p.flushSave();

        window.location.reload();
      },
    ];
  }
}

export { EventManager };
