// Vault

import { Vault } from './vault';

export class ConfigManager extends Vault {
  clearArticle() {
    this.articleList = [];
  }

  toggleSlideMode() {
    if (this.slideMode === 'REFRESH') {
      this.slideMode = 'RENDER';
    } else {
      this.slideMode = 'REFRESH';
    }
    this.saveConfig();
  }

  loadConfig() {
    const articleFilterConfig = localStorage.getItem('articleFilterConfig');
    if (articleFilterConfig) {
      this.articleFilterConfig = JSON.parse(articleFilterConfig) || {};
    }
    const articleList = localStorage.getItem('articleList');
    if (articleList) {
      this.articleList = JSON.parse(articleList) || [];
    }
    const slideMode = localStorage.getItem('slideMode');
    if (slideMode) {
      this.slideMode = slideMode;
    }
  }

  saveConfig() {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleList', JSON.stringify(this.articleList));
    localStorage.setItem('slideMode', this.slideMode);
  }
}
