import { failedCommand } from '@/core/result';
import type { CommandResult } from '@/core/result';
import { OperationError, reportFailure } from '@/utils/operation-error';
import { mergeState } from '@/vault/lazy-state';
import $ from 'jquery';

import { eventBus } from '@/core/app-events';
import {
  startSubscriptionFeed,
  retrySubscriptionStart,
} from '@/feature/article/subscription-feed';
import type { SubscriptionStartResult } from '@/feature/article/subscription-feed';
import {
  createSubscriptionStatus,
  subscriptionFailureRows,
} from './subscriptionStatus';
import { subscribeArticleLoading } from '@/feature/article/loading';
import { showToast } from '@/utils/toast';
import { fetchUrl } from '@/utils/fetch';
import { parseSubscribedChannels } from '@/feature/subscriptions';
import { createArticleFilterModal, extractFilterCategories } from './filterUi';
import { readingHeader } from './readingUi';
import { refreshUnvisitedNavigation } from '@/feature/article/link';
import '@css/subscribe.css';

import type { VaultAdapter } from '@/vault';
import type { ArticleFilterConfigImpl, ArticleFilterImpl } from '@/types';
import type { SubscribedChannel } from '@/feature/subscriptions';

const MODAL_SUBSCRIBE_TAB = `
<div class="helper-modal-tab helper-modal-subscribe">
  <div class="arcafeed-modal-content">
    <div class="arcafeed-subscribe-controls">
      <button type="button" class="arcafeed-modal-button" id="subscribe-select-all">전체 선택</button>
      <button type="button" class="arcafeed-modal-button" id="subscribe-select-none">전체 해제</button>
    </div>
    <div id="subscribe-start-status" class="arcafeed-subscription-status" hidden></div>
    <div id="subscribe-channel-list"></div>
    <div id="subscribe-filter-editor"></div>
  </div>
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
  let editorOpener: HTMLElement | null = null;
  const status = createSubscriptionStatus(p);
  $tab.find('.arcafeed-modal-content').prepend(status.element);
  const unsubscribeLoading = subscribeArticleLoading((active) => {
    $tab
      .find('#subscribe-start-status button, #subscribe-check-btn')
      .prop('disabled', active || channels.length === 0);
  });
  $tab.data('cleanup', () => {
    disposed = true;
    status.cleanup();
    unsubscribeLoading();
  });
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const $list = $tab.find('#subscribe-channel-list');
  const $panel = $tab.find('#subscribe-filter-editor');
  const clearStartResult = () =>
    $tab.find('#subscribe-start-status').empty().prop('hidden', true);
  $tab.on('change', '.subscribe-channel-checkbox', clearStartResult);
  const $header = $tab.children('.arcafeed-reading-header');
  const closeEditor = () => {
    editorRevision++;
    $tab.removeClass('is-editing-filter');
    $panel.empty();
    $list.show();
    $header.show();
    $tab.find('.arcafeed-subscribe-controls, #subscribe-buttons').show();
    if (editorOpener?.isConnected && $tab.is(':visible'))
      editorOpener.focus({ preventScroll: true });
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
          ...(filter?.includeTitle?.length
            ? [
                `포함 ${filter.includeTitle.length}개 · ${filter.includeMode === 'all' ? '모두' : '하나 이상'} 일치${filter.includeCaseSensitive ? ' · 대소문자 구분' : ''}`,
              ]
            : []),
        ].join(' · '),
      );
    summarize(p.articleFilterConfig[channel.id]);
    const openEditor = async () => {
      if (!$tab.hasClass('is-editing-filter'))
        editorOpener =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      const revision = ++editorRevision;
      $tab.addClass('is-editing-filter');
      $tab.find('.arcafeed-modal-content').scrollTop(0);
      $list.hide();
      $header.hide();
      $tab.find('.arcafeed-subscribe-controls, #subscribe-buttons').hide();
      $panel.empty().append(
        $('<div>', { class: 'arcafeed-subscribe-filter-loading' }).append(
          $('<p>', {
            text: `${channel.name} 카테고리를 불러오는 중…`,
            role: 'status',
          }),
          $('<button>', {
            type: 'button',
            class: 'arcafeed-modal-button',
            text: '취소',
          }).on('click', closeEditor),
        ),
      );
      $panel.find('button').first().trigger('focus');
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
          clearStartResult();
          drafts[channel.id] = filter;
          summarize(filter);
          closeEditor();
        },
        onCancel: closeEditor,
      })
        .removeClass('helper-modal-tab')
        .addClass('arcafeed-subscribe-filter-editor');
      const focusedLoading = $panel[0]?.contains(document.activeElement);
      $panel.empty().append(editor);
      if (focusedLoading && $panel.is(':visible'))
        editor
          .find('input, button, select')
          .filter(':visible')
          .first()
          .trigger('focus');
      if (failed)
        editor.find('.arcafeed-modal-content').prepend(
          $('<section>', { class: 'arcafeed-settings-section' }).append(
            $('<p>', {
              class: 'arcafeed-settings-description',
              role: 'status',
              text: '카테고리를 불러오지 못했습니다. 저장된 카테고리와 다른 필터는 수정할 수 있습니다.',
            }),
            $('<button>', {
              type: 'button',
              class: 'arcafeed-modal-button',
              text: '다시 불러오기',
            }).on('click', () => void openEditor()),
          ),
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
  $tab.find('#subscribe-select-all').on('click', () => {
    clearStartResult();
    $tab.find('.subscribe-channel-checkbox').prop('checked', true);
  });
  $tab.find('#subscribe-select-none').on('click', () => {
    clearStartResult();
    $tab.find('.subscribe-channel-checkbox').prop('checked', false);
  });
  $tab.find('#subscribe-save-btn').on('click', () => {
    try {
      $tab.find('#subscribe-start-status').empty().prop('hidden', true);
      initCheckSubscribeModal(p);
      refreshUnvisitedNavigation(p);
      p.flushSave();
      void eventBus.emit('closeModal');
      showToast('구독 채널 설정을 저장했습니다.');
    } catch (error) {
      reportFailure(error);
    }
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
  const hiddenSet = new Set(hiddenChannels);
  const filters = $('#dialog .helper-modal-subscribe').data('filters') as
    | ArticleFilterConfigImpl
    | undefined;
  p.updateState({
    subscriptionFailures: [],
    uiSettings: mergeState(p.uiSettings, { hiddenChannels }),
    ...(p.isSeriesMode && p.seriesChannels.length
      ? {
          seriesChannels: parseSubscribedChannels()
            .filter((channel) => !hiddenSet.has(channel.id))
            .map((channel) => channel.id),
          articleList: p.articleList.slice(0, p.activeIndex + 1),
        }
      : {}),
    ...(filters && Object.keys(filters).length
      ? {
          articleFilterConfig: mergeState(p.articleFilterConfig, filters),
          articleList: p.articleList.slice(0, p.activeIndex + 1),
        }
      : {}),
  });
  p.flushSave();
  return p;
}

// ── Home Series ─────────────────────────────────────────

async function initStartHomeSeries(p: VaultAdapter): Promise<CommandResult> {
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const channelIds = parseSubscribedChannels()
    .filter((channel) => !hiddenSet.has(channel.id))
    .map((channel) => channel.id);
  if (channelIds.length === 0) {
    showToast('탐색할 채널을 하나 이상 선택해주세요.');
    void eventBus.emit('closeModal');
    return reportedStartFailure('탐색할 채널이 없습니다.');
  }
  try {
    const result = await startSubscriptionFeed(p, channelIds);
    if (result?.started) {
      void eventBus.emit('closeModal');
      return { ok: true };
    }
    if (result) renderStartResult(p, result);
    return reportedStartFailure(
      result
        ? '탐색할 글을 불러오지 못했습니다.'
        : '탐색 조건이 바뀌었거나 다른 이동이 진행 중입니다.',
    );
  } catch (error) {
    console.error('[ArcaFeed] Subscription feed start failed:', error);
    return failedCommand(reportFailure(error));
  }
}

function reportedStartFailure(message: string): CommandResult {
  const error = new OperationError('command', message);
  error.reported = true;
  return failedCommand(error);
}

function renderStartResult(
  p: VaultAdapter,
  result: SubscriptionStartResult,
): void {
  const panel = $('#dialog #subscribe-start-status');
  if (!panel.length) return;
  panel
    .empty()
    .prop('hidden', false)
    .append(
      $('<p>', {
        role: 'status',
        text:
          result.failures.length === result.channels.length
            ? '선택한 모든 채널을 불러오지 못했습니다.'
            : result.failures.length
              ? '정상 조회한 채널에 탐색할 글이 없습니다. 실패 채널을 다시 시도하세요.'
              : '정상 조회했지만 현재 조건에서 탐색할 글이 없습니다.',
      }),
      ...subscriptionFailureRows(p, result.failures, async (id) => {
        if (!result.isCurrent()) {
          panel.empty().prop('hidden', true);
          showToast('탐색 조건이 바뀌었습니다. 일괄 탐색을 다시 시작해주세요.');
          return;
        }
        const next = await retrySubscriptionStart(p, result, id);
        if (next?.started) void eventBus.emit('closeModal');
        else if (next && panel.closest('body').length)
          renderStartResult(p, next);
      }),
    );
}

export {
  createSubscribeSettingModal,
  initCheckSubscribeModal,
  initStartHomeSeries,
};
