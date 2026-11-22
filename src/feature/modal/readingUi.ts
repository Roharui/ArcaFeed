import { createElement, listen, setAttributes } from '@/utils/dom';
import { reportFailure } from '@/utils/operation-error';
import { eventBus } from '@/core/app-events';

export function readingButton(
  label: string,
  action: () => unknown,
): HTMLButtonElement {
  return listen(
    createElement('button', {
      type: 'button',
      text: label,
      class: 'arcafeed-reading-button',
    }),
    'click',
    () => {
      try {
        void Promise.resolve(action()).catch(reportFailure);
      } catch (error) {
        reportFailure(error);
      }
    },
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

export function matchesReadingSearch(text: string, query: string): boolean {
  if (!query) return true;
  const content = normalizeSearch(text);
  return query.split(' ').every((word) => content.includes(word));
}

/** Cache normalized text by immutable record; split each query only once. */
export function createReadingSearchMatcher<T extends object>(
  getText: (item: T) => string,
): (item: T, query: string) => boolean {
  const contents = new WeakMap<T, string>();
  let previousQuery = '';
  let words: string[] = [];
  return (item, query) => {
    if (!query) return true;
    if (query !== previousQuery) {
      previousQuery = query;
      words = query.split(' ');
    }
    let content = contents.get(item);
    if (content === undefined) {
      content = normalizeSearch(getText(item));
      contents.set(item, content);
    }
    return words.every((word) => content.includes(word));
  };
}

export function readingSearch(
  placeholder: string,
  label: string,
  onChange: () => void,
) {
  const input = createElement('input', {
    type: 'search',
    placeholder,
    'aria-label': label,
    autocomplete: 'off',
    autocapitalize: 'none',
    spellcheck: 'false',
  });
  let query = '';
  let composing = false;
  const clear = readingButton('×', () => {
    input.value = '';
    commit();
    input.focus();
  });
  clear.classList.add('arcafeed-search-clear');
  setAttributes(clear, {
    'aria-label': '검색어 지우기',
    title: '검색어 지우기',
  });
  clear.hidden = true;
  const commit = () => {
    const value = input.value;
    clear.hidden = value.length === 0;
    const next = normalizeSearch(value);
    if (query === next) return;
    query = next;
    onChange();
  };
  input.addEventListener('compositionstart', () => {
    composing = true;
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    commit();
  });
  input.addEventListener('input', () => {
    clear.hidden = input.value.length === 0;
    if (!composing) commit();
  });
  return {
    element: createElement(
      'div',
      {
        class: 'arcafeed-reading-search',
        role: 'search',
      },
      createElement('span', { class: 'bi-search', 'aria-hidden': 'true' }),
      input,
      clear,
    ),
    getQuery: () => query,
  };
}

export function formatReadingTime(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function readingTime(timestamp: number): HTMLElement {
  return createElement('time', {
    class: 'arcafeed-reading-time',
    text: formatReadingTime(timestamp),
    datetime: new Date(timestamp).toISOString(),
    title: new Date(timestamp).toLocaleString('ko-KR'),
  });
}

export function readingDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return '오늘';
  today.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return '어제';
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear()
      ? { year: 'numeric' }
      : {}),
  });
}

export function readingHeader(
  title: string,
  description: string,
  count?: HTMLElement,
  closeDialog = () => {
    void eventBus.emit('closeModal');
  },
): HTMLElement {
  const close = readingButton('×', closeDialog);
  close.classList.add('arcafeed-reading-close');
  setAttributes(close, { 'aria-label': '설정창 닫기', title: '닫기' });
  return createElement(
    'div',
    { class: 'arcafeed-reading-header' },
    createElement(
      'div',
      {},
      createElement(
        'div',
        { class: 'arcafeed-reading-heading' },
        createElement('h2', { text: title }),
        ...(count ? [count] : []),
      ),
      createElement('p', {
        class: 'arcafeed-history-description',
        text: description,
      }),
    ),
    close,
  );
}

export function readingEmptyState(
  icon: string,
  title: string,
  description: string,
): HTMLElement {
  return createElement(
    'div',
    { class: 'arcafeed-reading-empty' },
    createElement('span', {
      class: `arcafeed-reading-empty-icon ${icon}`,
      'aria-hidden': 'true',
    }),
    createElement('strong', { text: title }),
    createElement('p', { text: description }),
  );
}

export function readingChannelId(path: string): string {
  return path.split('/')[2] || '';
}

export function syncChannelSelect(
  select: HTMLSelectElement,
  options: Iterable<readonly [string, string]>,
  selected: string,
): string {
  const validIds = new Set<string>();
  const children = [createElement('option', { value: '', text: '전체 채널' })];
  for (const [id, label] of options) {
    validIds.add(id);
    children.push(createElement('option', { value: id, text: label || id }));
  }
  const next = validIds.has(selected) ? selected : '';
  select.replaceChildren(...children);
  select.value = next;
  return next;
}
