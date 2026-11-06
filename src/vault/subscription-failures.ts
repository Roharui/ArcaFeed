import type { SubscriptionFailure } from '@/types/vault';

/** Stored diagnostics are optional and never trusted as navigation input. */
export function normalizeSubscriptionFailures(
  value: unknown,
): SubscriptionFailure[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((item): item is SubscriptionFailure => {
      if (!item || typeof item !== 'object') return false;
      const { channelId, reason } = item;
      if (
        typeof channelId !== 'string' ||
        !/^[a-zA-Z0-9]+$/.test(channelId) ||
        seen.has(channelId)
      )
        return false;
      if (!['timeout', 'network', 'unavailable'].includes(reason)) return false;
      seen.add(channelId);
      return true;
    })
    .map(({ channelId, reason }) => ({ channelId, reason }));
}
