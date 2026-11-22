import { createElement, setAttributes } from '@/utils/dom';
import '@css/reading.css';

import { extractArticleRows } from './filter';
import { refreshUnvisitedNavigation } from './article/link';
import { SITE_RECENT_KEY } from '@/vault/reading-history';
import { recordVisit } from '@/vault/site-recent-history';
import type { VaultAdapter } from '@/vault';
import { articlePath } from '@/vault/navigation-context';
import { readingContextLabel } from '@/vault/reading-context';
import { showPendingSkippedToast } from './swiper/skip-toast';
import { updateAfterSwipe } from './swiper/motion';
import { reportFailure } from '@/utils/operation-error';
import { afterPaint } from '@/utils/after-paint';

const ARTICLE_TITLE_SELECTOR =
  '#board_read .subject_inner_text, #board_read .subject_text';
const initializedVaults = new WeakSet<VaultAdapter>();
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

function bindStorageSync(p: VaultAdapter): void {
  const onStorage = (event: { key: string | null }) => {
    if (event.key === null || event.key === SITE_RECENT_KEY)
      p.reading.reload(['entries']);
  };
  window.addEventListener('storage', onStorage);
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
    } else if (lostNext && historyChanged && previousSkip) {
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
  updateSkipButton(p);
}
