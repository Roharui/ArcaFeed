import { createArticlePrefetch } from '@feed/core/feature/prefetch';
import { countSkippedVisited } from '@/vault/navigation-context';
import { skippedToastURL } from '@/feature/swiper/skip-toast';
import type { VaultAdapter } from '@/vault';

export const initArticlePrefetch = createArticlePrefetch<VaultAdapter>({
  countSkippedVisited,
  skippedToastURL,
});
