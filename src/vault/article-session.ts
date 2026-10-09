import type { VaultAdapter } from './index';

/** A request may only commit to the article session in which it started. */
export function captureArticleSession(p: VaultAdapter): () => boolean {
  const {
    articleLoadRevision,
    articleKey,
    href,
    articleFilterConfig,
    searchQuery,
    isSeriesMode,
    isShuffleMode,
    seriesChannels,
  } = p;
  const skipRead = p.uiSettings.skipVisitedArticles;

  return () =>
    p.articleLoadRevision === articleLoadRevision &&
    p.articleKey === articleKey &&
    p.href === href &&
    p.articleFilterConfig === articleFilterConfig &&
    p.searchQuery === searchQuery &&
    p.isSeriesMode === isSeriesMode &&
    p.isShuffleMode === isShuffleMode &&
    p.seriesChannels === seriesChannels &&
    p.uiSettings.skipVisitedArticles === skipRead;
}
