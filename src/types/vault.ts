type PageMode = 'NEXT' | 'PREV';

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

export type { HrefImpl, ArticleFilterConfigImpl, ArticleFilterImpl, PageMode };
