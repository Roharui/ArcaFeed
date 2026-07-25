import $ from 'jquery';

import { eventBus } from '@/core';
import { createArticleKey } from '@/utils/article-key';
import { getArticleId } from '@/utils/regex';
import { fetchChannelFirstPage } from '@/feature/article/fetch';

import type { VaultAdapter } from '@/vault';

interface ChannelInfo {
  id: string;
  name: string;
}

const MODAL_SUBSCRIBE_TAB = `
<div class="helper-modal-tab helper-modal-subscribe">
  <div class="ui-title">채널 설정</div>
  <div id="subscribe-channel-list"></div>
  <div id="subscribe-buttons" class="helper-modal-btns f-right" style="border-bottom: 0px none;">
    <input id="subscribe-check-btn" class="helper-button button" type="button" value="확인"/>
    <input id="subscribe-cancel-btn" class="helper-button button" type="button" value="취소"/>
  </div>
</div>
`;

function parseSubscribedChannels(): ChannelInfo[] {
  return $('.my-subscribe-channels > .vrow > a.channel')
    .toArray()
    .map((el) => {
      const href = $(el).attr('href') || '';
      const channelId = href.replace(/^\/b\//, '').split(/[/?#]/)[0] || '';
      const name = $(el).find('.channel-name').text().trim() || channelId;
      return { id: channelId, name };
    })
    .filter((c) => c.id !== '');
}

function createSubscribeToggleRow(
  channel: ChannelInfo,
  checked: boolean,
): JQuery<HTMLElement> {
  const $label = $('<label>');
  const $checkbox = $('<input>', {
    type: 'checkbox',
    class: 'category-check subscribe-channel-checkbox',
    'data-channel-id': channel.id,
  });
  $checkbox.prop('checked', checked);

  const $name = $('<span>', { class: 'category-span', text: channel.name });

  $label.append($checkbox).append($name);

  return $label;
}

function createSubscribeSettingModal(p: VaultAdapter): JQuery<HTMLElement> {
  const $tab = $(MODAL_SUBSCRIBE_TAB);

  const channels = parseSubscribedChannels();
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const $list = $tab.find('#subscribe-channel-list');

  for (const channel of channels) {
    $list.append(createSubscribeToggleRow(channel, !hiddenSet.has(channel.id)));
  }

  $tab.find('#subscribe-check-btn').on('click', () =>
    eventBus.emit('checkSubscribeModal'),
  );
  $tab.find('#subscribe-cancel-btn').on('click', () =>
    eventBus.emit('closeModal'),
  );

  return $tab;
}

function readSubscribeSettingsFromModal(): string[] {
  const hidden: string[] = [];

  $('.subscribe-channel-checkbox').each((_, el) => {
    const $el = $(el);
    const channelId = $el.attr('data-channel-id');
    if (channelId && !$el.prop('checked')) {
      hidden.push(channelId);
    }
  });

  return hidden;
}

function initCheckSubscribeModal(p: VaultAdapter): VaultAdapter {
  const hiddenChannels = readSubscribeSettingsFromModal();
  p.uiSettings = { ...p.uiSettings, hiddenChannels };
  return p;
}

// ── Loading indicator ──────────────────────────────────

function getLoader(): JQuery<HTMLElement> {
  let $loader = $('#arcafeed-fetch-loader');
  if (!$loader.length) {
    $loader = $('<div id="arcafeed-fetch-loader" class="fetch-loader"></div>');
    $('body').append($loader);
  }
  return $loader;
}

function showFetchLoader(): void {
  getLoader().addClass('active');
}

function hideFetchLoader(): void {
  getLoader().removeClass('active');
}

// ── Home Series ─────────────────────────────────────────

async function initStartHomeSeries(p: VaultAdapter): Promise<VaultAdapter> {
  const channels = parseSubscribedChannels();
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const selectedChannels = channels.filter((c) => !hiddenSet.has(c.id));

  if (selectedChannels.length === 0) return p;

  showFetchLoader();

  try {
    p.uiSettings = {
      ...p.uiSettings,
      homeSeriesChannels: selectedChannels.map((c) => c.id),
    };

    const articleKey = createArticleKey();
    const allArticles: { url: string; articleId: number }[] = [];

    for (const channel of selectedChannels) {
      const channelFilter = p.articleFilterConfig[channel.id];
      const articles = await fetchChannelFirstPage(channel.id, channelFilter);

      for (const url of articles) {
        const articleIdNum = parseInt(getArticleId(url));
        if (!isNaN(articleIdNum)) {
          allArticles.push({ url, articleId: articleIdNum });
        }
      }
    }

    allArticles.sort((a, b) => b.articleId - a.articleId);

    p.articleKey = articleKey;
    p.href.articleKey = articleKey;
    p.articleList = allArticles.map((a) => a.url);
    p.isSeriesMode = true;
    p.activeIndex = 0;
    p.searchQuery = `?articleKey=${articleKey}`;
    p.flushSave();

    if (allArticles.length > 0) {
      const firstArticle = allArticles[0] as { url: string; articleId: number };
      const nextUrl = new URL(firstArticle.url, window.location.origin);
      nextUrl.searchParams.set('articleKey', articleKey);
      window.location.replace(nextUrl.toString());
    }
  } finally {
    hideFetchLoader();
  }

  return p;
}

export { createSubscribeSettingModal, initCheckSubscribeModal, initStartHomeSeries };
