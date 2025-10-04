import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

import { parseHref } from '@/feature/regex';

class Vault {
  href: HrefImpl = {
    mode: 'OTHER',
    channelId: '',
    articleId: '',
    search: '',
  };

  nextArticleUrl: string | null = null;
  prevArticleUrl: string | null = null;

  swiper: Swiper | null = null;
  currentSlide: HTMLElement | undefined;

  constructor(href?: string) {
    this.href = parseHref(href)
  }

  isCurrentMode(mode: HrefImpl['mode']): boolean {
    return this.href.mode === mode;
  }
}

export { Vault };
