import $ from 'jquery';
import { installDialogFocus } from './focus';
import { createNavigationModal } from './navigationModal';
import '@css/modal.css';
import '@css/reading.css';
import {
  isArticleLoading,
  subscribeArticleLoading,
} from '@/feature/article/loading';
import { updateAfterSwipe } from '@/feature/swiper/motion';
import { currentArticlePath } from '@/vault/navigation-context';
import { activeSubscriptionFailures } from '@/vault/subscription-failures';
import type { VaultAdapter } from '@/vault';

export { createNavigationModal } from './navigationModal';

function positionNavigationControl(
  control: HTMLElement,
  trigger: HTMLElement,
): void {
  const nativeButton = document.querySelector<HTMLElement>(
    '.nav-control a, .nav-control button',
  );
  if (nativeButton) {
    const style = getComputedStyle(nativeButton);
    // Keep the native theme while retaining our rounded corners.
    for (const property of ['border', 'box-shadow', 'font-size']) {
      trigger.style.setProperty(property, style.getPropertyValue(property));
    }
  }
  control.style.bottom = '';
  const rect = control.getBoundingClientRect();
  let top = rect.top;
  // The site's navigation may change size, visibility, or location.
  const obstacles = Array.from(
    document.querySelectorAll<HTMLElement>('.nav-control'),
  )
    .map((navControl) => navControl.getBoundingClientRect())
    .filter(
      (box) =>
        box.width > 0 &&
        box.height > 0 &&
        box.left < rect.right + 12 &&
        box.right > rect.left - 12,
    )
    .sort((a, b) => b.top - a.top);
  for (const box of obstacles) {
    if (top < box.bottom + 12 && top + rect.height > box.top - 12)
      top = box.top - rect.height - 12;
  }
  control.style.bottom = `${window.innerHeight - top - rect.height}px`;
}

function installControlPositioning(
  p: VaultAdapter,
  control: JQuery<HTMLElement>,
  trigger: JQuery<HTMLElement>,
  isDisposed: () => boolean,
) {
  let touchTimer: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  const position = () => {
    if (isDisposed()) return;
    positionNavigationControl(control[0]!, trigger[0]!);
  };
  const schedulePosition = () => {
    if (frame === undefined) {
      frame = requestAnimationFrame(() => {
        frame = undefined;
        updateAfterSwipe(p.swiper, position);
      });
    }
  };
  const hide = () => {
    clearTimeout(touchTimer);
    trigger.removeClass('is-hovered');
  };

  control
    .on('pointerenter', (event) => {
      const pointer = event.originalEvent as PointerEvent | undefined;
      if (pointer?.pointerType === 'mouse') trigger.addClass('is-hovered');
    })
    .on('pointerleave', (event) => {
      const pointer = event.originalEvent as PointerEvent | undefined;
      if (pointer?.pointerType === 'mouse') trigger.removeClass('is-hovered');
    })
    .on('pointerdown', (event) => {
      const pointer = event.originalEvent as PointerEvent | undefined;
      if (pointer?.pointerType !== 'touch') return;
      trigger.addClass('is-hovered');
      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => trigger.removeClass('is-hovered'), 1500);
    });

  document.addEventListener('scroll', hide, { passive: true, capture: true });
  window.addEventListener('resize', schedulePosition);
  const resizeObserver = new ResizeObserver(schedulePosition);
  resizeObserver.observe(control[0]!);
  const observeControls = () => {
    document
      .querySelectorAll('.nav-control')
      .forEach((navControl) => resizeObserver.observe(navControl));
    schedulePosition();
  };
  const mutationObserver = new MutationObserver((records) => {
    if (
      records.some((record) => {
        const target = record.target;
        return (
          target instanceof Element &&
          !target.closest('.arcafeed-navigation-control') &&
          (target.matches('body, .nav-control') ||
            target.closest('.nav-control'))
        );
      })
    )
      observeControls();
  });
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
  observeControls();

  return {
    schedulePosition,
    cleanup: () => {
      clearTimeout(touchTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', schedulePosition);
    },
  };
}

/** A persistent entry point independent of the settings dialog. */
export function initNavigationList(p: VaultAdapter): (() => void) | undefined {
  if (!p.isCurrentMode('CHANNEL', 'ARTICLE')) return;
  if (document.querySelector('.arcafeed-navigation-trigger')) return;

  const control = $('<div>', { class: 'arcafeed-navigation-control' });
  let loading = isArticleLoading();
  const count = $('<span>', { class: 'arcafeed-navigation-count' });
  const trigger = $('<a>', {
    class: 'arcafeed-navigation-trigger',
    role: 'button',
    tabindex: 0,
    'aria-haspopup': 'dialog',
    'aria-expanded': 'false',
    title: '탐색 목록',
  })
    .append(
      $('<span>', { class: 'bi-list-ul', 'aria-hidden': 'true' }),
      count,
      $(
        '<svg class="arcafeed-navigation-loading-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="20" pathLength="100" /></svg>',
      ),
    )
    .on('click', () => open())
    .on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });

  let panel: JQuery<HTMLElement> | undefined;
  let cleanupFocus: (() => void) | undefined;
  let disposed = false;

  control.append(trigger).appendTo('body');
  const positioning = installControlPositioning(
    p,
    control,
    trigger,
    () => disposed,
  );

  const close = () => {
    if (!panel) return;
    cleanupFocus?.();
    cleanupFocus = undefined;
    panel.find('.helper-modal-tab').data('cleanup')?.();
    panel.remove();
    panel = undefined;
    trigger
      .addClass('is-hovered')
      .attr('aria-expanded', 'false')
      .trigger('focus');
    positioning.schedulePosition();
  };

  const open = () => {
    if (panel) return close();
    panel = $('<div>', { class: 'helper-modal arcafeed-navigation-panel' });
    const body = $('<div>', {
      class: 'helper-modal-body',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': '탐색 목록',
    }).append(createNavigationModal(p, close));
    panel
      .append(body)
      .appendTo('body')
      .on('click', (event) => {
        if (event.target === panel?.[0]) close();
      });
    trigger.attr('aria-expanded', 'true');
    positioning.schedulePosition();
    cleanupFocus = installDialogFocus(
      body[0]!,
      close,
      body.find('.arcafeed-reading-close')[0],
    );
  };

  const update = () => {
    if (disposed) return;
    trigger
      .toggleClass('is-loading', loading)
      .attr('aria-busy', String(loading));
    const current = currentArticlePath(p.href);
    const index =
      p.articleList[p.activeIndex] === current
        ? p.activeIndex
        : p.articleList.indexOf(current);
    const label =
      index >= 0
        ? `탐색 ${index + 1} / ${p.articleList.length}`
        : `탐색 목록 · ${p.articleList.length}개`;
    count.text(
      index >= 0
        ? `${index + 1}/${p.articleList.length}`
        : `${p.articleList.length}`,
    );
    const failures = activeSubscriptionFailures(p).length;
    if (failures) {
      count.append(
        $('<span>', {
          text: ` · 실패 ${failures}`,
          class: 'arcafeed-subscription-failure-count',
        }),
      );
    }
    trigger.attr(
      'title',
      failures ? `탐색 목록 · 실패 채널 ${failures}개 다시 시도` : '탐색 목록',
    );
    trigger.attr('data-failed-channels', String(failures));
    trigger.attr(
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
      positioning.schedulePosition();
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
