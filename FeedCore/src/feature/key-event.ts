import type { HrefImpl } from '../types/vault';

export type KeyNavEvent = 'toNextLinkForce' | 'toNextPage' | 'toPrevPage';

export interface KeyEventVault {
  href: Pick<HrefImpl, 'mode'>;
  isCurrentMode(...modes: HrefImpl['mode'][]): boolean;
  isNextPageActive(): boolean;
  swiper?: { enabled: boolean; animating: boolean } | null;
}

export interface CreateKeyEventOptions {
  panelSelector: string;
  emit: (event: KeyNavEvent) => unknown;
}

const MODE_KEY_EVENTS: Record<string, Record<string, KeyNavEvent>> = {
  CHANNEL: { ArrowRight: 'toNextLinkForce' },
  ARTICLE: { ArrowRight: 'toNextPage', ArrowLeft: 'toPrevPage' },
};

export function createKeyEventInit<TVault extends KeyEventVault>({
  panelSelector,
  emit,
}: CreateKeyEventOptions): (p: TVault) => void {
  const initializedVaults = new WeakSet<TVault>();

  return (p: TVault) => {
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
      if (document.querySelector(panelSelector)) return;
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
      void emit(nextEvent);
    });
  };
}
