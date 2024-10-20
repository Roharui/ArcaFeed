import { initConfigModal, nextPageConfigModal } from '@src/utils/modal';
import { toPage } from '@src/utils/toPage';

const CONTROL_KEYBORD_EVENT = {
  p: () => initConfigModal(),
  o: () => nextPageConfigModal(),
};

const KEYBORD_EVENT = {
  ArrowLeft: () => toPage(false),
  ArrowRight: () => toPage(true),
};

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT };
