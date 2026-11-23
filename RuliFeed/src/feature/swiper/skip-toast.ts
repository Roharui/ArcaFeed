import { createSkipToast } from '@feed/core/feature/swiper/skip-toast';
import { showToast } from '@/utils/toast';

export const {
  captureSkippedToast,
  skippedToastURL,
  showSkippedToast,
  clearSkippedToast,
  queueSkippedToast,
  showPendingSkippedToast,
} = createSkipToast({
  storageKey: 'ruliFeed:skippedVisitedToast',
  queryKey: 'ruliFeedSkipped',
  showToast,
});
