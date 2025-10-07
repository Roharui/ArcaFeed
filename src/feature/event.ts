
import $ from 'jquery'

import type { Param } from '@/vault';

import { nextLinkForce } from '@/feature/swiper';

function initEvent({ v }: Param): void {
  $(document).on('keydown', (e) => {
    if (e.key === 'ArrowRight' && v.isCurrentMode('CHANNEL')) nextLinkForce({ v } as Param);
    else if (e.key === 'ArrowRight' && v.isCurrentMode('ARTICLE')) v.swiper?.slideNext();
    else if (e.key === 'ArrowLeft' && v.isCurrentMode('ARTICLE')) v.swiper?.slidePrev()
  })
}

export { initEvent }
