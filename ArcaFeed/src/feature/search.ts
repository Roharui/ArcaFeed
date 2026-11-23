import type { VaultAdapter } from '@/vault';

export function normalizedSearchQuery(search: string): string {
  const searchParams = new URLSearchParams(search);

  searchParams.delete('p');
  searchParams.delete('near');
  searchParams.delete('after');
  searchParams.delete('before');
  searchParams.delete('tz');

  const q = searchParams.toString();
  return q ? `?${q}` : '';
}

function parseSearchQuery(p: VaultAdapter): VaultAdapter {
  p.searchQuery = normalizedSearchQuery(p.href.search);
  return p;
}

export { parseSearchQuery };
