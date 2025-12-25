type ArticleShowMode = 'Article' | 'Comment';
type PageMode = 'NEXT' | 'PREV' | 'ALL';

interface HrefImpl {
  mode: 'HOME' | 'CHANNEL' | 'ARTICLE' | 'OTHER' | 'NOT_CHECKED';
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
}

export type {
  ArticleShowMode,
  HrefImpl,
  ArticleFilterConfigImpl,
  ArticleFilterImpl,
  ConfigImpl,
  PageMode,
};
