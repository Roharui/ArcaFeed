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

  private log(msg: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(msg);
    }
  }

  async initPromise(): Promise<void> {
    this.log('Promise Init Start');

    this.isActive = true;

    while (this.promiseList.length > 0) {
      this.log('Promise Start');

      this.promiseListCurrent = this.promiseList.shift() || [];

      while (this.promiseListCurrent.length > 0) {
        const promiseFunc = this.promiseListCurrent.shift();

        if (!promiseFunc) continue;

        try {
          const result: PromiseFuncResult = await promiseFunc(this.p);

          const resultType = isPromiseFuncResult(result);
          switch (resultType) {
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

          if (process.env.NODE_ENV === 'development') {
            this.log('PromiseFunc : ');
            this.log(promiseFunc);
            this.log('Result : ');
            this.log(result);
            this.log('Result Type : ' + resultType);
            this.log('Current Param : ');
            this.log(this.p);
            this.log('============================');
          }
        } catch (e) {
          console.log(e);

          this.log('No Loop For Development Mode');

          if (process.env.NODE_ENV === 'development') {
            this.promiseListCurrent = [];
            break;
          }

          await sleep(1000);
          this.promiseListCurrent.unshift(promiseFunc);
        }
      }
      this.log('Promise End');
    }
    this.log('Promise Init End');
    this.log('Save Config Finish');

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
