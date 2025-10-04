
import $ from 'jquery'

import { Base } from '@/feature/base'
import type { Config, Vault } from '@/vault'

class EventManager extends Base {
  constructor(v: Vault, c: Config) {
    super(v, c)
  }

  init() {
    $(document).on('keypress', (e) => {
      if (e.key === 'ArrowRight') this.v.swiper?.slideNext();
      if (e.key === 'ArrowLeft') this.v.swiper?.slidePrev()
    })
  }

}

export { EventManager }
