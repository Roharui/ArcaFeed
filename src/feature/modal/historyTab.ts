import $ from 'jquery';
import {
  readingButton as button,
  readingChannelId as channelId,
  readingHeader,
  readingEmptyState,
  readingDateLabel,
  readingTime,
  readingSearch,
  createReadingSearchMatcher,
} from './readingUi';
import type { VaultAdapter } from '@/vault';
import { SITE_RECENT_URL } from '@/vault/reading-history';
import type { ReadingEntry } from '@/vault/reading-history';

const PAGE_SIZE = 50;

export function createHistoryModal(p: VaultAdapter): JQuery<HTMLElement> {
  p.reading.reload();
  const tab = $('<div>', { class: 'helper-modal-tab helper-modal-history' });
  const count = $('<span>', {
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

  const tools = $('<div>', { class: 'arcafeed-history-tools' });
  const search = readingSearch(
    '제목 또는 채널 이름으로 검색',
    '최근 본 글 검색',
    () => {
      visibleCount = PAGE_SIZE;
      render();
    },
  );
  const channel = $('<select>', { 'aria-label': '채널 필터' });
  tools.append(
    search.element,
    channel,
    $('<span>', { class: 'arcafeed-reading-sort', text: '최근 방문 순' }),
  );
  const entries = $('<div>', {
    class: 'arcafeed-reading-list arcafeed-history-list',
  });
  const total = $('<span>', { class: 'arcafeed-reading-total' });
  const more = button('더 보기', () => {
    visibleCount += PAGE_SIZE;
    render();
  }).addClass('arcafeed-reading-more');
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
    const selectedChannel = String(channel.val() || '');
    if (indexedEntries !== p.reading.entries) {
      indexedEntries = p.reading.entries;
      channelNames.clear();
      for (const entry of indexedEntries)
        channelNames.set(
          channelId(entry.path),
          entry.channelName || channelId(entry.path),
        );
      channel.empty().append($('<option>', { value: '', text: '전체 채널' }));
      for (const [id, name] of channelNames)
        channel.append($('<option>', { value: id, text: name }));
    }
    channel.val(channelNames.has(selectedChannel) ? selectedChannel : '');
    const filterChannel = String(channel.val() || '');
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
    count.text(String(filtered.length));
    total.text(`전체 ${p.reading.entries.length}개`);
    entries.empty();
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
              '사이트의 최근 읽은 글에서 기록 사용 설정을 확인해주세요.',
            ),
      );
    let previousDate = '';
    for (const entry of filtered.slice(0, visibleCount)) {
      const date = readingDateLabel(entry.visitedAt);
      if (date !== previousDate) {
        entries.append(
          $('<div>', { class: 'arcafeed-reading-date', text: date }),
        );
        previousDate = date;
      }
      entries.append(
        $('<a>', { href: entry.path, class: 'arcafeed-history-row' }).append(
          $('<div>', { class: 'arcafeed-history-row-heading' }).append(
            $('<span>', {
              class: 'arcafeed-history-link',
              text: entry.title,
              title: entry.title,
            }),
            $('<span>', { class: 'bi-arrow-up-right', 'aria-hidden': 'true' }),
          ),
          $('<div>', { class: 'arcafeed-history-meta' }).append(
            $('<span>', {
              class: 'arcafeed-reading-channel',
              text: entry.channelName || channelId(entry.path),
            }),
            readingTime(entry.visitedAt),
          ),
        ),
      );
    }
    more.toggle(filtered.length > visibleCount);
    more.text(
      `더 보기 · ${Math.min(PAGE_SIZE, Math.max(0, filtered.length - visibleCount))}개`,
    );
  };

  channel.on('change', () => {
    visibleCount = PAGE_SIZE;
    render();
  });
  tab.append(
    tools,
    $('<div>', { class: 'arcafeed-modal-content' }).append(entries, more),
  );
  tab.append(
    $('<div>', { class: 'arcafeed-history-footer' }).append(
      total,
      $('<div>', { class: 'arcafeed-history-footer-actions' }).append(
        button('새로고침', () => p.reading.reload()),
        $('<a>', {
          href: SITE_RECENT_URL,
          class: 'arcafeed-reading-button',
          text: '사이트 기록 관리',
        }),
      ),
    ),
  );
  const unsubscribeReading = p.reading.subscribe(render, ['entries']);
  tab.data('cleanup', unsubscribeReading);
  render();
  return tab;
}
