import $ from 'jquery';

import '@css/ui.css';

import { eventBus } from '@/core/app-events';
import { readingContextLabel } from '@/vault/reading-context';
import { readingHeader } from './readingUi';

import type { VaultAdapter } from '@/vault';

const UI_TOGGLE_ITEMS: { key: string; label: string; description: string }[] = [
  {
    key: 'hideScrollbar',
    label: '스크롤바 숨기기',
    description: '본문의 스크롤바를 숨겨 화면을 넓게 사용합니다.',
  },
  {
    key: 'hideBlur',
    label: '스포일러 블러 제거',
    description: '가려진 이미지와 내용을 바로 표시합니다.',
  },
  {
    key: 'hideNavControl',
    label: '게시글 내비게이션 숨기기',
    description: '이전 글·다음 글 이동 버튼을 숨깁니다.',
  },
  {
    key: 'showVisitedIndicators',
    label: '목록에 본 글 표시',
    description: '방문한 글의 제목 옆에 표시를 붙입니다.',
  },
];

const ARTICLE_INFO_TOGGLES: { key: string; label: string }[] = [
  { key: 'hideArticleTitle', label: '제목' },
  { key: 'hideArticleAuthor', label: '작성자' },
  { key: 'hideArticleTime', label: '작성일' },
  { key: 'hideArticleView', label: '조회수' },
];

const MODAL_UI_TAB = `
<div class="helper-modal-tab helper-modal-ui">
  <div class="arcafeed-modal-content">
    <section class="arcafeed-settings-section ui-reading-group">
      <h3 class="arcafeed-settings-heading">탐색</h3>
      <div id="ui-reading-list" class="ui-setting-list"></div>
    </section>
    <section class="arcafeed-settings-section">
      <h3 class="arcafeed-settings-heading">화면 표시</h3>
      <div id="ui-toggle-list" class="ui-setting-list"></div>
    </section>
    <fieldset class="arcafeed-settings-section ui-article-info-group">
      <legend class="arcafeed-settings-heading">게시글 목록에서 숨기기</legend>
      <p class="arcafeed-settings-description">숨길 정보를 선택해 목록을 간결하게 만드세요.</p>
      <div id="ui-article-info-list" class="ui-setting-list"></div>
    </fieldset>
  </div>
  <div id="ui-buttons" class="arcafeed-modal-actions">
    <button id="ui-cancel-btn" type="button" class="arcafeed-modal-button">취소</button>
    <button id="ui-check-btn" type="button" class="arcafeed-modal-button is-primary">적용</button>
  </div>
</div>
`;

function createToggleRow(
  key: string,
  label: string,
  checked: boolean,
  description = '',
): JQuery<HTMLElement> {
  const $label = $('<label>', { class: 'ui-setting-row' });
  const $checkbox = $('<input>', {
    type: 'checkbox',
    class: 'ui-toggle-checkbox',
    'data-key': key,
    role: 'switch',
  });
  $checkbox.prop('checked', checked);

  const copy = $('<span>', { class: 'ui-setting-copy' }).append(
    $('<span>', { class: 'ui-setting-label', text: label }),
  );
  if (description)
    copy.append(
      $('<span>', { class: 'ui-setting-description', text: description }),
    );
  $label.append(
    copy,
    $checkbox,
    $('<span>', { class: 'ui-setting-switch', 'aria-hidden': 'true' }),
  );

  return $label;
}

function createUISettingModal(p: VaultAdapter): JQuery<HTMLElement> {
  const $uiTab = $(MODAL_UI_TAB);
  $uiTab.prepend(readingHeader('UI 설정', '읽기 편한 화면으로 맞춰보세요.'));
  $uiTab
    .find('#ui-reading-list')
    .append(
      createToggleRow(
        'skipVisitedArticles',
        '본 글 건너뛰기',
        p.skipVisitedArticles,
        `${readingContextLabel(p)}에만 적용됩니다. 다른 채널·피드의 설정은 따로 기억합니다.`,
      ),
    );

  // Build toggle list from current settings
  const { uiSettings } = p;
  const $toggleList = $uiTab.find('#ui-toggle-list');

  for (const item of UI_TOGGLE_ITEMS) {
    const value = uiSettings[item.key as keyof typeof uiSettings] as boolean;
    $toggleList.append(
      createToggleRow(item.key, item.label, value, item.description),
    );
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

  $uiTab.find('#ui-check-btn').on('click', () => eventBus.emit('checkUIModal'));
  $uiTab.find('#ui-cancel-btn').on('click', () => eventBus.emit('closeModal'));

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
  const skipVisitedArticles = formSettings.skipVisitedArticles;
  delete formSettings.skipVisitedArticles;
  p.uiSettings = { ...p.uiSettings, ...formSettings };
  if (typeof skipVisitedArticles === 'boolean')
    p.skipVisitedArticles = skipVisitedArticles;
  p.flushSave();
  return p;
}

export { createUISettingModal, initCheckUIModal };
