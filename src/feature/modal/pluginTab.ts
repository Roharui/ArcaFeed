import $ from 'jquery';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

const MODAL_PLUGIN_TAB = `
<div class="helper-modal-tab helper-modal-plugins">
  <div class="ui-title">플러그인 관리</div>
  <div id="plugin-toggle-list"></div>
  <div id="plugin-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="plugin-check-btn" class="helper-button button" type="button" value="저장"/>
    <input id="plugin-cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

interface PluginEntry {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

function createPluginToggleRow(entry: PluginEntry): JQuery<HTMLElement> {
  const $row = $('<div>', { class: 'plugin-toggle-row' });

  const $label = $('<label>', { class: 'plugin-toggle-label' });
  const $checkbox = $('<input>', {
    type: 'checkbox',
    class: 'plugin-toggle-checkbox',
    'data-plugin-id': entry.id,
  });
  $checkbox.prop('checked', entry.enabled);

  $label.append($checkbox).append(` ${entry.name}`);

  const $desc = $('<div>', {
    class: 'plugin-toggle-desc',
    text: entry.description,
  });

  $row.append($label).append($desc);
  return $row;
}

/**
 * Build the plugin management tab content.
 */
function createPluginTab(p: VaultAdapter): JQuery<HTMLElement> {
  const $pluginTab = $(MODAL_PLUGIN_TAB);

  const registeredPlugins = (window as any).__arcaFeed?.plugins || [];
  const savedSettings = p.pluginSettings;

  const entries: PluginEntry[] = registeredPlugins.map(
    (info: { id: string; name: string; description: string }) => ({
      ...info,
      enabled: savedSettings[info.id] !== false,
    }),
  );

  const $toggleList = $pluginTab.find('#plugin-toggle-list');

  if (entries.length === 0) {
    $toggleList.append(
      $('<div>', {
        class: 'plugin-toggle-empty',
        text: '등록된 플러그인이 없습니다.',
      }),
    );
  } else {
    entries.forEach((entry) => {
      $toggleList.append(createPluginToggleRow(entry));
    });
  }

  $pluginTab
    .find('#plugin-check-btn')
    .on('click', () => eventBus.emit('checkPluginModal'));
  $pluginTab
    .find('#plugin-cancel-btn')
    .on('click', () => eventBus.emit('closeModal'));

  return $pluginTab;
}

/**
 * Read plugin toggle values from the modal and save to state.
 */
function initCheckPluginModal(p: VaultAdapter): VaultAdapter {
  const settings: Record<string, boolean> = {};

  $('.plugin-toggle-checkbox').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('data-plugin-id');
    if (id) {
      settings[id] = $el.prop('checked');
    }
  });

  p.pluginSettings = { ...p.pluginSettings, ...settings };
  return p;
}

export { createPluginTab, initCheckPluginModal };
