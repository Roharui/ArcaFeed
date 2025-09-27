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
) {
  constructor() {
    super();
    this.init();
  }

  init() {
    // 현재 페이지 상태 정보 가져오기
    const [mode, channelId, articleId] = this.checkPageMode(location.href);

    this.mode = mode;
    this.channelId = channelId;
    this.articleId = articleId;

    this.loadConfig();
    this.initLink();

    this.initHide();
    this.initHelperBtn();

    this.initSlide();

    this.initEvent();
    this.initPromise();
  }
}

export default Helper;
