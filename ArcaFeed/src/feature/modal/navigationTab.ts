import { findArticleIndex } from '@/vault/article-window';
import { createElement, fromTemplate } from '@feed/core/utils/dom';
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
function installControlPositioning(
  p: VaultAdapter,
  control: HTMLElement,
  trigger: HTMLElement,
) {
  let touchTimer: ReturnType<typeof setTimeout> | undefined;
  const positioning = installNavigationPosition(
    control,
    trigger,
    () => p.swiper,
  );
  const hide = () => {
    if (touchTimer !== undefined) {
      clearTimeout(touchTimer);
      touchTimer = undefined;
    }
    trigger.classList.toggle('is-hovered', false);
  };
  control.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') trigger.classList.add('is-hovered');
  });
  control.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') trigger.classList.remove('is-hovered');
  });
  control.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    trigger.classList.add('is-hovered');
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      touchTimer = undefined;
      trigger.classList.toggle('is-hovered', false);
    }, 1500);
  });
  document.addEventListener('scroll', hide, { passive: true, capture: true });
  return {
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
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;
  if (document.querySelector('.arcafeed-navigation-trigger')) return;
  const control = createElement('div', {
    class: 'arcafeed-navigation-control',
  });
  let loading = isArticleLoading();
  const count = createElement('span', { class: 'arcafeed-navigation-count' });
  const trigger = createElement(
    'a',
    {
      class: 'arcafeed-navigation-trigger',
      role: 'button',
      tabindex: 0,
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      title: '탐색 목록',
    },
    createElement('span', { class: 'bi-list-ul', 'aria-hidden': 'true' }),
    count,
    fromTemplate(
      '<svg class="arcafeed-navigation-loading-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="20" pathLength="100" /></svg>',
    ),
  );
  trigger.addEventListener('click', () => open());
  trigger.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.isComposing) {
      event.preventDefault();
      open();
    }
  });
  let panel: HTMLElement | undefined;
  let cleanupFocus: (() => void) | undefined;
  let disposed = false;
  control.append(trigger);
  document.body.append(control);
  const positioning = installControlPositioning(p, control, trigger);
  const close = () => {
    if (!panel) return;
    cleanupFocus?.();
    cleanupFocus = undefined;
    panel.querySelectorAll('.helper-modal-tab').forEach(disposeDialogElement);
    panel.remove();
    panel = undefined;
    trigger.classList.add('is-hovered');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
    positioning.schedulePosition();
  };
  const open = () => {
    if (panel) return close();
    panel = createElement('div', {
      class: 'helper-modal arcafeed-navigation-panel',
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
      body.querySelector<HTMLElement>('.arcafeed-reading-close') ?? undefined,
    );
  };
  const update = () => {
    if (disposed) return;
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
          class: 'arcafeed-subscription-failure-count',
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
  const unsubscribeLoading = subscribeArticleLoading((active) => {
    loading = active;
    updateAfterSwipe(p.swiper, update);
  });
  return () => {
    disposed = true;
    close();
    unsubscribe();
    unsubscribeLoading();
    positioning.cleanup();
    control.remove();
  };
}
