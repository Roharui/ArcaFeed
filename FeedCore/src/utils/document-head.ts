/** Wait for the parser to insert a head at document-start. */
export function waitForHead(): Promise<void> | undefined {
  if (document.head) return;
  return new Promise((resolve) => {
    let root: HTMLElement | null = null;
    const check = () => {
      if (document.head) {
        observer.disconnect();
        resolve();
        return;
      }
      const nextRoot = document.documentElement;
      if (nextRoot === root) return;
      root = nextRoot;
      observer.disconnect();
      observer.observe(document, { childList: true });
      if (root) observer.observe(root, { childList: true });
    };
    const observer = new MutationObserver(check);
    observer.observe(document, { childList: true });
    check();
  });
}
