import type { UISettings } from '@/types';

export const FILTER_CHANNELS_KEY = 'arcaFeed:filterChannels';
export const channelFilterKey = (id: string): string =>
  `arcaFeed:channelFilter:${id}`;
export const SETTINGS_VERSION_KEY = 'arcaFeed:settingsVersion';
export const LAST_MODAL_TAB_KEY = 'arcaFeed:lastModalTab';
export const SETTINGS_GROUPS: readonly {
  key: string;
  fields: readonly (keyof UISettings)[];
}[] = [
  {
    key: 'arcaFeed:displaySettings',
    fields: [
      'hideScrollbar',
      'hideBlur',
      'hideNavControl',
      'hideArticleTitle',
      'hideArticleAuthor',
      'hideArticleTime',
      'hideArticleView',
      'showVisitedIndicators',
      'contentWidth',
    ],
  },
  {
    key: 'arcaFeed:subscriptionSettings',
    fields: ['hiddenChannels', 'homeSeriesChannels'],
  },
  { key: 'arcaFeed:readingSettings', fields: ['skipVisitedContexts'] },
];
