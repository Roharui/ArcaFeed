
import $ from 'jquery'

import type { Param } from '@/vault';

function initEvent({ v }: Param): void {

  $(document).on('keydown', (e) => {
    // TODO: add Next Link Force

    //if (e.key === 'ArrowRight' && v.isCurrentMode('CHANNEL')) nextLinkForce();
    // else 
    if (e.key === 'ArrowRight' && v.isCurrentMode('ARTICLE')) v.swiper?.slideNext();
    else if (e.key === 'ArrowLeft' && v.isCurrentMode('ARTICLE')) v.swiper?.slidePrev()
  })

}

export { initEvent }
