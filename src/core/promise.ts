import { Base } from '@/core/base';

import type {
  PromiseFunc,
  PromiseFuncCondition,
  PromiseFuncResult,
} from '@/types';
import type { Param } from '@/vault';

import { sleep, isPromiseFuncResult, newAllPromise } from '@/utils';

export class PromiseManager extends Base {
  private promiseList: PromiseFunc[][] = [];
  private promiseListCurrent: PromiseFunc[] = [];
  private promiseListCondition: PromiseFuncCondition[] = [];

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

          this.log('PromiseFunc : ');
          this.log(promiseFunc);
          this.log('Result : ');
          this.log(result);
          this.log('Result Type : ' + resultType);
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

  // protected async initPromiseByCondition(): Promise<void> {
  //   this.log('Promise Condition Init Start');

  //   this.isActive = true;

  //   let i = 0;
  //   while (this.promiseListCondition.length > 0) {
  //     this.log('Promise Start');

  //     const conditionFuncList = this.promiseListCondition
  //       .filter(([_, conditon]) => conditon(this.p))
  //       .map(([func, _]) => func);
  //     this.promiseListCondition = this.promiseListCondition.filter(
  //       ([_, conditon]) => !conditon(this.p),
  //     );

  //     if (conditionFuncList.length === 0) {
  //       this.log('No Condition Met, Break Loop');
  //       break;
  //     }

  //     try {
  //       const result = await newAllPromise(...conditionFuncList)(this.p);

  //       this.p = Object.assign(this.p, result[0] as Param);

  //       const resultArray = result[1] as PromiseFunc[];
  //       this.promiseListCondition.push(
  //         ...(resultArray.map((func) => [
  //           func,
  //           () => true,
  //         ]) as PromiseFuncCondition[]),
  //       );

  //       this.log('PromiseFunc : ');
  //       this.log(conditionFuncList);
  //       this.log('Result : ');
  //       this.log(result);
  //       this.log('Current Param : ');
  //       this.log(this.p);
  //       this.log('============================');
  //     } catch (e) {
  //       console.log(e);

  //       this.log('No Loop For Development Mode');

  //       if (process.env.NODE_ENV === 'development') {
  //         break;
  //       }

  //       await sleep(1000);
  //     }

  //     if (i++ > 10) {
  //       this.log('Too Many Loops, Break Loop');
  //       break;
  //     }
  //     this.log('Promise End');
  //   }
  //   this.log('Promise Init End');
  //   this.log('Save Config Finish');

  //   this.log('Promise Condition Reset');
  //   this.promiseListCondition = [];

  //   this.p.c.saveConfig();

  //   this.isActive = false;
  // }

  private addPromiseCurrent(...promiseFuncList: PromiseFunc[]) {
    if (this.isActive) {
      this.promiseListCurrent.unshift(...promiseFuncList);
    } else {
      console.error(new Error('Promise is not active'));
    }
  }

  protected addNextPromise(...promiseFuncList: PromiseFunc[]) {
    this.promiseList.push(promiseFuncList);
  }

  // protected addNextPromiseCondition(...promiseFunc: PromiseFuncCondition[]) {
  //   this.promiseListCondition.push(...promiseFunc);
  // }
}
