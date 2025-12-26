import { Config } from './config';

import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

class Vault extends Config {
  href: HrefImpl = {
    mode: 'NOT_CHECKED',
    channelId: '',
    articleId: '',
    search: '',
  };

  activeIndex: number = -1;
  seriesIndex: number = -1;

  swiper: Swiper | null = null;

  constructor() {
    super();
  }

  isCurrentMode(...mode: HrefImpl['mode'][]): boolean {
    return mode.includes(this.href.mode);
  }

  isSeriesMode(): boolean {
    return this.seriesList.length > 0;
  }

  isNextPageActive(): boolean {
    if (this.isSeriesMode()) {
      return this.seriesIndex < this.seriesList.length - 1;
    }

    return this.activeIndex < this.articleList.length - 1;
  }

  isPrevPageActive(): boolean {
    if (this.isSeriesMode()) {
      return this.seriesIndex > 0;
    }
    return this.activeIndex > 0;
  }

  saveLastActiveIndex(): void {
    localStorage.setItem('lastActiveIndex', this.activeIndex.toString());
  }
}

export { Vault };
