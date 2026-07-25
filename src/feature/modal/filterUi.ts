import $ from 'jquery';

import '@css/filter.css';

import { eventBus } from '@/core';
import { NO_TAB_CATEGORIES, expandTabCategories } from '@/feature/filter';
import { normalizeFilterTokens } from '@/feature/filter-rules';

import type { VaultAdapter } from '@/vault';
import type { ArticleFilterImpl } from '@/types';

const MODAL_FILTER_TAB = `
<div class="helper-modal-tab helper-modal-filter">
  <div id="category-all"></div>
  <div id="category"></div>
  <div class="filter-best-row">
    <label>
      <input id="filter-best-checkbox" class="category-check" type="checkbox" />
      <span class="category-span">베스트만</span>
    </label>
  </div>
  <div class="exclude-title-list"></div>
  <div class="exclude-title-wrapper">
    <span class="helper-modal-btns exclude-title-input-wrapper">
      <label class="arcafeed-sr-only" for="filter-exclude-title">차단 제목</label>
      <input type="text" id="filter-exclude-title" placeholder="차단 제목 입력..."/>
      <input type="button" id="filter-exclude-btn" class="helper-button button" value="입력"/>
    </span>
  </div>
  <div id="modal-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="filter-check-btn" class="helper-button button" type="button" value="확인"/>
    <input id="filter-cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

function createArticleFilterModal(p: VaultAdapter) {
  const $filterTab = $(MODAL_FILTER_TAB);

  const { href, articleFilterConfig } = p;

  const { tab, title, onlyBest } = articleFilterConfig[href.channelId] || {
    tab: [],
    title: [],
    onlyBest: false,
  };

  // Set best checkbox
  $filterTab.find('#filter-best-checkbox').prop('checked', onlyBest);

  // get Categories
  const $rootContainer = $('.root-container').first();
  const category = normalizeFilterTokens([
    ...NO_TAB_CATEGORIES,
    ...$rootContainer
      .find('.board-category > span')
      .get()
      .map((ele) => $(ele).text())
      .filter((text) => text.trim() !== '전체'),
  ]);

  const tabSet = new Set(expandTabCategories(tab));
  const $filterCategory = $filterTab.find('#category');

  // Add Category Checkboxes
  category
    .map((text) =>
      createCategorySpan(text, 'ele-category', tabSet.has(text), () =>
        $filterTab
          .find('.ele-category-all')
          .prop(
            'checked',
            $filterTab.find('.ele-category').length ===
              $filterTab.find('.ele-category:checked').length,
          ),
      ),
    )
    .forEach((ele) => $filterCategory.append(ele));

  const spanAll = createCategorySpan(
    '전체',
    'ele-category-all',
    category.every((text) => tabSet.has(text)),
    () =>
      $filterTab
        .find('.ele-category')
        .prop('checked', $filterTab.find('.ele-category-all').prop('checked')),
  );

  $filterTab.find('#category-all').append(spanAll);

  // Title exclude tags
  normalizeFilterTokens(title).forEach((tag) =>
    createExcludeSpan(tag, $filterTab),
  );

  $filterTab
    .find('#filter-check-btn')
    .on('click', () => void eventBus.emit('checkFilterModal'));
  $filterTab
    .find('#filter-cancel-btn')
    .on('click', () => void eventBus.emit('closeModal'));
  $filterTab
    .find('#filter-exclude-btn')
    .on('click', () => addTitleExcludeTag($filterTab));
  $filterTab.find('#filter-exclude-title').on('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addTitleExcludeTag($filterTab);
  });

  return $filterTab;
}

function createExcludeSpan(text: string, $$filterTab: JQuery<HTMLElement>) {
  const $ele = $('<button>', {
    type: 'button',
    class: 'exclude-title-tag',
    'data-text': text,
    'aria-label': `${text} 제외어 삭제`,
    title: '클릭하여 제외어 삭제',
  }).append(
    $('<span>', {
      class: 'exclude-title-tag-text',
      text,
    }),
  );

  $ele.on('click.arcafeed-filter', () => $ele.remove());

  $$filterTab.find('.exclude-title-list').append($ele);
}

function createCategorySpan(
  text: string,
  clsName: string,
  prop: boolean,
  fn: () => void,
) {
  const checkBox = $('<input>', {
    type: 'checkbox',
    class: `category-check ${clsName}`,
    value: text,
  });
  checkBox.on('change', fn);

  const tabName = $('<span>', { class: 'category-span', text: text });
  const span = $('<label>');

  checkBox.prop('checked', prop);
  span.append(checkBox).append(tabName);

  return span;
}

function addTitleExcludeTag($filterTab: JQuery<HTMLElement>) {
  const $input = $filterTab.find('#filter-exclude-title');
  const excludeTagsStr = $input.val() || '';
  if (typeof excludeTagsStr !== 'string') return;

  const existingTags = new Set(
    $filterTab
      .find('button.exclude-title-tag[data-text]')
      .toArray()
      .map((element) => $(element).attr('data-text') || ''),
  );

  normalizeFilterTokens(excludeTagsStr.split(',')).forEach((tag) => {
    if (existingTags.has(tag)) return;

    existingTags.add(tag);
    createExcludeSpan(tag, $filterTab);
  });

  $input.val('');
}

function initCheckFilterModal(p: VaultAdapter): void {
  const { href } = p;
  const { channelId } = href;
  const $filterTab = $('#arcafeed-dialog .helper-modal-filter').first();
  if (!$filterTab.length) return;

  const tab = normalizeFilterTokens(
    $filterTab
      .find('.ele-category:checked')
      .toArray()
      .map((element) => String($(element).val() ?? '')),
  );

  const title = normalizeFilterTokens(
    $filterTab
      .find('button.exclude-title-tag[data-text]')
      .toArray()
      .map((ele) => $(ele).attr('data-text') || ''),
  );
  const existingFilter = p.articleFilterConfig[channelId];

  const pageFilter: ArticleFilterImpl = {
    tab,
    title,
    disableSwiper: existingFilter?.disableSwiper ?? false,
    onlyBest: $filterTab
      .find('#filter-best-checkbox')
      .prop('checked') as boolean,
  };

  p.articleFilterConfig = {
    ...p.articleFilterConfig,
    [channelId]: pageFilter,
  };
  p.articleList = p.articleList.slice(0, p.activeIndex + 1);
}

export { createArticleFilterModal, initCheckFilterModal };
