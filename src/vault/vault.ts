import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

class Vault {
  href: HrefImpl = {
    mode: 'NOT_CHECKED',
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

type VaultWithSwiper = Vault & { swiper: Swiper; currentSlide: HTMLElement };

export { Vault };
export type { VaultWithSwiper };
