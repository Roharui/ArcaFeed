import type { SubscriptionFailure } from '../types/vault';
import type { BaseAppState } from './store';

/** Stored diagnostics are optional and never trusted as navigation input. */
export function normalizeSubscriptionFailuresWith(
  value: unknown,
  isChannelId: (id: string) => boolean,
): SubscriptionFailure[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((item): item is SubscriptionFailure => {
      if (!item || typeof item !== 'object') return false;
      const { channelId, reason } = item;
      if (
        typeof channelId !== 'string' ||
        !isChannelId(channelId) ||
        seen.has(channelId)
      )
        return false;
      if (!['timeout', 'network', 'unavailable'].includes(reason)) return false;
      seen.add(channelId);
      return true;
    })
    .map(({ channelId, reason }) => ({ channelId, reason }));
}

export type SubscriptionFailureContext = Pick<
  BaseAppState,
  'isSeriesMode' | 'isScrapMode' | 'seriesChannels' | 'subscriptionFailures'
>;

/** Return failures belonging to the active subscription feed channels. */
export function activeSubscriptionFailures(
  context: SubscriptionFailureContext,
): SubscriptionFailure[] {
  if (!context.isSeriesMode || context.isScrapMode) return [];
  return context.subscriptionFailures.filter((failure) =>
    context.seriesChannels.includes(failure.channelId),
  );
}
