import {
  normalizeFiltersWith,
  normalizeUISettingsWith,
  stringList,
} from '@feed/core/vault/config-schema';
import type {
  ArticleFilterConfigImpl,
  UISettings,
} from '@feed/core/types/vault';
import { normalizeArticlePath } from '@/utils/regex';
import { isChannelId } from './record-schema';

export { stringList };

export function normalizeFilters(value: unknown): ArticleFilterConfigImpl {
  return normalizeFiltersWith(value, isChannelId);
}

const RULI_UI_OPTIONS = {
  skipVisitedContextPattern:
    /^(home|scrap|channel:(?:[a-zA-Z0-9_-]+\/)*board\/\d+|series:[a-zA-Z0-9_-]+)$/,
  allowedModalTabs: ['filter', 'history'] as const,
};

export function normalizeUISettings(value: unknown): UISettings {
  return normalizeUISettingsWith(value, RULI_UI_OPTIONS);
}

export function normalizeArticles(value: unknown, origin: string): string[] {
  if (!Array.isArray(value)) return [];
  try {
    new URL(origin);
  } catch {
    return [];
  }
  const articles = new Set<string>();
  for (const href of value) {
    if (typeof href !== 'string') continue;
    const path = normalizeArticlePath(href);
    if (path) articles.add(path);
  }
  return [...articles];
}
