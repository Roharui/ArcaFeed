import { Classes } from 'src/utils/classes';
import { RegexManager } from './regex';
import { LinkManager } from './link';
import { HideManager } from './hider';
import { ButtonManager } from './button';
import { PromiseManager } from './promise';
import { SlideManager } from './slide';
import { ConfigManager } from './config';
import { ModalManager } from './modal';
import { ConsoleManager } from './console';
import { PageManager } from './page';
import { FetchManager } from './fetch';

class Helper extends Classes(
  ButtonManager,
  RegexManager,
  LinkManager,
  HideManager,
  PromiseManager,
  SlideManager,
  ConfigManager,
  ModalManager,
  ConsoleManager,
  PageManager,
  FetchManager,
) {
  constructor() {
    super();
  }

  init() {
    this.addNextPromise([
      this.initPageMode,
      this.loadConfig,
      this.initHelperBtn,
      this.initSlide,
      this.initLink,
      this.doHide,
      this.initEvent,
    ]);
  }

  initEvent() {
    $(document).on('keydown', (e) => {
      if (e.key === 'ArrowRight')
        this.mode === 'ARTICLE'
          ? this.swiper.slideNext()
          : this.nextLinkForce();
      if (e.key === 'ArrowLeft') this.swiper.slidePrev();
    });
  }
}

export default Helper;
