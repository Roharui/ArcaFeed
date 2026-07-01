import $ from 'jquery';

import '@css/ui.css';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

const MODAL_UI_TAB = `
<div class="helper-modal-tab helper-modal-ui">
  <div id="ui-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="check-btn" class="helper-button button" type="button" value="확인"/>
    <input id="cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

function createUISettingModal(p: VaultAdapter): JQuery<HTMLElement> {
  const $uiTab = $(MODAL_UI_TAB);

  $uiTab.find('#check-btn').on('click', () => eventBus.emit('checkUIModal'));
  $uiTab.find('#cancel-btn').on('click', () => eventBus.emit('closeModal'));

  return $uiTab;
}

export { createUISettingModal };
