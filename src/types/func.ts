import type { Param } from '@/vault';

type PromiseFuncResultObj = Param | PromiseFunc;
type PromiseFuncResult =
  | void
  | PromiseFuncResultObj
  | Array<PromiseFuncResultObj>;

type ConditionFuncResult = 'wait' | 'skip' | 'run';

type Condition = (p: Param) => ConditionFuncResult;

type PromiseFunc = (p: Param) => Promise<PromiseFuncResult> | PromiseFuncResult;

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type {
  PromiseFunc,
  PromiseFuncResult,
  Condition,
  ConditionFuncResult,
  MethodKeys,
};
