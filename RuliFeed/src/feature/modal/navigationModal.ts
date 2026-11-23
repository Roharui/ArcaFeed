import { createElement } from '@feed/core/utils/dom';
import { setDialogCleanup } from '@feed/core/feature/modal/cleanup';
import { createSubscriptionStatus } from './subscriptionStatus';
import '@css/modal.css';
import '@css/reading.css';
import { navigateToArticle } from '@/feature/swiper/page';
import { currentArticlePath } from '@/vault/navigation-context';
import type { ReadingEntry } from '@/vault/reading-history';
import {
  readingButton,
  readingChannelId,
  readingHeader,
  readingEmptyState,
  syncChannelSelect,
} from './readingUi';
import type { VaultAdapter } from '@/vault';
interface NavigationItem {
  path: string;
  index: number;
}
const PAGE_WINDOW = 100;
const INITIAL_OFFSET = 50;
function centerCurrentRow(list: HTMLElement): void {
  const current = list.querySelector<HTMLElement>('[aria-current=page]');
  const padding = current
    ? Math.max(0, (list.clientHeight - current.offsetHeight) / 2)
    : 0;
  const [before, after] = Array.from(
    list.querySelectorAll<HTMLElement>('.rulifeed-navigation-spacer'),
  );
  if (before && after) {
    const previous = list.querySelector(
      '.rulifeed-navigation-load-previous:not([hidden])',
    );
    before.style.height = previous ? '0px' : `${padding}px`;
    after.style.height = `${padding}px`;
  }
  if (current) {
    const bounds = list.getBoundingClientRect();
    const row = current.getBoundingClientRect();
    list.scrollTop +=
      row.top + row.height / 2 - bounds.top - list.clientHeight / 2;
  }
}
function createNavigationRow(
  p: VaultAdapter,
  entries: ReadonlyMap<string, ReadingEntry>,
  item: NavigationItem,
  currentIndex: number,
  showChannels: boolean,
): HTMLElement {
  const { path, index } = item;
  const id = readingChannelId(path);
  const entry = entries.get(path);
  const title = entry?.title || `게시글 ${path.split('/').pop()}`;
  const name =
    entry?.channelName || p.articleFilterConfig[id]?.channelName || id;
  const row = readingButton('', () => {
    const latestIndex = p.articleList.indexOf(path);
    if (latestIndex >= 0)
      void navigateToArticle(p, latestIndex).catch(() => {});
  });
  row.classList.add('rulifeed-navigation-row');
  if (showChannels)
    row.append(
      createElement('span', {
        class: 'rulifeed-navigation-channel',
        text: name,
      }),
    );
  row.append(
    createElement('span', { class: 'rulifeed-navigation-title', text: title }),
  );
  if (index === currentIndex) {
    row.setAttribute('aria-current', 'page');
    row.append(
      createElement('span', {
        class: 'rulifeed-navigation-current',
        text: '현재 글',
      }),
    );
  }
  return row;
}
export function createNavigationModal(
  p: VaultAdapter,
  close: () => void,
): HTMLElement {
  const tab = createElement('div', {
    class: 'helper-modal-tab helper-modal-navigation',
  });
  const position = createElement('span', { 'aria-live': 'polite' });
  const channel = createElement('select', {
    'aria-label': '탐색 목록 채널 필터',
  });
  const tools = createElement(
    'div',
    { class: 'rulifeed-history-tools' },
    channel,
  );
  const list = createElement('div', { class: 'rulifeed-modal-content' });
  const status = createSubscriptionStatus(p);
  let centerFrame: number | undefined;
  const scheduleCenter = () => {
    if (centerFrame !== undefined) cancelAnimationFrame(centerFrame);
    centerFrame = requestAnimationFrame(() => {
      centerFrame = undefined;
      centerCurrentRow(list);
    });
  };
  const resizeObserver = new ResizeObserver(scheduleCenter);
  resizeObserver.observe(list);
  tab.append(
    readingHeader(
      '탐색 목록',
      '불러온 목록 기준입니다. 추가 로딩이나 오래된 목록 정리로 순번과 개수가 바뀔 수 있습니다.',
      position,
      close,
    ),
    tools,
    status.element,
    list,
  );
  const render = () => {
    const paths = p.articleList;
    const currentPath = currentArticlePath(p.href);
    const currentIndex =
      paths[p.activeIndex] === currentPath
        ? p.activeIndex
        : paths.indexOf(currentPath);
    position.textContent =
      currentIndex >= 0
        ? `${currentIndex + 1} / ${paths.length}`
        : `불러온 글 ${paths.length}개`;
    const selected = channel.value;
    const ids = [...new Set(paths.map(readingChannelId))];
    const showChannels = ids.length > 1 || p.seriesChannels.length > 0;
    if (showChannels) list.before(tools);
    else tools.remove();
    const selectedChannel = syncChannelSelect(
      channel,
      ids.map((id) => [id, p.articleFilterConfig[id]?.channelName || id]),
      selected,
    );
    const filter = showChannels ? selectedChannel : '';
    const entries = new Map(
      p.reading.entries.map((entry) => [entry.path, entry]),
    );
    list.replaceChildren();
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
    const items: NavigationItem[] = paths
      .map((path, index) => ({ path, index }))
      .filter(({ path }) => !filter || readingChannelId(path) === filter);
    const currentOffset = items.findIndex(
      ({ index }) => index === currentIndex,
    );
    let start =
      currentOffset >= 0 ? Math.max(0, currentOffset - INITIAL_OFFSET) : 0;
    let end = Math.min(items.length, start + PAGE_WINDOW);
    const buildRow = (item: NavigationItem) =>
      createNavigationRow(p, entries, item, currentIndex, showChannels);
    const before = createElement('div', {
      class: 'rulifeed-navigation-spacer',
      'aria-hidden': 'true',
    });
    const after = before.cloneNode(true);
    const rows = createElement('div');
    const previous = readingButton('이전 목록 더 보기', () => {
      const anchor = rows.firstElementChild;
      const top = anchor?.getBoundingClientRect().top ?? 0;
      const nextStart = Math.max(0, start - PAGE_WINDOW);
      rows.prepend(...items.slice(nextStart, start).map(buildRow));
      start = nextStart;
      previous.hidden = start === 0;
      if (anchor) list.scrollTop += anchor.getBoundingClientRect().top - top;
    });
    previous.classList.add(
      'rulifeed-navigation-load',
      'rulifeed-navigation-load-previous',
    );
    previous.prepend(
      createElement('span', { class: 'bi-arrow-up', 'aria-hidden': 'true' }),
    );
    const more = readingButton('더 보기', () => {
      rows.append(...items.slice(end, end + PAGE_WINDOW).map(buildRow));
      end = Math.min(items.length, end + PAGE_WINDOW);
      more.hidden = end >= items.length;
    });
    more.classList.add('rulifeed-navigation-load');
    more.append(
      createElement('span', { class: 'bi-arrow-down', 'aria-hidden': 'true' }),
    );
    if (items.length) {
      previous.hidden = start === 0;
      more.hidden = end >= items.length;
      list.append(before, previous, rows, more, after);
      rows.append(...items.slice(start, end).map(buildRow));
    }
    list.scrollTop = 0;
    scheduleCenter();
  };
  channel.addEventListener('change', render);
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
  setDialogCleanup(tab, () => {
    if (centerFrame !== undefined) cancelAnimationFrame(centerFrame);
    resizeObserver.disconnect();
    status.cleanup();
    unsubscribeState();
    unsubscribeReading();
  });
  render();
  return tab;
}
