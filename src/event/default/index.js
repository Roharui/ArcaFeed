import { initConfigModal, nextPageConfigModal } from 'src/utils/modal';
import { toNextPage, toPrevPage } from 'src/utils/toPage';
import { showViewer } from '../viewer';

const CONTROL_KEYBORD_EVENT = {
  p: () => initConfigModal(),
  o: () => nextPageConfigModal(),
};

const KEYBORD_EVENT = {
  ArrowLeft: () => toPrevPage(),
  ArrowRight: () => toNextPage(),
  Shift: () => showViewer(),
};

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT };
