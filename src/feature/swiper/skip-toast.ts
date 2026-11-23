import { createSkipToast } from '@feed/core/feature/swiper/skip-toast';
import { showToast } from '@/utils/toast';

function matchesDestination(destination: unknown, path: string): boolean {
  if (destination === path) return true;
  if (typeof destination !== 'string') return false;
  const expected = destination.match(/^\/b\/([A-Za-z0-9]+)\/(\d+)\/?$/);
  const actual = path.match(/^\/b\/([A-Za-z0-9]+)\/(\d+)\/?$/);
  // /b/my links redirect to the original channel; article IDs are global.
  return !!(
    expected &&
    actual &&
    expected[2] === actual[2] &&
    (expected[1] === 'my' || actual[1] === 'my')
  );
}

export const {
  captureSkippedToast,
  skippedToastURL,
  showSkippedToast,
  clearSkippedToast,
  queueSkippedToast,
  showPendingSkippedToast,
} = createSkipToast({
  storageKey: 'arcaFeed:skippedVisitedToast',
  queryKey: 'arcaFeedSkipped',
  showToast,
  matchesDestination,
});
