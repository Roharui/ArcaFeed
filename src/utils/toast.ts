import Toastify from 'toastify-js';

type ToastInstance = ReturnType<typeof Toastify>;

let activeToast: ToastInstance | null = null;
let activeToastToken = 0;

function showToast(message: string, duration: number = 2500): void {
  const toastToken = ++activeToastToken;

  if (activeToast !== null) {
    activeToast.hideToast();
    activeToast = null;
  }

  activeToast = Toastify({
    text: message,
    duration,
    gravity: 'bottom',
    position: 'center',
    stopOnFocus: false,
    close: false,
    style: {
      background: 'rgba(20, 20, 20, 0.92)',
      borderRadius: '999px',
      color: '#fff',
      fontSize: '0.95rem',
      lineHeight: '1.2',
      letterSpacing: '-0.01em',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      padding: '10px 14px',
    },
    callback: () => {
      if (activeToastToken === toastToken) {
        activeToast = null;
      }
    },
  });

  activeToast.showToast();
}

export { showToast };
