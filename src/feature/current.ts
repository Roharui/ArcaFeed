import { checkNotNull } from '@/utils';

import type { Vault, VaultFull } from '@/vault';

function getCurrentSlide(v: Vault): Promise<HTMLElement> {
  return new Promise((resolve) => {
    const { swiper } = v as VaultFull;
    swiper.once('update', () => {
      const { slides, activeIndex } = checkNotNull(swiper);
      resolve(checkNotNull(slides[activeIndex]));
    });
    swiper.update();
  });
}

export { getCurrentSlide };
