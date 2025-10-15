type ArticleShowMode = 'Article' | 'Comment';
type SlideMode = 'REFRESH' | 'RENDER';
type PageMode = 'NEXT' | 'PREV' | 'ALL';

interface HrefImpl {
  mode: 'HOME' | 'CHANNEL' | 'ARTICLE' | 'OTHER';
  channelId: string;
  articleId: string;
  search: string;
}

interface ArticleFilterImpl {
  tab: string[];
  title: string[];
}

interface ArticleFilterConfigImpl {
  [channelId: string]: ArticleFilterImpl;
}

interface ConfigImpl {
  articleList: string[];
  articleFilterConfig: ArticleFilterConfigImpl;
  searchQuery: string;
  slideMode: SlideMode;
}

export type {
  ArticleShowMode,
  HrefImpl,
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  ConfigImpl,
  SlideMode,
  PageMode,
};
