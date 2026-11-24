import { createElement } from '@feed/core/utils/dom';
import { setDialogCleanup } from '@feed/core/feature/modal/cleanup';
import {
  readingButton as button,
  readingChannelId as channelId,
  readingHeader,
  readingEmptyState,
  readingDateLabel,
  readingTime,
  readingSearch,
  createReadingSearchMatcher,
  syncChannelSelect,
} from './readingUi';
import type { VaultAdapter } from '@/vault';
import { SITE_RECENT_URL } from '@/vault/reading-history';
import type { ReadingEntry } from '@/vault/reading-history';
const PAGE_SIZE = 50;
export function createHistoryModal(p: VaultAdapter): HTMLElement {
  p.reading.reload(['entries']);
  const tab = createElement('div', {
    class: 'helper-modal-tab helper-modal-history',
  });
  const count = createElement('span', {
    class: 'arcafeed-reading-count',
    'aria-live': 'polite',
  });
  tab.append(
    readingHeader(
      '최근 본 글',
      '아카라이브의 최근 읽은 글 목록을 표시합니다.',
      count,
    ),
  );
  const tools = createElement('div', { class: 'arcafeed-history-tools' });
  const search = readingSearch(
    '제목 또는 채널 이름으로 검색',
    '최근 본 글 검색',
    () => {
      visibleCount = PAGE_SIZE;
      render();
    },
  );
  const channel = createElement('select', { 'aria-label': '채널 필터' });
  tools.append(
    search.element,
    channel,
    createElement('span', {
      class: 'arcafeed-reading-sort',
      text: '최근 방문 순',
    }),
  );
  const entries = createElement('div', {
    class: 'arcafeed-reading-list arcafeed-history-list',
  });
  const total = createElement('span', { class: 'arcafeed-reading-total' });
  const more = button('더 보기', () => {
    visibleCount += PAGE_SIZE;
    render();
  });
  more.classList.add('arcafeed-reading-more');
  let visibleCount = PAGE_SIZE;
  const matchesSearch = createReadingSearchMatcher<ReadingEntry>(
    (entry) => `${entry.title} ${entry.channelName} ${channelId(entry.path)}`,
  );
  let indexedEntries: readonly ReadingEntry[] | undefined;
  const channelNames = new Map<string, string>();
  let filteredEntries: readonly ReadingEntry[] | undefined;
  let previousQuery = '';
  let previousChannel = '';
  let filtered: readonly ReadingEntry[] = [];
  const render = () => {
    const selectedChannel = channel.value;
    if (indexedEntries !== p.reading.entries) {
      indexedEntries = p.reading.entries;
      channelNames.clear();
      for (const entry of indexedEntries)
        channelNames.set(
          channelId(entry.path),
          entry.channelName || channelId(entry.path),
        );
      syncChannelSelect(channel, channelNames, selectedChannel);
    } else {
      channel.value = channelNames.has(selectedChannel) ? selectedChannel : '';
    }
    const filterChannel = channel.value;
    const query = search.getQuery();
    if (
      filteredEntries !== p.reading.entries ||
      previousQuery !== query ||
      previousChannel !== filterChannel
    ) {
      filteredEntries = p.reading.entries;
      previousQuery = query;
      previousChannel = filterChannel;
      filtered = filteredEntries.filter(
        (entry) =>
          (!filterChannel || channelId(entry.path) === filterChannel) &&
          matchesSearch(entry, query),
      );
    }
    count.textContent = String(filtered.length);
    total.textContent = `전체 ${p.reading.entries.length}개`;
    if (!filtered.length)
      entries.replaceChildren(
        p.reading.entries.length
          ? readingEmptyState(
              'bi-search',
              '검색 결과가 없습니다',
              '다른 검색어나 채널을 선택해보세요.',
            )
          : readingEmptyState(
              'bi-clock-history',
              '아직 본 글이 없습니다',
              '사이트의 최근 읽은 글에서 기록 사용 설정을 확인해주세요.',
            ),
      );
    const rows: HTMLElement[] = [];
    let previousDate = '';
    for (const entry of filtered.slice(0, visibleCount)) {
      const date = readingDateLabel(entry.visitedAt);
      if (date !== previousDate) {
        rows.push(
          createElement('div', { class: 'arcafeed-reading-date', text: date }),
        );
        previousDate = date;
      }
      rows.push(
        createElement(
          'a',
          { href: entry.path, class: 'arcafeed-history-row' },
          createElement(
            'div',
            { class: 'arcafeed-history-row-heading' },
            createElement('span', {
              class: 'arcafeed-history-link',
              text: entry.title,
              title: entry.title,
            }),
            createElement('span', {
              class: 'bi-arrow-up-right',
              'aria-hidden': 'true',
            }),
          ),
          createElement(
            'div',
            { class: 'arcafeed-history-meta' },
            createElement('span', {
              class: 'arcafeed-reading-channel',
              text: entry.channelName || channelId(entry.path),
            }),
            readingTime(entry.visitedAt),
          ),
        ),
      );
    }
    if (rows.length) entries.replaceChildren(...rows);
    more.hidden = filtered.length <= visibleCount;
    more.textContent = `더 보기 · ${Math.min(PAGE_SIZE, Math.max(0, filtered.length - visibleCount))}개`;
  };
  channel.addEventListener('change', () => {
    visibleCount = PAGE_SIZE;
    render();
  });
  tab.append(
    tools,
    createElement('div', { class: 'arcafeed-modal-content' }, entries, more),
  );
  tab.append(
    createElement(
      'div',
      { class: 'arcafeed-history-footer' },
      total,
      createElement(
        'div',
        { class: 'arcafeed-history-footer-actions' },
        button('새로고침', () => p.reading.reload(['entries'])),
        createElement('a', {
          href: SITE_RECENT_URL,
          class: 'arcafeed-reading-button',
          text: '사이트 기록 관리',
        }),
      ),
    ),
  );
  const unsubscribeReading = p.reading.subscribe(render, ['entries']);
  setDialogCleanup(tab, unsubscribeReading);
  render();
  return tab;
}
