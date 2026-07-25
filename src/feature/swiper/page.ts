import { mergeSearchQuery } from '@/utils/url';
import { showToast } from '@/utils/toast';

import type { PageMode, PromiseFunc } from '@/types';
import type { VaultAdapter } from '@/vault';

// For Event
function nextLinkForce(p: VaultAdapter) {
  navigateToIndex(p, p.activeIndex + 1);
}

function navigateToIndex(p: VaultAdapter, index: number): void {
  const url = p.articleList[index];
  if (!url) {
    showToast('이동할 게시글이 없습니다.');
    return;
  }

  p.activeIndex = index;
  p.flushSave();
  window.location.replace(
    mergeSearchQuery(url, p.searchQuery, window.location.origin),
  );
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return (p: VaultAdapter): void => {
    const nextIndex = p.activeIndex + (mode === 'NEXT' ? 1 : -1);
    navigateToIndex(p, nextIndex);
  };
}

export { navigateToIndex, nextLinkForce, toLink };
