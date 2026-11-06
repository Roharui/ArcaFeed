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
    tabindex: -1,
    'aria-label': '이어보기 목록',
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
      $('<span>', {
        class: 'arcafeed-reading-sort',
        text: '고정 우선 · 최근 탐색 순',
      }),
    ),
    sessions,
  );

  const focusAction = (selector: string, id: string) => {
    const target = sessions
      .find(selector)
      .filter((_, el) => $(el).attr('data-session-id') === id);
    if (target.length) target.trigger('focus');
    else tab.find('input[type="search"]').trigger('focus');
  };

  let indexedEntries: readonly ReadingEntry[] | undefined;
  const channelNames = new Map<string, string>();
  const entriesByPath = new Map<string, ReadingEntry>();
  const makeMatcher = () =>
    createReadingSearchMatcher<ReadingSession>((session) => {
      const entry = entriesByPath.get(session.path);
      return `${session.customName || ''} ${session.label} ${entry?.title || ''} ${entry?.channelName || ''} ${readingChannelId(session.path)} ${session.seriesChannels.map((id) => `${id} ${channelNames.get(id) || ''}`).join(' ')}`;
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
      const displayName = session.customName || session.label;
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
        .attr('aria-label', `${displayName} · ${title} 이어보기`);
      const remove = readingButton('', () => {
        p.reading.removeSession(session.id);
        sessions[0]?.focus({ preventScroll: true });
      })
        .addClass('arcafeed-resume-delete arcafeed-resume-icon')
        .attr({
          'aria-label': `${displayName} · ${title} 이어보기 삭제`,
          title: '이 이어보기 삭제',
        })
        .append(
          $(
            '<svg class="bi-trash" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>',
          ),
        );
      const pin = readingButton('', () => {
        const latest = p.reading.sessions.find(
          (item) => item.id === session.id,
        );
        if (latest)
          p.reading.updateSession(session.id, { pinned: !latest.pinned });
        focusAction('.arcafeed-resume-pin', session.id);
      })
        .addClass('arcafeed-resume-pin arcafeed-resume-icon')
        .attr({
          'data-session-id': session.id,
          'aria-pressed': String(!!session.pinned),
          title: session.pinned ? '고정 해제' : '고정',
          'aria-label': `${displayName} ${session.pinned ? '고정 해제' : '고정'}`,
        });
      pin.append(
        $(
          `<svg class="${session.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 5 5-3 1-4 6v3l-8-8h3l6-4z" fill="${session.pinned ? 'currentColor' : 'none'}"/><path d="m10 14-7 7"/></svg>`,
        ),
      );
      const label = $('<span>', {
        class: 'arcafeed-resume-label',
        text: displayName,
        title: displayName,
      });
      const nameRow = $('<div>', { class: 'arcafeed-resume-name' });
      const rename = readingButton('', () => {
        const editor = $('<form>', {
          class: 'arcafeed-resume-name-editor',
          'aria-label': '이어보기 이름 변경',
        });
        const name = $<HTMLInputElement>('<input>', {
          type: 'text',
          maxlength: 100,
          value: displayName,
          placeholder: session.label,
          'aria-label': '이어보기 이름',
        });
        const close = () => {
          editor.remove();
          label.prop('hidden', false);
          rename.prop('hidden', false).trigger('focus');
        };
        editor.append(
          name,
          $('<button>', {
            type: 'submit',
            class: 'arcafeed-reading-button',
            text: '저장',
          }),
          readingButton('취소', close),
        );
        editor.on('submit', (event) => {
          event.preventDefault();
          p.reading.updateSession(session.id, {
            customName: String(name.val() || ''),
          });
          if (editor.closest('body').length) close();
          else focusAction('.arcafeed-resume-rename', session.id);
        });
        editor.on('keydown', (event) => {
          if (event.key === 'Escape' && !event.originalEvent?.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        });
        label.prop('hidden', true);
        rename.prop('hidden', true);
        nameRow.append(editor);
        name.trigger('focus');
        name[0]?.select();
      })
        .addClass('arcafeed-resume-rename arcafeed-resume-icon')
        .attr({
          'data-session-id': session.id,
          'aria-label': `${displayName} 이름 변경`,
          title: '이름 변경',
        });
      rename.append(
        $(
          '<svg class="bi-pencil" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>',
        ),
      );
      nameRow.append(label, rename);
      sessions.append(
        $('<div>', { class: 'arcafeed-resume-card' }).append(
          $('<div>', { class: 'arcafeed-resume-context' }).append(
            $('<span>', {
              class: 'arcafeed-resume-type',
              text: type,
            }),
            nameRow,
            pin,
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
