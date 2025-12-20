import { PromiseManager } from '@/core/promise';

import { initLink } from '@/feature/article';
import { initSwiper, initPage, initSlide } from '@/feature/swiper';
import {
  initEvent,
  initModal,
  addVersionInfo,
  initSeriesLinkBtn,
  initSeriesContent,
  initButton,
} from '@/feature';

import { checkPageMode, isString } from '@/utils';
import type { Param, Vault, VaultWithSwiper } from '@/vault';
import type { PromiseFunc } from '@/types';
import { ArcaFeed } from '.';

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
      const { swiper } = v as VaultWithSwiper;
      swiper.slideNext();
      return;
    });
  }

  toPrevPage() {
    this.addNextPromise(({ v }: Param) => {
      const { swiper } = v as VaultWithSwiper;
      swiper.slidePrev();
      return;
    });
  }

  renderNextPage() {
    this.addNextPromise(({ v, c }: Param): void | PromiseFunc => {
      const { nextArticleUrl } = v;
      const url = nextArticleUrl;

      if (!isString(url)) {
        ArcaFeed.log('No url at toLink');
        return;
      }

      if (c.isSlideMode('REFRESH')) {
        window.location.replace(url);
        return;
      } else {
        return;
        // return pageRender(mode);
      }
    });
  }

  renderPrevPage() {
    this.addNextPromise(({ v, c }: Param): void | PromiseFunc => {
      const { prevArticleUrl } = v;
      const url = prevArticleUrl;

      if (!isString(url)) {
        ArcaFeed.log('No url at toLink');
        return;
      }

      if (c.isSlideMode('REFRESH')) {
        window.location.replace(url);
        return;
      } else {
        return;
        // return pageRender(mode);
      }
    });
  }
}

export { EventManager };
