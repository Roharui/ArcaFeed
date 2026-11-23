export * from '@feed/core/vault/record-schema';

export const CHANNEL_ID_REGEX = /^[a-zA-Z0-9]+$/;

export function isChannelId(value: string): boolean {
  return CHANNEL_ID_REGEX.test(value);
}
