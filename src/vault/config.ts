import type {
  ArticleFilterConfigImpl,
  UISettingArticle,
  UISettingChannel,
} from '@/types';

class Config {
  seriesList: string[] = [];
  articleList: string[] = [];

  articleFilterConfig: ArticleFilterConfigImpl = {};

  articleUiSetting: UISettingArticle = {
    showNavBtn: true,
    showArticleList: true,
  };
  channelUiSetting: UISettingChannel = {};

  searchQuery: string = '';
  lastActiveIndex: number = -1;

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

    const articleUiSettingStr = localStorage.getItem('articleUiSetting');
    if (articleUiSettingStr) {
      this.articleUiSetting = JSON.parse(articleUiSettingStr);
    }

    const channelUiSettingStr = localStorage.getItem('channelUiSetting');
    if (channelUiSettingStr) {
      this.channelUiSetting = JSON.parse(channelUiSettingStr);
    }

    this.searchQuery = localStorage.getItem('searchQuery') || '';
    this.lastActiveIndex = parseInt(
      localStorage.getItem('lastActiveIndex') || '-1',
    );
  }

  saveConfig(): void {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );

    localStorage.setItem(
      'articleUiSetting',
      JSON.stringify(this.articleUiSetting),
    );
    localStorage.setItem(
      'channelUiSetting',
      JSON.stringify(this.channelUiSetting),
    );

    localStorage.setItem('articleList', JSON.stringify(this.articleList));
    localStorage.setItem('seriesList', JSON.stringify(this.seriesList));

    localStorage.setItem('searchQuery', this.searchQuery);
  }
}

export { Config };
