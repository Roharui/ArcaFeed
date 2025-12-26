import { getArrayItem } from '@/utils';

import type { PageMode, PromiseFunc, PromiseFuncResult } from '@/types';
import type { Param } from '@/vault';

// For Event
function nextLinkForce({ v, c }: Param) {
  window.location.replace(getArrayItem(c.articleList, v.activeIndex + 1));
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return ({ v, c }: Param): PromiseFuncResult => {
    const { activeIndex } = v;

    console.log(`Active Index: ${activeIndex}`);

    const idx = activeIndex + (mode === 'NEXT' ? 1 : -1);

    console.log(`Mode: ${mode}, Link Index: ${idx}`);

    const url = getArrayItem(c.articleList, idx);

    window.location.replace(url);
  };
}

export { nextLinkForce, toLink };
