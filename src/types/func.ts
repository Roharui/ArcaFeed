import { Vault } from '@/vault';

type PromiseFuncResultObj = Vault | PromiseFunc;
type PromiseFuncResult =
  | void
  | PromiseFuncResultObj
  | Array<PromiseFuncResultObj>;

type ConditionFuncResult = 'wait' | 'skip' | 'run';

type Condition = (p: Vault) => ConditionFuncResult;

type PromiseFunc = (p: Vault) => Promise<PromiseFuncResult> | PromiseFuncResult;

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
