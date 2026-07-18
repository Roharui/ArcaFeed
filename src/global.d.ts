declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

export {}; // Ensure this file is treated as a module

/** Global bridge for ArcaFeed plugins */
declare global {
  interface Window {
    __arcaFeed?: {
      eventBus: {
        on(event: string, handler: (...args: any[]) => void | Promise<void>): () => void;
        emit(event: string, ...args: any[]): Promise<void>;
        off(event: string, handler?: (...args: any[]) => void | Promise<void>): void;
      };
    };
  }
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
