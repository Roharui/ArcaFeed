const DEFAULT_CONFIG = {
  pageFilter: {},
  viewer: {
    fitScreen: false,
    defaultStart: false,
    hideOriImg: false,
  },
  btn: {
    nextBtn: true,
    navExpand: true,
  },
};

class VaultBase {
  constructor() {
    const configJSON = localStorage.getItem('aralive_helper_config');
    this.config = configJSON ? JSON.parse(configJSON) : { ...DEFAULT_CONFIG };
  }

  // === interface
  isViewerActive() {}
  setPageUrl() {}
  // ===

  getEventType() {
    if (this.isViewerActive()) return 'VIEWER';
    return 'DEFAULT';
  }

  getPageFilter(channelId) {
    if ((!channelId) in this.config.pageFilter) return;
    return this.config.pageFilter[channelId];
  }

  setPageFilter(channelId, pageFilter) {
    this.config.pageFilter[channelId] = pageFilter;
    this.setPageUrl();
    this.saveConfig();
  }

  setConfig(type, config) {
    this.config[type] = Object.assign(this.config[type], config);
    this.saveConfig();
  }

  saveConfig() {
    localStorage.setItem('aralive_helper_config', JSON.stringify(this.config));
  }
}

export { VaultBase };
