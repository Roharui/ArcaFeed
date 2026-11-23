import {
  cleanQuery,
  createContextKey,
  storedMode,
} from '@feed/core/vault/navigation-record';

export { cleanQuery, storedMode };

export const contextKey = createContextKey((path) => path.split('/')[2] ?? '');
