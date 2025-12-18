import { PromiseManager } from '@/core/promise';

import { initLink } from '@/feature/article';
import { initSwiper, initPage, initSlide } from '@/feature/swiper';
import {
  initEvent,
  initModal,
  initButton,
  initSeries,
  addVersionInfo,
} from '@/feature';

import type { PromiseFunc } from '@/types';

import { checkPageMode } from '@/utils';

class Helper extends PromiseManager {
  private static instance: Helper;

  constructor() {
    super();
    Helper.instance = this;
  }

  async init() {
    this.addNextPromise([
      addVersionInfo,
      checkPageMode,
      initSwiper,
      initSeries,
      initLink,
      initSlide,
      initPage,
      initEvent,
      initButton,
      initModal,
    ]);

    await this.initPromise();
  }

  static async runPromise(...func: PromiseFunc[]) {
    Helper.instance.addNextPromise(func);
    await Helper.instance.initPromise();
  }
}

export { Helper };
