import { updateAfterSwipe } from '../swiper/motion';
import type { SwiperLike } from '../swiper/types';

const NAV_CLASS = 'nav-control';
const NAV_SELECTOR = '.nav-control';
const THEME_PROPERTIES = ['border', 'box-shadow', 'font-size'];

/** Position Feed's floating controls around the site's own navigation. */
export function installNavigationPosition(
  control: HTMLElement,
  trigger: HTMLElement | undefined,
  getSwiper: () => SwiperLike | null,
): {
  schedulePosition: (resetBase?: boolean) => void;
  cleanup: () => void;
} {
  // The live collection reflects replaced or reclassified native controls.
  const controls = document.getElementsByClassName(NAV_CLASS);
  const attributes = new Map<Element, MutationObserver>();
  let frame: number | undefined;
  let disposed = false;
  let baseBottom: number | undefined;
  let styledNativeButton: HTMLElement | null = null;

  const resizeObserver =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          removeStaleControls();
          schedulePosition();
        })
      : undefined;
  resizeObserver?.observe(control);

  function removeStaleControls(): void {
    for (const [element, observer] of attributes) {
      if (element.isConnected && element.ownerDocument === document) continue;
      observer.disconnect();
      resizeObserver?.unobserve(element);
      attributes.delete(element);
    }
    if (!styledNativeButton?.isConnected) styledNativeButton = null;
  }

  function position(): void {
    if (disposed) return;
    removeStaleControls();
    if (baseBottom === undefined && control.style.bottom)
      control.style.bottom = '';
    const viewportHeight = window.innerHeight;
    const rect = control.getBoundingClientRect();
    baseBottom ??= viewportHeight - rect.bottom;
    const obstacles: DOMRect[] = [];
    let nativeButton: HTMLElement | null = null;

    for (let index = 0; index < controls.length; index++) {
      const element = controls[index]!;
      if (!attributes.has(element)) {
        const observer = new MutationObserver(() => schedulePosition());
        observer.observe(element, {
          attributes: true,
          attributeFilter: ['class', 'style', 'hidden'],
        });
        attributes.set(element, observer);
        resizeObserver?.observe(element);
      }
      if (trigger && !nativeButton)
        nativeButton = element.querySelector<HTMLElement>('a, button');
      const box = element.getBoundingClientRect();
      if (
        box.width > 0 &&
        box.height > 0 &&
        box.left < rect.right + 12 &&
        box.right > rect.left - 12
      )
        obstacles.push(box);
    }

    obstacles.sort((a, b) => b.top - a.top);
    let top = viewportHeight - baseBottom - rect.height;
    for (const box of obstacles) {
      if (top < box.bottom + 12 && top + rect.height > box.top - 12)
        top = box.top - rect.height - 12;
    }
    const nextBottom = `${viewportHeight - top - rect.height}px`;
    let theme: string[] | undefined;
    if (nativeButton && nativeButton !== styledNativeButton) {
      const style = getComputedStyle(nativeButton);
      theme = THEME_PROPERTIES.map((property) =>
        style.getPropertyValue(property),
      );
    }
    styledNativeButton = nativeButton;

    if (theme && trigger) {
      THEME_PROPERTIES.forEach((property, index) => {
        trigger.style.setProperty(property, theme[index]!);
      });
    }
    if (control.style.bottom !== nextBottom) control.style.bottom = nextBottom;
  }

  function schedulePosition(resetBase = false): void {
    if (disposed) return;
    if (resetBase) baseBottom = undefined;
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      updateAfterSwipe(getSwiper(), position);
    });
  }

  const onResize = () => schedulePosition(true);
  window.addEventListener('resize', onResize);
  const hasNativeControl = (nodes: NodeList): boolean => {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      if (
        node instanceof Element &&
        (node.matches(NAV_SELECTOR) || node.querySelector(NAV_SELECTOR))
      )
        return true;
    }
    return false;
  };
  const bodyObserver = new MutationObserver((records) => {
    const previousSize = attributes.size;
    removeStaleControls();
    if (
      attributes.size !== previousSize ||
      records.some(
        ({ addedNodes, removedNodes }) =>
          hasNativeControl(addedNodes) || hasNativeControl(removedNodes),
      )
    )
      schedulePosition();
  });
  bodyObserver.observe(document.body, { childList: true });
  schedulePosition();

  return {
    schedulePosition,
    cleanup: () => {
      disposed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      bodyObserver.disconnect();
      for (const observer of attributes.values()) observer.disconnect();
      attributes.clear();
      styledNativeButton = null;
      window.removeEventListener('resize', onResize);
    },
  };
}
