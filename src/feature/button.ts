import { eventBus } from '@/core/app-events';
import { createElement } from '@/utils/dom';
import type { VaultAdapter } from '@/vault';

export function initButton(p: VaultAdapter): void {
  const anchor =
    document.querySelector('#board, #content, main') ??
    document.body.firstElementChild;
  if (!anchor) return;

  const toolbar = createElement('div', {
    class: 'rulifeed-toolbar swiper-no-swiping',
  });
  if (p.isCurrentMode('CHANNEL', 'ARTICLE') && !p.isSeriesMode) {
    const toggle = createElement('button', {
      type: 'button',
      text: '스와이프 전환',
      'aria-pressed': String(
        !p.articleFilterConfig[p.href.channelId]?.disableSwiper,
      ),
    });
    toggle.addEventListener('click', () => void eventBus.emit('toggleSwiper'));
    toolbar.append(toggle);
  }

  const settings = createElement('button', {
    type: 'button',
    text: '루리피드 설정',
  });
  settings.addEventListener('click', () => void eventBus.emit('showModal'));
  toolbar.append(settings);
  anchor.before(toolbar);
}
