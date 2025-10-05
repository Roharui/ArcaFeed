import { PromiseManager } from '@/core/promise';

import { checkPageMode } from '@/utils/regex';
import { initSwiper } from '@/feature/swiper/swiper';
import { initLink } from '@/feature/article';
import { initPage } from '@/feature/swiper';
import { initEvent } from '@/feature/event';

import type { PromiseFunc } from '@/types';

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
