import { normalizeArticlePath } from '@/utils/regex';
import { navigate, isNavigating } from '@/feature/navigation';
import { articlePath, countSkippedVisited } from '@/vault/navigation-context';
import type { PageMode, PromiseFunc } from '@/types';
import type { VaultAdapter } from '@/vault';
import {
  clearSkippedToast,
  queueSkippedToast,
  showSkippedToast,
  skippedToastURL,
} from './skip-toast';

// For Event
function nextLinkForce(p: VaultAdapter) {
  return toLink('NEXT')(p);
}

// For Event
function toLink(mode: PageMode): PromiseFunc {
  return async (p: VaultAdapter): Promise<void> => {
    if (isNavigating(p)) return;
    const list = p.articleList;

    const nextIdx = p.getAdjacentArticleIndex(mode);
    const url = list[nextIdx];
    const skipped = mode === 'NEXT' ? countSkippedVisited(p, nextIdx) : 0;
    if (!url) {
      p.swiper?.slideTo(1, 0, false);
      if (skipped > 0) showSkippedToast(skipped);
      return;
    }
    await navigateToArticle(p, nextIdx, skipped);
  };
}

/** Jump within the current session while retaining its filters and order. */
export async function navigateToArticle(
  p: VaultAdapter,
  index: number,
  skipped = 0,
): Promise<void> {
  if (isNavigating(p) || !Number.isSafeInteger(index)) return;
  const path = p.articleList[index];
  if (!path || normalizeArticlePath(path) !== path) return;
  if (path === articlePath(p.href.channelId, p.href.articleId)) return;
  await navigate(
    p,
    () => {
      queueSkippedToast(path, skipped);
      window.location.replace(
        skippedToastURL(`${path}${p.searchQuery}`, skipped),
      );
    },
    { patch: { activeIndex: index }, rollback: clearSkippedToast },
  );
}

export { nextLinkForce, toLink };
