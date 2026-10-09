import type { ArticleFilterConfigImpl, UISettings } from '@/types';
import { createInitialState } from './store';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === 'string'),
        ),
      ]
    : [];
}

export function normalizeFilters(value: unknown): ArticleFilterConfigImpl {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([channel, filter]) =>
          /^[a-zA-Z0-9]+$/.test(channel) && isRecord(filter),
      )
      .map(([channel, raw]) => {
        const filter = raw as Record<string, unknown>;
        return [
          channel,
          {
            tab: stringList(filter.tab),
            title: stringList(filter.title),
            disableSwiper: filter.disableSwiper === true,
            onlyBest: filter.onlyBest === true,
            ...(typeof filter.channelName === 'string'
              ? { channelName: filter.channelName }
              : {}),
          },
        ];
      }),
  );
}

export function normalizeUISettings(value: unknown): UISettings {
  const settings = createInitialState().uiSettings;
  if (!isRecord(value)) return settings;
  const booleanKeys = [
    'hideScrollbar',
    'hideBlur',
    'hideNavControl',
    'hideArticleTitle',
    'hideArticleAuthor',
    'hideArticleTime',
    'hideArticleView',
    'showVisitedIndicators',
    'skipVisitedArticles',
  ] as const;
  for (const key of booleanKeys) {
    if (typeof value[key] === 'boolean') settings[key] = value[key];
  }
  // Preserve preferences saved by the earlier read-status implementation.
  if (
    typeof value.showVisitedIndicators !== 'boolean' &&
    typeof value.showReadIndicators === 'boolean'
  ) {
    settings.showVisitedIndicators = value.showReadIndicators;
  }
  if (
    typeof value.skipVisitedArticles !== 'boolean' &&
    typeof value.skipReadArticles === 'boolean'
  ) {
    settings.skipVisitedArticles = value.skipReadArticles;
  }
  if (
    value.lastModalTab === 'filter' ||
    value.lastModalTab === 'ui' ||
    value.lastModalTab === 'subscribe' ||
    value.lastModalTab === 'history' ||
    value.lastModalTab === 'resume'
  ) {
    settings.lastModalTab = value.lastModalTab;
  }
  settings.hiddenChannels = stringList(value.hiddenChannels);
  settings.homeSeriesChannels = stringList(value.homeSeriesChannels);
  if (
    typeof value.contentWidth === 'number' &&
    Number.isFinite(value.contentWidth)
  ) {
    settings.contentWidth = Math.min(
      1400,
      Math.max(700, Math.round(value.contentWidth)),
    );
  }
  return settings;
}

export function normalizeArticles(value: unknown, origin: string): string[] {
  const articles = stringList(value).flatMap((href) => {
    try {
      const url = new URL(href, origin);
      return url.origin === origin &&
        /^\/b\/[a-zA-Z0-9]+\/\d+\/?$/.test(url.pathname)
        ? [url.pathname.replace(/\/$/, '')]
        : [];
    } catch {
      return [];
    }
  });
  return [...new Set(articles)];
}
