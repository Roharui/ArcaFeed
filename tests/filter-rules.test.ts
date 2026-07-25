import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createArticleFilterRule,
  matchesArticleFilter,
  normalizeFilterTokens,
} from '../src/feature/filter-rules.ts';

test('normalizes filter tokens by trimming, removing blanks, and deduplicating', () => {
  assert.deepEqual(
    normalizeFilterTokens([' spoiler ', '', 'spoiler', '  ', '광고', '광고 ']),
    ['spoiler', '광고'],
  );
});

test('a title-only filter allows unrelated articles and blocks matching titles', () => {
  const rule = createArticleFilterRule([], ['spoiler']);

  assert.equal(matchesArticleFilter(rule, '잡담', '평범한 제목'), true);
  assert.equal(matchesArticleFilter(rule, '잡담', 'spoiler 포함 제목'), false);
});

test('blank title tokens never turn into a match-all exclusion', () => {
  const rule = createArticleFilterRule([], ['', ' ', '   ']);

  assert.deepEqual(rule.excludedTitles, []);
  assert.equal(matchesArticleFilter(rule, '정보', '어떤 제목이든 허용'), true);
});

test('tab restrictions and title exclusions are applied together', () => {
  const rule = createArticleFilterRule(
    ['정보', '정보', ' 공지 '],
    ['광고', ' 광고 '],
  );

  assert.equal(matchesArticleFilter(rule, '정보', '정상 게시글'), true);
  assert.equal(matchesArticleFilter(rule, '잡담', '정상 게시글'), false);
  assert.equal(matchesArticleFilter(rule, '공지', '광고 게시글'), false);
});
