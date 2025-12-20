import { Base } from '@/core/base';

import type { PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param } from '@/vault';

import { sleep, isPromiseFuncResult, newAllPromise } from '@/utils';

export class PromiseManager extends Base {
  private promiseList: PromiseFunc[][] = [];
  private promiseListCurrent: PromiseFunc[] = [];

  private isActive = false;

  constructor() {
    super();
  }

  protected log(msg: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(msg);
    }
  }

  protected async initPromise(): Promise<void> {
    this.log('Promise Init Start');

    this.isActive = true;

    while (this.promiseList.length > 0) {
      this.log('Promise Start');

      this.promiseListCurrent = this.promiseList.shift() || [];

      while (this.promiseListCurrent.length > 0) {
        try {
          const result: PromiseFuncResult[] = await Promise.all(
            this.promiseListCurrent.map((f) => f(this.p)),
          );

          this.promiseListCurrent = result.reduce((acc, r) => {
            const resultType = isPromiseFuncResult(r);
            switch (resultType) {
              case 'void':
                return acc as PromiseFunc[];
              case 'Function':
                return [...(acc as PromiseFunc[]), r as PromiseFunc];
              case 'FunctionArray':
                return (acc as PromiseFunc[]).concat(r as PromiseFunc[]);
              case 'Param':
                this.p = Object.assign(this.p, r as Param);
                return acc as PromiseFunc[];
            }
          }, [] as PromiseFunc[]) as PromiseFunc[];

          this.log('Result : ');
          this.log(result);
          this.log('Current Param : ');
          this.log(this.p);
          this.log('============================');
        } catch (e) {
          console.log(e);

          this.log('No Loop For Development Mode');

          if (process.env.NODE_ENV === 'development') {
            this.promiseListCurrent = [];
            break;
          }

          await sleep(1000);
        }
      }
      this.log('Promise End');
    }
    this.log('Promise Init End');
    this.log('Save Config Finish');

    this.p.c.saveConfig();

    this.isActive = false;
  }

  protected addNextPromise(...promiseFuncList: PromiseFunc[]) {
    this.promiseList.push(promiseFuncList);
  }

  // protected addNextPromiseCondition(...promiseFunc: PromiseFuncCondition[]) {
  //   this.promiseListCondition.push(...promiseFunc);
  // }
}
