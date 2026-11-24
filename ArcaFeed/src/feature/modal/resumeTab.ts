import {
  createElement,
  fromTemplate,
  setAttributes,
} from '@feed/core/utils/dom';
import { setDialogCleanup } from '@feed/core/feature/modal/cleanup';
import { resumeReading } from '@/feature/reading';
import {
  readingButton,
  readingChannelId,
  readingHeader,
  readingEmptyState,
  readingTime,
  readingSearch,
  createReadingSearchMatcher,
  syncChannelSelect,
} from './readingUi';
import type { VaultAdapter } from '@/vault';
import type { ReadingEntry, ReadingSession } from '@/vault/reading-history';
const TRASH_ICON =
  '<svg class="bi-trash" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
const PENCIL_ICON =
  '<svg class="bi-pencil" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>';
function pinIcon(pinned: boolean): string {
  return `<svg class="${pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 5 5-3 1-4 6v3l-8-8h3l6-4z" fill="${pinned ? 'currentColor' : 'none'}"/><path d="m10 14-7 7"/></svg>`;
}
function sessionTypeLabel(session: ReadingSession): string {
  if (session.isScrapMode) return '스크랩';
  if (session.isSeriesMode)
    return session.seriesChannels.length ? '구독 피드' : '시리즈';
  return '채널';
}
function openRenameEditor(
  p: VaultAdapter,
  session: ReadingSession,
  displayName: string,
  nameRow: HTMLElement,
  label: HTMLElement,
  rename: HTMLElement,
  focusAction: (selector: string, id: string) => void,
): void {
  const editor = createElement('form', {
    class: 'arcafeed-resume-name-editor',
    'aria-label': '이어보기 이름 변경',
  });
  const name = createElement('input', {
    type: 'text',
    maxlength: 100,
    value: displayName,
    placeholder: session.label,
    'aria-label': '이어보기 이름',
  });
  const close = () => {
    editor.remove();
    label.hidden = false;
    rename.hidden = false;
    rename.focus();
  };
  editor.append(
    name,
    createElement('button', {
      type: 'submit',
      class: 'arcafeed-reading-button',
      text: '저장',
    }),
    readingButton('취소', close),
  );
  editor.addEventListener('submit', (event) => {
    event.preventDefault();
    p.reading.updateSession(session.id, {
      customName: name.value,
    });
    if (editor.isConnected) close();
    else focusAction('.arcafeed-resume-rename', session.id);
  });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  label.hidden = true;
  rename.hidden = true;
  nameRow.append(editor);
  name.focus();
  name.select();
}
function createResumeCard(
  p: VaultAdapter,
  session: ReadingSession,
  entry: ReadingEntry | undefined,
  sessionsContainer: HTMLElement,
  focusAction: (selector: string, id: string) => void,
): HTMLElement {
  const displayName = session.customName || session.label;
  const title = entry?.title || `게시글 ${session.path.split('/').pop()}`;
  const resume = readingButton('이어보기', () => {
    const latest = p.reading.sessions.find((item) => item.id === session.id);
    if (latest) void resumeReading(p, latest).catch(() => {});
  });
  resume.classList.add('arcafeed-resume-action');
  resume.setAttribute('aria-label', `${displayName} · ${title} 이어보기`);
  const remove = readingButton('', () => {
    p.reading.removeSession(session.id);
    sessionsContainer.focus({ preventScroll: true });
  });
  remove.classList.add('arcafeed-resume-delete', 'arcafeed-resume-icon');
  setAttributes(remove, {
    'aria-label': `${displayName} · ${title} 이어보기 삭제`,
    title: '이 이어보기 삭제',
  });
  remove.append(fromTemplate(TRASH_ICON));
  const pin = readingButton('', () => {
    const latest = p.reading.sessions.find((item) => item.id === session.id);
    if (latest) p.reading.updateSession(session.id, { pinned: !latest.pinned });
    focusAction('.arcafeed-resume-pin', session.id);
  });
  pin.classList.add('arcafeed-resume-pin', 'arcafeed-resume-icon');
  setAttributes(pin, {
    'data-session-id': session.id,
    'aria-pressed': String(!!session.pinned),
    title: session.pinned ? '고정 해제' : '고정',
    'aria-label': `${displayName} ${session.pinned ? '고정 해제' : '고정'}`,
  });
  pin.append(fromTemplate(pinIcon(!!session.pinned)));
  const label = createElement('span', {
    class: 'arcafeed-resume-label',
    text: displayName,
    title: displayName,
  });
  const nameRow = createElement('div', { class: 'arcafeed-resume-name' });
  const rename = readingButton('', () => {
    openRenameEditor(
      p,
      session,
      displayName,
      nameRow,
      label,
      rename,
      focusAction,
    );
  });
  rename.classList.add('arcafeed-resume-rename', 'arcafeed-resume-icon');
  setAttributes(rename, {
    'data-session-id': session.id,
    'aria-label': `${displayName} 이름 변경`,
    title: '이름 변경',
  });
  rename.append(fromTemplate(PENCIL_ICON));
  nameRow.append(label, rename);
  return createElement(
    'div',
    { class: 'arcafeed-resume-card' },
    createElement(
      'div',
      { class: 'arcafeed-resume-context' },
      createElement('span', {
        class: 'arcafeed-resume-type',
        text: sessionTypeLabel(session),
      }),
      nameRow,
      pin,
    ),
    createElement('div', {
      class: 'arcafeed-resume-title',
      text: title,
      title,
    }),
    createElement(
      'div',
      { class: 'arcafeed-resume-bottom' },
      readingTime(session.updatedAt),
      createElement(
        'div',
        { class: 'arcafeed-resume-actions' },
        remove,
        resume,
      ),
    ),
  );
}
export function createResumeModal(p: VaultAdapter): HTMLElement {
  const tab = createElement('div', {
    class: 'helper-modal-tab helper-modal-resume',
  });
  const tools = createElement('div', { class: 'arcafeed-history-tools' });
  const search = readingSearch(
    '채널, 시리즈 또는 글 제목으로 검색',
    '이어보기 검색',
    () => render(),
  );
  const channel = createElement('select', {
    'aria-label': '이어보기 채널 필터',
  });
  const sessions = createElement('div', {
    class: 'arcafeed-modal-content arcafeed-reading-list arcafeed-resume-list',
    tabindex: -1,
    'aria-label': '이어보기 목록',
  });
  const count = createElement('span', {
    class: 'arcafeed-reading-count',
    'aria-live': 'polite',
  });
  tools.append(
    search.element,
    channel,
    createElement('span', {
      class: 'arcafeed-reading-sort',
      text: '고정 우선 · 최근 탐색 순',
    }),
  );
  tab.append(
    readingHeader('이어보기', '마지막으로 보던 글에서 계속 탐색하세요.', count),
    tools,
    sessions,
  );
  const focusAction = (selector: string, id: string) => {
    const target = Array.from(
      sessions.querySelectorAll<HTMLElement>(selector),
    ).find((element) => element.dataset.sessionId === id);
    (target ?? tab.querySelector<HTMLElement>('input[type="search"]'))?.focus();
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
    const selectedChannel = channel.value;
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
    const filterChannel = syncChannelSelect(
      channel,
      [...channelIds].map((id) => [id, channelNames.get(id) || id]),
      selectedChannel,
    );
    const query = search.getQuery();
    const checkpoints = p.reading.sessions.filter(
      (session) =>
        (!filterChannel ||
          readingChannelId(session.path) === filterChannel ||
          session.seriesChannels.includes(filterChannel)) &&
        matchesSearch(session, query),
    );
    count.textContent = String(checkpoints.length);
    if (!checkpoints.length) {
      sessions.replaceChildren(
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
      return;
    }
    sessions.replaceChildren(
      ...checkpoints.map((session) =>
        createResumeCard(
          p,
          session,
          entriesByPath.get(session.path),
          sessions,
          focusAction,
        ),
      ),
    );
  };
  channel.addEventListener('change', render);
  const unsubscribe = p.reading.subscribe(render, ['entries', 'sessions']);
  setDialogCleanup(tab, unsubscribe);
  render();
  return tab;
}
