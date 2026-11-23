import type { UISettings } from '../types/vault';

export const SETTINGS_GROUPS: readonly {
  key: string;
  fields: readonly (keyof UISettings)[];
}[] = [
  {
    key: 'display',
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
    key: 'subscription',
    fields: ['hiddenChannels', 'homeSeriesChannels'],
  },
  { key: 'reading', fields: ['skipVisitedContexts'] },
];
