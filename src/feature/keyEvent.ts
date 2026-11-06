import { eventBus } from '@/core/app-events';
import type { AppEvent } from '@/core/app-events';

import type { VaultAdapter } from '@/vault';

const MODE_KEY_EVENTS: Record<string, Record<string, AppEvent>> = {
  CHANNEL: { ArrowRight: 'toNextLinkForce' },
  ARTICLE: { ArrowRight: 'toNextPage', ArrowLeft: 'toPrevPage' },
};

const initializedVaults = new WeakSet<VaultAdapter>();

const initEvent = (p: VaultAdapter) => {
  const events = MODE_KEY_EVENTS[p.href.mode];
  if (!events || initializedVaults.has(p)) return;
  initializedVaults.add(p);
  document.addEventListener('keydown', (event) => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.repeat ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (document.querySelector('#dialog, .arcafeed-navigation-panel')) return;
    const targets = event.composedPath?.() ?? [event.target];
    if (
      targets.some(
        (target) =>
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest(
              'input, textarea, select, [role="textbox"], [role="combobox"], [role="searchbox"]',
            )),
      )
    )
      return;
    const nextEvent = events[event.key];
    if (!nextEvent) return;
    if (p.isCurrentMode('CHANNEL') && !p.isNextPageActive()) return;
    if (
      p.isCurrentMode('ARTICLE') &&
      (!p.swiper?.enabled || p.swiper.animating)
    )
      return;
    event.preventDefault();
    void eventBus.emit(nextEvent);
  });
};

export { initEvent };
