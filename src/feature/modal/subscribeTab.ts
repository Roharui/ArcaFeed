import $ from 'jquery';

import { eventBus } from '@/core';
import { createArticleKey } from '@/utils/article-key';
import { mapWithConcurrency } from '@/utils/async';
import { getArticleId } from '@/utils/regex';
import { appendSearchParam } from '@/utils/url';
import { showToast } from '@/utils/toast';
import {
  fetchChannelArticleBatch,
  hideFetchLoader,
  showFetchLoader,
} from '@/feature/article/fetch';

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
  const channels = $('.my-subscribe-channels > .vrow > a.channel')
    .toArray()
    .map((el) => {
      const href = $(el).attr('href') || '';
      const channelId = href.replace(/^\/b\//, '').split(/[/?#]/)[0] || '';
      const name = $(el).find('.channel-name').text().trim() || channelId;
      return { id: channelId, name };
    })
    .filter((c) => c.id !== '');

  return [
    ...new Map(channels.map((channel) => [channel.id, channel])).values(),
  ];
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

  $tab
    .find('#subscribe-check-btn')
    .on('click', () => void eventBus.emit('checkSubscribeModal'));
  $tab
    .find('#subscribe-cancel-btn')
    .on('click', () => void eventBus.emit('closeModal'));

  return $tab;
}

function readSubscribeSettingsFromModal(): string[] {
  const hidden: string[] = [];

  $('#arcafeed-dialog .subscribe-channel-checkbox').each((_, el) => {
    const $el = $(el);
    const channelId = $el.attr('data-channel-id');
    if (channelId && !$el.prop('checked')) {
      hidden.push(channelId);
    }
  });

  return hidden;
}

function initCheckSubscribeModal(p: VaultAdapter): void {
  const hiddenChannels = readSubscribeSettingsFromModal();
  p.uiSettings = { ...p.uiSettings, hiddenChannels };
}

// ── Home Series ─────────────────────────────────────────

async function initStartHomeSeries(p: VaultAdapter): Promise<void> {
  const channels = parseSubscribedChannels();
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const selectedChannels = channels.filter((c) => !hiddenSet.has(c.id));

  if (selectedChannels.length === 0) {
    showToast('선택한 채널이 없습니다.');
    return;
  }

  showFetchLoader();

  try {
    let failedChannels = 0;
    const batches = await mapWithConcurrency(
      selectedChannels,
      4,
      async (channel) => {
        try {
          const channelFilter = p.articleFilterConfig[channel.id];
          return {
            channelId: channel.id,
            batch: await fetchChannelArticleBatch(channel.id, 0, channelFilter),
          };
        } catch (error) {
          failedChannels += 1;
          console.warn(
            `[ArcaFeed] Failed to fetch channel "${channel.id}".`,
            error,
          );
          return null;
        }
      },
    );

    const successfulBatches = batches.filter(
      (result): result is NonNullable<typeof result> => result !== null,
    );
    const allArticles = [
      ...new Set(successfulBatches.flatMap(({ batch }) => batch.links)),
    ]
      .map((url) => ({
        url,
        articleId: Number.parseInt(getArticleId(url), 10),
      }))
      .filter(({ articleId }) => Number.isSafeInteger(articleId))
      .sort((a, b) => b.articleId - a.articleId);

    if (allArticles.length === 0) {
      showToast(
        failedChannels > 0
          ? '채널 게시글을 불러오지 못했습니다.'
          : '시리즈로 열 게시글이 없습니다.',
      );
      return;
    }

    const articleKey = createArticleKey();
    p.articleKey = articleKey;
    p.articleList = allArticles.map((a) => a.url);
    p.seriesSource = 'home';
    p.homeSeriesState = {
      channels: selectedChannels.map((channel) => channel.id),
      cursors: Object.fromEntries(
        successfulBatches
          .filter(({ batch }) => batch.cursor > 0)
          .map(({ channelId, batch }) => [channelId, batch.cursor]),
      ),
      exhaustedChannels: successfulBatches
        .filter(({ batch }) => batch.exhausted)
        .map(({ channelId }) => channelId),
    };
    p.activeIndex = 0;
    p.searchQuery = appendSearchParam('', 'articleKey', articleKey);
    p.flushSave();

    if (failedChannels > 0) {
      showToast(`${failedChannels}개 채널을 제외하고 시작합니다.`);
    }

    const [firstArticle] = allArticles;
    if (!firstArticle) return;
    const nextUrl = new URL(firstArticle.url, window.location.origin);
    nextUrl.searchParams.set('articleKey', articleKey);
    window.location.replace(nextUrl.toString());
  } finally {
    hideFetchLoader();
  }
}

export {
  createSubscribeSettingModal,
  initCheckSubscribeModal,
  initStartHomeSeries,
};
