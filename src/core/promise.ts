import { Base } from '@/core/base';

import type { PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param } from '@/vault';

import { sleep, isPromiseFuncResult } from '@/utils';

import { ArcaFeed } from '.';

export class PromiseManager extends Base {
  private promiseList: PromiseFunc[][] = [];
  private promiseListCurrent: PromiseFunc[] = [];

  private active: boolean = false;

  constructor() {
    super();
  }

  protected async initPromise(): Promise<void> {
    this.active = true;
    ArcaFeed.log('Promise Init Start');

    while (this.promiseList.length > 0) {
      ArcaFeed.log('Promise Start');

      this.promiseListCurrent = this.promiseList.shift() || [];
      let count = 0;

      while (this.promiseListCurrent.length > 0) {
        ArcaFeed.log('Running Promise List : ');
        ArcaFeed.log(this.promiseListCurrent.map((f) => f.name).join(' , '));

        try {
          const result: PromiseFuncResult[] = await Promise.all(
            this.promiseListCurrent.map((f) => f(this.p)),
          );

          this.promiseListCurrent = result.flat().reduce((acc, r) => {
            const resultType = isPromiseFuncResult(r);
            switch (resultType) {
              case 'void':
                return acc as PromiseFunc[];
              case 'Function':
                return [...(acc as PromiseFunc[]), r as PromiseFunc];
              case 'Param':
                this.p = Object.assign(this.p, r as Param);
                return acc as PromiseFunc[];
            }
          }, [] as PromiseFunc[]) as PromiseFunc[];

          ArcaFeed.log('Result : ');
          ArcaFeed.log(result);
          ArcaFeed.log('Current Param : ');
          ArcaFeed.log(this.p);
          ArcaFeed.log('============================');
        } catch (e) {
          ArcaFeed.log(e);

          ArcaFeed.log('No Loop For Development Mode');

          if (process.env.NODE_ENV === 'development') {
            this.promiseListCurrent = [];
            break;
          }

          await sleep(1000);
        }

        if (count++ >= 50) {
          ArcaFeed.log('Too Many Loop Breaker');
          break;
        }
      }
      ArcaFeed.log('Promise End');
    }
    ArcaFeed.log('Promise Init End');
    ArcaFeed.log('Save Config Finish');

    this.p.c.saveConfig();

    this.active = false;
  }

  protected addNextPromise(...promiseFuncList: PromiseFunc[]) {
    if (this.active) return;
    this.promiseList.push(promiseFuncList);
  }
}
