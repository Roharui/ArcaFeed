import type { ArticleFilterConfigImpl, ConfigImpl, SlideMode } from '@/types';

class Config implements ConfigImpl {
  articleList: string[] = [];
  articleFilterConfig: ArticleFilterConfigImpl = {};
  seriesName: string = '';
  searchQuery: string = '';
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
    const articleListStr = sessionStorage.getItem('articleList');

    this.articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};
    this.articleList = articleListStr ? JSON.parse(articleListStr) : [];

    this.slideMode =
      (sessionStorage.getItem('slideMode') as 'REFRESH' | 'RENDER') ||
      'REFRESH';

    this.searchQuery = sessionStorage.getItem('searchQuery') || '';
    this.seriesName = sessionStorage.getItem('seriesName') || '';
  }

  saveConfig(): void {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    sessionStorage.setItem('articleList', JSON.stringify(this.articleList));

    sessionStorage.setItem('slideMode', this.slideMode);
    sessionStorage.setItem('searchQuery', this.searchQuery);
    sessionStorage.setItem('seriesName', this.seriesName);
  }
}

export { Config };
