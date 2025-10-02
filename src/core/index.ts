import { PromiseManager } from '@/core/promise';
import type { Vault } from '@/vault';

class Helper {
  vault?: Vault;
  promise: PromiseManager;

  constructor() {
    this.promise = new PromiseManager();
  }

  init() {
    this.promise.addNextPromise([], this.vault);
  }
}

export { Helper };
