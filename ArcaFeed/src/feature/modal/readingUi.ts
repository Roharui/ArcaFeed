import {
  createReadingSearchMatcher,
  createReadingUi,
  formatReadingTime,
  matchesReadingSearch,
  readingChannelId,
  readingDateLabel,
  syncChannelSelect,
} from '@feed/core/feature/modal/reading-ui';
import { reportFailure } from '@/utils/operation-error';
import { eventBus } from '@/core/app-events';

export {
  createReadingSearchMatcher,
  formatReadingTime,
  matchesReadingSearch,
  readingChannelId,
  readingDateLabel,
  syncChannelSelect,
};

export const {
  readingButton,
  readingSearch,
  readingTime,
  readingHeader,
  readingEmptyState,
} = createReadingUi({
  classPrefix: 'arcafeed',
  reportFailure,
  closeModal: () => {
    void eventBus.emit('closeModal');
  },
});
