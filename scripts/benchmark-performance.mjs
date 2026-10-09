import { performance } from 'node:perf_hooks';
import {
  memoryStorage,
  projectRoot,
  sourceLoader,
  vaultFixture,
} from '../tests/source-loader.mjs';

const roots = process.argv.slice(2);
if (roots.length === 0) roots.push(projectRoot);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const root of roots) {
  const load = sourceLoader({
    root,
    globals: { console: { ...console, log() {} } },
    mocks: {
      'toastify-js': { default: () => ({ showToast() {}, hideToast() {} }) },
    },
  });
  const { StorageRepository } = load('src/vault/repository.ts');
  const { ConfigService } = load('src/vault/config.ts');
  const { createInitialState } = load('src/vault/store.ts');
  const storage = memoryStorage();
  const config = new ConfigService(new StorageRepository(storage));
  const state = {
    ...createInitialState(),
    articleKey: 'benchmark',
    articleList: Array.from(
      { length: 5000 },
      (_, index) => `/b/test/${10000 - index}`,
    ),
    activeIndex: 0,
  };
  config.saveConfig(state);
  storage.writes.length = 0;
  let start = performance.now();
  for (let index = 0; index < 1000; index++) config.saveConfig(state);
  const saveTime = performance.now() - start;
  const writes = storage.writes.length;
  const bytes = storage.writes.reduce(
    (sum, entry) => sum + Buffer.byteLength(entry.value),
    0,
  );

  const { mapConcurrent } = load('src/utils/func.ts');
  const channels = Array.from({ length: 8 }, (_, index) => index);
  start = performance.now();
  if (mapConcurrent) await mapConcurrent(channels, async () => delay(80));
  else for (let index = 0; index < channels.length; index++) await delay(80);
  const channelTime = performance.now() - start;

  const p = vaultFixture();
  const fetches = {
    fetchFirstBatch: async () => delay(80),
    filterLink: () => [],
    parseSearchQuery: (vault) => vault,
  };
  const { activateArticleLink } = sourceLoader({
    root,
    globals: { console: { ...console, log() {} } },
    mocks: {
      '@/feature': fetches,
      './fetch': fetches,
      'toastify-js': {},
      '@/feature/filter': fetches,
      '@/feature/search': fetches,
    },
  })('src/feature/article/link.ts');
  start = performance.now();
  await activateArticleLink(p, '100');
  const initTime = performance.now() - start;
  await delay(85);
  console.log(
    JSON.stringify(
      {
        root,
        scenario:
          'synthetic: 5000 article URLs, 1000 unchanged saves, 8 channels at 80ms/request',
        unchangedSavesMs: +saveTime.toFixed(2),
        storageWrites: writes,
        serializedBytes: bytes,
        channelBatchMs: +channelTime.toFixed(2),
        readyNavigationMs: +initTime.toFixed(2),
      },
      null,
      2,
    ),
  );
}
