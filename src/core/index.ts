import { PromiseManager } from '@/core/promise';

import { initEvent } from '@/feature';
import { initLink } from '@/feature/article';
import { initSwiper, initPage } from '@/feature/swiper';

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
      initLink,
      initPage,
      initEvent
    ]);

    await this.initPromise();
  }

  static async runPromise(func: PromiseFunc) {
    Helper.instance.addNextPromise([func]);
    await Helper.instance.initPromise();
  }
}

export { Helper };
