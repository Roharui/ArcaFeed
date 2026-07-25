import $ from 'jquery';

import '@css/modal.css';

import { createArticleFilterModal } from './filterUi';
import { createUISettingModal } from './uiTab';
import { createSubscribeSettingModal } from './subscribeTab';

import type { VaultAdapter } from '@/vault';

function resolveModalTab(
  lastTab: string,
  availableTabs: string[],
): string {
  return availableTabs.includes(lastTab) ? lastTab : (availableTabs[0] ?? 'filter');
}

function initModal(p: VaultAdapter) {
  const isHome = p.isCurrentMode('HOME');

  const dialog = $(`
    <div id="dialog" class="helper-modal">
      <div class="helper-modal-body">
        ${isHome ? `
          <input id="subscribe" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
          <label class="helper-modal-tab-label" for="subscribe">📡</label>
          <input id="ui" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
          <label class="helper-modal-tab-label" for="ui">🪟</label>
        ` : `
          <input id="filter" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
          <label class="helper-modal-tab-label" for="filter">🔍</label>
          <input id="ui" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
          <label class="helper-modal-tab-label" for="ui">🪟</label>
        `}
      </div>
    </div>
  `);
  const dialogBody = dialog.find('.helper-modal-body');

  if (p.isSeriesMode) {
    dialog.find('#filter').remove();
    dialog.find('label[for="filter"]').remove();
    dialog.find('#ui').prop('checked', true);
  } else if (isHome) {
    const initialTab = resolveModalTab(p.uiSettings.lastModalTab, ['subscribe', 'ui']);
    dialog.find(`#${initialTab}`).prop('checked', true);

    dialog.find('.helper-modal-tab-radio').on('change', function () {
      const selectedTab = $(this).attr('id') as typeof p.uiSettings.lastModalTab;
      p.uiSettings = { ...p.uiSettings, lastModalTab: selectedTab };
      p.flushSave();
    });
  } else {
    const initialTab = resolveModalTab(p.uiSettings.lastModalTab, ['filter', 'ui']);
    dialog.find(`#${initialTab}`).prop('checked', true);

    dialog.find('.helper-modal-tab-radio').on('change', function () {
      const selectedTab = $(this).attr('id') as typeof p.uiSettings.lastModalTab;
      p.uiSettings = { ...p.uiSettings, lastModalTab: selectedTab };
      p.flushSave();
    });

    dialogBody.append(createArticleFilterModal(p));
  }

  dialogBody.append(createUISettingModal(p));

  if (isHome) {
    dialogBody.append(createSubscribeSettingModal(p));
  }

  dialog.appendTo('body');
}

function initCloseModal(_: VaultAdapter): void {
  $('#dialog').remove();
}

function initCloseModalContent(_: VaultAdapter): void {
  $('#dialog .helper-modal-body').remove();
}

export * from './filterUi';
export * from './uiTab';
export * from './subscribeTab';

export { initModal, initCloseModal, initCloseModalContent };
