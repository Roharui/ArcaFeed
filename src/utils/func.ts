import { ArcaFeed } from '@/core';

import type {
  Condition,
  ConditionFuncResult,
  PromiseFunc,
  PromiseFuncResult,
} from '@/types';

import type { Param } from '@/vault';

import { isNotNull } from './type';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===

type ConditionsKeys =
  | 'HREF'
  | 'CHANNEL'
  | 'ARTICLE'
  | 'SWIPER'
  | 'NEXTURL'
  | 'PREVURL';

function conditions(keys: ConditionsKeys): Condition {
  if (keys === 'HREF') {
    return ({ v }: Param) => (v.href.mode === 'NOT_CHECKED' ? 'wait' : 'run');
  }

  if (keys === 'CHANNEL') {
    return ({ v }: Param) =>
      v.href.mode === 'NOT_CHECKED'
        ? 'wait'
        : v.href.mode === 'CHANNEL'
          ? 'run'
          : 'skip';
  }
  if (keys === 'ARTICLE') {
    return ({ v }: Param) =>
      v.href.mode === 'NOT_CHECKED'
        ? 'wait'
        : v.href.mode === 'ARTICLE'
          ? 'run'
          : 'skip';
  }

  if (keys === 'SWIPER') {
    return ({ v }: Param) => (!!v.swiper ? 'run' : 'wait');
  }

  if (keys === 'NEXTURL') {
    return ({ v }: Param) => (isNotNull(v.nextArticleUrl) ? 'run' : 'wait');
  }

  if (keys === 'PREVURL') {
    return ({ v }: Param) => (isNotNull(v.prevArticleUrl) ? 'run' : 'wait');
  }

  return () => 'skip';
}

function conditionMaker(...keys: ConditionsKeys[]): Condition {
  return ({ v }: Param): ConditionFuncResult => {
    const results = keys.map((key) => conditions(key)({ v } as Param));

    if (results.includes('skip')) return 'skip';
    if (results.every((result) => result === 'run')) return 'run';

    return 'wait';
  };
}

export function wrapperFunction(
  keys: ConditionsKeys[],
  func: PromiseFunc,
): PromiseFunc {
  const result = async function (p: Param): Promise<PromiseFuncResult> {
    ArcaFeed.log(
      'Wrapper Function:',
      keys,
      func.name,
      conditionMaker(...keys)(p),
    );
    if (conditionMaker(...keys)(p) === 'run') return func(p);
    if (conditionMaker(...keys)(p) === 'skip') return;

    // Wait Condition
    return wrapperFunction(keys, func);
  };
  return Object.defineProperty(result, 'name', {
    value: func.name.replace('Feature', ''),
  });
}
