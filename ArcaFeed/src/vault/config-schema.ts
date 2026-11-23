import {
  normalizeFiltersWith,
  normalizeUISettingsWith,
  stringList,
} from '@feed/core/vault/config-schema';
import type {
  ArticleFilterConfigImpl,
  UISettings,
} from '@feed/core/types/vault';
import { isChannelId } from './record-schema';

export { stringList };

export function normalizeFilters(value: unknown): ArticleFilterConfigImpl {
  return normalizeFiltersWith(value, isChannelId);
}

const ARCA_UI_OPTIONS = {
  skipVisitedContextPattern:
    /^(home|scrap|channel:[a-zA-Z0-9]+|series:[a-zA-Z0-9_-]+)$/,
  allowedModalTabs: ['filter', 'ui', 'subscribe', 'history', 'resume'] as const,
};

export function normalizeUISettings(value: unknown): UISettings {
  return normalizeUISettingsWith(value, ARCA_UI_OPTIONS);
}

export function normalizeArticles(value: unknown, origin: string): string[] {
  if (!Array.isArray(value)) return [];
  let canonicalOrigin = false;
  try {
    canonicalOrigin = new URL(origin).origin === origin;
  } catch {
    return [];
  }
  const articles = new Set<string>();
  for (const href of value) {
    if (typeof href !== 'string') continue;
    // Native records normally contain validated, origin-relative pathnames.
    // Check those directly; retain URL resolution for older/external input.
    if (canonicalOrigin && /^\/b\/[a-zA-Z0-9]+\/\d+\/?(?![\s\S])/.test(href)) {
      articles.add(href.endsWith('/') ? href.slice(0, -1) : href);
      continue;
    }
    try {
      const url = new URL(href, origin);
      if (
        url.origin === origin &&
        /^\/b\/[a-zA-Z0-9]+\/\d+\/?$/.test(url.pathname)
      )
        articles.add(url.pathname.replace(/\/$/, ''));
    } catch {
      // Ignore malformed stored links.
    }
  }
  return [...articles];
}
