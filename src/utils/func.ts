import type { PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param } from '@/vault';
import { isPromiseFuncResult } from './type';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function newAllPromise(...promiseFuncList: PromiseFunc[]): PromiseFunc {
  return async (p: Param) => {
    const result = await Promise.all(promiseFuncList.map((f) => f(p)));

    let resultObj = {};
    let funcArray: PromiseFunc[] = [];

    result.forEach((res) => {
      const type = isPromiseFuncResult(res);

      if (type === 'Function') {
        funcArray.push(res as PromiseFunc);
      }
      if (type === 'FunctionArray') {
        funcArray.push(...(res as PromiseFunc[]));
      }

      if (type === 'Param') {
        resultObj = Object.assign(resultObj, res);
      }
    });

    return [(_: Param) => resultObj as Param, ...funcArray];
  };
}
