import { Config } from './config';

import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

class Vault extends Config {
  href: HrefImpl = {
    mode: 'NOT_CHECKED',
    channelId: '',
    articleId: '',
    articleKey: '',
    search: '',
  };

  activeIndex: number = -1;

  swiper: Swiper | null = null;

  constructor() {
    super();
  }

  isCurrentMode(...mode: HrefImpl['mode'][]): boolean {
    return mode.includes(this.href.mode);
  }

  isNextPageActive(): boolean {
    return this.activeIndex < this.articleList.length - 1;
  }

  isPrevPageActive(): boolean {
    return this.activeIndex > 0;
  }

  saveLastActiveIndex(): void {
    this.setStorageItem('lastActiveIndex', this.activeIndex.toString());
  }
}

export { Vault };
