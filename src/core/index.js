import { Classes } from 'src/utils/classes';
import { RegexManager } from './regex';
import { LinkManager } from './link';
import { Vault } from './vault';
import { EventManager } from './event';
import { HideManager } from './hider';
import { ButtonManager } from './button';
import { PromiseManager } from './promise';
import { SlideManager } from './slide';
import { ConfigManager } from './config';
import { ModalManager } from './modal';
import { ConsoleManager } from './console';

class Helper extends Classes(
  Vault,
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
      () => this.doHide('Article'),
      this.initEvent,
      this.saveConfig,
    ]);
  }
}

export default Helper;
