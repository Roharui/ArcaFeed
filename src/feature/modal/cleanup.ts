const cleanups = new WeakMap<Element, () => void>();

export function setDialogCleanup(element: Element, cleanup: () => void): void {
  cleanups.set(element, cleanup);
}

export function disposeDialogElement(element: Element): void {
  const cleanup = cleanups.get(element);
  cleanups.delete(element);
  cleanup?.();
}
