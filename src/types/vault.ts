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

export type { HrefImpl, ArticleFilterConfigImpl, ArticleFilterImpl, PageMode };
