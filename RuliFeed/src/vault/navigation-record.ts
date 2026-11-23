import {
  cleanQuery,
  createContextKey,
  storedMode,
} from '@feed/core/vault/navigation-record';
import { parseHref } from '@/utils/regex';

export { cleanQuery, storedMode };

export const contextKey = createContextKey((path) => parseHref(path).channelId);
