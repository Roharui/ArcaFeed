/** Manage only the topmost ArcaFeed dialog; leave inner editors their Escape key. */
export function installDialogFocus(
  root: HTMLElement,
  close: () => void,
  initial?: HTMLElement | null,
): () => void {
  const previous =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const isTop = () => {
    const dialogs = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.helper-modal [aria-modal="true"]',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    return dialogs[dialogs.length - 1] === root;
  };
  const controls = () =>
    Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]',
      ),
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(':disabled') &&
        !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== 'hidden' &&
        (!(element instanceof HTMLInputElement) ||
          element.type !== 'radio' ||
          element.checked ||
          !Array.from(
            root.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
          ).some((other) => other.name === element.name && other.checked)),
    );
  root.tabIndex = -1;
  const focusFirst = () =>
    (controls()[0] ?? root).focus({ preventScroll: true });
  const onKey = (event: KeyboardEvent) => {
    if (
      !isTop() ||
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229
    )
      return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key !== 'Tab') return;
    const items = controls();
    const first = items[0] ?? root;
    const last = items[items.length - 1] ?? root;
    const current = document.activeElement;
    if (
      !items.length ||
      !root.contains(current) ||
      (event.shiftKey ? current === first : current === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  };
  const onFocus = (event: FocusEvent) => {
    if (isTop() && event.target instanceof Node && !root.contains(event.target))
      focusFirst();
  };
  root.addEventListener('keydown', onKey);
  document.addEventListener('focusin', onFocus);
  (initial ?? controls()[0] ?? root).focus({ preventScroll: true });
  return () => {
    root.removeEventListener('keydown', onKey);
    document.removeEventListener('focusin', onFocus);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
}
