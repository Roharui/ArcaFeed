/**
 * ArcaFeed Sample Plugin — Core Logic
 *
 * Demonstrates plugin registration and enable/disable support.
 * Exported for use in both standalone and bundled builds.
 */

function isPluginEnabled(): boolean {
  try {
    const raw = localStorage.getItem('arcaFeed:pluginSettings');
    if (!raw) return true;
    const settings = JSON.parse(raw);
    return settings.sample !== false;
  } catch {
    return true;
  }
}

function register(): void {
  const bridge = (window as any).__arcaFeed;
  if (!bridge) return;
  if (!bridge.plugins) bridge.plugins = [];
  bridge.plugins.push({
    id: 'sample',
    name: '샘플 플러그인',
    description: 'EventBus API 사용법을 보여주는 예제 플러그인입니다.',
  });
}

export function initSamplePlugin(): void {
  register();

  if (!isPluginEnabled()) {
    console.log('[Sample Plugin] Disabled, skipping.');
    return;
  }

  console.log('[Sample Plugin] Loaded!');

  const bus = (window as any).__arcaFeed?.eventBus;
  if (!bus) {
    console.warn('[Sample Plugin] ArcaFeed eventBus not available.');
    return;
  }

  bus.on('init', () => {
    console.log('[Sample Plugin] ArcaFeed init event received!');
  });

  bus.on('renderNextPage', () => {
    console.log('[Sample Plugin] Next page rendered!');
  });

  bus.on('enableSeries', () => {
    console.log('[Sample Plugin] Series mode enabled!');
  });

  bus.on('showModal', () => {
    console.log('[Sample Plugin] Modal shown!');
  });

  bus.on('closeModal', () => {
    console.log('[Sample Plugin] Modal closed!');
  });
}
