interface HrefImpl {
  mode: 'HOME' | 'CHANNEL' | 'ARTICLE' | 'OTHER';
  channelId: string;
  articleId: string;
  search: string;
}

interface ArticleFilterImpl {
  [channelId: string]: {
    tab: string[];
    title: string[];
  };
}

interface ConfigImpl {
  articleList: string[];
  articleFilterConfig: ArticleFilterImpl;
  searchQuery: string;
  slideMode: 'REFRESH' | 'RENDER';
}

export type { HrefImpl, ArticleFilterImpl, ConfigImpl };
