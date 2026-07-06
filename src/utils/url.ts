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
