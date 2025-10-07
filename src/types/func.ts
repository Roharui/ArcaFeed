import type { Param } from '@/vault';

type PromiseFuncResult = Param | void | PromiseFunc | PromiseFunc[]
type PromiseFunc = (p: Param) => Promise<PromiseFuncResult> | PromiseFuncResult;

export type { PromiseFunc, PromiseFuncResult };
