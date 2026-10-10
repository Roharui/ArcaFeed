import type { PageMode, PromiseFunc } from '@/types';
import type { VaultAdapter } from '@/vault';
import {
  clearSkippedToast,
  queueSkippedToast,
  showSkippedToast,
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
    const skipped =
      mode === 'NEXT' && p.skipVisitedArticles
        ? list
            .slice(idx + 1, nextIdx === -1 ? undefined : nextIdx)
            .filter(
              (path) =>
                path !== `/b/${p.href.channelId}/${p.href.articleId}` &&
                p.reading.hasVisited(path),
            ).length
        : 0;
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
      window.location.replace(`${url}${p.searchQuery}`);
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
