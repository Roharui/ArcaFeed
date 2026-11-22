import { mergeState } from '@/vault/lazy-state';
import { createElement, fromTemplate } from '@/utils/dom';
import '@css/filter.css';
import { eventBus } from '@/core/app-events';
import { readingHeader } from './readingUi';
import type { VaultAdapter } from '@/vault';
import type { ArticleFilterImpl } from '@/types';
const MODAL_FILTER_TAB = `
<div class="helper-modal-tab helper-modal-filter">
  <div class="rulifeed-modal-content">
    <section class="rulifeed-settings-section filter-best-row">
      <label>
        <input id="filter-best-checkbox" class="category-check" type="checkbox" />
        <span class="category-span">베스트만 보기</span>
      </label>
      <p class="rulifeed-settings-description">게시판의 베스트 목록에서 글을 불러옵니다.</p>
    </section>
    <section class="rulifeed-settings-section">
      <label for="include-title" class="rulifeed-settings-heading">제목 포함 키워드</label>
      <p id="include-title-help" class="rulifeed-settings-description">입력한 키워드가 포함된 글만 탐색합니다. 여러 개는 쉼표로 구분하며 비우면 제한하지 않습니다. 차단 키워드와 겹치면 차단이 우선합니다.</p>
      <input type="text" id="include-title" placeholder="포함할 키워드" aria-describedby="include-title-help" autocomplete="off" />
      <div class="filter-include-options">
        <label>일치 방식 <select id="include-mode"><option value="any">하나 이상 일치</option><option value="all">모두 일치</option></select></label>
        <label><input type="checkbox" id="include-case-sensitive" /> 대소문자 구분</label>
      </div>
    </section>
    <section class="rulifeed-settings-section">
      <label for="exclude-title" class="rulifeed-settings-heading">제목 키워드 차단</label>
      <p id="exclude-title-help" class="rulifeed-settings-description">키워드가 포함된 글을 제외합니다. 여러 개는 쉼표로 구분하세요.</p>
      <div class="exclude-title-input-wrapper">
        <input type="text" id="exclude-title" placeholder="차단할 키워드" aria-describedby="exclude-title-help" autocomplete="off" />
        <button type="button" id="exclude-btn" class="rulifeed-modal-button">추가</button>
      </div>
      <div class="exclude-title-list" aria-label="차단 키워드"></div>
    </section>
  </div>
  <div id="modal-buttons" class="rulifeed-modal-actions">
    <button id="filter-cancel-btn" class="rulifeed-modal-button" type="button">취소</button>
    <button id="filter-check-btn" class="rulifeed-modal-button is-primary" type="button">적용</button>
  </div>
</div>
`;
function createArticleFilterModal(p: VaultAdapter): HTMLElement {
  const editor = fromTemplate(MODAL_FILTER_TAB);
  editor.prepend(
    readingHeader('필터', '제목 키워드와 베스트 조건을 설정하세요.'),
  );
  const filter = p.articleFilterConfig[p.href.channelId];
  const { title = [], onlyBest = false } = filter ?? {};
  editor.querySelector<HTMLInputElement>('#include-title')!.value = (
    filter?.includeTitle ?? []
  ).join(', ');
  editor.querySelector<HTMLSelectElement>('#include-mode')!.value =
    filter?.includeMode ?? 'any';
  editor.querySelector<HTMLInputElement>('#include-case-sensitive')!.checked =
    filter?.includeCaseSensitive === true;
  editor.querySelector<HTMLInputElement>('#filter-best-checkbox')!.checked =
    onlyBest;
  title.forEach((tag) => createExcludeTag(tag, editor));
  editor.querySelector('#filter-check-btn')!.addEventListener('click', () => {
    addTitleExcludeTag(editor);
    void eventBus.emit('checkFilterModal');
  });
  editor.querySelector('#filter-cancel-btn')!.addEventListener('click', () => {
    void eventBus.emit('closeModal');
  });
  editor
    .querySelector('#exclude-btn')!
    .addEventListener('click', () => addTitleExcludeTag(editor));
  editor
    .querySelector<HTMLInputElement>('#exclude-title')!
    .addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        addTitleExcludeTag(editor);
      }
    });
  return editor;
}

function createExcludeTag(text: string, editor: HTMLElement): void {
  text = text.trim();
  if (
    !text ||
    Array.from(editor.querySelectorAll<HTMLElement>('.exclude-title-tag')).some(
      (element) => element.dataset.text === text,
    )
  )
    return;
  const tag = createElement(
    'button',
    {
      type: 'button',
      class: 'exclude-title-tag',
      'data-text': text,
      'aria-label': `${text} 차단 해제`,
      title: '클릭하여 차단 해제',
    },
    createElement('span', { text }),
    createElement('span', { text: '×', 'aria-hidden': 'true' }),
  );
  tag.addEventListener('click', () => tag.remove());
  editor.querySelector('.exclude-title-list')!.append(tag);
}

function addTitleExcludeTag(editor: HTMLElement): void {
  const input = editor.querySelector<HTMLInputElement>('#exclude-title')!;
  input.value.split(',').forEach((tag) => createExcludeTag(tag, editor));
  input.value = '';
  input.focus();
}

export function readArticleFilter(
  editor: ParentNode,
  previous?: ArticleFilterImpl,
  channelName?: string,
): ArticleFilterImpl {
  const title = Array.from(
    editor.querySelectorAll<HTMLElement>('.exclude-title-tag'),
    (tag) => tag.dataset.text ?? '',
  );
  const includeTitle = [
    ...new Set(
      (editor.querySelector<HTMLInputElement>('#include-title')?.value ?? '')
        .split(',')
        .map((word) => word.trim())
        .filter(Boolean),
    ),
  ];
  return {
    tab: [],
    title,
    ...(includeTitle.length
      ? {
          includeTitle,
          includeMode:
            editor.querySelector<HTMLSelectElement>('#include-mode')?.value ===
            'all'
              ? ('all' as const)
              : ('any' as const),
          includeCaseSensitive:
            editor.querySelector<HTMLInputElement>('#include-case-sensitive')
              ?.checked === true,
        }
      : {}),
    disableSwiper: previous?.disableSwiper ?? false,
    onlyBest:
      editor.querySelector<HTMLInputElement>('#filter-best-checkbox')
        ?.checked === true,
    ...(channelName ? { channelName } : {}),
  };
}

function initCheckFilterModal(p: VaultAdapter) {
  const { channelId } = p.href;
  const editor = document.querySelector('#dialog .helper-modal-filter');
  if (!editor) return p;
  const pageFilter = readArticleFilter(
    editor,
    p.articleFilterConfig[channelId],
    document.querySelector('#board_name')?.textContent?.trim() || channelId,
  );
  p.updateState({
    articleFilterConfig: mergeState(p.articleFilterConfig, {
      [channelId]: pageFilter,
    }),
    articleList: p.articleList.slice(0, p.activeIndex + 1),
  });
  return p;
}
export { createArticleFilterModal, initCheckFilterModal };
