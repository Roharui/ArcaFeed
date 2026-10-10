/** Keep a bounded resume window that always includes the current article. */
export function articleWindow(
  articles: readonly string[],
  path: string,
  limit: number,
): string[] {
  const index = articles.indexOf(path);
  const start = Math.max(0, index - Math.min(500, Math.floor(limit / 4)));
  const window = articles.slice(start, start + limit);
  if (!window.includes(path)) {
    window.unshift(path);
    window.length = Math.min(window.length, limit);
  }
  return window;
}
