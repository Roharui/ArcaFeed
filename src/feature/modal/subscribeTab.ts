import { failedCommand } from '@feed/core/core/result';
import type { CommandResult } from '@feed/core/core/result';
import { OperationError, reportFailure } from '@/utils/operation-error';
import { mergeState } from '@feed/core/vault/lazy-state';
import {
  createElement,
  fromTemplate,
  isVisible,
  listen,
} from '@feed/core/utils/dom';
import { setDialogCleanup } from '@feed/core/feature/modal/cleanup';
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
import { subscribeArticleLoading } from '@feed/core/feature/loading';
import { showToast } from '@/utils/toast';
import { fetchUrl } from '@feed/core/utils/fetch';
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
function formatFilterSummary(filter?: ArticleFilterImpl): string {
  return [
    filter?.tab.length ? `${filter.tab.length}개 카테고리` : '전체 카테고리',
    filter?.onlyBest ? '인기글' : '전체글',
    `차단 키워드 ${filter?.title.length ?? 0}개`,
    ...(filter?.includeTitle?.length
      ? [
          `포함 ${filter.includeTitle.length}개 · ${filter.includeMode === 'all' ? '모두' : '하나 이상'} 일치${filter.includeCaseSensitive ? ' · 대소문자 구분' : ''}`,
        ]
      : []),
  ].join(' · ');
}
function createSubscribeToggleRow(
  channel: SubscribedChannel,
  checked: boolean,
): HTMLElement {
  const labelElement = createElement('label');
  const checkbox = createElement('input', {
    type: 'checkbox',
    class: 'category-check subscribe-channel-checkbox',
    'data-channel-id': channel.id,
  });
  checkbox.checked = checked;
  const nameElement = createElement('span', {
    class: 'category-span',
    text: channel.name,
  });
  labelElement.append(checkbox, nameElement);
  return labelElement;
}
async function fetchChannelCategories(channelId: string): Promise<{
  categories: string[];
  failed: boolean;
}> {
  try {
    const response = await fetchUrl(`/b/${channelId}`);
    return {
      categories: extractFilterCategories(
        new DOMParser().parseFromString(response.responseText, 'text/html'),
      ),
      failed: false,
    };
  } catch {
    return { categories: [], failed: true };
  }
}
const filterDrafts = new WeakMap<Element, ArticleFilterConfigImpl>();

function createSubscribeSettingModal(p: VaultAdapter): HTMLElement {
  const tab = fromTemplate(MODAL_SUBSCRIBE_TAB);
  tab.prepend(
    readingHeader(
      '구독 채널',
      '채널별 필터를 설정하고 선택한 채널의 글을 함께 탐색하세요.',
    ),
  );
  const channels = parseSubscribedChannels();
  const drafts: ArticleFilterConfigImpl = {};
  filterDrafts.set(tab, drafts);
  let disposed = false;
  let editorRevision = 0;
  let editorOpener: HTMLElement | null = null;
  const status = createSubscriptionStatus(p);
  const content = tab.querySelector<HTMLElement>('.arcafeed-modal-content')!;
  content.prepend(status.element);
  const unsubscribeLoading = subscribeArticleLoading((active) => {
    tab
      .querySelectorAll<HTMLButtonElement>(
        '#subscribe-start-status button, #subscribe-check-btn',
      )
      .forEach((button) => {
        button.disabled = active || channels.length === 0;
      });
  });
  setDialogCleanup(tab, () => {
    disposed = true;
    status.cleanup();
    unsubscribeLoading();
  });
  const hiddenSet = new Set(p.uiSettings.hiddenChannels);
  const list = tab.querySelector<HTMLElement>('#subscribe-channel-list')!;
  const panel = tab.querySelector<HTMLElement>('#subscribe-filter-editor')!;
  const header = tab.querySelector<HTMLElement>(
    ':scope > .arcafeed-reading-header',
  )!;
  const startResult = tab.querySelector<HTMLElement>(
    '#subscribe-start-status',
  )!;
  const controls = [
    list,
    header,
    ...Array.from(
      tab.querySelectorAll<HTMLElement>(
        '.arcafeed-subscribe-controls, #subscribe-buttons',
      ),
    ),
  ];
  const clearStartResult = () => {
    startResult.replaceChildren();
    startResult.hidden = true;
  };
  tab.addEventListener('change', (event) => {
    if (
      event.target instanceof Element &&
      event.target.matches('.subscribe-channel-checkbox')
    )
      clearStartResult();
  });
  const closeEditor = () => {
    editorRevision++;
    tab.classList.remove('is-editing-filter');
    panel.replaceChildren();
    controls.forEach((control) => {
      control.hidden = false;
    });
    if (editorOpener?.isConnected && isVisible(tab))
      editorOpener.focus({ preventScroll: true });
  };
  const openChannelEditor = async (
    channel: SubscribedChannel,
    onSummaryUpdate: (filter: ArticleFilterImpl) => void,
  ) => {
    if (!tab.classList.contains('is-editing-filter')) {
      editorOpener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    const revision = ++editorRevision;
    tab.classList.add('is-editing-filter');
    content.scrollTop = 0;
    controls.forEach((control) => {
      control.hidden = true;
    });
    panel.replaceChildren(
      createElement(
        'div',
        { class: 'arcafeed-subscribe-filter-loading' },
        createElement('p', {
          text: `${channel.name} 카테고리를 불러오는 중…`,
          role: 'status',
        }),
        listen(
          createElement('button', {
            type: 'button',
            class: 'arcafeed-modal-button',
            text: '취소',
          }),
          'click',
          closeEditor,
        ),
      ),
    );
    panel.querySelector('button')?.focus();
    const { categories, failed } = await fetchChannelCategories(channel.id);
    if (disposed || revision !== editorRevision) return;
    const editor = createArticleFilterModal(p, {
      channelId: channel.id,
      channelName: channel.name,
      categories,
      filter: drafts[channel.id] ?? p.articleFilterConfig[channel.id],
      onApply: (filter) => {
        clearStartResult();
        drafts[channel.id] = filter;
        onSummaryUpdate(filter);
        closeEditor();
      },
      onCancel: closeEditor,
    });
    editor.classList.remove('helper-modal-tab');
    editor.classList.add('arcafeed-subscribe-filter-editor');
    const focusedLoading = panel.contains(document.activeElement);
    panel.replaceChildren(editor);
    if (focusedLoading && isVisible(panel)) {
      Array.from(editor.querySelectorAll<HTMLElement>('input, button, select'))
        .find(isVisible)
        ?.focus();
    }
    if (failed) {
      editor.querySelector('.arcafeed-modal-content')!.prepend(
        createElement(
          'section',
          { class: 'arcafeed-settings-section' },
          createElement('p', {
            class: 'arcafeed-settings-description',
            role: 'status',
            text: '카테고리를 불러오지 못했습니다. 저장된 카테고리와 다른 필터는 수정할 수 있습니다.',
          }),
          listen(
            createElement('button', {
              type: 'button',
              class: 'arcafeed-modal-button',
              text: '다시 불러오기',
            }),
            'click',
            () => void openChannelEditor(channel, onSummaryUpdate),
          ),
        ),
      );
    }
  };
  for (const channel of channels) {
    const summary = createElement('div', {
      class: 'arcafeed-subscribe-summary',
    });
    const updateSummary = (filter?: ArticleFilterImpl) => {
      summary.textContent = formatFilterSummary(filter);
    };
    updateSummary(p.articleFilterConfig[channel.id]);
    list.append(
      createElement(
        'div',
        { class: 'arcafeed-subscribe-row' },
        createElement(
          'div',
          {},
          createSubscribeToggleRow(channel, !hiddenSet.has(channel.id)),
          summary,
        ),
        listen(
          createElement('button', {
            type: 'button',
            class: 'arcafeed-modal-button',
            text: '필터 수정',
            'aria-label': `${channel.name} 필터 수정`,
          }),
          'click',
          () => void openChannelEditor(channel, updateSummary),
        ),
      ),
    );
  }
  if (!channels.length) {
    list.append(
      createElement('p', {
        text: '구독 채널이 없습니다. /b/my에서 로그인 상태와 구독 목록을 확인해주세요.',
      }),
    );
  }
  tab.querySelector('#subscribe-select-all')!.addEventListener('click', () => {
    clearStartResult();
    tab
      .querySelectorAll<HTMLInputElement>('.subscribe-channel-checkbox')
      .forEach((checkbox) => {
        checkbox.checked = true;
      });
  });
  tab.querySelector('#subscribe-select-none')!.addEventListener('click', () => {
    clearStartResult();
    tab
      .querySelectorAll<HTMLInputElement>('.subscribe-channel-checkbox')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
  });
  tab.querySelector('#subscribe-save-btn')!.addEventListener('click', () => {
    try {
      clearStartResult();
      initCheckSubscribeModal(p);
      refreshUnvisitedNavigation(p);
      p.flushSave();
      void eventBus.emit('closeModal');
      showToast('구독 채널 설정을 저장했습니다.');
    } catch (error) {
      reportFailure(error);
    }
  });
  tab
    .querySelector('#subscribe-check-btn')!
    .addEventListener('click', () => eventBus.emit('checkSubscribeModal'));
  tab
    .querySelector('#subscribe-cancel-btn')!
    .addEventListener('click', () => eventBus.emit('closeModal'));
  return tab;
}
function readSubscribeSettingsFromModal(): string[] {
  const hidden: string[] = [];
  document
    .querySelectorAll<HTMLInputElement>('.subscribe-channel-checkbox')
    .forEach((checkbox) => {
      const channelId = checkbox.dataset.channelId;
      if (channelId && !checkbox.checked) hidden.push(channelId);
    });
  return hidden;
}
function initCheckSubscribeModal(p: VaultAdapter): VaultAdapter {
  const hiddenChannels = readSubscribeSettingsFromModal();
  const hiddenSet = new Set(hiddenChannels);
  const editor = document.querySelector('#dialog .helper-modal-subscribe');
  const filters = editor ? filterDrafts.get(editor) : undefined;
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
  const panel = document.querySelector<HTMLElement>(
    '#dialog #subscribe-start-status',
  );
  if (!panel) return;
  panel.hidden = false;
  panel.replaceChildren(
    createElement('p', {
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
        panel.replaceChildren();
        panel.hidden = true;
        showToast('탐색 조건이 바뀌었습니다. 일괄 탐색을 다시 시작해주세요.');
        return;
      }
      const next = await retrySubscriptionStart(p, result, id);
      if (next?.started) void eventBus.emit('closeModal');
      else if (next && panel.isConnected) renderStartResult(p, next);
    }),
  );
}
export {
  createSubscribeSettingModal,
  initCheckSubscribeModal,
  initStartHomeSeries,
};
