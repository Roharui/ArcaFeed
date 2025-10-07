import { PromiseManager } from '@/core/promise';

import { initLink } from '@/feature/article';
import { initSwiper, initPage } from '@/feature/swiper';
import { initEvent, initModal, initButton, initSeries } from '@/feature';

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
      checkPageMode,
      initSwiper,
      initSeries,
      initLink,
      initPage,
      initEvent,
      initButton,
      initModal
    ]);

    await this.initPromise();
  }

  static async runPromise(...func: PromiseFunc[]) {
    Helper.instance.addNextPromise(func);
    await Helper.instance.initPromise();
  }
}

export { Helper };
