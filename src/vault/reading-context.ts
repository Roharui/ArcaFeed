import type { AppState } from './store';

type ReadingContext = Pick<
  AppState,
  'href' | 'articleKey' | 'isSeriesMode' | 'isScrapMode' | 'seriesChannels'
>;

/** Keep skip preferences stable as a feed moves between channels and articles. */
export function readingPreferenceKey(p: ReadingContext): string {
  if (p.isScrapMode || p.href.mode === 'SCRAP') return 'scrap';
  if (p.href.mode === 'HOME' || (p.isSeriesMode && p.seriesChannels.length))
    return 'home';
  if (p.isSeriesMode) return `series:${p.articleKey}`;
  return `channel:${p.href.channelId}`;
}

export function readingContextLabel(p: ReadingContext): string {
  if (p.isScrapMode || p.href.mode === 'SCRAP') return '스크랩';
  if (p.href.mode === 'HOME' || (p.isSeriesMode && p.seriesChannels.length))
    return '구독 피드';
  return p.isSeriesMode ? '이 시리즈' : '이 채널';
}
