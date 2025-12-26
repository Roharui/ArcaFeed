import type { ArticleFilterConfigImpl, ConfigImpl } from '@/types';

class Config implements ConfigImpl {
  seriesList: string[] = [];
  articleList: string[] = [];
  articleFilterConfig: ArticleFilterConfigImpl = {};

  searchQuery: string = '';

  constructor() {
    this.loadConfig();
  }

  resetArticleList() {
    this.seriesList = [];
    this.articleList = [];
  }

  loadConfig(): void {
    const articleFilterConfigStr = localStorage.getItem('articleFilterConfig');

    this.articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};

    const articleListStr = localStorage.getItem('articleList');
    this.articleList = articleListStr ? JSON.parse(articleListStr) : [];

    const seriesListStr = localStorage.getItem('seriesList');
    this.seriesList = seriesListStr ? JSON.parse(seriesListStr) : [];

    this.searchQuery = localStorage.getItem('searchQuery') || '';
  }

  saveConfig(): void {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleList', JSON.stringify(this.articleList));
    localStorage.setItem('seriesList', JSON.stringify(this.seriesList));

    localStorage.setItem('searchQuery', this.searchQuery);
  }
}

export { Config };
