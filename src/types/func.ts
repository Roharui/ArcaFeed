import type { Param } from '@/vault';

type PromiseFuncParamResult = Param | void;
type PromiseFuncResult = PromiseFuncParamResult | PromiseFunc | PromiseFunc[];

type Condition = (p: Param) => boolean;

type PromiseFunc = (p: Param) => Promise<PromiseFuncResult> | PromiseFuncResult;
type PromiseFuncNoFuncResult = (
  p: Param,
) => Promise<PromiseFuncParamResult> | PromiseFuncParamResult;

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type {
  PromiseFunc,
  PromiseFuncResult,
  Condition,
  PromiseFuncParamResult,
  PromiseFuncNoFuncResult,
  MethodKeys,
};
