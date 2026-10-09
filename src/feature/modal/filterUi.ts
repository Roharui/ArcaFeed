import $ from 'jquery';

import '@css/filter.css';

import { eventBus } from '@/core/app-events';
import { NO_TAB_CATEGORIES, expandTabCategories } from '@/feature/filter';
import { checkNotNull } from '@/utils';
import { readingHeader } from './readingUi';

import type { VaultAdapter } from '@/vault';
import type { ArticleFilterImpl } from '@/types';

const MODAL_FILTER_TAB = `
<div class="helper-modal-tab helper-modal-filter">
  <section class="arcafeed-settings-section">
    <div class="filter-section-heading">
      <h3 class="arcafeed-settings-heading">카테고리</h3>
      <div id="category-all"></div>
    </div>
    <p class="arcafeed-settings-description">선택한 카테고리의 글을 탐색합니다. 선택하지 않으면 모두 표시합니다.</p>
    <div id="category"></div>
  </section>
  <section class="arcafeed-settings-section filter-best-row">
    <label>
      <input id="filter-best-checkbox" class="category-check" type="checkbox" />
      <span class="category-span">인기글만 보기</span>
    </label>
    <p class="arcafeed-settings-description">채널의 인기글 목록에서 글을 불러옵니다.</p>
  </section>
  <section class="arcafeed-settings-section">
    <label for="exclude-title" class="arcafeed-settings-heading">제목 키워드 차단</label>
    <p id="exclude-title-help" class="arcafeed-settings-description">키워드가 포함된 글을 제외합니다. 여러 개는 쉼표로 구분하세요.</p>
    <div class="exclude-title-input-wrapper">
      <input type="text" id="exclude-title" placeholder="차단할 키워드" aria-describedby="exclude-title-help" autocomplete="off" />
      <button type="button" id="exclude-btn" class="arcafeed-modal-button">추가</button>
    </div>
    <div class="exclude-title-list" aria-label="차단 키워드"></div>
  </section>
  <div id="modal-buttons" class="arcafeed-modal-actions">
    <button id="filter-cancel-btn" class="arcafeed-modal-button" type="button">취소</button>
    <button id="filter-check-btn" class="arcafeed-modal-button is-primary" type="button">적용</button>
  </div>
</div>
`;

function createArticleFilterModal(p: VaultAdapter) {
  const $filterTab = $(MODAL_FILTER_TAB);
  $filterTab.prepend(
    readingHeader('필터', '이 채널에서 보고 싶은 글만 골라보세요.'),
  );

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
  const category = $rootContainer
    .find('.board-category > span')
    .get()
    .map((ele) => $(ele).text().trim())
    .filter((text) => text !== '전체');

  category.splice(0, 0, ...NO_TAB_CATEGORIES);
  const categories = [...new Set(category)];

  const tabSet = new Set(expandTabCategories(tab));
  const $filterCategory = $filterTab.find('#category');

  // Add Category Checkboxes
  const updateAll = () => {
    const selected = $filterTab.find('.ele-category:checked').length;
    $filterTab.find('.ele-category-all').prop({
      checked: selected === categories.length,
      indeterminate: selected > 0 && selected < categories.length,
    });
  };
  categories
    .map((text) =>
      createCategorySpan(text, 'ele-category', tabSet.has(text), updateAll),
    )
    .forEach((ele) => $filterCategory.append(ele));

  const spanAll = createCategorySpan(
    '전체 선택',
    'ele-category-all',
    categories.every((text) => tabSet.has(text)),
    () =>
      $filterTab
        .find('.ele-category')
        .prop('checked', $filterTab.find('.ele-category-all').prop('checked')),
  );

  $filterTab.find('#category-all').append(spanAll);
  updateAll();

  // Title exclude tags
  title.forEach((tag) => createExcludeSpan(tag, $filterTab));

  $filterTab
    .find('#filter-check-btn')
    .on('click', () => eventBus.emit('checkFilterModal'));
  $filterTab
    .find('#filter-cancel-btn')
    .on('click', () => eventBus.emit('closeModal'));
  $filterTab
    .find('#exclude-btn')
    .on('click', () => addTitleExcludeTag($filterTab));
  $filterTab.find('#exclude-title').on('keydown', (event) => {
    if (event.key === 'Enter' && !event.originalEvent?.isComposing) {
      event.preventDefault();
      addTitleExcludeTag($filterTab);
    }
  });

  return $filterTab;
}

function createExcludeSpan(text: string, $$filterTab: JQuery<HTMLElement>) {
  text = text.trim();
  if (
    !text ||
    $$filterTab
      .find('.exclude-title-tag')
      .toArray()
      .some((el) => $(el).attr('data-text') === text)
  )
    return;
  const $ele = $('<button>', {
    type: 'button',
    class: 'exclude-title-tag',
    'data-text': text,
    'aria-label': `${text} 차단 해제`,
    title: '클릭하여 차단 해제',
  }).append(
    $('<span>', { text }),
    $('<span>', { text: '×', 'aria-hidden': 'true' }),
  );

  $ele.on('click', () => $ele.remove());

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
  const excludeTagsStr = $filterTab.find('#exclude-title').val() || '';
  if (typeof excludeTagsStr !== 'string') return;

  const excludeTags = excludeTagsStr.split(',') || [];

  excludeTags.forEach((tag) => createExcludeSpan(tag, $filterTab));

  $filterTab.find('#exclude-title').val('').trigger('focus');
}

function initCheckFilterModal(p: VaultAdapter) {
  const { href } = p;
  const { channelId } = href;

  const tab = $('.ele-category:checked')
    .toArray()
    .map((element) => checkNotNull($(element).val()) as string);

  const title = $('.helper-modal-filter .exclude-title-tag')
    .toArray()
    .map((ele): string => $(ele).attr('data-text') as string);

  const pageFilter: ArticleFilterImpl = {
    tab,
    title,
    disableSwiper: false,
    onlyBest: $('#filter-best-checkbox').prop('checked') as boolean,
    channelName: $('a.title')
      .attr('data-channel-name')
      ?.replace(' 채널', '') as string,
  };

  p.updateState({
    articleFilterConfig: {
      ...p.articleFilterConfig,
      [channelId]: pageFilter,
    },
    articleList: p.articleList.slice(0, p.activeIndex + 1),
  });

  return p;
}

export { createArticleFilterModal, initCheckFilterModal };
