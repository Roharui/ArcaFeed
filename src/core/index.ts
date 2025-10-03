import { PromiseManager } from '@/core/promise';

import { Config, Vault } from '@/vault';

import { PageManager } from '@/feature/swiper';
import { LinkManager } from '@/feature/article';
import { checkPageMode } from '@/feature/regex';
import { doHide } from '@/feature/hider';

class Helper {
  vault: Vault;
  config: Config;

  promise: PromiseManager;
  link: LinkManager;
  page: PageManager;

  constructor() {
    this.vault = new Vault();
    this.config = new Config();

    this.promise = new PromiseManager();
    this.link = new LinkManager(this.vault, this.config);
    this.page = new PageManager(this.vault, this.config, this.link)
  }

  async init() {
    this.promise.addNextPromise([
      checkPageMode(),
      ...this.page.init(),
      doHide('Article'),
      this.link.init(),
      () => this.config.saveConfig()
    ]);

    this.vault = await this.promise.initPromise(this.vault)
  }
}

export { Helper };
