import $ from 'jquery';

import { eventBus } from '@/core/app-events';
import { createArticleKey } from '@/utils/article-key';
import { getArticleId } from '@/utils/regex';
import {
  fetchChannelFirstPage,
  fetchChannelArticlesBefore,
  showFetchLoader,
  hideFetchLoader,
} from '@/feature/article/fetch';
import { mapConcurrent } from '@/utils/func';
import { captureArticleSession } from '@/vault/article-session';
import { showToast } from '@/utils/toast';
import { fetchUrl } from '@/utils/fetch';
import { parseSubscribedChannels } from '@/feature/subscriptions';
import { createArticleFilterModal, extractFilterCategories } from './filterUi';
import { readingHeader } from './readingUi';
import { isVisitedPath } from '@/vault/reading-history';
import { refreshUnvisitedNavigation } from '@/feature/article/link';
import '@css/subscribe.css';

import type { VaultAdapter } from '@/vault';
import type { ArticleFilterConfigImpl, ArticleFilterImpl } from '@/types';
import type { SubscribedChannel } from '@/feature/subscriptions';

const MODAL_SUBSCRIBE_TAB = `
<div class="helper-modal-tab helper-modal-subscribe">
  <div class="arcafeed-subscribe-controls">
    <button type="button" class="arcafeed-modal-button" id="subscribe-select-all">전체 선택</button>
    <button type="button" class="arcafeed-modal-button" id="subscribe-select-none">전체 해제</button>
  </div>
  <div id="subscribe-channel-list"></div>
  <div id="subscribe-filter-editor"></div>
  <div id="subscribe-buttons" class="arcafeed-modal-actions">
    <button id="subscribe-cancel-btn" class="arcafeed-modal-button" type="button">취소</button>
    <button id="subscribe-save-btn" class="arcafeed-modal-button" type="button">저장</button>
    <button id="subscribe-check-btn" class="arcafeed-modal-button is-primary" type="button">일괄 탐색 시작</button>
  </div>
</div>
`;

function createSubscribeToggleRow(
  channel: SubscribedChannel,
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
  $tab.prepend(
    readingHeader(
      '구독 채널',
      '채널별 필터를 설정하고 선택한 채널의 글을 함께 탐색하세요.',
    ),
  );

  const channels = parseSubscribedChannels();
  const drafts: ArticleFilterConfigImpl = {};
  $tab.data('filters', drafts);
  let disposed = false;
  let editorRevision = 0;
  $tab.data('cleanup', () => {
    disposed = true;
  });
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const $list = $tab.find('#subscribe-channel-list');
  const $panel = $tab.find('#subscribe-filter-editor');
  const $header = $tab.children('.arcafeed-reading-header');
  const closeEditor = () => {
    editorRevision++;
    $panel.empty();
    $list.show();
    $header.show();
    $tab.find('.arcafeed-subscribe-controls, #subscribe-buttons').show();
  };

  for (const channel of channels) {
    const $summary = $('<div>', { class: 'arcafeed-subscribe-summary' });
    const summarize = (filter?: ArticleFilterImpl) =>
      $summary.text(
        [
          filter?.tab.length
            ? `${filter.tab.length}개 카테고리`
            : '전체 카테고리',
          filter?.onlyBest ? '인기글' : '전체글',
          `차단 키워드 ${filter?.title.length ?? 0}개`,
        ].join(' · '),
      );
    summarize(p.articleFilterConfig[channel.id]);
    const openEditor = async () => {
      const revision = ++editorRevision;
      $list.hide();
      $header.hide();
      $tab.find('.arcafeed-subscribe-controls, #subscribe-buttons').hide();
      $panel.empty().append(
        $('<p>', {
          text: `${channel.name} 카테고리를 불러오는 중…`,
          role: 'status',
        }),
        $('<button>', {
          type: 'button',
          class: 'arcafeed-modal-button',
          text: '취소',
        }).on('click', closeEditor),
      );
      let categories: string[] = [];
      let failed = false;
      try {
        const response = await fetchUrl(`/b/${channel.id}`);
        categories = extractFilterCategories(
          $(
            new DOMParser().parseFromString(response.responseText, 'text/html')
              .documentElement,
          ),
        );
      } catch {
        failed = true;
      }
      if (disposed || revision !== editorRevision) return;
      const editor = createArticleFilterModal(p, {
        channelId: channel.id,
        channelName: channel.name,
        categories,
        filter: drafts[channel.id] ?? p.articleFilterConfig[channel.id],
        onApply: (filter) => {
          drafts[channel.id] = filter;
          summarize(filter);
          closeEditor();
        },
        onCancel: closeEditor,
      })
        .removeClass('helper-modal-tab')
        .addClass('arcafeed-subscribe-filter-editor');
      $panel.empty().append(editor);
      if (failed)
        editor.prepend(
          $('<p>', {
            class: 'arcafeed-settings-description',
            text: '카테고리를 불러오지 못했습니다. 저장된 카테고리와 다른 필터는 수정할 수 있습니다.',
          }),
          $('<button>', {
            type: 'button',
            class: 'arcafeed-modal-button',
            text: '다시 불러오기',
          }).on('click', () => void openEditor()),
        );
    };
    $list.append(
      $('<div>', { class: 'arcafeed-subscribe-row' }).append(
        $('<div>').append(
          createSubscribeToggleRow(channel, !hiddenSet.has(channel.id)),
          $summary,
        ),
        $('<button>', {
          type: 'button',
          class: 'arcafeed-modal-button',
          text: '필터 수정',
          'aria-label': `${channel.name} 필터 수정`,
        }).on('click', () => void openEditor()),
      ),
    );
  }
  if (!channels.length)
    $list.append(
      $('<p>', {
        text: '구독 채널이 없습니다. /b/my에서 로그인 상태와 구독 목록을 확인해주세요.',
      }),
    );
  $tab.find('#subscribe-check-btn').prop('disabled', channels.length === 0);
  $tab
    .find('#subscribe-select-all')
    .on('click', () =>
      $tab.find('.subscribe-channel-checkbox').prop('checked', true),
    );
  $tab
    .find('#subscribe-select-none')
    .on('click', () =>
      $tab.find('.subscribe-channel-checkbox').prop('checked', false),
    );
  $tab.find('#subscribe-save-btn').on('click', () => {
    initCheckSubscribeModal(p);
    refreshUnvisitedNavigation(p);
    p.flushSave();
    void eventBus.emit('closeModal');
    showToast('구독 채널 설정을 저장했습니다.');
  });

  $tab
    .find('#subscribe-check-btn')
    .on('click', () => eventBus.emit('checkSubscribeModal'));
  $tab
    .find('#subscribe-cancel-btn')
    .on('click', () => eventBus.emit('closeModal'));

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
  const filters = $('#dialog .helper-modal-subscribe').data('filters') as
    | ArticleFilterConfigImpl
    | undefined;
  p.updateState({
    uiSettings: { ...p.uiSettings, hiddenChannels },
    ...(p.isSeriesMode && p.seriesChannels.length
      ? {
          seriesChannels: parseSubscribedChannels()
            .filter((channel) => !hiddenChannels.includes(channel.id))
            .map((channel) => channel.id),
          articleList: p.articleList.slice(0, p.activeIndex + 1),
        }
      : {}),
    ...(filters && Object.keys(filters).length
      ? {
          articleFilterConfig: { ...p.articleFilterConfig, ...filters },
          articleList: p.articleList.slice(0, p.activeIndex + 1),
        }
      : {}),
  });
  return p;
}

// ── Home Series ─────────────────────────────────────────

async function initStartHomeSeries(p: VaultAdapter): Promise<VaultAdapter> {
  const channels = parseSubscribedChannels();
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const selectedChannels = channels.filter((c) => !hiddenSet.has(c.id));

  if (selectedChannels.length === 0) {
    showToast('탐색할 채널을 하나 이상 선택해주세요.');
    void eventBus.emit('closeModal');
    return p;
  }

  showFetchLoader();
  const isCurrent = captureArticleSession(p);

  try {
    p.uiSettings = {
      ...p.uiSettings,
      homeSeriesChannels: selectedChannels.map((c) => c.id),
    };

    const articleKey = createArticleKey();
    const filterConfig = p.articleFilterConfig;
    const visitedPaths = p.skipVisitedArticles
      ? p.reading.getVisitedPaths()
      : undefined;
    const allArticles: { url: string; articleId: number }[] = [];

    const batches = await mapConcurrent(selectedChannels, async (channel) => {
      if (!isCurrent()) return [];
      const channelFilter = filterConfig[channel.id];
      return visitedPaths ||
        channelFilter?.tab.length ||
        channelFilter?.title.length
        ? fetchChannelArticlesBefore(
            channel.id,
            0,
            channelFilter,
            undefined,
            visitedPaths,
          )
        : fetchChannelFirstPage(channel.id, channelFilter);
    });
    if (!isCurrent()) return p;

    const seen = new Set<string>();
    for (const articles of batches) {
      for (const url of articles) {
        const articleIdNum = parseInt(getArticleId(url));
        if (!isNaN(articleIdNum) && !seen.has(url)) {
          seen.add(url);
          allArticles.push({ url, articleId: articleIdNum });
        }
      }
    }

    allArticles.sort((a, b) => b.articleId - a.articleId);

    const firstIndex = allArticles.findIndex(
      (article) => !isVisitedPath(visitedPaths, article.url),
    );
    if (firstIndex === -1) {
      showToast(
        visitedPaths
          ? '선택한 채널에서 아직 방문하지 않은 게시글을 찾지 못했습니다.'
          : '선택한 채널에서 게시글을 찾지 못했습니다.',
      );
      return p;
    }
    p.updateState({
      articleKey,
      href: { ...p.href, articleKey },
      articleList: allArticles.map((a) => a.url),
      isSeriesMode: true,
      isScrapMode: false,
      seriesChannels: selectedChannels.map((channel) => channel.id),
      activeIndex: firstIndex,
      searchQuery: `?articleKey=${articleKey}`,
    });
    p.flushSave();

    if (allArticles.length > 0) {
      const firstArticle = allArticles[firstIndex] as {
        url: string;
        articleId: number;
      };
      const nextUrl = new URL(firstArticle.url, window.location.origin);
      nextUrl.searchParams.set('articleKey', articleKey);
      window.location.replace(nextUrl.toString());
    }
  } catch (error) {
    console.error('[ArcaFeed] Subscription feed load failed:', error);
    if (isCurrent())
      showToast(
        '구독 채널의 글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
  } finally {
    hideFetchLoader();
    // Also dismiss the loading overlay if a channel request fails.
    void eventBus.emit('closeModal');
  }

  return p;
}

export {
  createSubscribeSettingModal,
  initCheckSubscribeModal,
  initStartHomeSeries,
};
