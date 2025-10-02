import type { PromiseFunc } from '@/types/func';

import { sleep } from '@/utils/sleep';
import { Vault } from '@/vault';

export class PromiseManager {
  promiseListCurrent: PromiseFunc[] = [];
  promiseList: PromiseFunc[][] = [];

  isActive = false;

  async initPromise(_vault?: Vault): Promise<Vault> {
    console.log('Promise Init Start');

    let vault = _vault || (new Vault() as Vault);

    this.isActive = true;

    while (this.promiseList.length > 0) {
      console.log('Promise Start');

      this.promiseListCurrent = this.promiseList.shift() || [];

      while (this.promiseListCurrent.length > 0) {
        const promiseFunc = this.promiseListCurrent.shift();

        if (!promiseFunc) continue;

        try {
          vault = await promiseFunc.call(this, vault);
        } catch (e) {
          console.log(e);

          if (process.env.NODE_ENV === 'development') {
            console.log('No Loop For Development Mode');

            this.promiseListCurrent = [];
            break;
          }

          await sleep(1000);
          this.promiseListCurrent.unshift(promiseFunc);
        }
      }
      console.log('Promise End');
    }
    console.log('Promise Init End');

    vault.saveConfig();

    this.isActive = false;

    return vault;
  }

  addPromiseCurrent(...promiseFuncList: PromiseFunc[]) {
    if (this.isActive) {
      this.promiseListCurrent.unshift(...promiseFuncList);
    } else {
      console.error(new Error('Promise is not active'));
    }
  }

  addNextPromise(promiseFuncList: PromiseFunc[], vault?: Vault) {
    this.promiseList.push(promiseFuncList);
    if (!this.isActive) setTimeout(() => this.initPromise(vault), 100);
  }
}
