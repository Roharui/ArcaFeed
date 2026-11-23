import type { ArticleFilterConfigImpl, UISettings } from '../types/vault';
import { isRecord } from './record-schema';
import { createBaseInitialState } from './store';

export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === 'string'),
        ),
      ]
    : [];
}

export function normalizeFiltersWith(
  value: unknown,
  isChannelId: (id: string) => boolean,
): ArticleFilterConfigImpl {
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

export interface NormalizeUISettingsOptions {
  skipVisitedContextPattern: RegExp;
  allowedModalTabs: readonly UISettings['lastModalTab'][];
}

export function normalizeUISettingsWith(
  value: unknown,
  options: NormalizeUISettingsOptions,
): UISettings {
  const settings = createBaseInitialState().uiSettings;
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
          options.skipVisitedContextPattern.test(entry[0]) &&
          typeof entry[1] === 'boolean',
      ),
    );
  }
  if (
    typeof value.lastModalTab === 'string' &&
    (options.allowedModalTabs as readonly string[]).includes(value.lastModalTab)
  ) {
    settings.lastModalTab = value.lastModalTab as UISettings['lastModalTab'];
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
