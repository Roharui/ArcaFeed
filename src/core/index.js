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
    this.promiseList.push(() => this.initPageMode(window.location.href));
    this.promiseList.push(this.initHelperBtn);

    this.promiseList.push(this.loadConfig);

    this.promiseList.push(this.initSlide);

    this.promiseList.push(this.initLink);
    this.promiseList.push(() => this.doHide('Article'));

    this.promiseList.push(this.initEvent);
    this.promiseList.push(this.saveConfig);

    setTimeout(() => this.initPromise(), 100);
  }
}

export default Helper;
