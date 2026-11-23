import type { BaseAppState } from './store';

export type NavigationMode = 'channel' | 'series' | 'scrap' | 'subscription';

export type ReadingContext = Pick<
  BaseAppState,
  'href' | 'articleKey' | 'isSeriesMode' | 'isScrapMode' | 'seriesChannels'
>;

export function createReadingContext(
  navigationMode: (p: ReadingContext) => NavigationMode,
) {
  /** Keep skip preferences stable as a feed moves between channels and articles. */
  function readingPreferenceKey(p: ReadingContext): string {
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

  function readingContextLabel(p: ReadingContext): string {
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

  return { readingPreferenceKey, readingContextLabel };
}
