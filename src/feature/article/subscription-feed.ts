import { navigate, isNavigating } from '@/feature/navigation';
import { mergeState } from '@/vault/lazy-state';
import { captureArticleSession } from '@/vault/article-session';
import { isVisitedPath } from '@/vault/reading-history';
import { createArticleKey } from '@/utils/article-key';
import { extractChannelId, getArticleId } from '@/utils/regex';
import { mapConcurrent } from '@/utils/func';
import { showToast } from '@/utils/toast';
import {
  fetchChannelFirstPage,
  fetchChannelArticlesBefore,
  showFetchLoader,
  hideFetchLoader,
} from '@/feature/article/fetch';
import type { VaultAdapter } from '@/vault';
import type { SubscriptionFailure } from '@/types/vault';

export interface SubscriptionStartResult {
  channels: string[];
  articles: string[];
  failures: SubscriptionFailure[];
  emptyChannels: string[];
  started: boolean;
  isCurrent: () => boolean;
}

// Automatic replenishment, startup and manual retries never race within a page.
const pending = new WeakSet<VaultAdapter>();

function failureReason(error: unknown): SubscriptionFailure['reason'] {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  if (/^HTTP \d+:/.test(message)) return 'unavailable';
  return 'network';
}

/** Channel failures are results; the shared concurrency runner keeps its failure policy. */
async function fetchChannels(
  p: VaultAdapter,
  channels: string[],
  isCurrent: () => boolean,
  existingUrls?: ReadonlySet<string>,
  cursors = new Map<string, number>(),
) {
  const filters = p.articleFilterConfig;
  const visited = p.skipVisitedArticles
    ? p.reading.getVisitedPaths()
    : undefined;
  return mapConcurrent(channels, async (channelId) => {
    const articles: string[] = [];
    if (!isCurrent()) return { channelId, articles };
    try {
      const filter = filters[channelId];
      const before = cursors.get(channelId) ?? 0;
      articles.push(
        ...(before ||
        visited ||
        filter?.tab.length ||
        filter?.title.length ||
        filter?.includeTitle?.length
          ? await fetchChannelArticlesBefore(
              channelId,
              before,
              filter,
              existingUrls,
              visited,
              isCurrent,
            )
          : await fetchChannelFirstPage(channelId, filter, isCurrent)),
      );
      return { channelId, articles };
    } catch (error) {
      return {
        channelId,
        articles,
        failure: { channelId, reason: failureReason(error) },
      };
    }
  });
}

export function startSubscriptionFeed(p: VaultAdapter, channelIds: string[]) {
  return buildSubscriptionFeed(p, [...new Set(channelIds)]);
}

/** Retry just one failed startup channel, retaining the original selection. */
export function retrySubscriptionStart(
  p: VaultAdapter,
  result: SubscriptionStartResult,
  channelId: string,
) {
  if (
    !result.isCurrent() ||
    !result.failures.some((failure) => failure.channelId === channelId)
  )
    return Promise.resolve(undefined);
  return buildSubscriptionFeed(p, result.channels, result, channelId);
}

async function buildSubscriptionFeed(
  p: VaultAdapter,
  channels: string[],
  previous?: SubscriptionStartResult,
  retryChannelId?: string,
): Promise<SubscriptionStartResult | undefined> {
  if (pending.has(p) || isNavigating(p)) return;
  pending.add(p);
  showFetchLoader();
  const isCurrent = captureArticleSession(p);
  try {
    const requested = retryChannelId ? [retryChannelId] : channels;
    const batches = await fetchChannels(p, requested, isCurrent);
    if (!isCurrent()) return;
    const failures: SubscriptionFailure[] = [
      ...(previous?.failures ?? []).filter(
        (failure) => !requested.includes(failure.channelId),
      ),
      ...batches.flatMap((batch) => (batch.failure ? [batch.failure] : [])),
    ];
    const emptyChannels = [
      ...(previous?.emptyChannels ?? []).filter(
        (id) => !requested.includes(id),
      ),
      ...batches
        .filter((batch) => !batch.failure && !batch.articles.length)
        .map((batch) => batch.channelId),
    ];
    const articles = [
      ...new Set([
        ...(previous?.articles ?? []),
        ...batches.flatMap((batch) => batch.articles),
      ]),
    ].sort((a, b) => Number(getArticleId(b)) - Number(getArticleId(a)));
    const visited = p.skipVisitedArticles
      ? p.reading.getVisitedPaths()
      : undefined;
    const firstIndex = articles.findIndex(
      (path) => !isVisitedPath(visited, path),
    );
    const result = {
      channels,
      articles,
      failures,
      emptyChannels,
      started: false,
      isCurrent,
    };
    if (firstIndex === -1) {
      showToast(
        failures.length === channels.length
          ? '선택한 모든 채널을 불러오지 못했습니다. 실패 채널을 다시 시도할 수 있습니다.'
          : failures.length
            ? '불러온 채널에 탐색할 글이 없습니다. 실패 채널을 다시 시도할 수 있습니다.'
            : visited
              ? '선택한 채널에서 아직 방문하지 않은 게시글을 찾지 못했습니다.'
              : '선택한 채널에서 게시글을 찾지 못했습니다.',
      );
      return result;
    }
    const articleKey = createArticleKey();
    const nextUrl = new URL(articles[firstIndex]!, window.location.origin);
    nextUrl.searchParams.set('articleKey', articleKey);
    const moved = navigate(
      p,
      () => window.location.replace(nextUrl.toString()),
      {
        patch: {
          articleKey,
          href: { ...p.href, articleKey },
          articleList: articles,
          isSeriesMode: true,
          isScrapMode: false,
          seriesChannels: [...channels],
          subscriptionFailures: failures,
          activeIndex: firstIndex,
          searchQuery: `?articleKey=${articleKey}`,
          uiSettings: mergeState(p.uiSettings, {
            homeSeriesChannels: [...channels],
          }),
        },
      },
    );
    return moved ? { ...result, started: true } : undefined;
  } finally {
    pending.delete(p);
    hideFetchLoader();
  }
}

/** Merge against the latest list, preserving everything through the current article. */
function mergeArticles(p: VaultAdapter, additions: string[]): string[] {
  const seen = new Set(p.articleList);
  const unique = additions.filter((path) => {
    if (seen.has(path)) return false;
    seen.add(path);
    return true;
  });
  if (!unique.length) return p.articleList;
  return [
    ...p.articleList.slice(0, p.activeIndex + 1),
    ...[...p.articleList.slice(p.activeIndex + 1), ...unique].sort(
      (a, b) => Number(getArticleId(b)) - Number(getArticleId(a)),
    ),
  ];
}

/** Failed channels stay paused until the user explicitly retries them. */
export async function retrySubscriptionChannel(
  p: VaultAdapter,
  channelId: string,
): Promise<void> {
  if (
    !p.isSeriesMode ||
    p.isScrapMode ||
    !p.seriesChannels.includes(channelId) ||
    !p.subscriptionFailures.some((failure) => failure.channelId === channelId)
  )
    return;
  await replenish(p, [channelId]);
}

async function replenish(p: VaultAdapter, channels: string[]): Promise<void> {
  if (pending.has(p) || !channels.length) return;
  pending.add(p);
  const isCurrent = captureArticleSession(p);
  const cursors = new Map<string, number>();
  for (const path of p.articleList) {
    const channel = extractChannelId(path);
    const id = Number(getArticleId(path));
    if (channel && id > 0)
      cursors.set(channel, Math.min(cursors.get(channel) ?? Infinity, id));
  }
  showFetchLoader();
  try {
    const batches = await fetchChannels(
      p,
      channels,
      isCurrent,
      new Set(p.articleList),
      cursors,
    );
    if (!isCurrent()) return;
    const failures: SubscriptionFailure[] = [
      ...p.subscriptionFailures.filter(
        (failure) => !channels.includes(failure.channelId),
      ),
      ...batches.flatMap((batch) => (batch.failure ? [batch.failure] : [])),
    ];
    p.updateState({
      articleList: mergeArticles(
        p,
        batches.flatMap((batch) => batch.articles),
      ),
      subscriptionFailures: failures,
    });
    p.flushSave();
    if (batches.some((batch) => batch.failure))
      showToast(
        '일부 구독 채널을 불러오지 못했습니다. 탐색 목록에서 다시 시도할 수 있습니다.',
      );
    else if (batches.every((batch) => !batch.articles.length))
      showToast('조회한 채널에서 추가로 탐색할 글을 찾지 못했습니다.');
  } finally {
    pending.delete(p);
    hideFetchLoader();
  }
}

export async function loadMoreHomeSeriesArticles(
  p: VaultAdapter,
): Promise<void> {
  const failed = new Set(
    p.subscriptionFailures.map((failure) => failure.channelId),
  );
  const remaining = new Map<string, number>();
  for (const [index, path] of p.articleList.entries()) {
    if (
      index <= p.activeIndex ||
      (p.skipVisitedArticles && p.reading.hasVisited(path))
    )
      continue;
    const channel = extractChannelId(path);
    if (channel) remaining.set(channel, (remaining.get(channel) ?? 0) + 1);
  }
  const channels = [...new Set(p.seriesChannels)].filter(
    (id) => !failed.has(id) && (remaining.get(id) ?? 0) <= 3,
  );
  await replenish(p, channels);
}
