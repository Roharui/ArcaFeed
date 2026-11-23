import { createKeyEventInit } from '@feed/core/feature/key-event';
import { eventBus } from '@/core/app-events';
import type { VaultAdapter } from '@/vault';

export const initEvent = createKeyEventInit<VaultAdapter>({
  panelSelector: '#dialog, .arcafeed-navigation-panel',
  emit: (event) => eventBus.emit(event),
});
