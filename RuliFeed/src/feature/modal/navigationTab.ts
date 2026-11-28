import { findArticleIndex } from '@/vault/article-window';
import { createElement, fromTemplate } from '@feed/core/utils/dom';
import { createFloatingControlButtons } from '@/feature/button';
import { disposeDialogElement } from '@feed/core/feature/modal/cleanup';
import { installDialogFocus } from '@feed/core/feature/modal/focus';
import { installNavigationPosition } from '@feed/core/feature/modal/navigation-position';
import { createNavigationModal } from './navigationModal';
import '@css/modal.css';
import '@css/reading.css';
import {
  isArticleLoading,
  subscribeArticleLoading,
} from '@feed/core/feature/loading';
import { updateAfterSwipe } from '@/feature/swiper/motion';
import { currentArticlePath } from '@/vault/navigation-context';
import { activeSubscriptionFailures } from '@/vault/subscription-failures';
import type { VaultAdapter } from '@/vault';
export { createNavigationModal } from './navigationModal';

const LIST_ICON =
  '<svg class="rulifeed-control-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>';

function installControlPositioning(
  p: VaultAdapter,
  control: HTMLElement,
  trigger: HTMLElement | undefined,
) {
  let touchTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressClickUntil = 0;
  const positioning = installNavigationPosition(
    control,
    trigger,
    () => p.swiper,
  );
  const setRevealed = (visible: boolean) => {
    control.classList.toggle('is-hovered', visible);
    trigger?.classList.toggle('is-hovered', visible);
  };
  const hide = () => {
    clearTimeout(touchTimer);
    suppressClickUntil = 0;
    setRevealed(false);
  };
  control.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setRevealed(true);
  });
  control.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') setRevealed(false);
  });
  control.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    const wasRevealed = control.classList.contains('is-hovered');
    setRevealed(true);
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => setRevealed(false), 1500);
    if (!wasRevealed) suppressClickUntil = Date.now() + 400;
  });
  const consumeSuppressedClick = (event: Event) => {
    if (Date.now() > suppressClickUntil) return false;
    suppressClickUntil = 0;
    event.preventDefault();
    return true;
  };
  document.addEventListener('scroll', hide, { passive: true, capture: true });
  return {
    setRevealed,
    hide,
    consumeSuppressedClick,
    schedulePosition: positioning.schedulePosition,
    cleanup: () => {
      clearTimeout(touchTimer);
      positioning.cleanup();
      document.removeEventListener('scroll', hide, true);
    },
  };
}
/** A persistent entry point independent of the settings dialog. */
export function initNavigationList(p: VaultAdapter): (() => void) | undefined {
  if (!p.isCurrentMode('HOME', 'CHANNEL', 'ARTICLE')) return;
  if (document.querySelector('.rulifeed-navigation-control')) return;
  const control = createElement('div', {
    class: 'rulifeed-navigation-control swiper-no-swiping',
  });
  const hasNavigation = p.isCurrentMode('CHANNEL', 'ARTICLE');
  let loading = isArticleLoading();
  let count: HTMLElement | undefined;
  let trigger: HTMLAnchorElement | undefined;
  let panel: HTMLElement | undefined;
  let cleanupFocus: (() => void) | undefined;
  let disposed = false;

  const actions = createFloatingControlButtons(p, {
    onSettingsOpen: () => positioning.hide(),
    shouldSuppressClick: (event) => positioning.consumeSuppressedClick(event),
  });
  control.append(...actions.buttons);

  if (hasNavigation) {
    count = createElement('span', { class: 'rulifeed-navigation-count' });
    trigger = createElement(
      'a',
      {
        class: 'rulifeed-navigation-trigger',
        role: 'button',
        tabindex: 0,
        'aria-haspopup': 'dialog',
        'aria-expanded': 'false',
        title: '탐색 목록',
      },
      createElement(
        'span',
        { class: 'bi-list-ul', 'aria-hidden': 'true' },
        fromTemplate(LIST_ICON),
      ),
      count,
      fromTemplate(
        '<svg class="rulifeed-navigation-loading-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="20" pathLength="100" /></svg>',
      ),
    );
    trigger.addEventListener('click', (event) => {
      if (positioning.consumeSuppressedClick(event)) return;
      open();
    });
    trigger.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.isComposing) {
        event.preventDefault();
        open();
      }
    });
    control.append(trigger);
  }

  document.body.append(control);
  const positioning = installControlPositioning(p, control, trigger);

  const close = () => {
    if (!panel) return;
    cleanupFocus?.();
    cleanupFocus = undefined;
    panel.querySelectorAll('.helper-modal-tab').forEach(disposeDialogElement);
    panel.remove();
    panel = undefined;
    positioning.setRevealed(true);
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus();
    positioning.schedulePosition();
  };
  const open = () => {
    if (!trigger) return;
    if (panel) return close();
    panel = createElement('div', {
      class: 'helper-modal rulifeed-navigation-panel',
    });
    const body = createElement(
      'div',
      {
        class: 'helper-modal-body',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': '탐색 목록',
      },
      createNavigationModal(p, close),
    );
    panel.append(body);
    document.body.append(panel);
    panel.addEventListener('click', (event) => {
      if (event.target === panel) close();
    });
    trigger.setAttribute('aria-expanded', 'true');
    positioning.schedulePosition();
    cleanupFocus = installDialogFocus(
      body,
      close,
      body.querySelector<HTMLElement>('.rulifeed-reading-close') ?? undefined,
    );
  };
  const update = () => {
    if (disposed) return;
    actions.update();
    if (!trigger || !count) {
      positioning.schedulePosition();
      return;
    }
    trigger.classList.toggle('is-loading', loading);
    trigger.setAttribute('aria-busy', String(loading));
    const current = currentArticlePath(p.href);
    const index = findArticleIndex(p.articleList, current, p.activeIndex);
    const label =
      index >= 0
        ? `탐색 ${index + 1} / ${p.articleList.length}`
        : `탐색 목록 · ${p.articleList.length}개`;
    count.textContent =
      index >= 0
        ? `${index + 1}/${p.articleList.length}`
        : `${p.articleList.length}`;
    const failures = activeSubscriptionFailures(p).length;
    if (failures) {
      count.append(
        createElement('span', {
          text: ` · 실패 ${failures}`,
          class: 'rulifeed-subscription-failure-count',
        }),
      );
    }
    trigger.setAttribute(
      'title',
      failures ? `탐색 목록 · 실패 채널 ${failures}개 다시 시도` : '탐색 목록',
    );
    trigger.setAttribute('data-failed-channels', String(failures));
    trigger.setAttribute(
      'aria-label',
      `${label}, ${failures ? `실패 채널 ${failures}개, ` : ''}${loading ? '게시글 목록 불러오는 중, ' : ''}불러온 목록 기준, 목록 열기`,
    );
    positioning.schedulePosition();
  };
  let previous = p.getState();
  let previousSettings = p.uiSettings;
  const unsubscribe = p.subscribe((state) => {
    const changed =
      state.articleList !== previous.articleList ||
      state.activeIndex !== previous.activeIndex ||
      state.href !== previous.href ||
      state.articleFilterConfig !== previous.articleFilterConfig ||
      state.subscriptionFailures !== previous.subscriptionFailures ||
      state.seriesChannels !== previous.seriesChannels ||
      state.isSeriesMode !== previous.isSeriesMode ||
      state.isScrapMode !== previous.isScrapMode;
    previous = state;
    if (changed) updateAfterSwipe(p.swiper, update);
    if (state.uiSettings !== previousSettings) {
      previousSettings = state.uiSettings;
      positioning.schedulePosition(true);
    }
  });
  const unsubscribeLoading = hasNavigation
    ? subscribeArticleLoading((active) => {
        loading = active;
        updateAfterSwipe(p.swiper, update);
      })
    : () => {};
  return () => {
    disposed = true;
    close();
    unsubscribe();
    unsubscribeLoading();
    positioning.cleanup();
    control.remove();
  };
}
