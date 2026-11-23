import type { ArticleFilterConfigImpl, HrefImpl } from '../types/vault';

export interface ArticleSessionSnapshot {
  articleLoadRevision: number;
  articleKey: string;
  href: HrefImpl;
  articleFilterConfig: ArticleFilterConfigImpl;
  searchQuery: string;
  isSeriesMode: boolean;
  isScrapMode: boolean;
  isShuffleMode: boolean;
  seriesChannels: string[];
  skipVisitedArticles: boolean;
}

/** A request may only commit to the article session in which it started. */
export function captureArticleSession(
  p: ArticleSessionSnapshot,
): () => boolean {
  const {
    articleLoadRevision,
    articleKey,
    href,
    articleFilterConfig,
    searchQuery,
    isSeriesMode,
    isScrapMode,
    isShuffleMode,
    seriesChannels,
  } = p;
  const skipRead = p.skipVisitedArticles;

  return () =>
    p.articleLoadRevision === articleLoadRevision &&
    p.articleKey === articleKey &&
    p.href === href &&
    p.articleFilterConfig === articleFilterConfig &&
    p.searchQuery === searchQuery &&
    p.isSeriesMode === isSeriesMode &&
    p.isScrapMode === isScrapMode &&
    p.isShuffleMode === isShuffleMode &&
    p.seriesChannels === seriesChannels &&
    p.skipVisitedArticles === skipRead;
}
