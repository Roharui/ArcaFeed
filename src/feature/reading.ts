import { createElement, setAttributes } from '@/utils/dom';
import { navigate } from '@/feature/navigation';
import '@css/reading.css';

import { extractArticleRows } from './filter';
import { refreshUnvisitedNavigation } from './article/link';
import { createArticleKey } from '@/utils/article-key';
import { SITE_RECENT_KEY } from '@/vault/reading-history';
import { recordVisit } from '@/vault/site-recent-history';
import type { ReadingSession } from '@/vault/reading-history';
import type { VaultAdapter } from '@/vault';
import { articlePath } from '@/vault/navigation-context';
import { readingContextLabel } from '@/vault/reading-context';
import { articleWindow } from '@/vault/article-window';
import { SESSION_ARTICLE_LIMIT } from '@/vault/storage-keys';
import { showPendingSkippedToast } from './swiper/skip-toast';
import { updateAfterSwipe } from './swiper/motion';
import { OperationError, reportFailure } from '@/utils/operation-error';
import { showToast } from '@/utils/toast';
import { afterPaint } from '@/utils/after-paint';

const RESUME_SCROLL_KEY = 'ruliFeed:resumeScroll';
const ARTICLE_TITLE_SELECTOR =
  '#board_read .subject_inner_text, #board_read .subject_text';
const initializedVaults = new WeakSet<VaultAdapter>();
const stoppedVaults = new WeakSet<VaultAdapter>();
const fullPinnedWarnings = new WeakSet<VaultAdapter>();
const checkpointContexts = new WeakMap<
  VaultAdapter,
  { source: string[]; channels: string[]; session: ReadingSession }
>();

function currentPath(p: VaultAdapter): string {
  return articlePath(p.href.channelId, p.href.articleId);
}

function channelName(p: VaultAdapter): string {
  return (
    document.querySelector('#board_name')?.textContent?.trim() ||
    p.articleFilterConfig[p.href.channelId]?.channelName ||
    p.href.channelId
  );
}

function normalizeRowPath(href: string): string {
  if (href.startsWith('/')) {
    const end = href.search(/[?#]/);
    const pathname = end === -1 ? href : href.slice(0, end);
    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  }
  return new URL(href, window.location.origin).pathname.replace(/\/$/, '');
}

function updateVisitedIndicators(p: VaultAdapter): void {
  const enabled = p.uiSettings.showVisitedIndicators;
  for (const row of extractArticleRows()) {
    const href = row.getAttribute('href');
    if (!href) continue;
    const show = enabled && p.reading.hasVisited(normalizeRowPath(href));
    const title = row;
    if (!title) continue;
    let status = title.querySelector<HTMLElement>(
      ':scope > .rulifeed-list-visited-status',
    );
    if (!show && !status && !title.classList.contains('rulifeed-list-title'))
      continue;
    if (show && !status) {
      status = createElement('span', {
        class: 'rulifeed-list-visited-status',
        'aria-label': '본 글',
      });
      title.append(status);
    }
    title.classList.toggle('rulifeed-list-title', show);
    if (status) status.hidden = !show;
  }
  updateSkipButton(p);
}

function updateSkipButton(p: VaultAdapter): void {
  const skip = p.skipVisitedArticles;
  const button = document.querySelector<HTMLButtonElement>(
    '#rulifeed-skip-visited',
  );
  if (!button) return;
  const label = readingContextLabel(p);
  button.disabled = !p.canSkipVisitedArticles;
  button.classList.toggle('is-active', skip);
  setAttributes(button, {
    'aria-pressed': String(skip),
    'aria-label': `${label}에서 본 글 건너뛰기`,
    title: p.canSkipVisitedArticles
      ? `${label} · 본 글 건너뛰기: ${skip ? '켜짐 · 클릭하여 끄기' : '꺼짐 · 클릭하여 켜기'}`
      : '일반 시리즈·스크랩 모드에서는 본 글 건너뛰기를 사용할 수 없습니다.',
  });
}

function contextId(p: VaultAdapter): string {
  return p.reading.getContextId(
    p.isSeriesMode ? 'series' : 'channel',
    p.href.channelId,
    p.articleKey,
    p.searchQuery,
  );
}

function buildCheckpointMeta(p: VaultAdapter) {
  const path = currentPath(p);
  const params = new URLSearchParams(p.searchQuery);
  params.delete('articleKey');
  const query = params.size ? `?${params}` : '';
  const channel = channelName(p);
  const label = p.isScrapMode
    ? '스크랩'
    : p.isSeriesMode
      ? p.seriesChannels.length > 0
        ? `구독 피드 · ${p.seriesChannels.length}개 채널`
        : `시리즈 · ${channel}`
      : `${channel}${params.get('q') ? ` · ${params.get('q')}` : ''}${params.get('mode') === 'best' ? ' · 인기글' : ''}`;
  return { id: contextId(p), path, query, label };
}

function saveCheckpoint(p: VaultAdapter): void {
  if (stoppedVaults.has(p)) return;
  const { id, path, query, label } = buildCheckpointMeta(p);
  const previous = checkpointContexts.get(p);
  if (
    previous?.source === p.articleList &&
    previous.channels === p.seriesChannels &&
    previous.session.id === id &&
    previous.session.path === path &&
    previous.session.label === label &&
    previous.session.searchQuery === query &&
    previous.session.isSeriesMode === p.isSeriesMode &&
    previous.session.isScrapMode === p.isScrapMode &&
    p.reading.savePosition(id, path, window.scrollY, Date.now())
  )
    return;

  const session: ReadingSession = {
    id,
    label,
    path,
    searchQuery: query,
    articleList: articleWindow(p.articleList, path, SESSION_ARTICLE_LIMIT),
    isSeriesMode: p.isSeriesMode,
    isScrapMode: p.isScrapMode,
    seriesChannels: [...p.seriesChannels],
    scrollY: window.scrollY,
    updatedAt: Date.now(),
  };
  const preparation = p.reading.prepareSession(session);
  if (preparation) {
    const tracked = p.reading.hasSession(id);
    void preparation
      .then(() => {
        if (tracked && !p.reading.hasSession(id)) return;
        saveCheckpoint(p);
      })
      .catch(reportFailure);
    return;
  }
  if (p.reading.saveSession(session) === false) {
    if (!fullPinnedWarnings.has(p)) {
      showToast(
        '이어보기 20개가 모두 고정되어 새 탐색을 저장하지 못했습니다. 이어보기에서 고정을 해제하거나 항목을 정리해주세요.',
      );
    }
    fullPinnedWarnings.add(p);
    return;
  }
  fullPinnedWarnings.delete(p);
  checkpointContexts.set(p, {
    source: p.articleList,
    channels: p.seriesChannels,
    session,
  });
}

/** Rebuild the navigation cache even when its original articleKey has expired. */
export async function resumeReading(
  p: VaultAdapter,
  session: ReadingSession,
): Promise<void> {
  const key =
    session.isSeriesMode && session.id.startsWith('series:')
      ? session.id.slice('series:'.length)
      : createArticleKey();
  const url = new URL(session.path, window.location.origin);
  url.search = session.searchQuery;
  url.searchParams.set('articleKey', key);
  let previousScroll: string | null = null;
  let wroteScroll = false;
  await navigate(p, () => window.location.assign(url.toString()), {
    suspend: () => {
      const wasStopped = stoppedVaults.has(p);
      stoppedVaults.add(p);
      return () => {
        if (!wasStopped) stoppedVaults.delete(p);
      };
    },
    prepare: async () => {
      await p.reading.prepareList(session.id);
      p.reading.reload(['sessions', 'progress']);
      const latest = p.reading.sessions.find((item) => item.id === session.id);
      if (!latest)
        throw new OperationError('command', '이미 삭제된 이어보기입니다.');
      url.pathname = latest.path;
      url.search = latest.searchQuery;
      url.searchParams.set('articleKey', key);
      p.restoreReadingSession(latest, key);
      try {
        previousScroll = sessionStorage.getItem(RESUME_SCROLL_KEY);
        sessionStorage.setItem(
          RESUME_SCROLL_KEY,
          JSON.stringify({ path: latest.path, key, scrollY: latest.scrollY }),
        );
        wroteScroll = true;
      } catch {
        // Scroll handoff is optional; the saved article session is required.
      }
    },
    rollback: () => {
      if (!wroteScroll) return;
      if (previousScroll === null) sessionStorage.removeItem(RESUME_SCROLL_KEY);
      else sessionStorage.setItem(RESUME_SCROLL_KEY, previousScroll);
    },
  });
}

function restoreScroll(p: VaultAdapter): void {
  let stored: unknown;
  try {
    const raw = sessionStorage.getItem(RESUME_SCROLL_KEY);
    if (!raw) return;
    stored = JSON.parse(raw);
    sessionStorage.removeItem(RESUME_SCROLL_KEY);
  } catch {
    return;
  }
  if (!stored || typeof stored !== 'object') return;
  const checkpoint = stored as Record<string, unknown>;
  if (
    checkpoint.path !== currentPath(p) ||
    checkpoint.key !== p.articleKey ||
    typeof checkpoint.scrollY !== 'number' ||
    !Number.isFinite(checkpoint.scrollY)
  )
    return;
  const targetY = Math.max(0, checkpoint.scrollY);
  let userMoved = false;
  const stop = () => {
    userMoved = true;
  };
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  events.forEach((name) =>
    window.addEventListener(name, stop, { passive: true }),
  );
  const restore = () => {
    if (!userMoved) window.scrollTo({ top: targetY, behavior: 'instant' });
  };
  requestAnimationFrame(restore);
  // Images can expand the page after DOM-ready. Follow their layout for up to 5s.
  const observer =
    typeof ResizeObserver === 'function' ? new ResizeObserver(restore) : null;
  const body = document.querySelector('.view_content');
  if (body) observer?.observe(body);
  window.addEventListener('load', restore, { once: true });
  setTimeout(() => {
    observer?.disconnect();
    window.removeEventListener('load', restore);
    events.forEach((name) => window.removeEventListener(name, stop));
  }, 5000);
}

function bindStorageSync(p: VaultAdapter): void {
  const onStorage = (event: { key: string | null }) => {
    if (event.key === null) p.reading.reload();
    else if (event.key === SITE_RECENT_KEY) p.reading.reload(['entries']);
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('rulifeed:storage', ((
    event: CustomEvent<{
      changes: { store: string; key: string | string[] }[];
    }>,
  ) => {
    const changes = event.detail.changes ?? [];
    const requested: ('sessions' | 'progress')[] = [];
    if (changes.some((item) => item.store === 'resumeSessions'))
      requested.push('sessions');
    if (
      changes.some(
        (item) =>
          item.store === 'progress' &&
          Array.isArray(item.key) &&
          item.key[0] === 'resume',
      )
    )
      requested.push('progress');
    if (
      changes.some(
        (item) =>
          item.store === 'lists' &&
          Array.isArray(item.key) &&
          item.key[0] === 'resume',
      )
    )
      p.reading.reloadSessionList(requested);
    else if (requested.length) p.reading.reload(requested);
  }) as EventListener);
  window.addEventListener('load', () => p.reading.reloadEntriesIfLoaded(), {
    once: true,
  });
}

function bindReadingStateUpdates(
  p: VaultAdapter,
  isIndicatorsReady: () => boolean,
  refreshIndicators: () => void,
): void {
  let previousSkip = p.skipVisitedArticles;
  let previousCanSkip = p.canSkipVisitedArticles;
  let previousHasNext = p.isNextPageActive();
  let previousReadingRevision = p.getState().readingRevision;
  let previousIndicators = p.uiSettings.showVisitedIndicators;
  let previousContext = readingContextLabel(p);

  p.subscribe((state) => {
    const historyChanged = previousReadingRevision !== state.readingRevision;
    previousReadingRevision = state.readingRevision;
    const skipChanged = previousSkip !== p.skipVisitedArticles;
    const context = readingContextLabel(p);
    if (
      historyChanged ||
      skipChanged ||
      previousCanSkip !== p.canSkipVisitedArticles ||
      previousContext !== context ||
      previousIndicators !== state.uiSettings.showVisitedIndicators
    ) {
      previousContext = context;
      previousCanSkip = p.canSkipVisitedArticles;
      previousIndicators = state.uiSettings.showVisitedIndicators;
      if (isIndicatorsReady()) updateAfterSwipe(p.swiper, refreshIndicators);
      else updateSkipButton(p);
    }
    const hasNext = p.isNextPageActive();
    const lostNext = previousHasNext && !hasNext;
    previousHasNext = hasNext;
    if (previousSkip !== p.skipVisitedArticles) {
      previousSkip = p.skipVisitedArticles;
      if (previousSkip) refreshUnvisitedNavigation(p);
    } else if (
      lostNext &&
      historyChanged &&
      previousSkip &&
      !stoppedVaults.has(p)
    ) {
      refreshUnvisitedNavigation(p);
    }
  });
}

function mountSkipButton(p: VaultAdapter): void {
  if (!p.canSkipVisitedArticles) return;
  const heading = document.querySelector(ARTICLE_TITLE_SELECTOR);
  if (!heading) return;
  const skipButton = createElement('button', {
    id: 'rulifeed-skip-visited',
    type: 'button',
    class: 'rulifeed-skip-setting swiper-no-swiping',
    'aria-label': '본 글 건너뛰기',
  });
  skipButton.addEventListener('click', () => {
    p.skipVisitedArticles = !p.skipVisitedArticles;
    try {
      p.flushSave();
    } catch (error) {
      reportFailure(error);
    }
  });
  const wrapper = createElement('div', { class: 'rulifeed-article-heading' });
  heading.classList.add('rulifeed-article-heading-text');
  heading.before(wrapper);
  wrapper.append(heading, skipButton);
}

function installCheckpointScheduler(p: VaultAdapter): void {
  let checkpointTimer: ReturnType<typeof setTimeout> | undefined;
  let checkpointDeadline: ReturnType<typeof setTimeout> | undefined;
  let checkpointRemoved = false;
  let checkpointTracked = p.reading.hasSession(contextId(p));

  const clearTimers = () => {
    clearTimeout(checkpointTimer);
    clearTimeout(checkpointDeadline);
    checkpointDeadline = undefined;
  };
  const checkpoint = () => {
    cancelInitialCheckpoint();
    clearTimers();
    if (!checkpointRemoved) saveCheckpoint(p);
  };
  const scheduleCheckpoint = () => {
    clearTimeout(checkpointTimer);
    checkpointTimer = setTimeout(checkpoint, 700);
    checkpointDeadline ??= setTimeout(checkpoint, 5000);
  };

  p.reading.subscribe(() => {
    if (p.reading.hasSession(contextId(p))) {
      checkpointTracked = true;
    } else if (checkpointTracked) {
      checkpointRemoved = true;
      cancelInitialCheckpoint();
      clearTimers();
    }
  }, ['sessions']);

  let previousList = p.articleList;
  let previousQuery = p.searchQuery;
  p.subscribe(() => {
    if (previousList !== p.articleList || previousQuery !== p.searchQuery) {
      previousList = p.articleList;
      previousQuery = p.searchQuery;
      scheduleCheckpoint();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      checkpoint();
      p.flushSave();
    }
  });
  window.addEventListener('scroll', scheduleCheckpoint, { passive: true });
  window.addEventListener('pagehide', () => {
    checkpoint();
    p.flushSave();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    stoppedVaults.delete(p);
    p.reading.reload();
    checkpoint();
  });
  const cancelInitialCheckpoint = afterPaint(checkpoint);
}

export function initReading(p: VaultAdapter): void {
  if (initializedVaults.has(p)) return;
  initializedVaults.add(p);
  let indicatorsReady = false;
  const refreshIndicators = () => updateVisitedIndicators(p);
  afterPaint(() => {
    if (p.isCurrentMode('ARTICLE')) {
      recordVisit(
        currentPath(p),
        document.querySelector(ARTICLE_TITLE_SELECTOR)?.textContent?.trim() ||
          document.title,
        channelName(p),
      );
      p.reading.reload(['entries']);
    }
    indicatorsReady = true;
    showPendingSkippedToast(currentPath(p));
    updateAfterSwipe(p.swiper, refreshIndicators);
  });

  bindStorageSync(p);
  bindReadingStateUpdates(p, () => indicatorsReady, refreshIndicators);

  if (p.skipVisitedArticles && !p.isNextPageActive())
    refreshUnvisitedNavigation(p);

  if (!p.isCurrentMode('ARTICLE')) return;

  mountSkipButton(p);
  installCheckpointScheduler(p);
  restoreScroll(p);
  updateSkipButton(p);
}
