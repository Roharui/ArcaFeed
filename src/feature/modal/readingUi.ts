import $ from 'jquery';
import { eventBus } from '@/core/app-events';

export function readingButton(
  label: string,
  action: () => void,
): JQuery<HTMLElement> {
  return $('<button>', {
    type: 'button',
    text: label,
    class: 'arcafeed-reading-button',
  }).on('click', action);
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

export function matchesReadingSearch(text: string, query: string): boolean {
  const content = normalizeSearch(text);
  return !query || query.split(' ').every((word) => content.includes(word));
}

export function readingSearch(
  placeholder: string,
  label: string,
  onChange: () => void,
) {
  // Constructor properties invoke matching jQuery plugins such as autocomplete.
  const input = $('<input>').attr({
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
    input.val('');
    commit();
    input.trigger('focus');
  })
    .addClass('arcafeed-search-clear')
    .attr({ 'aria-label': '검색어 지우기', title: '검색어 지우기' })
    .hide();
  const commit = () => {
    const value = String(input.val() || '');
    clear.toggle(value.length > 0);
    const next = normalizeSearch(value);
    if (query === next) return;
    query = next;
    onChange();
  };
  input.on('compositionstart', () => {
    composing = true;
  });
  input.on('compositionend', () => {
    composing = false;
    commit();
  });
  input.on('input', () => {
    clear.toggle(String(input.val() || '').length > 0);
    if (!composing) commit();
  });
  return {
    element: $('<div>', {
      class: 'arcafeed-reading-search',
      role: 'search',
    }).append(
      $('<span>', { class: 'bi-search', 'aria-hidden': 'true' }),
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

export function readingTime(timestamp: number): JQuery<HTMLElement> {
  return $('<time>', {
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
  count?: JQuery<HTMLElement>,
): JQuery<HTMLElement> {
  const close = readingButton('×', () => {
    void eventBus.emit('closeModal');
  })
    .addClass('arcafeed-reading-close')
    .attr({ 'aria-label': '설정창 닫기', title: '닫기' });
  return $('<div>', { class: 'arcafeed-reading-header' }).append(
    $('<div>').append(
      $('<div>', { class: 'arcafeed-reading-heading' }).append(
        $('<h2>', { text: title }),
        count ?? [],
      ),
      $('<p>', { class: 'arcafeed-history-description', text: description }),
    ),
    close,
  );
}

export function readingEmptyState(
  icon: string,
  title: string,
  description: string,
): JQuery<HTMLElement> {
  return $('<div>', { class: 'arcafeed-reading-empty' }).append(
    $('<span>', {
      class: `arcafeed-reading-empty-icon ${icon}`,
      'aria-hidden': 'true',
    }),
    $('<strong>', { text: title }),
    $('<p>', { text: description }),
  );
}

export function readingChannelId(path: string): string {
  return path.split('/')[2] || '';
}
