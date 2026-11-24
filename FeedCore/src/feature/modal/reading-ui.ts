import { createElement, listen, setAttributes } from '../../utils/dom';

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

let readingTimeFormatter: Intl.DateTimeFormat | undefined;
let readingDateFormatter: Intl.DateTimeFormat | undefined;
let readingDateWithYearFormatter: Intl.DateTimeFormat | undefined;
let readingTitleFormatter: Intl.DateTimeFormat | undefined;

export function formatReadingTime(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return Math.abs(timestamp) <= 8.64e15
    ? (readingTimeFormatter ??= new Intl.DateTimeFormat('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })).format(timestamp)
    : 'Invalid Date';
}

export function readingDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  if (Number.isNaN(year)) return 'Invalid Date';
  const month = date.getMonth();
  const day = date.getDate();
  const today = new Date();
  const currentYear = today.getFullYear();
  if (
    year === currentYear &&
    month === today.getMonth() &&
    day === today.getDate()
  )
    return '오늘';
  today.setDate(today.getDate() - 1);
  if (
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate()
  )
    return '어제';
  return (
    year === currentYear
      ? (readingDateFormatter ??= new Intl.DateTimeFormat('ko-KR', {
          month: 'long',
          day: 'numeric',
        }))
      : (readingDateWithYearFormatter ??= new Intl.DateTimeFormat('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }))
  ).format(date);
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

export interface CreateReadingUiOptions {
  classPrefix: string;
  reportFailure: (error: unknown) => unknown;
  closeModal: () => void;
}

export function createReadingUi({
  classPrefix,
  reportFailure,
  closeModal,
}: CreateReadingUiOptions) {
  function readingButton(
    label: string,
    action: () => unknown,
  ): HTMLButtonElement {
    return listen(
      createElement('button', {
        type: 'button',
        text: label,
        class: `${classPrefix}-reading-button`,
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

  function readingSearch(
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
    clear.classList.add(`${classPrefix}-search-clear`);
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
          class: `${classPrefix}-reading-search`,
          role: 'search',
        },
        createElement('span', { class: 'bi-search', 'aria-hidden': 'true' }),
        input,
        clear,
      ),
      getQuery: () => query,
    };
  }

  function readingTime(timestamp: number): HTMLElement {
    const date = new Date(timestamp);
    return createElement('time', {
      class: `${classPrefix}-reading-time`,
      text: formatReadingTime(timestamp),
      datetime: date.toISOString(),
      title: (readingTitleFormatter ??= new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })).format(date),
    });
  }

  function readingHeader(
    title: string,
    description: string,
    count?: HTMLElement,
    closeDialog = closeModal,
  ): HTMLElement {
    const close = readingButton('×', closeDialog);
    close.classList.add(`${classPrefix}-reading-close`);
    setAttributes(close, { 'aria-label': '설정창 닫기', title: '닫기' });
    return createElement(
      'div',
      { class: `${classPrefix}-reading-header` },
      createElement(
        'div',
        {},
        createElement(
          'div',
          { class: `${classPrefix}-reading-heading` },
          createElement('h2', { text: title }),
          ...(count ? [count] : []),
        ),
        createElement('p', {
          class: `${classPrefix}-history-description`,
          text: description,
        }),
      ),
      close,
    );
  }

  function readingEmptyState(
    icon: string,
    title: string,
    description: string,
  ): HTMLElement {
    return createElement(
      'div',
      { class: `${classPrefix}-reading-empty` },
      createElement('span', {
        class: `${classPrefix}-reading-empty-icon ${icon}`,
        'aria-hidden': 'true',
      }),
      createElement('strong', { text: title }),
      createElement('p', { text: description }),
    );
  }

  return {
    readingButton,
    readingSearch,
    readingTime,
    readingHeader,
    readingEmptyState,
  };
}
