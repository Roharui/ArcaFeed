import type { HrefImpl } from '@/types';
import type { Swiper } from '@swiper/types';

class Vault {
  href: HrefImpl = {
    mode: 'NOT_CHECKED',
    channelId: '',
    articleId: '',
    search: '',
  };

  activeIndex: number = -1;

  swiper: Swiper | null = null;

  isCurrentMode(...mode: HrefImpl['mode'][]): boolean {
    return mode.includes(this.href.mode);
  }
}

type VaultFull = Vault & {
  swiper: Swiper;
};

export { Vault };
export type { VaultFull };
