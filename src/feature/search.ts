import type { VaultAdapter } from '@/vault';

function parseSearchQuery(p: VaultAdapter): VaultAdapter {
  const { search } = p.href;

  const searchParams = new URLSearchParams(search);

  searchParams.delete('p');
  searchParams.delete('near');
  searchParams.delete('after');
  searchParams.delete('before');
  searchParams.delete('tz');

  const q = searchParams.toString();
  p.searchQuery = q ? `?${q}` : '';

  return p;
}

export { parseSearchQuery };
