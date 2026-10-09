import $ from 'jquery';

import '@css/modal.css';
import { eventBus } from '@/core/app-events';

import { createArticleFilterModal } from './filterUi';
import { createUISettingModal } from './uiTab';
import { createSubscribeSettingModal } from './subscribeTab';
import { createHistoryModal } from './historyTab';
import { createResumeModal } from './resumeTab';

import type { VaultAdapter } from '@/vault';

function resolveModalTab(lastTab: string, availableTabs: string[]): string {
  return availableTabs.includes(lastTab)
    ? lastTab
    : (availableTabs[0] ?? 'filter');
}

function initModal(p: VaultAdapter) {
  initCloseModal(p);
  const isHome = p.isCurrentMode('HOME');
  const availableTabs = isHome
    ? ['subscribe', 'ui', 'history', 'resume']
    : p.isSeriesMode || p.isCurrentMode('SCRAP')
      ? ['ui', 'history', 'resume']
      : ['filter', 'ui', 'history', 'resume'];
  const labels: Record<string, { icon: string; title: string }> = {
    filter: { icon: '🔍', title: '필터' },
    ui: { icon: '🪟', title: 'UI 설정' },
    subscribe: { icon: '📡', title: '채널 설정' },
    history: { icon: '🕘', title: '최근 본 글' },
    resume: { icon: '📖', title: '이어보기' },
  };
  const dialog = $(`
    <div id="dialog" class="helper-modal">
      <div class="helper-modal-body" style="--arcafeed-modal-tab-count: ${availableTabs.length}" role="dialog" aria-modal="true" aria-label="아카피드 설정">
        ${availableTabs
          .map(
            (tab) => `
          <input id="${tab}" class="helper-modal-tab-radio" type="radio" name="helper-modal-tab-group" />
          <label class="helper-modal-tab-label" for="${tab}" title="${labels[tab]!.title}" aria-label="${labels[tab]!.title}"><span aria-hidden="true">${labels[tab]!.icon}</span><span>${labels[tab]!.title}</span></label>
        `,
          )
          .join('')}
      </div>
    </div>
  `);
  const dialogBody = dialog.find('.helper-modal-body');

  const initialTab = resolveModalTab(p.uiSettings.lastModalTab, availableTabs);
  dialog.find(`#${initialTab}`).prop('checked', true);
  dialog.find('.helper-modal-tab-radio').on('change', function () {
    const selectedTab = $(this).attr('id') as typeof p.uiSettings.lastModalTab;
    p.uiSettings = { ...p.uiSettings, lastModalTab: selectedTab };
    if (selectedTab === 'ui') {
      dialog
        .find('.ui-toggle-checkbox[data-key="showVisitedIndicators"]')
        .prop('checked', p.uiSettings.showVisitedIndicators);
    }
    p.flushSave();
  });
  if (availableTabs.includes('filter')) {
    dialogBody.append(createArticleFilterModal(p));
  }

  dialogBody.append(createUISettingModal(p));
  dialogBody.append(createHistoryModal(p));
  dialogBody.append(createResumeModal(p));

  if (isHome) {
    dialogBody.append(createSubscribeSettingModal(p));
  }

  dialog.appendTo('body');
  dialog.on('click', (event) => {
    if (event.target === dialog[0]) void eventBus.emit('closeModal');
  });
  $(document).on('keydown.arcafeedModal', (event) => {
    if (event.key === 'Escape') void eventBus.emit('closeModal');
  });
}

function initCloseModal(_: VaultAdapter): void {
  $('#dialog .helper-modal-history, #dialog .helper-modal-resume').each(
    (_, element) => {
      $(element).data('cleanup')?.();
    },
  );
  $(document).off('keydown.arcafeedModal');
  $('#dialog').remove();
}

function initCloseModalContent(_: VaultAdapter): void {
  $('#dialog .helper-modal-history, #dialog .helper-modal-resume').each(
    (_, element) => {
      $(element).data('cleanup')?.();
    },
  );
  $(document).off('keydown.arcafeedModal');
  $('#dialog .helper-modal-body').remove();
}

export * from './filterUi';
export * from './uiTab';
export * from './subscribeTab';

export { initModal, initCloseModal, initCloseModalContent };
