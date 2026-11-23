import type { CommandResult } from '../core/result';

type PromiseFuncResultObj<TVault = any> = TVault | PromiseFunc<TVault>;
type PromiseFuncResult<TVault = any> =
  | void
  | CommandResult
  | PromiseFuncResultObj<TVault>
  | Array<PromiseFuncResultObj<TVault>>;

type ConditionFuncResult = 'wait' | 'skip' | 'run';

type Condition<TVault = any> = (p: TVault) => ConditionFuncResult;

type PromiseFunc<TVault = any> = (
  p: TVault,
) => Promise<PromiseFuncResult<TVault>> | PromiseFuncResult<TVault>;

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
