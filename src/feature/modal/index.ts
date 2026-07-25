import $ from 'jquery';

import '@css/modal.css';

import { createArticleFilterModal } from './filterUi';
import { createUISettingModal } from './uiTab';
import { createSubscribeSettingModal } from './subscribeTab';

import type { VaultAdapter } from '@/vault';

type ModalTab = 'filter' | 'ui' | 'subscribe';

const MODAL_TAB_IDS: Record<ModalTab, string> = {
  filter: 'arcafeed-modal-tab-filter',
  ui: 'arcafeed-modal-tab-ui',
  subscribe: 'arcafeed-modal-tab-subscribe',
};

const MODAL_TAB_LABELS: Record<ModalTab, string> = {
  filter: '게시글 필터 설정',
  ui: '화면 설정',
  subscribe: '구독 채널 설정',
};

const MODAL_TAB_ICONS: Record<ModalTab, string> = {
  filter: '🔍',
  ui: '🪟',
  subscribe: '📡',
};

let modalReturnFocus: HTMLElement | null = null;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function resolveModalTab(lastTab: string, availableTabs: ModalTab[]): ModalTab {
  return (
    availableTabs.find((tab) => tab === lastTab) ?? availableTabs[0] ?? 'filter'
  );
}

function buildModalTabControl(tab: ModalTab): string {
  const id = MODAL_TAB_IDS[tab];
  const label = MODAL_TAB_LABELS[tab];
  const icon = MODAL_TAB_ICONS[tab];

  return `
    <input
      id="${id}"
      class="helper-modal-tab-radio"
      type="radio"
      name="helper-modal-tab-group"
      data-modal-tab="${tab}"
      aria-label="${label}"
    />
    <label class="helper-modal-tab-label" for="${id}" title="${label}">
      <span aria-hidden="true">${icon}</span>
      <span class="arcafeed-sr-only">${label}</span>
    </label>
  `;
}

function focusModal($dialog: JQuery<HTMLElement>): void {
  const $target = $dialog
    .find(`input:checked, ${FOCUSABLE_SELECTOR}`)
    .filter(':visible')
    .first();

  if ($target.length) {
    $target.trigger('focus');
  } else {
    $dialog.find('.helper-modal-body').trigger('focus');
  }
}

function keepFocusInsideModal(
  event: JQuery.KeyDownEvent,
  $dialog: JQuery<HTMLElement>,
): void {
  if (event.key !== 'Tab') return;

  const focusable = $dialog
    .find(FOCUSABLE_SELECTOR)
    .filter(':visible')
    .toArray();
  if (focusable.length === 0) {
    event.preventDefault();
    $dialog.find('.helper-modal-body').trigger('focus');
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  const active = document.activeElement;
  const focusIsOutside =
    !(active instanceof Element) || !$.contains($dialog[0]!, active);
  const focusLast = event.shiftKey && (active === first || focusIsOutside);
  const focusFirst = !event.shiftKey && (active === last || focusIsOutside);

  if (focusLast) {
    event.preventDefault();
    last?.focus();
  } else if (focusFirst) {
    event.preventDefault();
    first?.focus();
  }
}

function initModal(p: VaultAdapter): void {
  const $existingDialog = $('#arcafeed-dialog');
  if ($existingDialog.length) {
    focusModal($existingDialog.first());
    return;
  }

  const isHome = p.isCurrentMode('HOME');
  const availableTabs: ModalTab[] = p.isSeriesMode
    ? ['ui']
    : isHome
      ? ['subscribe', 'ui']
      : ['filter', 'ui'];
  const tabControls = availableTabs.map(buildModalTabControl).join('');

  const dialog = $(`
    <div id="arcafeed-dialog" class="helper-modal">
      <div
        class="helper-modal-body"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arcafeed-modal-title"
        tabindex="-1"
      >
        <h2 id="arcafeed-modal-title" class="arcafeed-sr-only">ArcaFeed 설정</h2>
        ${tabControls}
      </div>
    </div>
  `);
  const dialogBody = dialog.find('.helper-modal-body');
  const initialTab = resolveModalTab(p.uiSettings.lastModalTab, availableTabs);
  dialog
    .find(`.helper-modal-tab-radio[data-modal-tab="${initialTab}"]`)
    .prop('checked', true);

  dialog
    .find('.helper-modal-tab-radio')
    .on('change.arcafeed-modal', function () {
      const selectedTab = $(this).attr(
        'data-modal-tab',
      ) as typeof p.uiSettings.lastModalTab;
      p.uiSettings = { ...p.uiSettings, lastModalTab: selectedTab };
      p.flushSave();
    });

  if (!p.isSeriesMode && !isHome) {
    dialogBody.append(createArticleFilterModal(p));
  }

  dialogBody.append(createUISettingModal(p));

  if (isHome) {
    dialogBody.append(createSubscribeSettingModal(p));
  }

  modalReturnFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  dialog
    .on('keydown.arcafeed-modal', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        initCloseModal(p);
      } else {
        keepFocusInsideModal(event, dialog);
      }
    })
    .on('mousedown.arcafeed-modal', (event) => {
      if (event.target !== dialog[0]) return;
      initCloseModal(p);
    });

  dialog.appendTo('body');
  focusModal(dialog);
}

function initCloseModal(_: VaultAdapter): void {
  $('#arcafeed-dialog').remove();

  if (modalReturnFocus?.isConnected) {
    modalReturnFocus.focus();
  }
  modalReturnFocus = null;
}

export * from './filterUi';
export * from './uiTab';
export * from './subscribeTab';

export { initModal, initCloseModal };
