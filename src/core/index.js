import { Classes } from 'src/utils/classes';
import { RegexManager } from './regex';
import { LinkManager } from './link';
import { EventManager } from './event';
import { HideManager } from './hider';
import { ButtonManager } from './button';
import { PromiseManager } from './promise';
import { SlideManager } from './slide';
import { ConfigManager } from './config';
import { ModalManager } from './modal';
import { ConsoleManager } from './console';
import { PageManager } from './page';
import { FetchManager } from './fetch';
import { sleep } from 'src/utils/sleep';

class Helper extends Classes(
  ButtonManager,
  RegexManager,
  LinkManager,
  EventManager,
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
    this.init();
  }

  init() {
    this.addNextPromise([
      () => this.initPageMode(window.location.href),
      this.loadConfig,
      this.initHelperBtn,
      this.initSlide,
      this.initLink,
      this.initHide,
      this.initEvent,
      this.saveConfig,
    ]);
  }
}

export default Helper;
