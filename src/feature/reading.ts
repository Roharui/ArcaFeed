import $ from 'jquery';
import '@css/reading.css';

import { extractArticleRows } from './filter';
import { refreshUnvisitedNavigation } from './article/link';
import { createArticleKey } from '@/utils/article-key';
import {
  READING_HISTORY_KEY,
  SITE_RECENT_KEY,
  SITE_RECENT_DISABLED_KEY,
} from '@/vault/reading-history';
import type { ReadingSession } from '@/vault/reading-history';
import type { VaultAdapter } from '@/vault';
import { readingContextLabel } from '@/vault/reading-context';

const RESUME_SCROLL_KEY = 'arcaFeed:resumeScroll';
const ARTICLE_TITLE_SELECTOR =
  '.article-head .title, .board-article > .title, .board-article > .arcafeed-article-heading > .title';
const initializedVaults = new WeakSet<VaultAdapter>();
const stoppedVaults = new WeakSet<VaultAdapter>();

function currentPath(p: VaultAdapter): string {
  return `/b/${p.href.channelId}/${p.href.articleId}`;
}

function channelName(p: VaultAdapter): string {
  return (
    $('.board-title .channel-name, .board-title .title')
      .first()
      .text()
      .trim() ||
    p.articleFilterConfig[p.href.channelId]?.channelName ||
    p.href.channelId
  );
}

function updateVisitedIndicators(p: VaultAdapter): void {
  const enabled = p.uiSettings.showVisitedIndicators;
  extractArticleRows($('.root-container')).each((_, element) => {
    const href = element.getAttribute('href');
    if (!href) return;
    const path = new URL(href, window.location.origin).pathname.replace(
      /\/$/,
      '',
    );
    const row = $(element);
    const title = row.is('.title')
      ? row
      : row.find('.col-title, .title').first();
    if (!title.length) return;
    let status = title.children('.arcafeed-list-visited-status');
    if (!status.length) {
      status = $('<span>', { class: 'arcafeed-list-visited-status' }).appendTo(
        title,
      );
    }
    const show = enabled && p.reading.hasVisited(path);
    title.toggleClass('arcafeed-list-title', show);
    status
      .attr({
        'aria-label': '본 글',
      })
      .toggle(show);
  });
  const skip = p.skipVisitedArticles;
  $('#arcafeed-skip-visited')
    .toggleClass('is-active', skip)
    .attr({
      'aria-pressed': String(skip),
      'aria-label': `${readingContextLabel(p)}에서 본 글 건너뛰기`,
      title: `${readingContextLabel(p)} · 본 글 건너뛰기: ${skip ? '켜짐 · 클릭하여 끄기' : '꺼짐 · 클릭하여 켜기'}`,
    });
}

function contextId(p: VaultAdapter): string {
  if (p.isSeriesMode) return `series:${p.articleKey}`;
  const params = new URLSearchParams(p.searchQuery);
  params.delete('articleKey');
  params.sort();
  // Keep the storage identifier short even for a long search expression.
  let hash = 2166136261;
  for (const char of params.toString())
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `channel:${p.href.channelId}:${(hash >>> 0).toString(16)}`;
}

function saveCheckpoint(p: VaultAdapter): void {
  if (stoppedVaults.has(p)) return;
  const path = currentPath(p);
  const index = p.articleList.indexOf(path);
  const start = Math.max(0, index - 500);
  const articleList = p.articleList.slice(start, start + 2000);
  if (!articleList.includes(path)) articleList.unshift(path);
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
  p.reading.saveSession({
    id: contextId(p),
    label,
    path,
    searchQuery: query,
    articleList,
    isSeriesMode: p.isSeriesMode,
    isScrapMode: p.isScrapMode,
    seriesChannels: [...p.seriesChannels],
    scrollY: window.scrollY,
    updatedAt: Date.now(),
  });
}

/** Rebuild the navigation cache even when its original articleKey has expired. */
export function resumeReading(p: VaultAdapter, session: ReadingSession): void {
  const key =
    session.isSeriesMode && session.id.startsWith('series:')
      ? session.id.slice('series:'.length)
      : createArticleKey();
  const url = new URL(session.path, window.location.origin);
  url.search = session.searchQuery;
  url.searchParams.set('articleKey', key);
  // The outgoing page must not checkpoint itself over the restored session.
  stoppedVaults.add(p);
  p.restoreReadingSession(session, key);
  try {
    sessionStorage.setItem(
      RESUME_SCROLL_KEY,
      JSON.stringify({ path: session.path, key, scrollY: session.scrollY }),
    );
  } catch {
    // The article and list can still be resumed if sessionStorage is unavailable.
  }
  window.location.assign(url.toString());
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
  const body = document.querySelector('.article-body');
  if (body) observer?.observe(body);
  window.addEventListener('load', restore, { once: true });
  setTimeout(() => {
    observer?.disconnect();
    window.removeEventListener('load', restore);
    events.forEach((name) => window.removeEventListener(name, stop));
  }, 5000);
}

export function initReading(p: VaultAdapter): void {
  if (initializedVaults.has(p)) return;
  initializedVaults.add(p);

  window.addEventListener('storage', (event) => {
    if (
      event.key === READING_HISTORY_KEY ||
      event.key === SITE_RECENT_KEY ||
      event.key === SITE_RECENT_DISABLED_KEY ||
      event.key === null
    )
      p.reading.reload();
  });
  p.reading.reload();
  window.addEventListener('load', () => p.reading.reload(), { once: true });
  let previousSkip = p.skipVisitedArticles;
  let previousHasNext = p.isNextPageActive();
  let previousReadingRevision = p.getState().readingRevision;
  p.subscribe((state) => {
    updateVisitedIndicators(p);
    const historyChanged = previousReadingRevision !== state.readingRevision;
    previousReadingRevision = state.readingRevision;
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
  updateVisitedIndicators(p);
  if (p.skipVisitedArticles && !p.isNextPageActive())
    refreshUnvisitedNavigation(p);

  if (!p.isCurrentMode('ARTICLE')) return;

  let checkpointTimer: ReturnType<typeof setTimeout> | undefined;
  let checkpointRemoved = false;

  const skipButton = $('<button>', {
    id: 'arcafeed-skip-visited',
    type: 'button',
    class: 'arcafeed-skip-setting swiper-no-swiping',
    'aria-label': '본 글 건너뛰기',
  });
  skipButton.on('click', () => {
    p.skipVisitedArticles = !p.skipVisitedArticles;
    p.flushSave();
  });
  const heading = $(ARTICLE_TITLE_SELECTOR).first();
  if (heading.length) {
    heading
      .addClass('arcafeed-article-heading-text')
      .wrap('<div class="arcafeed-article-heading"></div>')
      .parent()
      .append(skipButton);
  }

  const checkpoint = () => {
    clearTimeout(checkpointTimer);
    if (!checkpointRemoved) saveCheckpoint(p);
  };
  const scheduleCheckpoint = () => {
    clearTimeout(checkpointTimer);
    checkpointTimer = setTimeout(checkpoint, 700);
  };
  p.reading.subscribe(() => {
    if (!p.reading.sessions.some((session) => session.id === contextId(p))) {
      checkpointRemoved = true;
      clearTimeout(checkpointTimer);
    }
  });
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
  restoreScroll(p);
  checkpoint();
  updateVisitedIndicators(p);
}
