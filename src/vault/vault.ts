import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

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

  updateFn: () => void = () => {};

  isCurrentMode(...mode: HrefImpl['mode'][]): boolean {
    return mode.includes(this.href.mode);
  }
}

export { Vault };
