/** Manage only the topmost Feed dialog; leave inner editors their Escape key. */
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
    const dialogs = document.querySelectorAll<HTMLElement>(
      '.helper-modal [aria-modal="true"]',
    );
    for (let index = dialogs.length - 1; index >= 0; index--) {
      const dialog = dialogs[index]!;
      if (dialog.getClientRects().length > 0) return dialog === root;
    }
    return false;
  };
  const controls = () => {
    let checkedNames: Set<string> | undefined;
    const items: HTMLElement[] = [];
    const candidates = root.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]',
    );
    for (let index = 0; index < candidates.length; index++) {
      const element = candidates[index]!;
      if (
        element.tabIndex < 0 ||
        element.matches(':disabled') ||
        element.closest('[hidden], [inert], [aria-hidden="true"]') ||
        element.getClientRects().length === 0 ||
        getComputedStyle(element).visibility === 'hidden'
      )
        continue;
      if (
        element instanceof HTMLInputElement &&
        element.type === 'radio' &&
        !element.checked
      ) {
        // Include hidden checked radios to keep the existing group behavior.
        if (!checkedNames) {
          checkedNames = new Set();
          root
            .querySelectorAll<HTMLInputElement>('input[type="radio"]')
            .forEach((radio) => {
              if (radio.checked) checkedNames!.add(radio.name);
            });
        }
        if (checkedNames.has(element.name)) continue;
      }
      items.push(element);
    }
    return items;
  };
  root.tabIndex = -1;
  const focusFirst = () =>
    (controls()[0] ?? root).focus({ preventScroll: true });
  const onKey = (event: KeyboardEvent) => {
    if (
      (event.key !== 'Escape' && event.key !== 'Tab') ||
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      !isTop()
    )
      return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
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
    if (event.target instanceof Node && !root.contains(event.target) && isTop())
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
