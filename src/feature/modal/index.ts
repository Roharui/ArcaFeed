import $ from 'jquery';

import '@css/modal.css';

import { createArticleFilterModal } from './filterUi';
import { createUISettingModal } from './uiTab';
import { createPluginTab } from './pluginTab';

import type { VaultAdapter } from '@/vault';

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" class="helper-modal">
  <div class="helper-modal-body">
    <input id="filter" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
    <label class="helper-modal-tab-label" for="filter">🔍</label>
    <input id="ui" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
    <label class="helper-modal-tab-label" for="ui">🪟</label>
    <input id="plugins" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
    <label class="helper-modal-tab-label" for="plugins">🧩</label>
  </div>
</div>
`;

// ── Mode-specific modal builders ───────────────────────

function buildSeriesModal(
  _p: VaultAdapter,
  dialog: JQuery<HTMLElement>,
  _dialogBody: JQuery<HTMLElement>,
): void {
  dialog.find('#filter').remove();
  dialog.find('label[for="filter"]').remove();
  dialog.find('#ui').prop('checked', true);
}

function buildNormalModal(
  p: VaultAdapter,
  dialog: JQuery<HTMLElement>,
  dialogBody: JQuery<HTMLElement>,
): void {
  dialog.find(`#${p.uiSettings.lastModalTab}`).prop('checked', true);

  dialog.find('.helper-modal-tab-radio').on('change', function () {
    const selectedTab = $(this).attr('id') as 'filter' | 'ui' | 'plugins';
    p.uiSettings = { ...p.uiSettings, lastModalTab: selectedTab };
    p.flushSave();
  });

  dialogBody.append(createArticleFilterModal(p));
}

function initModal(p: VaultAdapter) {
  const dialog = $(NEXT_PAGE_MODAL_HTML);
  const dialogBody = dialog.find('.helper-modal-body');

  const buildModal = p.isSeriesMode ? buildSeriesModal : buildNormalModal;
  buildModal(p, dialog, dialogBody);

  dialogBody.append(createUISettingModal(p));
  dialogBody.append(createPluginTab(p));
  dialog.appendTo('body');
}

function initCloseModal(_: VaultAdapter): void {
  $('#dialog').remove();
}

export * from './filterUi';
export * from './uiTab';
export * from './pluginTab';

export { initModal, initCloseModal };
