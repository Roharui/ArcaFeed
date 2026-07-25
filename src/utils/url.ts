/**
 * URL manipulation utilities.
 */

export function appendSearchParam(
  searchQuery: string,
  key: string,
  value: string,
): string {
  if (!value) {
    return searchQuery;
  }

  const params = new URLSearchParams(
    searchQuery.startsWith('?') ? searchQuery.slice(1) : searchQuery,
  );

  params.set(key, value);

  const normalized = params.toString();
  return normalized ? `?${normalized}` : '';
}

export function mergeSearchQuery(
  href: string,
  searchQuery: string,
  baseOrigin = 'https://arca.live',
): string {
  const url = new URL(href, baseOrigin);
  const searchParams = new URLSearchParams(
    searchQuery.startsWith('?') ? searchQuery.slice(1) : searchQuery,
  );

  const replacementKeys = new Set(searchParams.keys());
  replacementKeys.forEach((key) => url.searchParams.delete(key));
  searchParams.forEach((value, key) => url.searchParams.append(key, value));

  return `${url.pathname}${url.search}${url.hash}`;
}
