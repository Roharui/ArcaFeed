declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module 'toastify-js' {
  type ToastifyPosition = 'left' | 'center' | 'right';
  type ToastifyGravity = 'top' | 'bottom';

  interface ToastifyOptions {
    text?: string;
    duration?: number;
    selector?: string;
    gravity?: ToastifyGravity;
    position?: ToastifyPosition;
    close?: boolean;
    stopOnFocus?: boolean;
    callback?: () => void;
    onClick?: () => void;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
  }

  interface ToastifyInstance {
    showToast(): void;
    hideToast(): void;
  }

  export default function Toastify(options: ToastifyOptions): ToastifyInstance;
}
