/** Keep a bounded resume window that always includes the current article. */
export function articleWindow(
  articles: readonly string[],
  path: string,
  limit: number,
): string[] {
  const index = findArticleIndex(articles, path);
  const start = Math.max(0, index - Math.min(500, Math.floor(limit / 4)));
  const window = articles.slice(start, start + limit);
  if (!window.includes(path)) {
    window.unshift(path);
    window.length = Math.min(window.length, limit);
  }
  return window;
}
/** Drop old navigation history in batches without losing queued articles. */
export function compactNavigationArticles(
  articles: string[],
  path: string,
  hint = -1,
  seriesChannels: readonly string[] = [],
): string[] {
  const index = findArticleIndex(articles, path, hint);
  if (index <= 200) return articles;
  const start = index - 100;
  const tail = articles.slice(start);
  if (!seriesChannels.length) return tail;
  // Preserve each channel's oldest ID as the next refill cursor.
  const cursors = new Map<string, { index: number; id: number }>();
  const channels = new Set(seriesChannels);
  articles.forEach((article, position) => {
    const [, , channel, id] = article.split('/');
    if (!channel || !channels.has(channel)) return;
    const value = Number(id);
    const previous = cursors.get(channel);
    if (!previous || value < previous.id)
      cursors.set(channel, { index: position, id: value });
  });
  const retained = [...cursors.values()]
    .filter((cursor) => cursor.index < start)
    .sort((a, b) => a.index - b.index)
    .map((cursor) => articles[cursor.index]!);
  return [...retained, ...tail];
}

const articleIndices = new WeakMap<readonly string[], Map<string, number>>();

/** Validate the saved index first; cache only requested paths on immutable lists. */
export function findArticleIndex(
  articles: readonly string[],
  path: string,
  hint = -1,
): number {
  let indices = articleIndices.get(articles);
  if (!indices) {
    indices = new Map();
    articleIndices.set(articles, indices);
  }
  const cached = indices.get(path);
  if (cached !== undefined) return cached;
  const index =
    hint >= 0 && articles[hint] === path ? hint : articles.indexOf(path);
  indices.set(path, index);
  return index;
}
