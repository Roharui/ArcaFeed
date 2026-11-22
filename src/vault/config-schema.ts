import { normalizeArticlePath } from '@/utils/regex';
import type { ArticleFilterConfigImpl, UISettings } from '@/types';
import { isChannelId, isRecord } from './record-schema';
import { createInitialState } from './store';

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
      .filter(([channel, filter]) => isChannelId(channel) && isRecord(filter))
      .map(([channel, raw]) => {
        const filter = raw as Record<string, unknown>;
        const includeTitle = [
          ...new Set(
            stringList(filter.includeTitle)
              .map((word) => word.trim())
              .filter(Boolean),
          ),
        ];
        return [
          channel,
          {
            tab: stringList(filter.tab),
            title: stringList(filter.title),
            ...(includeTitle.length
              ? {
                  includeTitle,
                  includeMode: filter.includeMode === 'all' ? 'all' : 'any',
                  includeCaseSensitive: filter.includeCaseSensitive === true,
                }
              : {}),
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
  if (isRecord(value.skipVisitedContexts)) {
    settings.skipVisitedContexts = Object.fromEntries(
      Object.entries(value.skipVisitedContexts).filter(
        (entry): entry is [string, boolean] =>
          /^(home|scrap|channel:(?:[a-zA-Z0-9_-]+\/)*board\/\d+|series:[a-zA-Z0-9_-]+)$/.test(
            entry[0],
          ) && typeof entry[1] === 'boolean',
      ),
    );
  }
  if (value.lastModalTab === 'filter' || value.lastModalTab === 'history') {
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
  if (!Array.isArray(value)) return [];
  try {
    new URL(origin);
  } catch {
    return [];
  }
  return [
    ...new Set(
      value.flatMap((href) => {
        const path =
          typeof href === 'string' ? normalizeArticlePath(href) : null;
        return path ? [path] : [];
      }),
    ),
  ];
}
