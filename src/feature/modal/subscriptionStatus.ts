import $ from 'jquery';
import { retrySubscriptionChannel } from '@/feature/article/subscription-feed';
import { subscribeArticleLoading } from '@/feature/article/loading';
import { reportFailure } from '@/utils/operation-error';
import type { SubscriptionFailure } from '@/types/vault';
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
): JQuery<HTMLElement>[] {
  return failures.map(({ channelId, reason }) =>
    $('<div>', { class: 'arcafeed-subscribe-row' }).append(
      $('<span>', {
        text: `${p.articleFilterConfig[channelId]?.channelName || channelId} · ${REASONS[reason]}`,
      }),
      $('<button>', {
        type: 'button',
        class: 'arcafeed-modal-button',
        text: '다시 시도',
        'aria-label': `${p.articleFilterConfig[channelId]?.channelName || channelId} 다시 시도`,
      }).on('click', async (event) => {
        const button = $(event.currentTarget).prop('disabled', true);
        try {
          await retry(channelId);
        } catch (error) {
          console.error('[ArcaFeed] Subscription retry failed:', error);
          reportFailure(error);
        } finally {
          button.prop('disabled', false);
        }
      }),
    ),
  );
}

/** Both subscription settings and the independent navigation panel expose retries. */
export function createSubscriptionStatus(p: VaultAdapter) {
  const element = $('<section>', {
    class: 'arcafeed-subscription-status arcafeed-settings-section',
    'aria-label': '구독 피드 불러오기 상태',
  });
  let loading = false;
  const render = () => {
    const failures =
      p.isSeriesMode && !p.isScrapMode
        ? p.subscriptionFailures.filter((failure) =>
            p.seriesChannels.includes(failure.channelId),
          )
        : [];
    element.empty().toggle(failures.length > 0);
    if (!failures.length) return;
    element.append(
      $('<p>', {
        role: 'status',
        text: `현재 피드에서 ${failures.length}개 채널을 불러오지 못했습니다. 불러온 글은 계속 탐색할 수 있습니다.`,
      }),
      ...subscriptionFailureRows(p, failures, (id) =>
        retrySubscriptionChannel(p, id),
      ),
    );
    element.find('button').prop('disabled', loading);
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
    element.find('button').prop('disabled', active);
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
