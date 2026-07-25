type PageMode = 'NEXT' | 'PREV';
type SeriesSource = 'none' | 'article' | 'scrap' | 'home';

interface HrefImpl {
  mode: 'HOME' | 'CHANNEL' | 'ARTICLE' | 'SCRAP' | 'OTHER' | 'NOT_CHECKED';
  channelId: string;
  articleId: string;
  articleKey: string;
  search: string;
}

interface ArticleFilterImpl {
  tab: string[];
  title: string[];
  disableSwiper: boolean;
  onlyBest: boolean;
}

interface ArticleFilterConfigImpl {
  [channelId: string]: ArticleFilterImpl;
}

interface HomeSeriesState {
  channels: string[];
  cursors: Record<string, number>;
  exhaustedChannels: string[];
}

interface UISettings {
  hideScrollbar: boolean;
  hideBlur: boolean;
  hideNavControl: boolean;
  hideArticleTitle: boolean;
  hideArticleAuthor: boolean;
  hideArticleTime: boolean;
  hideArticleView: boolean;
  lastModalTab: 'filter' | 'ui' | 'subscribe';
  hiddenChannels: string[];
  contentWidth: number;
}

export type {
  HrefImpl,
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  HomeSeriesState,
  PageMode,
  SeriesSource,
  UISettings,
};
