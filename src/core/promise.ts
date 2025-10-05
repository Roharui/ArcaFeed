
import { Base } from './base';
import { sleep } from '@/utils/sleep';

import type { PromiseFunc, PromiseFuncResult } from '@/types';
import { isPromiseFuncResult } from '@/utils/type';
import type { Param } from '@/vault';

export class PromiseManager extends Base {
  promiseListCurrent: PromiseFunc[] = [];
  promiseList: PromiseFunc[][] = [];

  isActive = false;

  constructor() {
    super();
  }

  async initPromise(): Promise<void> {
    console.log('Promise Init Start');

    this.isActive = true;

    while (this.promiseList.length > 0) {
      console.log('Promise Start');

      this.promiseListCurrent = this.promiseList.shift() || [];

      while (this.promiseListCurrent.length > 0) {
        const promiseFunc = this.promiseListCurrent.shift();

        if (!promiseFunc) continue;

        try {
          const result: PromiseFuncResult = await promiseFunc(this.p);

          switch (isPromiseFuncResult(result)) {
            case 'void':
              break;
            case 'Function':
              this.addPromiseCurrent(result as PromiseFunc);
              break;
            case 'FunctionArray':
              this.addPromiseCurrent(...result as PromiseFunc[]);
              break;
            case 'Param':
              this.p = result as Param;
              break;
          }
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

    this.isActive = false;
  }

  addPromiseCurrent(...promiseFuncList: PromiseFunc[]) {
    if (this.isActive) {
      this.promiseListCurrent.unshift(...promiseFuncList);
    } else {
      console.error(new Error('Promise is not active'));
    }
  }

  addNextPromise(promiseFuncList: PromiseFunc[]) {
    this.promiseList.push(promiseFuncList);
  }
}
