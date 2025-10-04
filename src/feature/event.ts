
import $ from 'jquery'

import { Base } from '@/feature/base'
import type { Config, Vault } from '@/vault'
import type { PageManager } from './swiper'

class EventManager extends Base {
  p: PageManager;

  constructor(v: Vault, c: Config, p: PageManager) {
    super(v, c)
    this.p = p;
  }

  init(): void {
    $(document).on('keydown', (e) => {
      if (e.key === 'ArrowRight' && this.v.isCurrentMode('CHANNEL')) this.p.nextLinkForce();
      else if (e.key === 'ArrowRight' && this.v.isCurrentMode('ARTICLE')) this.v.swiper?.slideNext();
      else if (e.key === 'ArrowLeft' && this.v.isCurrentMode('ARTICLE')) this.v.swiper?.slidePrev()
    })
  }

}

export { EventManager }
