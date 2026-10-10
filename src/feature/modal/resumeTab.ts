import $ from 'jquery';
import { resumeReading } from '@/feature/reading';
import {
  readingButton,
  readingChannelId,
  readingHeader,
  readingEmptyState,
  readingTime,
  readingSearch,
  createReadingSearchMatcher,
} from './readingUi';
import type { VaultAdapter } from '@/vault';
import type { ReadingEntry, ReadingSession } from '@/vault/reading-history';

export function createResumeModal(p: VaultAdapter): JQuery<HTMLElement> {
  const tab = $('<div>', { class: 'helper-modal-tab helper-modal-resume' });
  const tools = $('<div>', { class: 'arcafeed-history-tools' });
  const search = readingSearch(
    '채널, 시리즈 또는 글 제목으로 검색',
    '이어보기 검색',
    () => render(),
  );
  const channel = $('<select>', { 'aria-label': '이어보기 채널 필터' });
  const sessions = $('<div>', {
    class: 'arcafeed-modal-content arcafeed-reading-list arcafeed-resume-list',
  });
  const count = $('<span>', {
    class: 'arcafeed-reading-count',
    'aria-live': 'polite',
  });
  tab.append(
    readingHeader('이어보기', '마지막으로 보던 글에서 계속 탐색하세요.', count),
    tools.append(
      search.element,
      channel,
      $('<span>', { class: 'arcafeed-reading-sort', text: '최근 탐색 순' }),
    ),
    sessions,
  );

  let indexedEntries: readonly ReadingEntry[] | undefined;
  const channelNames = new Map<string, string>();
  const entriesByPath = new Map<string, ReadingEntry>();
  const makeMatcher = () =>
    createReadingSearchMatcher<ReadingSession>((session) => {
      const entry = entriesByPath.get(session.path);
      return `${session.label} ${entry?.title || ''} ${entry?.channelName || ''} ${readingChannelId(session.path)} ${session.seriesChannels.map((id) => `${id} ${channelNames.get(id) || ''}`).join(' ')}`;
    });
  let matchesSearch = makeMatcher();
  const render = () => {
    const selectedChannel = String(channel.val() || '');
    const channelIds = new Set(
      p.reading.sessions.flatMap((session) => [
        readingChannelId(session.path),
        ...session.seriesChannels,
      ]),
    );
    if (indexedEntries !== p.reading.entries) {
      indexedEntries = p.reading.entries;
      channelNames.clear();
      entriesByPath.clear();
      for (const entry of indexedEntries) {
        channelNames.set(readingChannelId(entry.path), entry.channelName);
        entriesByPath.set(entry.path, entry);
      }
      matchesSearch = makeMatcher();
    }
    channel.empty().append($('<option>', { value: '', text: '전체 채널' }));
    for (const id of channelIds)
      channel.append(
        $('<option>', { value: id, text: channelNames.get(id) || id }),
      );
    channel.val(channelIds.has(selectedChannel) ? selectedChannel : '');
    const filterChannel = String(channel.val() || '');
    const query = search.getQuery();
    const checkpoints = p.reading.sessions.filter((session) => {
      return (
        (!filterChannel ||
          readingChannelId(session.path) === filterChannel ||
          session.seriesChannels.includes(filterChannel)) &&
        matchesSearch(session, query)
      );
    });

    sessions.empty();
    count.text(String(checkpoints.length));
    if (!checkpoints.length)
      sessions.append(
        p.reading.sessions.length
          ? readingEmptyState(
              'bi-search',
              '검색 결과가 없습니다',
              '다른 검색어나 채널을 선택해보세요.',
            )
          : readingEmptyState(
              'bi-book',
              '다음에 여기서 이어보세요',
              '게시글을 탐색하면 마지막 위치를 기억합니다.',
            ),
      );
    for (const session of checkpoints) {
      const entry = entriesByPath.get(session.path);
      const type = session.isScrapMode
        ? '스크랩'
        : session.isSeriesMode
          ? session.seriesChannels.length
            ? '구독 피드'
            : '시리즈'
          : '채널';
      const title = entry?.title || `게시글 ${session.path.split('/').pop()}`;
      const resume = readingButton('이어보기', () => {
        const latest = p.reading.sessions.find(
          (item) => item.id === session.id,
        );
        if (latest) resumeReading(p, latest);
      })
        .addClass('arcafeed-resume-action')
        .attr('aria-label', `${session.label} · ${title} 이어보기`)
        .append(
          $('<span>', { class: 'bi-arrow-right', 'aria-hidden': 'true' }),
        );
      const remove = readingButton('삭제', () => {
        p.reading.removeSession(session.id);
      })
        .addClass('arcafeed-resume-delete')
        .attr({
          'aria-label': `${session.label} · ${title} 이어보기 삭제`,
          title: '이 이어보기 삭제',
        });
      sessions.append(
        $('<div>', { class: 'arcafeed-resume-card' }).append(
          $('<div>', { class: 'arcafeed-resume-context' }).append(
            $('<span>', { class: 'arcafeed-resume-type', text: type }),
            $('<span>', {
              class: 'arcafeed-resume-label',
              text: session.label,
              title: session.label,
            }),
          ),
          $('<div>', { class: 'arcafeed-resume-title', text: title, title }),
          $('<div>', { class: 'arcafeed-resume-bottom' }).append(
            readingTime(session.updatedAt),
            $('<div>', { class: 'arcafeed-resume-actions' }).append(
              remove,
              resume,
            ),
          ),
        ),
      );
    }
  };
  channel.on('change', render);
  const unsubscribe = p.reading.subscribe(render, ['entries', 'sessions']);
  tab.data('cleanup', unsubscribe);
  render();
  return tab;
}
