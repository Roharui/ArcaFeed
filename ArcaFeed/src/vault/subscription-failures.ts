import {
  activeSubscriptionFailures,
  normalizeSubscriptionFailuresWith,
} from '@feed/core/vault/subscription-failures';
import type { SubscriptionFailure } from '@feed/core/types/vault';
import { isChannelId } from './record-schema';

export { activeSubscriptionFailures };

export function normalizeSubscriptionFailures(
  value: unknown,
): SubscriptionFailure[] {
  return normalizeSubscriptionFailuresWith(value, isChannelId);
}
