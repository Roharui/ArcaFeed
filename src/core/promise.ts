import { Base } from '@/core/base';

import type { PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param } from '@/vault';

import { sleep, isPromiseFuncResult } from '@/utils';

export class PromiseManager extends Base {
  private promiseListCurrent: PromiseFunc[] = [];
  private promiseList: PromiseFunc[][] = [];

  private isActive = false;

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
              this.addPromiseCurrent(...(result as PromiseFunc[]));
              break;
            case 'Param':
              this.p = Object.assign(this.p, result as Param);
              break;
          }

          console.log('PromiseFunc : ');
          console.log(promiseFunc);
          console.log('Result : ');
          console.log(result);
          console.log('Result Type : ' + isPromiseFuncResult(result));
          console.log('Current Param : ');
          console.log(this.p);
          console.log('============================');
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

    console.log('Save Config Finish');
    this.p.c.saveConfig();

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
