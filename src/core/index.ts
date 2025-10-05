import { PromiseManager } from '@/core/promise';
import { initEvent } from '@/feature/event';
import { checkPageMode } from '@/utils/regex';

class Helper extends PromiseManager {
  constructor() {
    super();
  }

  async init() {
    this.addNextPromise([
      checkPageMode,
      initEvent
    ]);

    await this.initPromise();
  }
}

export { Helper };
