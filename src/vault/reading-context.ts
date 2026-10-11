import { navigationMode } from './navigation-context';
import type { AppState } from './store';

type ReadingContext = Pick<
  AppState,
  'href' | 'articleKey' | 'isSeriesMode' | 'isScrapMode' | 'seriesChannels'
>;

/** Keep skip preferences stable as a feed moves between channels and articles. */
export function readingPreferenceKey(p: ReadingContext): string {
  switch (navigationMode(p)) {
    case 'scrap':
      return 'scrap';
    case 'subscription':
      return 'home';
    case 'series':
      return `series:${p.articleKey}`;
    case 'channel':
      return `channel:${p.href.channelId}`;
  }
}

export function readingContextLabel(p: ReadingContext): string {
  switch (navigationMode(p)) {
    case 'scrap':
      return '스크랩';
    case 'subscription':
      return '구독 피드';
    case 'series':
      return '이 시리즈';
    case 'channel':
      return '이 채널';
  }
}
