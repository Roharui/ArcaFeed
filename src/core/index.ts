import { PromiseManager } from '@/core/promise';

class Helper {
  promise: PromiseManager;

  constructor() {
    this.promise = new PromiseManager();
  }

  init() {}
}

export { Helper };
