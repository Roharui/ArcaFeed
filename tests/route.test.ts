import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractChannelId,
  getArticleId,
  parseHref,
} from '../src/utils/regex.ts';
import { mergeSearchQuery } from '../src/utils/url.ts';

test('parses supported ArcaLive routes with their query state', () => {
  assert.deepEqual(parseHref('https://arca.live/?theme=dark'), {
    mode: 'HOME',
    channelId: '',
    articleId: '',
    articleKey: '',
    search: '?theme=dark',
  });
  assert.deepEqual(
    parseHref('https://arca.live/b/bluearchive?articleKey=abc&p=2'),
    {
      mode: 'CHANNEL',
      channelId: 'bluearchive',
      articleId: '',
      articleKey: 'abc',
      search: '?articleKey=abc&p=2',
    },
  );
  assert.equal(
    parseHref('https://arca.live/b/bluearchive/12345?articleKey=xyz').mode,
    'ARTICLE',
  );
  assert.equal(parseHref('https://arca.live/u/scrap_list?p=2').mode, 'SCRAP');
});

test('does not classify unrelated or external URLs as supported routes', () => {
  assert.equal(parseHref('https://example.com/b/test/123').mode, 'OTHER');
  assert.equal(
    parseHref('https://arca.live/b/test/not-a-number').mode,
    'OTHER',
  );
  assert.equal(parseHref('not a valid absolute URL').mode, 'OTHER');
});

test('extracts exact article and channel path segments', () => {
  assert.equal(getArticleId('/b/test/123'), '123');
  assert.equal(getArticleId('/b/test/1234'), '1234');
  assert.equal(getArticleId('/b/test/123/extra'), '');
  assert.equal(extractChannelId('/b/test/123'), 'test');
  assert.equal(extractChannelId('/u/scrap_list'), null);
});

test('merges search parameters without creating duplicate question marks', () => {
  const merged = new URL(
    mergeSearchQuery('/b/test/123?mode=best', '?articleKey=abc&mode=all'),
    'https://arca.live',
  );
  assert.equal(merged.pathname, '/b/test/123');
  assert.equal(merged.searchParams.get('mode'), 'all');
  assert.equal(merged.searchParams.get('articleKey'), 'abc');
  assert.equal(
    mergeSearchQuery('/b/test/123?tag=old', '?tag=a&tag=b'),
    '/b/test/123?tag=a&tag=b',
  );
});
