import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import '@css/toast.css';

type ToastInstance = ReturnType<typeof Toastify>;
type ToastOptions = Parameters<typeof Toastify>[0];

let activeToast: ToastInstance | null = null;
let activeToastToken = 0;
let activeDismiss: (() => void) | undefined;

function displayToast(options: ToastOptions, onDismiss?: () => void): void {
  const previousToast = activeToast;
  const previousDismiss = activeDismiss;
  activeToast = null;
  activeDismiss = undefined;
  previousDismiss?.();
  previousToast?.hideToast();
  const toastToken = ++activeToastToken;

  activeDismiss = onDismiss;
  activeToast = Toastify({
    gravity: 'bottom',
    position: 'center',
    stopOnFocus: false,
    close: false,
    ...options,
    style: {
      background: 'rgba(20, 20, 20, 0.92)',
      borderRadius: '999px',
      color: '#fff',
      fontSize: '0.95rem',
      lineHeight: '1.2',
      letterSpacing: '-0.01em',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      padding: '10px 14px',
      ...options.style,
    },
    callback: () => {
      if (activeToastToken === toastToken) {
        activeToast = null;
        activeDismiss = undefined;
      }
      onDismiss?.();
    },
  });

  activeToast.showToast();
}

function showToast(message: string, duration: number = 2500): void {
  displayToast({ text: message, duration });
}

function showConfirmToast(
  message: string,
  confirmLabel = '확인',
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const content = document.createElement('div');
    content.className = 'arcafeed-toast-confirm';
    const text = document.createElement('div');
    text.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'arcafeed-toast-actions';
    let settled = false;
    let toast: ToastInstance | null = null;
    const finish = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', cancel);
      if (activeToast === toast) {
        activeToast = null;
        activeDismiss = undefined;
        toast?.hideToast();
      }
      resolve(accepted);
    };
    const cancel = () => finish(false);
    for (const [label, accepted] of [
      [confirmLabel, true],
      ['취소', false],
    ] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = accepted ? 'arcafeed-toast-primary' : '';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        finish(accepted);
      });
      actions.append(button);
    }
    content.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') cancel();
    });
    content.append(text, actions);
    displayToast(
      {
        node: content,
        duration: -1,
        className: 'arcafeed-toast-with-actions',
        style: { borderRadius: '12px', padding: '16px' },
      },
      cancel,
    );
    toast = activeToast;
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export { showToast, showConfirmToast };
