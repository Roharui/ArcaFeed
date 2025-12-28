import $ from 'jquery';

import { ArcaFeed } from '@/core';

import { initLink } from '@/feature';
import { checkNotNull } from '@/utils';

import type { Vault } from '@/vault';
import type { ArticleFilterImpl, PromiseFunc } from '@/types';

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" class="helper-modal" style="display: none">
  <div class="helper-modal-body">
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
</div>
`;

function initModal(p: Vault): void | PromiseFunc {
  if (!p.isCurrentMode('CHANNEL')) return;

  const dialog = $(NEXT_PAGE_MODAL_HTML);

  const { href, articleFilterConfig } = p;

  const { tab, title } = articleFilterConfig[href.channelId] || {
    tab: [],
    title: [],
  };

  const $rootContainer = $('.root-container').first();
  const category = $rootContainer
    .find('.board-category > span')
    .get()
    .map((ele) => $(ele).text().trim())
    .filter((text) => text !== '전체');

  category.splice(0, 0, '노탭');

  // Use Set for O(1) lookup instead of O(n) array.includes
  const tabSet = new Set(tab);
  const $dialogCategory = dialog.find('#category');

  category
    .map((text) =>
      createCategorySpan(text, 'ele-category', tabSet.has(text), () =>
        dialog
          .find('.ele-category-all')
          .prop(
            'checked',
            dialog.find('.ele-category').length ===
              dialog.find('.ele-category:checked').length,
          ),
      ),
    )
    .forEach((ele) => $dialogCategory.append(ele));

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

  dialog.find('#category-all').append(spanAll);

  title.forEach((tag) => createExcludeSpan(tag));

  dialog
    .find('#check-btn')
    .on('click', () =>
      ArcaFeed.runPromise(checkFn, initLink, () => toggleArticleFilterModal),
    );
  dialog.find('#cancel-btn').on('click', () => toggleArticleFilterModal());
  dialog.find('#exclude-btn').on('click', () => {
    const excludeTagsStr = dialog.find('#exclude-title').val() || '';

    if (typeof excludeTagsStr !== 'string') return;

    const excludeTags = excludeTagsStr.split(',') || [];

    excludeTags.forEach((tag) => createExcludeSpan(tag));

    $('#exclude-title').val('');
  });

  $('body').append(dialog);
}

function createExcludeSpan(text: string) {
  const $ele = $(`
    <label class="exclude-title-tag" data-text="${text}">
      <span class="exclude-title-tag">${text}</span>
    </label>
  `);

  $ele.on('click', () => $ele.remove());

  $ele.appendTo('.exclude-title-list');
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

function checkFn(p: Vault) {
  const { href } = p;
  const { channelId } = href;

  const tab = $('.ele-category:checked')
    .toArray()
    .reduce((prev: string[], cur: HTMLElement): string[] => {
      const r = checkNotNull($(cur).val()) as string;
      return [...prev, r];
    }, []);

  const title = $('.exclude-title-tag')
    .toArray()
    .map((ele): string => $(ele).attr('data-text') as string);

  const pageFilter: ArticleFilterImpl = {
    tab,
    title: title.length > 0 ? title : [],
  };

  p.articleFilterConfig[channelId] = pageFilter;

  return p;
}

function toggleArticleFilterModal() {
  $('#dialog').toggle();
}

export { initModal, toggleArticleFilterModal };
