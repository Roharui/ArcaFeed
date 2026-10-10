import type { PageMode, PromiseFunc } from '@/types';
import type { VaultAdapter } from '@/vault';
import {
  clearSkippedToast,
  queueSkippedToast,
  showSkippedToast,
  skippedToastURL,
} from './skip-toast';

const navigatingVaults = new WeakSet<VaultAdapter>();

// For Event
function nextLinkForce(p: VaultAdapter) {
  return toLink('NEXT')(p);
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return (p: VaultAdapter): void => {
    if (navigatingVaults.has(p)) return;
    const { activeIndex, articleList } = p;

    const idx = activeIndex;
    const list = articleList;

    const nextIdx = p.getAdjacentArticleIndex(mode);
    const url = list[nextIdx];
    let skipped = 0;
    if (mode === 'NEXT' && p.skipVisitedArticles) {
      const currentPath = `/b/${p.href.channelId}/${p.href.articleId}`;
      const end = nextIdx === -1 ? list.length : nextIdx;
      for (let index = idx + 1; index < end; index++) {
        const path = list[index]!;
        if (path !== currentPath && p.reading.hasVisited(path)) skipped++;
      }
    }
    if (!url) {
      p.swiper?.slideTo(1, 0, false);
      if (skipped > 0) showSkippedToast(skipped);
      return;
    }
    p.activeIndex = nextIdx;
    p.flushSave();
    navigatingVaults.add(p);
    queueSkippedToast(url, skipped);
    try {
      window.location.replace(
        skippedToastURL(`${url}${p.searchQuery}`, skipped),
      );
    } catch (error) {
      clearSkippedToast();
      navigatingVaults.delete(p);
      p.activeIndex = idx;
      p.flushSave();
      throw error;
    }
  };
}

export { nextLinkForce, toLink };
