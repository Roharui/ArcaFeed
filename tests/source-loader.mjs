import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const requireDependency = createRequire(import.meta.url);

// Execute the actual TypeScript modules with isolated browser/network adapters.
// This keeps performance regressions reproducible without adding runtime packages.
export function sourceLoader({
  root = projectRoot,
  globals = {},
  mocks = {},
} = {}) {
  const modules = new Map();
  const environment = {
    console,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    AbortSignal,
    ...globals,
  };
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
        fileName: filename,
      },
    );
    function requireSource(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.endsWith('.css')) return {};
      let target;
      if (specifier.startsWith('@/'))
        target = path.join(root, 'src', specifier.slice(2));
      else if (specifier.startsWith('.'))
        target = path.resolve(path.dirname(filename), specifier);
      else return requireDependency(specifier);
      return load(
        fs.existsSync(`${target}.ts`)
          ? `${target}.ts`
          : path.join(target, 'index.ts'),
      );
    }
    const execute = new Function(
      'require',
      'module',
      'exports',
      ...Object.keys(environment),
      outputText,
    );
    execute(
      requireSource,
      module,
      module.exports,
      ...Object.values(environment),
    );
    return module.exports;
  }
  return (entry) => load(path.resolve(root, entry));
}

export function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      writes.push({ key, value });
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export function vaultFixture(overrides = {}) {
  return {
    href: {
      mode: 'ARTICLE',
      channelId: 'test',
      articleId: '100',
      articleKey: 'session',
      search: '',
    },
    articleKey: 'session',
    articleList: ['/b/test/100', '/b/test/99'],
    articleFilterConfig: {},
    activeIndex: -1,
    articleLoadRevision: 0,
    isSeriesMode: false,
    uiSettings: { homeSeriesChannels: [] },
    searchQuery: '',
    saves: 0,
    flushSave() {
      this.saves++;
    },
    resetArticleList() {
      this.articleLoadRevision++;
      this.articleList = [];
      this.activeIndex = -1;
    },
    updateState(patch) {
      Object.assign(this, patch);
    },
    isCurrentMode(...modes) {
      return modes.includes(this.href.mode);
    },
    isNextPageActive() {
      return this.activeIndex < this.articleList.length - 1;
    },
    isPrevPageActive() {
      return this.activeIndex > 0;
    },
    ...overrides,
  };
}
