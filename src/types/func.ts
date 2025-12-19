import type { Param } from '@/vault';

type PromiseFuncParamResult = Param | void;
type PromiseFuncResult = PromiseFuncParamResult | PromiseFunc | PromiseFunc[];

type PromiseFunc = (p: Param) => Promise<PromiseFuncResult> | PromiseFuncResult;
type PromiseFuncNoFuncResult = (
  p: Param,
) => Promise<PromiseFuncParamResult> | PromiseFuncParamResult;
type PromiseFuncCondition = [PromiseFunc, (p: Param) => boolean];

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type {
  PromiseFunc,
  PromiseFuncResult,
  PromiseFuncParamResult,
  PromiseFuncNoFuncResult,
  PromiseFuncCondition,
  MethodKeys,
};
