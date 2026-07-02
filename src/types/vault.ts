type PageMode = 'NEXT' | 'PREV';

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
}

interface ArticleFilterConfigImpl {
  [channelId: string]: ArticleFilterImpl;
}

interface UISettings {
  hideLeftSidebar: boolean;
  hideScrollbar: boolean;
  hideBlur: boolean;
  hideSidebar: boolean;
  hideNavControl: boolean;
  hideArticleTitle: boolean;
  hideArticleAuthor: boolean;
  hideArticleTime: boolean;
  hideArticleView: boolean;
  lastModalTab: 'filter' | 'ui';
  contentWidth: number;
}

export type {
  HrefImpl,
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  PageMode,
  UISettings,
};
