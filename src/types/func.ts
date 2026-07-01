import type { VaultAdapter } from '@/vault';

type PromiseFuncResultObj = VaultAdapter | PromiseFunc;
type PromiseFuncResult =
  | void
  | PromiseFuncResultObj
  | Array<PromiseFuncResultObj>;

type ConditionFuncResult = 'wait' | 'skip' | 'run';

type Condition = (p: VaultAdapter) => ConditionFuncResult;

type PromiseFunc = (
  p: VaultAdapter,
) => Promise<PromiseFuncResult> | PromiseFuncResult;

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
