import type { HrefImpl } from '@/types';
import type { AppState } from './store';

export type NavigationMode = 'channel' | 'series' | 'scrap' | 'subscription';

type NavigationContext = Pick<
  AppState,
  'href' | 'isSeriesMode' | 'isScrapMode' | 'seriesChannels'
>;

export function articlePath(channelId: string, articleId: string): string {
  return `/b/${channelId}/${articleId}`;
}

export function currentArticlePath(
  href: Pick<HrefImpl, 'mode' | 'channelId' | 'articleId'>,
): string {
  return href.mode === 'ARTICLE'
    ? articlePath(href.channelId, href.articleId)
    : '';
}

/** Interpret legacy session flags in one place, including restored sessions. */
export function navigationMode(p: NavigationContext): NavigationMode {
  if (p.isScrapMode || p.href.mode === 'SCRAP') return 'scrap';
  if (p.isSeriesMode)
    return p.seriesChannels.length > 0 ? 'subscription' : 'series';
  return p.href.mode === 'HOME' || p.href.channelId === 'my'
    ? 'subscription'
    : 'channel';
}
