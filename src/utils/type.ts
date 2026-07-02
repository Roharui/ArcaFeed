import type { PromiseFuncResult } from '@/types';

function getRegexMatchByIndex(
  match: RegExpMatchArray | null,
  index: number,
): string {
  const result = match?.[index];
  if (typeof result === 'string') return result;
  throw Error('Regex match failed');
}

function getRegexMatchByIndexTry(
  match: RegExpMatchArray | null,
  index: number,
  instade: string,
): string {
  const result = match?.[index];
  return typeof result === 'string' ? result : instade;
}

function checkNotNull<T>(obj: T | null | undefined): T {
  if (obj != null) return obj;
  throw Error('this Object is Null');
}

function isPromiseFuncResult(
  r: PromiseFuncResult,
): 'Function' | 'Param' | 'void' {
  if (typeof r === 'function') return 'Function';
  if (r === undefined || r === null) return 'void';
  if (typeof r === 'object') return 'Param';
  return 'void';
}

function getArrayItem<T>(arr: T[], idx: number): T {
  const item = arr.at(idx);
  if (item === undefined) {
    throw Error(`Array access failed: idx=${idx}, len=${arr.length}`);
  }
  return item;
}

export {
  checkNotNull,
  isPromiseFuncResult,
  getArrayItem,
  getRegexMatchByIndex,
  getRegexMatchByIndexTry,
};
