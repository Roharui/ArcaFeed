import { Base } from '@/core/base';

import type { PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param } from '@/vault';

import { sleep, isPromiseFuncResult } from '@/utils';

import { ArcaFeed } from '.';

export class PromiseManager extends Base {
  private promiseList: PromiseFunc[] = [];

  private active: boolean = false;

  constructor() {
    super();
  }

  protected async initPromise(): Promise<void> {
    if (this.active) return;

    this.active = true;

    ArcaFeed.log('Promise Start');
    let count = 0;

    while (this.promiseList.length > 0) {
      ArcaFeed.log('Running Promise List : ');
      ArcaFeed.log(this.promiseList.map((f) => f.name).join(' , '));

      try {
        const result: PromiseFuncResult[] = await Promise.all(
          this.promiseList.map((f) => f(this.p)),
        );

        this.promiseList = result.flat().reduce((acc, r) => {
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
        if (ArcaFeed.isDev()) {
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
    ArcaFeed.log('Save Config Finish');

    this.p.c.saveConfig();

    this.active = false;
  }

  protected addNextPromise(...promiseFuncList: PromiseFunc[]) {
    if (this.active) return;
    this.promiseList.push(...promiseFuncList);
  }
}
