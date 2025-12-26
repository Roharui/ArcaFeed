import { getArrayItem } from '@/utils';

import type { PageMode, PromiseFunc } from '@/types';
import type { Vault } from '@/vault';

// For Event
function nextLinkForce(p: Vault) {
  window.location.replace(getArrayItem(p.articleList, p.activeIndex + 1));
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return (p: Vault): void => {
    const { activeIndex, seriesIndex, seriesList, articleList } = p;

    const idx = p.isSeriesMode() ? seriesIndex : activeIndex;
    const list = p.isSeriesMode() ? seriesList : articleList;

    const nextIdx = idx + (mode === 'NEXT' ? 1 : -1);
    const url = getArrayItem(list, nextIdx);

    window.location.replace(url);
  };
}

export { nextLinkForce, toLink };
