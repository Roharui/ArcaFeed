import { createReadingContext } from '@feed/core/vault/reading-context';
import { navigationMode } from './navigation-context';

export const { readingPreferenceKey, readingContextLabel } =
  createReadingContext(navigationMode);
