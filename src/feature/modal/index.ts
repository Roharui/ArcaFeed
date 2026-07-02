import $ from 'jquery';

import '@css/modal.css';

import { createArticleFilterModal } from './filterUi';

import type { VaultAdapter } from '@/vault';
import { createUISettingModal } from './uiTab';

const NEXT_PAGE_MODAL_HTML = `
<div id="dialog" class="helper-modal">
  <div class="helper-modal-body">
    <input id="filter" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
    <label class="helper-modal-tab-label" for="filter">🔍</label>
    <input id="ui" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
    <label class="helper-modal-tab-label" for="ui">🪟</label>
  </div>
</div>
`;

function initModal(p: VaultAdapter) {
  const dialog = $(NEXT_PAGE_MODAL_HTML);
  const dialogBody = dialog.find('.helper-modal-body');

  // Restore last active tab
  const lastTab = p.uiSettings.lastModalTab;
  dialog.find(`#${lastTab}`).prop('checked', true);

  // Save tab selection on change
  dialog.find('.helper-modal-tab-radio').on('change', function () {
    const selectedTab = $(this).attr('id') as 'filter' | 'ui';
    p.uiSettings = { ...p.uiSettings, lastModalTab: selectedTab };
    p.flushSave();
  });

  dialogBody.append(createArticleFilterModal(p));
  dialogBody.append(createUISettingModal(p));

  dialog.appendTo('body');
}

function initCloseModal(_: VaultAdapter): void {
  $('#dialog').remove();
}

export * from './filterUi';
export * from './uiTab';

export { initModal, initCloseModal };
