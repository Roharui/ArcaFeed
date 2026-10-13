import $ from 'jquery';

import '@css/modal.css';
import { eventBus } from '@/core/app-events';

import { createArticleFilterModal } from './filterUi';
import { createUISettingModal } from './uiTab';
import { createSubscribeSettingModal } from './subscribeTab';
import { createHistoryModal } from './historyTab';
import { createResumeModal } from './resumeTab';

import { mergeState } from '@/vault/lazy-state';
import { navigationMode } from '@/vault/navigation-context';
import type { VaultAdapter } from '@/vault';

function resolveModalTab(lastTab: string, availableTabs: string[]): string {
  return availableTabs.includes(lastTab)
    ? lastTab
    : (availableTabs[0] ?? 'filter');
}

function initModal(p: VaultAdapter) {
  initCloseModal(p);
  const mode = navigationMode(p);
  const availableTabs =
    mode === 'subscription'
      ? ['subscribe', 'ui', 'history', 'resume']
      : mode === 'series' || mode === 'scrap'
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

  const factories: Record<string, () => JQuery<HTMLElement>> = {
    filter: () => createArticleFilterModal(p),
    ui: () => createUISettingModal(p),
    subscribe: () => createSubscribeSettingModal(p),
    history: () => createHistoryModal(p),
    resume: () => createResumeModal(p),
  };
  const created = new Set<string>();
  const ensureTab = (tab: string) => {
    if (created.has(tab) || !availableTabs.includes(tab)) return;
    dialogBody.append(factories[tab]!());
    created.add(tab);
  };
  const initialTab = resolveModalTab(p.uiSettings.lastModalTab, availableTabs);
  dialog.find(`#${initialTab}`).prop('checked', true);
  ensureTab(initialTab);
  dialog.find('.helper-modal-tab-radio').on('change', function () {
    const selectedTab = $(this).attr('id') as typeof p.uiSettings.lastModalTab;
    ensureTab(selectedTab);
    p.uiSettings = mergeState(p.uiSettings, { lastModalTab: selectedTab });
    dialogBody.find('.arcafeed-modal-content').scrollTop(0);
    p.flushSave();
  });
  dialog.appendTo('body');
  dialog.on('click', (event) => {
    if (event.target === dialog[0]) void eventBus.emit('closeModal');
  });
  $(document).on('keydown.arcafeedModal', (event) => {
    if (event.key === 'Escape') void eventBus.emit('closeModal');
  });
}

function initCloseModal(_: VaultAdapter): void {
  $('#dialog .helper-modal-tab').each((_, element) => {
    $(element).data('cleanup')?.();
  });
  $(document).off('keydown.arcafeedModal');
  $('#dialog').remove();
}

function initCloseModalContent(_: VaultAdapter): void {
  $('#dialog .helper-modal-tab').each((_, element) => {
    $(element).data('cleanup')?.();
  });
  $(document).off('keydown.arcafeedModal');
  $('#dialog .helper-modal-body').remove();
}

export * from './filterUi';
export * from './uiTab';
export * from './subscribeTab';

export { initModal, initCloseModal, initCloseModalContent };
