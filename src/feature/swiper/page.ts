import { getArrayItem } from '@/utils';

import type { PageMode, PromiseFunc } from '@/types';
import type { VaultAdapter } from '@/vault';

// For Event
function nextLinkForce(p: VaultAdapter) {
  const url = getArrayItem(p.articleList, p.activeIndex + 1);
  p.activeIndex += 1;
  p.flushSave();
  window.location.replace(url + p.searchQuery);
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return (p: VaultAdapter): void => {
    const { activeIndex, articleList } = p;

    const idx = activeIndex;
    const list = articleList;

    const nextIdx = idx + (mode === 'NEXT' ? 1 : -1);
    const url = getArrayItem(list, nextIdx);
    p.activeIndex = nextIdx;
    p.flushSave();
    window.location.replace(`${url}${p.searchQuery}`);
  };
}

export { nextLinkForce, toLink };
