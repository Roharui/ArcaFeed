import $ from 'jquery';

import type { Param, VaultWithSwiper } from '@/vault';

import { nextLinkForce } from '@/feature/swiper';

function initEvent({ v }: Param): void {
  const vault = v as VaultWithSwiper;
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight' && v.isCurrentMode('CHANNEL'))
      nextLinkForce({ v } as Param);
    else if (e.key === 'ArrowRight' && v.isCurrentMode('ARTICLE'))
      vault.swiper.slideNext();
    else if (e.key === 'ArrowLeft' && v.isCurrentMode('ARTICLE'))
      vault.swiper.slidePrev();
  });
}

export { initEvent };
