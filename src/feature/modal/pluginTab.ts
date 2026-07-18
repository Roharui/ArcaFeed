import $ from 'jquery';

import { eventBus } from '@/core';

import type { VaultAdapter } from '@/vault';

const MODAL_PLUGIN_TAB = `
<div class="helper-modal-tab helper-modal-plugins">
  <div class="ui-title">플러그인 관리</div>
  <div id="plugin-loaded-section">
    <div class="plugin-section-title">로드된 플러그인</div>
    <div id="plugin-loaded-list"></div>
  </div>
  <div id="plugin-failed-section">
    <div class="plugin-section-title">불러오지 못한 플러그인</div>
    <div id="plugin-failed-list"></div>
  </div>
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
 * Create a row for a failed plugin with a "Load" button.
 */
function createFailedPluginRow(entry: PluginEntry, p: VaultAdapter): JQuery<HTMLElement> {
  const $row = $('<div>', { class: 'plugin-failed-row' });

  const $info = $('<div>', { class: 'plugin-failed-info' });
  const $name = $('<div>', { class: 'plugin-failed-name', text: entry.name });
  const $desc = $('<div>', {
    class: 'plugin-failed-desc',
    text: entry.description,
  });
  $info.append($name).append($desc);

  const $loadBtn = $('<input>', {
    type: 'button',
    class: 'plugin-load-btn helper-button button',
    value: '불러오기',
  }).on('click', () => {
    try {
      p.pluginSettings = { ...p.pluginSettings, [entry.id]: true };
      p.flushSave();
    } catch (err) {
      console.error('[ArcaFeed] Failed to enable plugin:', entry.id, err);
    }
    window.location.reload();
  });

  $row.append($info).append($loadBtn);
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

  // Separate loaded and failed plugins
  const loadedEntries = entries.filter((e) => e.enabled);
  const failedEntries = entries.filter((e) => !e.enabled);

  const $loadedList = $pluginTab.find('#plugin-loaded-list');
  const $failedList = $pluginTab.find('#plugin-failed-list');

  if (entries.length === 0) {
    $pluginTab.find('#plugin-loaded-section').remove();
    $pluginTab.find('#plugin-failed-section').remove();
    const $toggleList = $pluginTab.find('#plugin-toggle-list');
    $toggleList.append(
      $('<div>', {
        class: 'plugin-toggle-empty',
        text: '등록된 플러그인이 없습니다.',
      }),
    );
  } else {
    // Hide the old toggle list
    $pluginTab.find('#plugin-toggle-list').remove();

    if (loadedEntries.length === 0) {
      $loadedList.append(
        $('<div>', {
          class: 'plugin-toggle-empty',
          text: '로드된 플러그인이 없습니다.',
        }),
      );
    } else {
      loadedEntries.forEach((entry) => {
        $loadedList.append(createPluginToggleRow(entry));
      });
    }

    if (failedEntries.length === 0) {
      $pluginTab.find('#plugin-failed-section').remove();
    } else {
      failedEntries.forEach((entry) => {
        $failedList.append(createFailedPluginRow(entry, p));
      });
    }
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
