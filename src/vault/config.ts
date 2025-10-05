
import type { ArticleFilterConfigImpl, ConfigImpl, SlideMode } from '@/types'

class Config implements ConfigImpl {
  articleList: string[] = [];
  articleFilterConfig: ArticleFilterConfigImpl = {};
  searchQuery: string = '';
  slideMode: SlideMode;

  constructor() {
    this.slideMode = 'REFRESH';
    this.loadConfig()
  }

  resetArticleList() {
    this.articleList = []
  }

  isSlideMode(mode: SlideMode): boolean {
    return this.slideMode === mode;
  }

  loadConfig(): void {
    const articleFilterConfigStr = localStorage.getItem('articleFilterConfig');
    this.articleFilterConfig = articleFilterConfigStr
      ? JSON.parse(articleFilterConfigStr)
      : {};
    const articleListStr = localStorage.getItem('articleList');
    this.articleList = articleListStr ? JSON.parse(articleListStr) : [];
    this.slideMode =
      (localStorage.getItem('slideMode') as 'REFRESH' | 'RENDER') || 'REFRESH';
    this.searchQuery = localStorage.getItem('searchQuery') || '';
  }

  saveConfig(): void {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem(
      'articleList',
      JSON.stringify(this.articleList),
    );
    localStorage.setItem('slideMode', this.slideMode);
    localStorage.setItem('searchQuery', this.searchQuery);
  }
}

export { Config }
