import $ from 'jquery';

import '@css/filter.css';

import { ArcaFeed } from '@/core';
import { checkNotNull } from '@/utils';

import type { Vault } from '@/vault';
import type { ArticleFilterImpl } from '@/types';

const MODAL_FILTER_TAB = `
<div class="helper-modal-tab helper-modal-filter">
  <div id="category-all"></div>
  <div id="category"></div>
  <div class="exclude-title-list"></div>
  <div class="exclude-title-wrapper">
    <span class="helper-modal-btns exclude-title-input-wrapper">
      <input type="text" id="exclude-title" placeholder="차단 제목 입력..."/>
      <input type="button" id="exclude-btn" class="helper-button button" value="입력"/>
    </span>
  </div>
  <div id="modal-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="check-btn" class="helper-button button" type="button" value="확인"/>
    <input id="cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

function createArticleFilterModal(p: Vault) {
  const $filterTab = $(MODAL_FILTER_TAB);

  const { href, articleFilterConfig } = p;

  const { tab, title } = articleFilterConfig[href.channelId] || {
    tab: [],
    title: [],
  };

  // get Categories
  const $rootContainer = $('.root-container').first();
  const category = $rootContainer
    .find('.board-category > span')
    .get()
    .map((ele) => $(ele).text().trim())
    .filter((text) => text !== '전체');

  category.splice(0, 0, '노탭');

  const tabSet = new Set(tab);
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
    tab.length === category.length,
    () =>
      $('.ele-category').prop(
        'checked',
        $('.ele-category-all').prop('checked'),
      ),
  );

  $filterTab.find('#category-all').append(spanAll);

  // Title exclude tags
  title.forEach((tag) => createExcludeSpan(tag, $filterTab));

  $filterTab
    .find('#check-btn')
    .on('click', () => ArcaFeed.runEvent('checkFilterModal'));
  $filterTab
    .find('#cancel-btn')
    .on('click', () => ArcaFeed.runEvent('closeModal'));
  $filterTab
    .find('#exclude-btn')
    .on('click', () => addTitleExcludeTag($filterTab));

  return $filterTab;
}

function createExcludeSpan(text: string, $$filterTab: JQuery<HTMLElement>) {
  const $ele = $(`
    <label class="exclude-title-tag" data-text="${text}">
      <span class="exclude-title-tag">${text}</span>
    </label>
  `);

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

  $('#exclude-title').val('');
}

function initCheckFilterModal(p: Vault) {
  const { href } = p;
  const { channelId } = href;

  const tab = $('.ele-category:checked')
    .toArray()
    .reduce((prev: string[], cur: HTMLElement): string[] => {
      const r = checkNotNull($(cur).val()) as string;
      return [...prev, r];
    }, []);

  const title = $('label.exclude-title-tag')
    .toArray()
    .map((ele): string => $(ele).attr('data-text') as string);

  const pageFilter: ArticleFilterImpl = {
    tab,
    title: title.length > 0 ? title : [],
  };

  p.articleFilterConfig[channelId] = pageFilter;
  p.articleList = p.articleList.slice(0, p.activeIndex + 1);

  return p;
}

export { createArticleFilterModal, initCheckFilterModal };
