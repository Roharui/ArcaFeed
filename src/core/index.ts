import { PromiseManager } from '@/core/promise';

import { Config, Vault } from '@/vault';

import { SlideManager } from '@/feature/swiper';
import { LinkManager } from '@/feature/article';
import { checkPageMode } from '@/feature/regex';
import { doHide } from '@/feature/hider';

class Helper {
  vault: Vault;
  config: Config;

  promise: PromiseManager;
  link: LinkManager;
  slide: SlideManager;

  constructor() {
    this.vault = new Vault();
    this.config = new Config();

    this.promise = new PromiseManager();
    this.link = new LinkManager(this.vault, this.config);
    this.slide = new SlideManager(this.vault, this.config)
  }

  async init() {
    this.promise.addNextPromise([
      checkPageMode(),
      this.slide.init(),
      doHide('Article'),
      this.link.init(),
      () => this.config.saveConfig()
    ]);

    this.vault = await this.promise.initPromise(this.vault)
  }
}

export { Helper };
