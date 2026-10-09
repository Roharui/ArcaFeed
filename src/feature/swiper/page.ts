import type { PageMode, PromiseFunc } from '@/types';
import type { VaultAdapter } from '@/vault';

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

    const nextIdx = idx + (mode === 'NEXT' ? 1 : -1);
    const url = list[nextIdx];
    if (!url) {
      p.swiper?.slideTo(1, 0, false);
      return;
    }
    p.activeIndex = nextIdx;
    p.flushSave();
    navigatingVaults.add(p);
    try {
      window.location.replace(`${url}${p.searchQuery}`);
    } catch (error) {
      navigatingVaults.delete(p);
      p.activeIndex = idx;
      p.flushSave();
      throw error;
    }
  };
}

export { nextLinkForce, toLink };
