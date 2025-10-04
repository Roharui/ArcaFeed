import { PromiseManager } from '@/core/promise';

import { Config, Vault } from '@/vault';

import { PageManager } from '@/feature/swiper';
import { LinkManager } from '@/feature/article';
import { EventManager } from '@/feature/event';

class Helper {
  vault: Vault;
  config: Config;

  promise: PromiseManager;
  link: LinkManager;
  page: PageManager;
  event: EventManager;

  constructor() {
    this.vault = new Vault();
    this.config = new Config();

    this.promise = new PromiseManager();
    this.link = new LinkManager(this.vault, this.config);
    this.page = new PageManager(this.vault, this.config, this.link, this.promise)
    this.event = new EventManager(this.vault, this.config);
  }

  async init() {
    this.promise.addNextPromise([
      ...this.page.init(),
      this.link.init(),
      () => this.event.init(),
      () => this.config.saveConfig()
    ]);

    this.vault = await this.promise.initPromise(this.vault);
  }
}

export { Helper };
