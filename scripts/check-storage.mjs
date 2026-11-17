// Playwright MCP: browser_run_code_unsafe({ filename: "scripts/check-storage.mjs" })
// Uses an isolated browser context; never accesses the arca.live database.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkStorage(page) {
  const baseURL = new URL(page.url()).origin;
  const context = await page.context().browser().newContext();
  const target = await context.newPage();
  try {
    await target.goto(`${baseURL}/fixture`);
    await target.waitForFunction(() => window.storageFixture);
    const result = await target.evaluate(async () => {
      const { IndexedStorage, StorageRepository, ReadingHistory } =
        window.storageFixture;
      const failures = [],
        checks = [];
      const check = (name, condition) => {
        checks.push(name);
        if (!condition) failures.push(name);
      };
      const done = (tx) =>
        new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onabort = () => reject(tx.error);
        });
      const open = (name, upgrade) =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = () => upgrade(request.result);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const db = await open('ArcaFeed', (db) => db.createObjectStore('values'));
      const paths = ['/b/test/100', '/b/test/99'];
      const old = {
        id: 'series:old',
        label: 'saved',
        customName: 'my name',
        pinned: true,
        path: paths[0],
        searchQuery: '',
        isSeriesMode: true,
        isScrapMode: false,
        seriesChannels: [],
        scrollY: 25,
        updatedAt: 1,
        articleCount: 2,
      };
      const tx = db.transaction('values', 'readwrite');
      tx.objectStore('values').put(
        JSON.stringify({ version: 2, sessions: [old] }),
        'arcaFeed:readingHistory',
      );
      tx.objectStore('values').put(
        JSON.stringify(paths),
        'arcaFeed:readingList:series%3Aold',
      );
      tx.objectStore('values').put(
        JSON.stringify([
          { id: old.id, path: old.path, scrollY: 250, updatedAt: 2 },
        ]),
        'arcaFeed:readingProgress',
      );
      await done(tx);
      db.close();
      localStorage.setItem('recent_articles', '[]');
      const first = new IndexedStorage(indexedDB, localStorage);
      await first.initialize();
      check(
        'native stores replace values',
        !first.database.objectStoreNames.contains('values'),
      );
      check(
        'legacy name and pin preserved',
        first.get('resumeSessions', old.id).customName === 'my name' &&
          first.get('resumeSessions', old.id).pinned,
      );
      check(
        'list initially unloaded',
        first.get('lists', ['resume', old.id]) === undefined,
      );
      const history = new ReadingHistory(new StorageRepository(first));
      await history.prepareList(old.id);
      check(
        'selected list and scroll restored',
        history.sessions[0].articleList.length === 2 &&
          history.sessions[0].scrollY === 250,
      );
      history.saveSession({
        ...old,
        articleList: paths,
        scrollY: 500,
        updatedAt: 3,
      });
      await first.flush();
      check(
        'position checkpoint',
        history.savePosition(old.id, old.path, 700, 4),
      );
      await first.flush();
      const second = new IndexedStorage(indexedDB, localStorage);
      await second.initialize();
      check(
        'position committed as its own object',
        second.get('progress', ['resume', old.id]).scrollY === 700,
      );
      const other = new ReadingHistory(new StorageRepository(second));
      other.updateSession(old.id, { customName: 'edited' });
      await second.flush();
      history.saveSession({
        ...old,
        articleList: paths,
        scrollY: 800,
        updatedAt: 5,
      });
      await first.flush();
      const third = new IndexedStorage(indexedDB, localStorage);
      await third.initialize();
      check(
        'concurrent automatic checkpoint preserves name',
        third.get('resumeSessions', old.id).customName === 'edited',
      );
      other.removeSession(old.id);
      await second.flush();
      await first.refresh();
      history.reload();
      check(
        'deletion recovered without list resurrection',
        history.sessions.length === 0,
      );
      const {
        initializeStorage,
        getStorage,
        flushStorage,
        VaultAdapter,
        Store,
        initReading,
      } = window.storageFixture;
      await initializeStorage();
      const vault = new VaultAdapter(
        new Store({
          articleKey: 'cold',
          articleList: paths,
          isSeriesMode: true,
        }),
        { saveConfig() {} },
        {
          mode: 'ARTICLE',
          channelId: 'test',
          articleId: '100',
          articleKey: 'cold',
          search: '',
        },
      );
      initReading(vault);
      await new Promise((resolve) => setTimeout(resolve, 80));
      await flushStorage();
      check(
        'first deferred checkpoint creates a new session',
        getStorage().get('resumeSessions', 'series:cold')?.path === paths[0],
      );
      check(
        'first deferred checkpoint retains its complete list',
        getStorage().get('lists', ['resume', 'series:cold'])?.paths.length ===
          2,
      );
      vault.destroy();
      const benchmarkDB = await open('ArcaFeed-list-benchmark', (db) => {
        db.createObjectStore('whole', { keyPath: 'id' });
        db.createObjectStore('json', { keyPath: 'id' });
        db.createObjectStore('chunks', { keyPath: ['id', 'chunk'] });
      });
      const median = (values) =>
        [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const benchmark = [];
      for (const size of [2000, 20000]) {
        const id = String(size),
          chunkSize = 500;
        let links = Array.from(
          { length: size },
          (_, index) => `/b/test/${index + 1}`,
        );
        const seed = benchmarkDB.transaction(
          ['whole', 'json', 'chunks'],
          'readwrite',
        );
        seed.objectStore('whole').put({ id, paths: links });
        seed.objectStore('json').put({ id, json: JSON.stringify(links) });
        for (let chunk = 0; chunk < Math.ceil(size / chunkSize); chunk++)
          seed.objectStore('chunks').put({
            id,
            chunk,
            paths: links.slice(chunk * chunkSize, (chunk + 1) * chunkSize),
          });
        await done(seed);
        const writes = { whole: [], json: [], chunks: [] },
          reads = { whole: [], json: [], chunks: [] };
        for (let run = 0; run < 15; run++) {
          const startIndex = links.length;
          links = links.concat(
            Array.from(
              { length: 100 },
              (_, index) => `/b/test/${startIndex + index + 1}`,
            ),
          );
          for (const store of ['whole', 'json', 'chunks']) {
            let start = performance.now();
            const write = benchmarkDB.transaction(store, 'readwrite');
            if (store === 'whole')
              write.objectStore(store).put({ id, paths: links });
            else if (store === 'json')
              write.objectStore(store).put({ id, json: JSON.stringify(links) });
            else
              for (
                let chunk = Math.floor(startIndex / chunkSize);
                chunk < Math.ceil(links.length / chunkSize);
                chunk++
              )
                write.objectStore(store).put({
                  id,
                  chunk,
                  paths: links.slice(
                    chunk * chunkSize,
                    (chunk + 1) * chunkSize,
                  ),
                });
            await done(write);
            writes[store].push(performance.now() - start);
            start = performance.now();
            const read = benchmarkDB.transaction(store);
            const request =
              store === 'chunks'
                ? read
                    .objectStore(store)
                    .getAll(
                      IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]),
                    )
                : read.objectStore(store).get(id);
            let result;
            request.onsuccess = () => {
              result =
                store === 'chunks'
                  ? request.result.flatMap((row) => row.paths)
                  : store === 'json'
                    ? JSON.parse(request.result.json)
                    : request.result.paths;
            };
            await done(read);
            reads[store].push(performance.now() - start);
            check(
              `${size}/${run}/${store} preserves order`,
              result.length === links.length && result.at(-1) === links.at(-1),
            );
          }
        }
        benchmark.push({
          initialLinks: size,
          appendLinks: 100,
          iterations: 15,
          medianMs: Object.fromEntries(
            ['whole', 'json', 'chunks'].map((store) => [
              store,
              {
                write: +median(writes[store]).toFixed(3),
                read: +median(reads[store]).toFixed(3),
              },
            ]),
          ),
        });
      }
      benchmarkDB.close();
      return {
        passed: !failures.length,
        failures,
        checks: checks.length,
        benchmark,
        userAgent: navigator.userAgent,
      };
    });
    const response = await page.request.post(`${baseURL}/results`, {
      data: result,
    });
    return { ...result, reportPath: (await response.json()).reportPath };
  } finally {
    await context.close();
  }
}
