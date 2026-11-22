import { fromTemplate } from '@/utils/dom';
import { disposeDialogElement, setDialogCleanup } from './cleanup';
import { reportFailure } from '@/utils/operation-error';

import '@css/modal.css';
import { installDialogFocus } from './focus';
import { eventBus } from '@/core/app-events';

import { createArticleFilterModal } from './filterUi';
import { createHistoryModal } from './historyTab';

import { mergeState } from '@/vault/lazy-state';
import type { VaultAdapter } from '@/vault';

function resolveModalTab(lastTab: string, availableTabs: string[]): string {
  return availableTabs.includes(lastTab)
    ? lastTab
    : (availableTabs[0] ?? 'filter');
}

function initModal(p: VaultAdapter) {
  initCloseModal(p);
  const availableTabs = ['filter', 'history'];
  const labels: Record<string, { icon: string; title: string }> = {
    filter: { icon: '🔍', title: '필터' },
    history: { icon: '🕘', title: '최근 본 글' },
  };
  const dialog = fromTemplate(`
    <div id="dialog" class="helper-modal">
      <div class="helper-modal-body" style="--rulifeed-modal-tab-count: ${availableTabs.length}" role="dialog" aria-modal="true" aria-label="루리피드 설정">
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
  const dialogBody = dialog.querySelector<HTMLElement>('.helper-modal-body')!;

  const factories: Record<string, () => HTMLElement> = {
    filter: () => createArticleFilterModal(p),
    history: () => createHistoryModal(p),
  };
  const created = new Set<string>();
  const ensureTab = (tab: string) => {
    if (created.has(tab) || !availableTabs.includes(tab)) return;
    dialogBody.append(factories[tab]!());
    created.add(tab);
  };
  const initialTab = resolveModalTab(p.uiSettings.lastModalTab, availableTabs);
  const initialRadio = dialog.querySelector<HTMLInputElement>(
    `#${initialTab}`,
  )!;
  initialRadio.checked = true;
  ensureTab(initialTab);
  dialog
    .querySelectorAll<HTMLInputElement>('.helper-modal-tab-radio')
    .forEach((radio) => {
      radio.addEventListener('change', () => {
        const selectedTab = radio.id as typeof p.uiSettings.lastModalTab;
        ensureTab(selectedTab);
        p.uiSettings = mergeState(p.uiSettings, { lastModalTab: selectedTab });
        dialogBody
          .querySelectorAll<HTMLElement>('.rulifeed-modal-content')
          .forEach((content) => {
            content.scrollTop = 0;
          });
        try {
          p.flushSave();
        } catch (error) {
          reportFailure(error);
        }
      });
    });
  document.body.append(dialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) void eventBus.emit('closeModal');
  });
  setDialogCleanup(
    dialog,
    installDialogFocus(
      dialogBody,
      () => {
        void eventBus.emit('closeModal');
      },
      initialRadio,
    ),
  );
}

function initCloseModal(_: VaultAdapter): void {
  const dialog = document.getElementById('dialog');
  if (!dialog) return;
  dialog.querySelectorAll('.helper-modal-tab').forEach(disposeDialogElement);
  disposeDialogElement(dialog);
  dialog.remove();
}

export * from './filterUi';

export { initModal, initCloseModal };
