import { navigate } from '@/feature/navigation';
import { OperationError } from '@/utils/operation-error';
import { shuffle } from '@/utils/func';
import { showToast, showConfirmToast } from '@/utils/toast';
import { captureArticleSession } from '@/vault/article-session';
import { isVisitedPath } from '@/vault/reading-history';
import { fetchListingPages } from './listing';
import { showFetchLoader, hideFetchLoader } from './loading';
import type { ArticleFilterImpl } from '@/types';
import type { VaultAdapter } from '@/vault';

// Preserve the article API while parsing and pagination live in their own module.
export { extractLinks, withBestMode } from './listing';

/** Capture the navigation session before iterating its listing pages. */
function fetchArticlePages(
  p: VaultAdapter,
  articleId: string,
  continueSearch?: () => Promise<boolean>,
): AsyncGenerator<string[]> {
  const scrap = p.isCurrentMode('SCRAP');
  const basePath = scrap ? '/u/scrap_list' : articleId;
  return fetchListingPages({
    url: `${basePath}${p.searchQuery}`,
    basePath,
    filter: p.articleFilterConfig[p.href.channelId],
    existingUrls: new Set(p.articleList),
    isCurrent: captureArticleSession(p),
    continueSearch,
  });
}

// ── Convenience wrappers ───────────────────────────────

/**
 * Fetch until the first page that yields results, then stop.
 * Shows a failure toast only if no navigable next article remains.
 */
async function fetchFirstBatch(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  showFetchLoader();
  const isCurrent = captureArticleSession(p);
  try {
    let searchCancelled = false;
    const continueSearch = async () => {
      if (!isCurrent() || !p.skipVisitedArticles || p.isNextPageActive())
        return false;
      const controller = new AbortController();
      const unsubscribe = p.subscribe(() => {
        if (!isCurrent() || p.isNextPageActive()) controller.abort();
      });
      hideFetchLoader();
      try {
        const accepted = await showConfirmToast(
          '아직 방문하지 않은 다음 게시글을 찾지 못했습니다.\n찾을 때까지 계속 검색할까요?',
          '계속 검색',
          controller.signal,
        );
        searchCancelled = !accepted;
        return accepted;
      } finally {
        unsubscribe();
        showFetchLoader();
      }
    };
    for await (const links of fetchArticlePages(p, articleId, continueSearch)) {
      if (!isCurrent()) return;
      if (links.length > 0) {
        p.articleList = [...new Set([...p.articleList, ...links])];
        const currentPath = `/b/${p.href.channelId}/${p.href.articleId}`;
        if (
          !p.skipVisitedArticles ||
          links.some(
            (path) => path !== currentPath && !p.reading.hasVisited(path),
          )
        )
          return;
      }
    }
    if (isCurrent() && !searchCancelled && !p.isNextPageActive())
      showToast(
        p.skipVisitedArticles
          ? '아직 방문하지 않은 다음 게시글을 찾지 못했습니다.'
          : '다음 게시글 탐색에 실패했습니다.',
      );
  } finally {
    hideFetchLoader();
  }
}

/**
 * Collect all article links across all available pages.
 * After exhaustion, opens the first scrap series article if in series mode.
 */
async function fetchAllBatches(
  p: VaultAdapter,
  articleId: string,
): Promise<void> {
  showFetchLoader();
  const isCurrent = captureArticleSession(p);
  try {
    const additions: string[] = [];
    for await (const links of fetchArticlePages(p, articleId)) {
      if (!isCurrent()) return;
      additions.push(...links);
    }
    if (!isCurrent()) return;
    const articles = [...new Set([...p.articleList, ...additions])];

    if (p.isShuffleMode) {
      shuffle(articles);
    }
    p.articleList = articles;

    if (p.isSeriesMode) {
      openScrapSeriesArticle(p);
    }
  } finally {
    hideFetchLoader();
  }
}

// ── Navigation ─────────────────────────────────────────

function openScrapSeriesArticle(p: VaultAdapter): void {
  const firstIndex = p.articleList.findIndex(
    (path) => !p.skipVisitedArticles || !p.reading.hasVisited(path),
  );
  const firstUrl = p.articleList[firstIndex];
  if (!firstUrl) {
    showToast(
      p.skipVisitedArticles
        ? '아직 방문하지 않은 스크랩 글이 없습니다.'
        : '스크랩 글을 찾지 못했습니다.',
    );
    const error = new OperationError('command', '탐색할 스크랩 글이 없습니다.');
    error.reported = true;
    throw error;
  }

  const nextUrl = new URL(firstUrl, window.location.origin);
  nextUrl.search = p.searchQuery;

  if (p.articleKey) {
    nextUrl.searchParams.set('articleKey', p.articleKey);
  }

  navigate(p, () => window.location.replace(nextUrl.toString()), {
    patch: { activeIndex: firstIndex },
  });
}

// ── Channel listings ───────────────────────────────────

async function fetchChannelFirstPage(
  channelId: string,
  filter?: ArticleFilterImpl,
  isCurrent: () => boolean = () => true,
): Promise<string[]> {
  const basePath = `/b/${channelId}`;
  for await (const links of fetchListingPages({
    url: basePath,
    basePath,
    filter,
    isCurrent,
  })) {
    return links;
  }
  return [];
}

async function fetchChannelArticles(
  channelId: string,
  filter?: ArticleFilterImpl,
  existingUrls?: ReadonlySet<string>,
): Promise<string[]> {
  const basePath = `/b/${channelId}`;
  const results: string[] = [];
  for await (const links of fetchListingPages({
    url: basePath,
    basePath,
    filter,
    existingUrls,
  })) {
    results.push(...links);
  }
  return results;
}

async function fetchChannelArticlesBefore(
  channelId: string,
  beforeArticleId: number,
  filter?: ArticleFilterImpl,
  existingUrls?: ReadonlySet<string>,
  visitedPaths?: Set<string>,
  isCurrent: () => boolean = () => true,
): Promise<string[]> {
  const basePath = `/b/${channelId}`;
  const results: string[] = [];
  for await (const links of fetchListingPages({
    url: beforeArticleId > 0 ? `${basePath}/${beforeArticleId}` : basePath,
    basePath,
    filter,
    existingUrls,
    isCurrent,
  })) {
    results.push(...links);
    if (links.some((path) => !isVisitedPath(visitedPaths, path))) break;
  }
  return results;
}

export {
  fetchArticlePages,
  fetchChannelArticlesBefore,
  fetchFirstBatch,
  fetchAllBatches,
  fetchChannelArticles,
  fetchChannelFirstPage,
  hideFetchLoader,
  openScrapSeriesArticle,
  showFetchLoader,
};
