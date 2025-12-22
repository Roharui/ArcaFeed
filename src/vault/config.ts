import type { ArticleFilterConfigImpl, ConfigImpl, SlideMode } from '@/types';

class Config implements ConfigImpl {
  articleList: string[] = [];
  articleFilterConfig: ArticleFilterConfigImpl = {};

  seriesName: string = '';
  searchQuery: string = '';
  lastSearchedPage: number = 1;

  slideMode: SlideMode;

  constructor() {
    this.slideMode = 'REFRESH';
    this.loadConfig();
  }

  resetArticleList() {
    this.seriesName = '';
    this.articleList = [];
  }

  isSlideMode(mode: SlideMode): boolean {
    return this.slideMode === mode;
  }

  loadConfig(): void {
    const articleFilterConfigStr = localStorage.getItem('articleFilterConfig');
    const articleListStr = localStorage.getItem('articleList');

    this.articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};
    this.articleList = articleListStr ? JSON.parse(articleListStr) : [];

    this.slideMode =
      (localStorage.getItem('slideMode') as 'REFRESH' | 'RENDER') || 'REFRESH';

    this.lastSearchedPage = parseInt(
      localStorage.getItem('lastSearchedPage') || '1',
      10,
    );
    this.searchQuery = localStorage.getItem('searchQuery') || '';
    this.seriesName = localStorage.getItem('seriesName') || '';
  }

  saveConfig(): void {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleList', JSON.stringify(this.articleList));

    localStorage.setItem('lastSearchedPage', this.lastSearchedPage.toString());
    localStorage.setItem('slideMode', this.slideMode);
    localStorage.setItem('searchQuery', this.searchQuery);
    localStorage.setItem('seriesName', this.seriesName);
  }
}

export { Config };
