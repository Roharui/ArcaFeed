import type { PromiseFuncResult } from '@/types';

function isString(str: string | null | undefined): str is string {
  return !!str;
}

function getRegexMatchByIndex(
  match: RegExpMatchArray | null,
  index: number,
): string {
  if (!match) throw Error('Regex Match is null');
  if (match.length < index) throw Error('Regex Match index is Over');

  const result = match[index];

  if (isString(result)) {
    return result;
  }

  throw Error('Regex Metch is Not String');
}

function getRegexMatchByIndexTry(
  match: RegExpMatchArray | null,
  index: number,
  instade: string,
): string {
  try {
    if (!match) throw Error('Regex Match is null');
    if (match.length < index) throw Error('Regex Match index is Over');

    const result = match[index];

    if (isString(result)) {
      return result;
    }

    throw Error('Regex Metch is Not String');
  } catch (e) {
    return instade;
  }
}

function isNotNull<T>(obj: T | null | undefined): obj is T {
  if (!obj) return false;
  return true;
}

function checkNotNull<T>(obj: T | null | undefined): T {
  if (isNotNull(obj)) return obj;

  throw Error('this Object is Null');
}

function isPromiseFuncResult(
  r: PromiseFuncResult,
): 'Function' | 'Param' | 'void' {
  if (typeof r === 'function') return 'Function';

  if (r === undefined || r === null) return 'void';

  if (typeof r === 'object') return 'Param';

  throw Error('PromiseFuncResult is Not Availe : ' + r);
}

export {
  isString,
  isNotNull,
  checkNotNull,
  isPromiseFuncResult,
  getRegexMatchByIndex,
  getRegexMatchByIndexTry,
};
