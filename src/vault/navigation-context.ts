import type { AppState } from './store';

export type NavigationMode = 'channel' | 'series' | 'scrap' | 'subscription';

type NavigationContext = Pick<
  AppState,
  'href' | 'isSeriesMode' | 'isScrapMode' | 'seriesChannels'
>;

/** Interpret legacy session flags in one place, including restored sessions. */
export function navigationMode(p: NavigationContext): NavigationMode {
  if (p.isScrapMode || p.href.mode === 'SCRAP') return 'scrap';
  if (p.isSeriesMode)
    return p.seriesChannels.length > 0 ? 'subscription' : 'series';
  return p.href.mode === 'HOME' || p.href.channelId === 'my'
    ? 'subscription'
    : 'channel';
}
