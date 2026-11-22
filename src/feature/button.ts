import { eventBus } from '@/core/app-events';
import { createElement, fromTemplate, setAttributes } from '@/utils/dom';
import type { VaultAdapter } from '@/vault';

const SWIPE_ICON =
  '<svg class="rulifeed-control-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/><path d="M3 12h18"/><path class="rulifeed-swipe-slash" d="M4 4l16 16"/></svg>';

const SETTINGS_ICON =
  '<svg class="rulifeed-control-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

export interface FloatingControlButtons {
  buttons: HTMLButtonElement[];
  update: () => void;
}

export function createFloatingControlButtons(
  p: VaultAdapter,
  options?: {
    onSettingsOpen?: () => void;
    shouldSuppressClick?: (event: Event) => boolean;
  },
): FloatingControlButtons {
  const buttons: HTMLButtonElement[] = [];
  let toggle: HTMLButtonElement | undefined;

  if (p.isCurrentMode('CHANNEL', 'ARTICLE')) {
    toggle = createElement(
      'button',
      {
        type: 'button',
        class:
          'rulifeed-control-button rulifeed-swipe-toggle swiper-no-swiping',
        'aria-label': '스와이프 전환',
      },
      fromTemplate(SWIPE_ICON),
      createElement('span', {
        class: 'rulifeed-control-label',
        text: '스와이프',
      }),
    );
    toggle.addEventListener('click', (event) => {
      if (options?.shouldSuppressClick?.(event)) return;
      void eventBus.emit('toggleSwiper');
    });
    buttons.push(toggle);
  }

  const settings = createElement(
    'button',
    {
      type: 'button',
      class:
        'rulifeed-control-button rulifeed-settings-trigger swiper-no-swiping',
      'aria-label': '루리피드 설정',
      title: '루리피드 설정',
    },
    fromTemplate(SETTINGS_ICON),
    createElement('span', { class: 'rulifeed-control-label', text: '설정' }),
  );
  settings.addEventListener('click', (event) => {
    if (options?.shouldSuppressClick?.(event)) return;
    options?.onSettingsOpen?.();
    void eventBus.emit('showModal');
  });
  buttons.push(settings);

  const update = () => {
    if (!toggle) return;
    const visible = !p.isSeriesMode;
    toggle.hidden = !visible;
    const enabled = !p.articleFilterConfig[p.href.channelId]?.disableSwiper;
    toggle.classList.toggle('is-active', enabled);
    setAttributes(toggle, {
      'aria-pressed': String(enabled),
      title: enabled
        ? '스와이프 켜짐 · 클릭하여 끄기'
        : '스와이프 꺼짐 · 클릭하여 켜기',
    });
  };
  update();

  return { buttons, update };
}
