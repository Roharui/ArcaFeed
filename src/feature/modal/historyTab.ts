import { createElement } from '@/utils/dom';
import { setDialogCleanup } from './cleanup';
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
import type { ReadingEntry } from '@/vault/reading-history';
const PAGE_SIZE = 50;
export function createHistoryModal(p: VaultAdapter): HTMLElement {
  p.reading.reload(['entries']);
  const tab = createElement('div', {
    class: 'helper-modal-tab helper-modal-history',
  });
  const count = createElement('span', {
    class: 'rulifeed-reading-count',
    'aria-live': 'polite',
  });
  tab.append(
    readingHeader(
      '최근 본 글',
      '루리웹의 최근 읽은 글 목록을 표시합니다.',
      count,
    ),
  );
  const tools = createElement('div', { class: 'rulifeed-history-tools' });
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
      class: 'rulifeed-reading-sort',
      text: '최근 방문 순',
    }),
  );
  const entries = createElement('div', {
    class: 'rulifeed-reading-list rulifeed-history-list',
  });
  const total = createElement('span', { class: 'rulifeed-reading-total' });
  const more = button('더 보기', () => {
    visibleCount += PAGE_SIZE;
    render();
  });
  more.classList.add('rulifeed-reading-more');
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
    entries.replaceChildren();
    if (!filtered.length)
      entries.append(
        p.reading.entries.length
          ? readingEmptyState(
              'bi-search',
              '검색 결과가 없습니다',
              '다른 검색어나 채널을 선택해보세요.',
            )
          : readingEmptyState(
              'bi-clock-history',
              '아직 본 글이 없습니다',
              '게시글을 열면 이 목록에 표시됩니다.',
            ),
      );
    let previousDate = '';
    for (const entry of filtered.slice(0, visibleCount)) {
      const date = readingDateLabel(entry.visitedAt);
      if (date !== previousDate) {
        entries.append(
          createElement('div', { class: 'rulifeed-reading-date', text: date }),
        );
        previousDate = date;
      }
      entries.append(
        createElement(
          'a',
          { href: entry.path, class: 'rulifeed-history-row' },
          createElement(
            'div',
            { class: 'rulifeed-history-row-heading' },
            createElement('span', {
              class: 'rulifeed-history-link',
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
            { class: 'rulifeed-history-meta' },
            createElement('span', {
              class: 'rulifeed-reading-channel',
              text: entry.channelName || channelId(entry.path),
            }),
            readingTime(entry.visitedAt),
          ),
        ),
      );
    }
    more.hidden = filtered.length <= visibleCount;
    more.textContent = `더 보기 · ${Math.min(PAGE_SIZE, Math.max(0, filtered.length - visibleCount))}개`;
  };
  channel.addEventListener('change', () => {
    visibleCount = PAGE_SIZE;
    render();
  });
  tab.append(
    tools,
    createElement('div', { class: 'rulifeed-modal-content' }, entries, more),
  );
  tab.append(
    createElement(
      'div',
      { class: 'rulifeed-history-footer' },
      total,
      createElement(
        'div',
        { class: 'rulifeed-history-footer-actions' },
        button('새로고침', () => p.reading.reload(['entries'])),
      ),
    ),
  );
  const unsubscribeReading = p.reading.subscribe(render, ['entries']);
  setDialogCleanup(tab, unsubscribeReading);
  render();
  return tab;
}
