import { createElement, listen } from '@feed/core/utils/dom';
import { retrySubscriptionChannel } from '@/feature/article/subscription-feed';
import { subscribeArticleLoading } from '@feed/core/feature/loading';
import { reportFailure } from '@/utils/operation-error';
import { activeSubscriptionFailures } from '@/vault/subscription-failures';
import type { SubscriptionFailure } from '@feed/core/types/vault';
import type { VaultAdapter } from '@/vault';
import '@css/subscribe.css';
const REASONS: Record<SubscriptionFailure['reason'], string> = {
  timeout: '요청 시간 초과',
  network: '네트워크 요청 실패',
  unavailable: '서버 응답 오류',
};
export function subscriptionFailureRows(
  p: VaultAdapter,
  failures: SubscriptionFailure[],
  retry: (id: string) => Promise<unknown>,
): HTMLElement[] {
  return failures.map(({ channelId, reason }) =>
    createElement(
      'div',
      { class: 'arcafeed-subscribe-row' },
      createElement('span', {
        text: `${p.articleFilterConfig[channelId]?.channelName || channelId} · ${REASONS[reason]}`,
      }),
      listen(
        createElement('button', {
          type: 'button',
          class: 'arcafeed-modal-button',
          text: '다시 시도',
          'aria-label': `${p.articleFilterConfig[channelId]?.channelName || channelId} 다시 시도`,
        }),
        'click',
        async (_event, button) => {
          button.disabled = true;
          try {
            await retry(channelId);
          } catch (error) {
            console.error('[ArcaFeed] Subscription retry failed:', error);
            reportFailure(error);
          } finally {
            button.disabled = false;
          }
        },
      ),
    ),
  );
}
/** Both subscription settings and the independent navigation panel expose retries. */
export function createSubscriptionStatus(p: VaultAdapter) {
  const element = createElement('section', {
    class: 'arcafeed-subscription-status arcafeed-settings-section',
    'aria-label': '구독 피드 불러오기 상태',
  });
  let loading = false;
  const render = () => {
    const failures = activeSubscriptionFailures(p);
    element.replaceChildren();
    element.hidden = failures.length === 0;
    if (!failures.length) return;
    element.append(
      createElement('p', {
        role: 'status',
        text: `현재 피드에서 ${failures.length}개 채널을 불러오지 못했습니다. 불러온 글은 계속 탐색할 수 있습니다.`,
      }),
      ...subscriptionFailureRows(p, failures, (id) =>
        retrySubscriptionChannel(p, id),
      ),
    );
    element.querySelectorAll('button').forEach((button) => {
      button.disabled = loading;
    });
  };
  let previous = p.getState();
  const unsubscribe = p.subscribe((state) => {
    const changed =
      state.subscriptionFailures !== previous.subscriptionFailures ||
      state.seriesChannels !== previous.seriesChannels ||
      state.isSeriesMode !== previous.isSeriesMode ||
      state.isScrapMode !== previous.isScrapMode ||
      state.articleFilterConfig !== previous.articleFilterConfig;
    previous = state;
    if (changed) render();
  });
  const unsubscribeLoading = subscribeArticleLoading((active) => {
    loading = active;
    element.querySelectorAll('button').forEach((button) => {
      button.disabled = active;
    });
  });
  render();
  return {
    element,
    cleanup: () => {
      unsubscribe();
      unsubscribeLoading();
    },
  };
}
