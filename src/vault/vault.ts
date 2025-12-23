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
  nextRenderSlide: HTMLElement | undefined;

  isCurrentMode(...mode: HrefImpl['mode'][]): boolean {
    return mode.includes(this.href.mode);
  }
}

type VaultFull = Vault & {
  swiper: Swiper;
  nextArticleUrl: string;
  prevArticleUrl: string;
};

export { Vault };
export type { VaultFull };
