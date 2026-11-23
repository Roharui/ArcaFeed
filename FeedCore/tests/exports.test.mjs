import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);

test('all package exports resolve to existing TypeScript source files', () => {
  for (const [key, target] of Object.entries(pkg.exports)) {
    assert.equal(typeof target, 'string', `export ${key} should be a string`);
    if (target.includes('*')) {
      const dir = path.resolve(root, path.dirname(target));
      assert.equal(
        fs.existsSync(dir),
        true,
        `export wildcard directory missing for ${key}: ${dir}`,
      );
      const files = fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.ts') && !name.endsWith('.d.ts'));
      assert.ok(
        files.length > 0,
        `export wildcard directory has no .ts files for ${key}: ${dir}`,
      );
    } else {
      const fullPath = path.resolve(root, target);
      assert.equal(
        fs.existsSync(fullPath),
        true,
        `export target missing for ${key}: ${fullPath}`,
      );
    }
  }
});

test('@feed/core has zero runtime or third-party dependencies in src', () => {
  const srcRoot = path.join(root, 'src');
  const importPattern =
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      const content = fs.readFileSync(full, 'utf8');
      for (const match of content.matchAll(importPattern)) {
        const specifier = match[1];
        assert.ok(
          specifier.startsWith('.'),
          `unexpected non-relative import "${specifier}" in ${path.relative(root, full)}`,
        );
      }
    }
  }
  walk(srcRoot);
});
