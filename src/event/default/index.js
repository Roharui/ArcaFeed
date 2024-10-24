import { initConfigModal, nextPageConfigModal } from 'src/utils/modal';
import { showViewer } from '../viewer';
import { toNextPage, toPrevPage } from 'src/utils/toPage';
import { show } from 'src/utils/jutils';

const CONTROL_KEYBORD_EVENT = {
  p: () => initConfigModal(),
  o: () => nextPageConfigModal(),
};

const KEYBORD_EVENT = {
  ArrowLeft: () => toPrevPage(),
  ArrowRight: () => toNextPage(),
  Shift: () => showViewer(),
  '\\': () => {
    $('.article-content')
      .find('img')
      .not('.twemoji')
      .not('.arca-emoticon')
      .show();
    show('.article-content > p > br');
  },
};

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT };
