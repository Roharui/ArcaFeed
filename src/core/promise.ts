import { sleep } from '@/utils/sleep';
import { Vault } from '@/vault';

export class PromiseManager {
  promiseListCurrent: Function[] = [];
  promiseList: Function[][] = [];

  isActive = false;

  async initPromise() {
    if (this.isActive) return;
    console.log('Promise Init Start');

    let vault = new Vault();

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
  }

  addPromiseCurrent(...promiseFuncList: Function[]) {
    if (this.isActive) {
      this.promiseListCurrent.unshift(...promiseFuncList);
    } else {
      console.error(new Error('Promise is not active'));
    }
  }

  addNextPromise(promiseFuncList: Function[]) {
    this.promiseList.push(promiseFuncList);
    setTimeout(() => this.initPromise(), 100);
  }
}
