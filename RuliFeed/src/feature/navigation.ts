import { createNavigation } from '@feed/core/feature/navigation';
import { flushStorage } from '@/vault/indexed-storage';
import { reportFailure } from '@/utils/operation-error';
import type { VaultAdapter } from '@/vault';
import type { AppState } from '@/vault/store';

export const {
  captureNavigationState,
  restoreNavigationState,
  isNavigating,
  navigate,
} = createNavigation<AppState, VaultAdapter>({
  appName: 'RuliFeed',
  captureFields: [
    'href',
    'activeIndex',
    'articleKey',
    'articleList',
    'isSeriesMode',
    'isScrapMode',
    'seriesChannels',
    'subscriptionFailures',
    'searchQuery',
    'nextPageUrl',
    'lastActiveIndex',
  ],
  flushStorage,
  reportFailure,
});
