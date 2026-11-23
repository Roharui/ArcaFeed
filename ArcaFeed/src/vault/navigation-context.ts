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

interface SkippedVisitedContext {
  href: Pick<HrefImpl, 'channelId' | 'articleId'>;
  activeIndex: number;
  articleList: readonly string[];
  skipVisitedArticles: boolean;
  reading: { hasVisited: (path: string) => boolean };
}

/** Count visited articles skipped between activeIndex and nextIndex on forward navigation. */
export function countSkippedVisited(
  p: SkippedVisitedContext,
  nextIndex: number,
): number {
  if (!p.skipVisitedArticles) return 0;
  const currentPath = articlePath(p.href.channelId, p.href.articleId);
  const end = nextIndex === -1 ? p.articleList.length : nextIndex;
  let skipped = 0;
  for (let index = p.activeIndex + 1; index < end; index++) {
    const path = p.articleList[index]!;
    if (path !== currentPath && p.reading.hasVisited(path)) skipped++;
  }
  return skipped;
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
