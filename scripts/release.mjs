import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(command, args, { capture = false } = {}) {
  const output = execFileSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return capture ? output.trim() : '';
}

function git(args, options) {
  return run('git', args, options);
}

function gitSucceeds(args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function runQualityChecks() {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    run(process.execPath, [npmCli, 'run', 'check']);
    return;
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npmCommand, ['run', 'check'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const status = git(['status', '--porcelain'], { capture: true });
if (status) fail('uncommitted changes exist.');

const branch = git(['branch', '--show-current'], { capture: true });
if (!branch) fail('detached HEAD cannot be released.');
if (branch !== 'main') fail('releases must be created from the main branch.');

let upstream;
let remote;
try {
  upstream = git(
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    { capture: true },
  );
  remote = git(['config', '--get', `branch.${branch}.remote`], {
    capture: true,
  });
} catch {
  fail('the current branch has no upstream.');
}
if (!remote || remote === '.') fail('the upstream is not a remote branch.');

git(['fetch', '--quiet', remote]);

const [behind, ahead] = git(
  ['rev-list', '--left-right', '--count', `${upstream}...HEAD`],
  { capture: true },
)
  .split(/\s+/)
  .map(Number);
if (behind !== 0 || ahead !== 0) {
  fail(
    `branch must match ${upstream} exactly (behind ${behind}, ahead ${ahead}).`,
  );
}

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const tag = `v${packageJson.version}`;
const tagRef = `refs/tags/${tag}`;

if (gitSucceeds(['show-ref', '--verify', '--quiet', tagRef])) {
  fail(`local tag ${tag} already exists.`);
}
if (gitSucceeds(['ls-remote', '--exit-code', '--tags', remote, tagRef])) {
  fail(`remote tag ${tag} already exists.`);
}

runQualityChecks();

let createdTag = false;
try {
  git(['tag', tag]);
  createdTag = true;
  git(['push', remote, tag]);
} catch (error) {
  if (createdTag) {
    try {
      git(['tag', '--delete', tag]);
    } catch {
      // Keep the original release failure.
    }
  }
  throw error;
}
