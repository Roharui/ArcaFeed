export class ConfigManager {
  articleFilterConfig = {};

  loadConfig() {
    const articleFilterConfig = localStorage.getItem('articleFilterConfig');
    if (articleFilterConfig) {
      this.articleFilterConfig = JSON.parse(articleFilterConfig) || {};
    }
  }
  saveConfig() {
    localStorage.setItem(
      'articleFilterConfig',
      JSON.stringify(this.articleFilterConfig),
    );
  }
}
