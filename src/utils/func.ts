import type {
  Condition,
  PromiseFunc,
  PromiseFuncNoFuncResult,
  PromiseFuncResult,
} from '@/types';
import type { Param } from '@/vault';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function conditionMaker(
  ...conditions: ('HREF' | 'SWIPER' | 'SLIDE' | 'URL')[]
): Condition {
  return ({ v }: Param): boolean => {
    return (
      (!conditions.includes('HREF') ||
        (conditions.includes('HREF') && v.href.mode === 'NOT_CHECKED')) &&
      (!conditions.includes('SWIPER') ||
        (conditions.includes('SWIPER') && !!v.swiper)) &&
      (!conditions.includes('SLIDE') ||
        (conditions.includes('SLIDE') && !!v.currentSlide)) &&
      (!conditions.includes('URL') ||
        (conditions.includes('URL') &&
          !!v.nextArticleUrl &&
          !!v.prevArticleUrl))
    );
  };
}

export function wrapperFunction(
  condition: Condition,
  func: PromiseFunc,
): PromiseFunc {
  return async (p: Param): Promise<PromiseFuncResult> => {
    if (condition(p)) return func(p);
    return wrapperFunction(condition, func);
  };
}

export function newAllPromise(...promiseFuncList: PromiseFuncNoFuncResult[]) {
  return async (p: Param): Promise<Param> => {
    const result = await Promise.all(promiseFuncList.map((f) => f(p)));

    return Object.assign({}, ...result) as Param;
  };
}
