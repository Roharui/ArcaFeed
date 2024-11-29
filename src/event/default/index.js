import { initConfigModal, nextPageConfigModal } from 'src/feature/modal';
import { showViewer } from '../viewer';
import { toNextPage, toPrevPage } from 'src/feature/toPage';
import { showImage } from 'src/feature/hideImage';
import { webcamSnapToggle } from 'src/feature/webcam';

const CONTROL_KEYBORD_EVENT = {
  p: () => initConfigModal(),
  o: () => nextPageConfigModal(),
  a: () => webcamSnapToggle(),
};

const KEYBORD_EVENT = {
  ArrowLeft: () => toPrevPage(),
  ArrowRight: () => toNextPage(),
  ' ': () => toNextPage(),
  Shift: () => showViewer(),
  '\\': () => showImage(),
};

export { CONTROL_KEYBORD_EVENT, KEYBORD_EVENT };
