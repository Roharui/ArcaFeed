import type { ArticleFilterConfigImpl, ConfigImpl } from '@/types';

class Config implements ConfigImpl {
  articleList: string[] = [];
  articleFilterConfig: ArticleFilterConfigImpl = {};

  seriesName: string = '';
  searchQuery: string = '';

  constructor() {
    this.loadConfig();
  }

  resetArticleList() {
    this.seriesName = '';
    this.articleList = [];
  }

  loadConfig(): void {
    const articleFilterConfigStr = localStorage.getItem('articleFilterConfig');
    const articleListStr = localStorage.getItem('articleList');

    this.articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};
    this.articleList = articleListStr ? JSON.parse(articleListStr) : [];

    this.searchQuery = localStorage.getItem('searchQuery') || '';
    this.seriesName = localStorage.getItem('seriesName') || '';
  }

  saveConfig(): void {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleList', JSON.stringify(this.articleList));
    localStorage.setItem('searchQuery', this.searchQuery);
    localStorage.setItem('seriesName', this.seriesName);
  }
}

export { Config };
