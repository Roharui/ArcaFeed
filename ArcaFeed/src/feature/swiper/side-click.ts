import { createSideClickInstaller } from '@feed/core/feature/swiper/side-click';
import { eventBus } from '@/core/app-events';
import { isNavigating } from '@/feature/navigation';
import type { VaultAdapter } from '@/vault';

export const installSideClick = createSideClickInstaller<VaultAdapter>({
  panelSelector: '#dialog, .arcafeed-navigation-panel',
  contentSelector: '.slide-active .content-wrapper',
  isNavigating,
  emit: (event) => eventBus.emit(event),
});
