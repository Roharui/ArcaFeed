import { getArrayItem } from '@/utils';

import type { PageMode, PromiseFunc } from '@/types';
import type { Vault } from '@/vault';

// For Event
function nextLinkForce(p: Vault) {
  window.location.replace(
    getArrayItem(p.articleList, p.activeIndex + 1) + p.searchQuery,
  );
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return (p: Vault): void => {
    const { activeIndex, articleList } = p;

    const idx = activeIndex;
    const list = articleList;

    const nextIdx = idx + (mode === 'NEXT' ? 1 : -1);
    const url = getArrayItem(list, nextIdx);

    window.location.replace(`${url}${p.searchQuery}`);
  };
}

export { nextLinkForce, toLink };
