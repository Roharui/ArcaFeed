import $ from 'jquery';

import '@css/ui.css';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

const UI_TOGGLE_ITEMS: { key: string; label: string }[] = [
  { key: 'hideScrollbar', label: '스크롤바 숨기기' },
  { key: 'hideBlur', label: '스포일러 블러 제거' },
  { key: 'hideNavControl', label: '게시글 내비게이션 숨기기' },
];

const ARTICLE_INFO_TOGGLES: { key: string; label: string }[] = [
  { key: 'hideArticleTitle', label: '제목' },
  { key: 'hideArticleAuthor', label: '작성자' },
  { key: 'hideArticleTime', label: '작성일' },
  { key: 'hideArticleView', label: '조회수' },
];

const MODAL_UI_TAB = `
<div class="helper-modal-tab helper-modal-ui">
  <div class="ui-title">UI 설정</div>
  <div id="ui-toggle-list"></div>
  <div class="ui-article-info-group">
    <div class="ui-article-info-header">게시글 목록에서 숨기기</div>
    <div id="ui-article-info-list"></div>
  </div>
  <div id="ui-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="check-btn" class="helper-button button" type="button" value="확인"/>
    <input id="cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

function createToggleRow(
  key: string,
  label: string,
  checked: boolean,
): JQuery<HTMLElement> {
  const $label = $('<label>');
  const $checkbox = $('<input>', {
    type: 'checkbox',
    class: 'ui-toggle-checkbox',
    'data-key': key,
  });
  $checkbox.prop('checked', checked);

  $label.append($checkbox).append(` ${label}`);

  return $label;
}

function createUISettingModal(p: VaultAdapter): JQuery<HTMLElement> {
  const $uiTab = $(MODAL_UI_TAB);

  // Build toggle list from current settings
  const { uiSettings } = p;
  const $toggleList = $uiTab.find('#ui-toggle-list');

  for (const item of UI_TOGGLE_ITEMS) {
    const value = uiSettings[item.key as keyof typeof uiSettings] as boolean;
    $toggleList.append(createToggleRow(item.key, item.label, value));
  }

  // Build article info toggle group (hidden in series mode)
  if (!p.isSeriesMode) {
    const $articleInfoList = $uiTab.find('#ui-article-info-list');
    for (const item of ARTICLE_INFO_TOGGLES) {
      const value = uiSettings[item.key as keyof typeof uiSettings] as boolean;
      $articleInfoList.append(createToggleRow(item.key, item.label, value));
    }
  } else {
    $uiTab.find('.ui-article-info-group').remove();
  }

  $uiTab.find('#check-btn').on('click', () => eventBus.emit('checkUIModal'));
  $uiTab.find('#cancel-btn').on('click', () => eventBus.emit('closeModal'));

  return $uiTab;
}

/**
 * Read the current toggle values from the modal form and return them as
 * a partial UISettings object for saving.
 */
function readUISettingsFromModal(): Record<string, boolean> {
  const settings: Record<string, boolean> = {};

  $('.ui-toggle-checkbox').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-key');
    if (key) {
      settings[key] = $el.prop('checked');
    }
  });

  return settings;
}

/**
 * Save UI settings from the modal into VaultAdapter state.
 * Called as part of the checkUIModal event pipeline.
 */
function initCheckUIModal(p: VaultAdapter): VaultAdapter {
  const formSettings = readUISettingsFromModal();
  p.uiSettings = { ...p.uiSettings, ...formSettings };
  return p;
}

export { createUISettingModal, initCheckUIModal };
