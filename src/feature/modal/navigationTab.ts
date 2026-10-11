import $ from 'jquery';
import '@css/modal.css';
import '@css/reading.css';
import {
  isArticleLoading,
  subscribeArticleLoading,
} from '@/feature/article/loading';
import { navigateToArticle } from '@/feature/swiper/page';
import {
  readingButton,
  readingChannelId,
  readingHeader,
  readingEmptyState,
} from './readingUi';
import type { VaultAdapter } from '@/vault';

export function createNavigationModal(
  p: VaultAdapter,
  close: () => void,
): JQuery<HTMLElement> {
  const tab = $('<div>', { class: 'helper-modal-tab helper-modal-navigation' });
  const position = $('<span>', { 'aria-live': 'polite' });
  const channel = $('<select>', { 'aria-label': '탐색 목록 채널 필터' });
  const tools = $('<div>', { class: 'arcafeed-history-tools' }).append(channel);
  const list = $('<div>', { class: 'arcafeed-modal-content' });
  let centerFrame: number | undefined;
  const centerCurrent = () => {
    const container = list[0]!;
    const current = list.find('[aria-current=page]')[0];
    const padding = current
      ? Math.max(0, (container.clientHeight - current.offsetHeight) / 2)
      : 0;
    list.find('.arcafeed-navigation-spacer').height(padding);
    if (current) {
      const bounds = container.getBoundingClientRect();
      const row = current.getBoundingClientRect();
      container.scrollTop +=
        row.top + row.height / 2 - bounds.top - container.clientHeight / 2;
    }
  };
  const scheduleCenter = () => {
    if (centerFrame !== undefined) cancelAnimationFrame(centerFrame);
    centerFrame = requestAnimationFrame(() => {
      centerFrame = undefined;
      centerCurrent();
    });
  };
  const resizeObserver = new ResizeObserver(scheduleCenter);
  resizeObserver.observe(list[0]!);
  tab.append(
    readingHeader(
      '탐색 목록',
      '불러온 목록 기준입니다. 추가 로딩이나 오래된 목록 정리로 순번과 개수가 바뀔 수 있습니다.',
      position,
    ),
    tools,
    list,
  );
  tab.find('.arcafeed-reading-close').off('click').on('click', close);
  const render = () => {
    const paths = p.articleList;
    const currentPath = p.isCurrentMode('ARTICLE')
      ? `/b/${p.href.channelId}/${p.href.articleId}`
      : '';
    const currentIndex =
      paths[p.activeIndex] === currentPath
        ? p.activeIndex
        : paths.indexOf(currentPath);
    position.text(
      currentIndex >= 0
        ? `${currentIndex + 1} / ${paths.length}`
        : `불러온 글 ${paths.length}개`,
    );
    const selected = String(channel.val() || '');
    const ids = [...new Set(paths.map(readingChannelId))];
    channel.empty().append($('<option>', { value: '', text: '전체 채널' }));
    for (const id of ids) {
      channel.append(
        $('<option>', {
          value: id,
          text: p.articleFilterConfig[id]?.channelName || id,
        }),
      );
    }
    channel.val(ids.includes(selected) ? selected : '');
    const filter = String(channel.val() || '');
    const entries = new Map(
      p.reading.entries.map((entry) => [entry.path, entry]),
    );
    list.empty();
    if (!paths.length) {
      list.append(
        readingEmptyState(
          'bi-list-ul',
          '불러온 탐색 목록이 없습니다',
          '채널이나 시리즈, 구독 피드에서 탐색을 시작하세요.',
        ),
      );
    }
    // Render in small pages; opening a long series need not create thousands of nodes.
    const items = paths
      .map((path, index) => ({ path, index }))
      .filter(({ path }) => !filter || readingChannelId(path) === filter);
    const currentOffset = items.findIndex(
      ({ index }) => index === currentIndex,
    );
    let start = currentOffset >= 0 ? Math.max(0, currentOffset - 50) : 0;
    let end = Math.min(items.length, start + 100);
    const before = $('<div>', {
      class: 'arcafeed-navigation-spacer',
      'aria-hidden': 'true',
    });
    const after = before.clone();
    const rows = $('<div>');
    const previous = readingButton('이전 목록 더 보기', () => {
      const anchor = rows.children()[0];
      const top = anchor?.getBoundingClientRect().top ?? 0;
      const nextStart = Math.max(0, start - 100);
      rows.prepend(items.slice(nextStart, start).map(createRow));
      start = nextStart;
      previous.toggle(start > 0);
      if (anchor)
        list[0]!.scrollTop += anchor.getBoundingClientRect().top - top;
    });
    const more = readingButton('더 보기', () => {
      rows.append(items.slice(end, end + 100).map(createRow));
      end = Math.min(items.length, end + 100);
      more.toggle(end < items.length);
    });
    const createRow = ({ path, index }: { path: string; index: number }) => {
      const id = readingChannelId(path);
      const entry = entries.get(path);
      const title = entry?.title || `게시글 ${path.split('/').pop()}`;
      const name =
        entry?.channelName || p.articleFilterConfig[id]?.channelName || id;
      const current = index === currentIndex;
      const row = readingButton(
        `${index + 1}. ${name} · ${title}${current ? ' · 현재 글' : ''}`,
        () => {
          const latestIndex = p.articleList.indexOf(path);
          if (latestIndex >= 0) navigateToArticle(p, latestIndex);
        },
      ).addClass('arcafeed-navigation-row');
      if (current) row.attr('aria-current', 'page');
      return row[0]!;
    };
    if (items.length) {
      list.append(
        before,
        previous.toggle(start > 0),
        rows,
        more.toggle(end < items.length),
        after,
      );
      rows.append(items.slice(start, end).map(createRow));
    }
    list.scrollTop(0);
    scheduleCenter();
  };
  channel.on('change', render);
  let previous = p.getState();
  const unsubscribeState = p.subscribe((state) => {
    const changed =
      state.articleList !== previous.articleList ||
      state.activeIndex !== previous.activeIndex ||
      state.href !== previous.href ||
      state.articleFilterConfig !== previous.articleFilterConfig;
    previous = state;
    if (changed) render();
  });
  const unsubscribeReading = p.reading.subscribe(render, ['entries']);
  tab.data('cleanup', () => {
    if (centerFrame !== undefined) cancelAnimationFrame(centerFrame);
    resizeObserver.disconnect();
    unsubscribeState();
    unsubscribeReading();
  });
  render();
  return tab;
}

/** A persistent entry point independent of the settings dialog. */
export function initNavigationList(p: VaultAdapter): (() => void) | undefined {
  if (document.querySelector('.arcafeed-navigation-trigger')) return;
  const control = $('<div>', {
    class: 'arcafeed-navigation-control',
  });
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
        '<svg class="arcafeed-navigation-loading-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="8" pathLength="100" /></svg>',
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
  const close = () => {
    panel?.find('.helper-modal-tab').data('cleanup')?.();
    panel?.remove();
    panel = undefined;
    $(document).off('keydown.arcafeedNavigation');
    trigger.attr('aria-expanded', 'false').trigger('focus');
    reveal();
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
    reveal();
    body.find('.arcafeed-reading-close').trigger('focus');
    $(document).on('keydown.arcafeedNavigation', (event) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const controls = body.find('button, select').filter(':visible');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
  };
  const update = () => {
    const current = p.isCurrentMode('ARTICLE')
      ? `/b/${p.href.channelId}/${p.href.articleId}`
      : '';
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
    trigger.attr(
      'aria-label',
      `${label}, ${loading ? '게시글 목록 불러오는 중, ' : ''}불러온 목록 기준, 목록 열기`,
    );
  };
  control.append(trigger).appendTo('body');
  let previous = p.getState();
  const unsubscribe = p.subscribe((state) => {
    const changed =
      state.articleList !== previous.articleList ||
      state.activeIndex !== previous.activeIndex ||
      state.href !== previous.href;
    previous = state;
    if (changed) {
      update();
      schedulePosition();
    }
    if (state.uiSettings !== previousSettings) {
      previousSettings = state.uiSettings;
      schedulePosition();
    }
  });
  let previousSettings = p.uiSettings;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  const position = () => {
    frame = undefined;
    const nativeButton = document.querySelector<HTMLElement>(
      '.nav-control a, .nav-control button',
    );
    if (nativeButton) {
      const style = getComputedStyle(nativeButton);
      trigger[0]!.style.backgroundColor = `color-mix(in srgb, ${style.backgroundColor} 75%, transparent)`;
      const height =
        nativeButton.getBoundingClientRect().height || parseFloat(style.height);
      if (Number.isFinite(height) && height > 0)
        trigger[0]!.style.setProperty(
          '--arcafeed-navigation-height',
          `${height}px`,
        );
      // Keep the native theme and button shape without inheriting its click handler.
      for (const property of [
        'color',
        'border',
        'border-radius',
        'box-shadow',
        'font-size',
      ]) {
        trigger[0]!.style.setProperty(
          property,
          style.getPropertyValue(property),
        );
      }
    }
    const element = control[0]!;
    element.style.bottom = '';
    const rect = element.getBoundingClientRect();
    let top = rect.top;
    // The site's navigation may change size, visibility, or location.
    const obstacles = Array.from(
      document.querySelectorAll<HTMLElement>('.nav-control'),
    )
      .map((control) => control.getBoundingClientRect())
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
    element.style.bottom = `${window.innerHeight - top - rect.height}px`;
  };
  const schedulePosition = () => {
    if (frame === undefined) frame = requestAnimationFrame(position);
  };
  const reveal = () => {
    trigger.removeClass('is-idle');
    clearTimeout(idleTimer);
    schedulePosition();
    idleTimer = setTimeout(() => {
      if (loading || panel || trigger.is(':hover')) return;
      trigger.addClass('is-idle');
    }, 3000);
  };
  trigger.on('pointerenter focus', reveal).on('pointerleave', reveal);
  document.addEventListener('scroll', reveal, { passive: true, capture: true });
  document.addEventListener('pointerdown', reveal, { passive: true });
  document.addEventListener('pointermove', reveal, { passive: true });
  document.addEventListener('keydown', reveal);
  window.addEventListener('resize', reveal);
  const resizeObserver = new ResizeObserver(schedulePosition);
  resizeObserver.observe(control[0]!);
  const observeControls = () => {
    document
      .querySelectorAll('.nav-control')
      .forEach((control) => resizeObserver.observe(control));
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
  const unsubscribeLoading = subscribeArticleLoading((active) => {
    loading = active;
    trigger
      .toggleClass('is-loading', loading)
      .attr('aria-busy', String(loading));
    update();
    reveal();
  });
  return () => {
    close();
    clearTimeout(idleTimer);
    if (frame !== undefined) cancelAnimationFrame(frame);
    unsubscribe();
    unsubscribeLoading();
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    document.removeEventListener('scroll', reveal, true);
    document.removeEventListener('pointerdown', reveal);
    document.removeEventListener('pointermove', reveal);
    document.removeEventListener('keydown', reveal);
    window.removeEventListener('resize', reveal);
    control.remove();
  };
}
