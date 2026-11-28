import { navigate } from '@/feature/navigation';
import { handoffTabArticleKey } from '@/utils/article-key';
import { OperationError } from '@/utils/operation-error';
import { getArticleId } from '@/utils/regex';
import { shuffle } from '@feed/core/utils/func';
import { showToast, showConfirmToast } from '@/utils/toast';
import { captureArticleSession } from '@feed/core/vault/article-session';
import { articlePath } from '@/vault/navigation-context';
import { isVisitedPath } from '@/vault/reading-history';
import { fetchListingPages } from './listing';
import { showFetchLoader, hideFetchLoader } from '@feed/core/feature/loading';
import type { ArticleFilterImpl } from '@/types';
import type { VaultAdapter } from '@/vault';

// Preserve the article API while parsing and pagination live in their own module.
export { extractLinks, withBestMode } from './listing';

function previousListingPage(url: string, basePath: string): string {
  const listing = new URL(url, 'https://m.ruliweb.com');
  const page = Number(listing.searchParams.get('page'));
  if (listing.pathname !== basePath || !Number.isSafeInteger(page) || page < 2)
    return url;
  if (page === 2) listing.searchParams.delete('page');
  else listing.searchParams.set('page', String(page - 1));
  return listing.pathname + listing.search;
}

function resolveListingStartUrl(
  p: VaultAdapter,
  basePath: string,
  articleId: string,
  scrap: boolean,
): string {
  const savedNext = !scrap && p.articleList.length > 0 ? p.nextPageUrl : '';
  if (
    savedNext &&
    (savedNext === basePath ||
      savedNext.startsWith(`${basePath}?`) ||
      savedNext.startsWith(`${basePath}/`))
  ) {
    // Rows can shift across page boundaries as the board changes.
    return previousListingPage(savedNext, basePath);
  }
  const path =
    articleId && !scrap ? articlePath(p.href.channelId, articleId) : basePath;
  return `${path}${p.href.search}`;
}

/** Capture the navigation session before iterating its listing pages. */
function fetchArticlePages(
  p: VaultAdapter,
  articleId: string,
  continueSearch?: () => Promise<boolean>,
  onPageLoaded?: (nextUrl: string | null, pageUrl: string) => void,
): AsyncGenerator<string[]> {
  const scrap = p.isCurrentMode('SCRAP');
  const basePath = scrap ? window.location.pathname : `/${p.href.channelId}`;
  return fetchListingPages({
    url: resolveListingStartUrl(p, basePath, articleId, scrap),
    basePath,
    filter: p.articleFilterConfig[p.href.channelId],
    existingUrls: new Set(p.articleList),
    isCurrent: captureArticleSession(p),
    continueSearch,
    onPageLoaded,
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
  const currentPath = articlePath(p.href.channelId, p.href.articleId);
  const initialList = p.articleList;
  const needsAnchor =
    p.href.mode === 'ARTICLE' && !initialList.includes(currentPath);
  const tail = initialList.at(-1);
  const beforeId = needsAnchor
    ? Number(p.href.articleId)
    : Number(tail && getArticleId(tail));
  let anchored = !needsAnchor;
  try {
    let searchCancelled = false;
    let nextPageUrl = p.nextPageUrl ?? '';
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
    const pages = fetchArticlePages(
      p,
      articleId,
      continueSearch,
      (nextUrl, pageUrl) => {
        nextPageUrl = nextUrl ?? pageUrl;
      },
    );
    for await (const pageLinks of pages) {
      if (!isCurrent()) return;
      // A detail request can show page 1 even if the article is much older.
      const containsCurrent = !anchored && pageLinks.includes(currentPath);
      const links =
        !beforeId || containsCurrent
          ? pageLinks
          : pageLinks.filter((path) => Number(getArticleId(path)) < beforeId);
      if (containsCurrent || links.length > 0) anchored = true;
      const nextList =
        links.length > 0
          ? [...new Set([...p.articleList, ...links])]
          : p.articleList;
      if (nextList !== p.articleList || nextPageUrl !== (p.nextPageUrl ?? '')) {
        p.updateState({
          articleList: nextList,
          nextPageUrl,
          ...(containsCurrent
            ? { activeIndex: nextList.indexOf(currentPath) }
            : {}),
        });
      }
      if (links.length > 0) {
        const articles = p.articleList;
        const currentIndex =
          p.href.mode === 'ARTICLE' ? articles.indexOf(currentPath) : -1;
        const candidates = currentIndex >= 0 ? articles : links;
        for (let index = currentIndex + 1; index < candidates.length; index++) {
          const path = candidates[index]!;
          if (
            path !== currentPath &&
            (!p.skipVisitedArticles || !p.reading.hasVisited(path))
          )
            return;
        }
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
      await openScrapSeriesArticle(p);
    }
  } finally {
    hideFetchLoader();
  }
}

// ── Navigation ─────────────────────────────────────────

async function openScrapSeriesArticle(p: VaultAdapter): Promise<void> {
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

  await navigate(
    p,
    () => {
      if (p.articleKey) handoffTabArticleKey(p.articleKey, firstUrl);
      window.location.replace(nextUrl.toString());
    },
    {
      patch: { activeIndex: firstIndex },
    },
  );
}

// ── Channel listings ───────────────────────────────────

async function fetchChannelFirstPage(
  channelId: string,
  filter?: ArticleFilterImpl,
  isCurrent: () => boolean = () => true,
): Promise<string[]> {
  const basePath = `/${channelId}`;
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
  const basePath = `/${channelId}`;
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
  const basePath = `/${channelId}`;
  const results: string[] = [];
  for await (const links of fetchListingPages({
    url: beforeArticleId > 0 ? `${basePath}/read/${beforeArticleId}` : basePath,
    basePath,
    filter,
    existingUrls,
    isCurrent,
  })) {
    const older =
      beforeArticleId > 0
        ? links.filter((path) => Number(getArticleId(path)) < beforeArticleId)
        : links;
    results.push(...older);
    if (older.some((path) => !isVisitedPath(visitedPaths, path))) break;
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
