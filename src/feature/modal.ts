
import $ from 'jquery'

import { Helper } from "@/core";

import type { Param } from "@/vault";
import type { ArticleFilterImpl, PromiseFunc } from "@/types";
import { initLink } from './article';
import { checkNotNull } from '@/utils';

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" class="helper-modal" style="display: none">
  <div class="helper-modal-body">
    <div id="category-all"></div>
    <div id="category"></div>
    <div style="display: none;">
      <p>차단 제목</p>
      <input type="text" id="exclude-title"/>
    </div>
    <div id="modal-buttons" class="helper-modal-btns" style="border-bottom: 0px none;">
      <input id="check-btn" class="button" type="button" value="확인"/>
      <input id="cancel-btn" class="button" type="button" value="취소"/>
    </div>
  </div>
</div>
`;

function appendModal({ v }: Param) {
  if (!v.isCurrentMode("ARTICLE", "CHANNEL")) return;
  const dialog = $(NEXT_PAGE_MODAL_HTML)
  $("body").append(dialog);
}

function createModal({ v, c }: Param) {
  const { href } = v;
  const { articleFilterConfig } = c;
  const { tab, title } = articleFilterConfig[href.channelId] || { tab: [], title: [] };

  const category = $('.root-container')
    .first()
    .find('.board-category > span')
    .get()
    .map((ele) => $(ele).text().trim())
    .filter((text) => text !== '전체');

  category.splice(0, 0, '노탭');

  category
    .map((text) =>
      createCategorySpan(text, 'ele-category', tab.includes(text), () =>
        $('.ele-category-all').prop('checked', $('.ele-category').length === $('.ele-category:checked').length)
      ),
    )
    .forEach((ele) => $('#dialog #category').append(ele));

  const spanAll = createCategorySpan(
    '전체', 'ele-category-all', tab.length === category.length,
    () => $('.ele-category').prop('checked', $(".ele-category-all").prop('checked')),
  );

  $('#category-all').append(spanAll);
  $('#exclude-title').val(title.join(','));

  $("#check-btn").on("click", () =>
    Helper.runPromise(checkFn, initLink, () => toggleArticleFilterModal)
  )
  $("#cancel-btn").on("click", () => toggleArticleFilterModal())
}

function createCategorySpan(text: string, clsName: string, prop: boolean, fn: () => void) {
  const checkBox = $('<input>', {
    type: 'checkbox',
    class: `category-check ${clsName}`,
    value: text,
  });
  checkBox.on('change', fn);

  const tabName = $('<span>', { class: "category-span", text: text });
  const span = $('<label>');

  checkBox.prop('checked', prop);
  span.append(checkBox).append(tabName);

  return span;
};

function checkFn({ v, c }: Param) {
  const { href } = v;
  const channelId = href.channelId;

  const tab = $('.ele-category:checked')
    .toArray()
    .reduce((prev: string[], cur: HTMLElement): string[] => {
      const r = checkNotNull($(cur).val()) as string;
      return [...prev, r]
    }, [])

  const title = $('#exclude-title').val() as string || "";

  const pageFilter: ArticleFilterImpl = {
    tab,
    title: title.trim().length > 0 ? title.split(',') : [],
  };

  c.articleFilterConfig[channelId] = pageFilter;

  return { v, c } as Param;
};

function toggleArticleFilterModal() {
  $("#dialog").toggle()
}

function initModal(): PromiseFunc[] {
  return [
    appendModal,
    createModal,
  ]
}

export { initModal, toggleArticleFilterModal }
