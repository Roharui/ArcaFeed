export class ConfigManager {
  articleFilterConfig = {};
  articleHistory = [];

  loadConfig() {
    const articleFilterConfig = localStorage.getItem('articleFilterConfig');
    if (articleFilterConfig) {
      this.articleFilterConfig = JSON.parse(articleFilterConfig) || {};
    }
    const articleHistory = localStorage.getItem('articleHistory');
    if (articleHistory) {
      this.articleHistory = JSON.parse(articleHistory) || [];
    }
  }
  saveConfig() {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
    localStorage.setItem('articleHistory', JSON.stringify(this.articleHistory));
  }
}
