// Legacy fixtures/projections live only in tests. Production uses native records.
export function attachRecordCache(storage, load) {
  const { importLegacyRecords } = load('src/vault/record-migration.ts');
  const { equalData } = load('src/vault/record-schema.ts');
  const rows = new Map();
  const arrays = new Map();
  const token = (store, key) => JSON.stringify([store, key]);
  const rebuild = () => {
    rows.clear();
    arrays.clear();
    for (const { store, key, value } of importLegacyRecords(storage.values))
      rows.set(token(store, key), { store, key, value });
    const count = storage.writes.length;
    for (const { store, key, value } of rows.values())
      project(store, key, value);
    storage.writes.length = count;
  };
  const originalSet = storage.setItem.bind(storage);
  const originalRemove = storage.removeItem.bind(storage);
  storage.setItem = (key, value) => {
    originalSet(key, value);
    if (key.startsWith('arcaFeed:') || key === 'arca_version_info') rebuild();
  };
  storage.removeItem = (key) => {
    originalRemove(key);
    if (key.startsWith('arcaFeed:') || key === 'arca_version_info') rebuild();
  };
  const settingKey = (id) =>
    ({
      display: 'arcaFeed:displaySettings',
      subscription: 'arcaFeed:subscriptionSettings',
      reading: 'arcaFeed:readingSettings',
      shuffle: 'arcaFeed:isShuffleMode',
      lastModalTab: 'arcaFeed:lastModalTab',
      versionInfo: 'arca_version_info',
    })[id];
  const legacyKey = (store, key) =>
    store === 'settings'
      ? settingKey(key)
      : store === 'channelFilters'
        ? `arcaFeed:channelFilter:${key}`
        : store === 'resumeSessions'
          ? 'arcaFeed:readingHistory'
          : store === 'lists'
            ? key[0] === 'resume'
              ? `arcaFeed:readingList:${encodeURIComponent(key[1])}`
              : `arcaFeed:${key[1]}:articleList`
            : store === 'progress'
              ? key[0] === 'resume'
                ? 'arcaFeed:readingProgress'
                : `arcaFeed:${key[1]}:lastActiveIndex`
              : undefined;
  const raw = (key, value) => {
    if (storage.values.get(key) === value) return;
    if (value === undefined) storage.values.delete(key);
    else {
      storage.values.set(key, value);
      storage.writes.push({ key, value });
    }
  };
  const all = (store) =>
    [...rows.values()]
      .filter((entry) => entry.store === store)
      .map((entry) => entry.value);
  const legacySummary = (row) => ({
    id: row.id,
    label: row.label,
    ...(row.customName ? { customName: row.customName } : {}),
    ...(row.pinned ? { pinned: true } : {}),
    path: row.path,
    searchQuery: row.query,
    isSeriesMode: row.mode !== 'channel',
    isScrapMode: row.mode === 'scrap',
    seriesChannels: row.channels,
    scrollY: 0,
    updatedAt: row.updatedAt,
    articleCount: row.articleCount,
  });
  const project = (store, key, value) => {
    if (store === 'settings')
      raw(
        settingKey(key),
        value
          ? typeof value.value === 'string'
            ? value.value
            : JSON.stringify(value.value)
          : undefined,
      );
    if (store === 'channelFilters') {
      raw(
        `arcaFeed:channelFilter:${key}`,
        value ? JSON.stringify(value.value) : undefined,
      );
      storage.values.set(
        'arcaFeed:filterChannels',
        JSON.stringify(all(store).map((row) => row.id)),
      );
    }
    if (store === 'navigationSessions') {
      if (!value) {
        for (const suffix of [
          'articleList',
          'seriesMode',
          'scrapMode',
          'seriesChannels',
          'subscriptionFailures',
          'searchQuery',
          'lastActiveIndex',
        ])
          raw(`arcaFeed:${key}:${suffix}`, undefined);
      } else
        for (const [field, item] of Object.entries({
          seriesMode: String(value.mode !== 'channel'),
          scrapMode: String(value.mode === 'scrap'),
          seriesChannels: JSON.stringify(value.channels ?? []),
          subscriptionFailures: JSON.stringify(value.failures ?? []),
          searchQuery: value.query
            ? `${value.query}${value.query.includes('?') ? '&' : '?'}articleKey=${key}`
            : '',
        }))
          raw(`arcaFeed:${key}:${field}`, item);
    }
    if (store === 'lists')
      raw(
        legacyKey(store, key),
        value ? JSON.stringify(value.paths) : undefined,
      );
    if (store === 'resumeSessions')
      raw(
        'arcaFeed:readingHistory',
        JSON.stringify({
          version: 2,
          sessions: all(store)
            .sort(
              (a, b) =>
                b.updatedAt - a.updatedAt ||
                (all('progress').find((row) => row.id === b.id)?.sequence ??
                  0) -
                  (all('progress').find((row) => row.id === a.id)?.sequence ??
                    0),
            )
            .map(legacySummary),
        }),
      );
    if (store === 'progress') {
      if (key[0] === 'resume')
        raw(
          'arcaFeed:readingProgress',
          JSON.stringify(
            all(store)
              .filter((row) => row.kind === 'resume')
              .map(({ id, path, scrollY, updatedAt }) => ({
                id,
                path,
                scrollY,
                updatedAt,
              })),
          ),
        );
      else
        raw(
          legacyKey(store, key),
          value ? String(value.activeIndex) : undefined,
        );
    }
  };
  storage.recordWrites = [];
  storage.get = (store, key) => {
    const legacy = legacyKey(store, key);
    if (legacy) storage.getItem(legacy);
    return rows.get(token(store, key))?.value;
  };
  storage.all = (store) => {
    if (store === 'resumeSessions') storage.getItem('arcaFeed:readingHistory');
    if (store === 'progress') storage.getItem('arcaFeed:readingProgress');
    if (!arrays.has(store)) arrays.set(store, all(store));
    return arrays.get(store);
  };
  storage.set = (store, key, value) => {
    const id = token(store, key);
    if (equalData(rows.get(id)?.value, value)) return;
    const copy = structuredClone(value);
    rows.set(id, { store, key, value: copy });
    arrays.delete(store);
    storage.recordWrites.push({ store, key, value: copy });
    project(store, key, copy);
  };
  storage.delete = (store, key) => {
    const id = token(store, key);
    if (!rows.has(id)) return;
    rows.delete(id);
    arrays.delete(store);
    if (store === 'resumeSessions' || store === 'navigationSessions') {
      const kind = store === 'resumeSessions' ? 'resume' : 'navigation';
      storage.delete('lists', [kind, key]);
      storage.delete('progress', [kind, key]);
    }
    storage.recordWrites.push({ store, key, value: undefined });
    project(store, key, undefined);
  };
  storage.prepare = () => undefined;
  storage.site = (key) => storage.getItem(key);
  rebuild();
  return storage;
}
