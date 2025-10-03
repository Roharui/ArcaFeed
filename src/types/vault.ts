type ArticleShowMode = 'Article' | 'Comment';

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
  slideMode: 'REFRESH' | 'RENDER';
}

export type {
  ArticleShowMode,
  HrefImpl,
  ArticleFilterConfigImpl,
  ArticleF
