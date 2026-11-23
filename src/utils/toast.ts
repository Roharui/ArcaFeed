import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import '@css/toast.css';
import { createToast } from '@feed/core/utils/toast';

export const { showToast, showConfirmToast } = createToast({
  toastify: Toastify,
  classPrefix: 'arcafeed',
});
