import type { Param } from "@/vault";

function parseSearchQuery({ v, c }: Param): Param {
  const { search } = v.href;

  const searchParams = new URLSearchParams(search);

  searchParams.delete('p');
  searchParams.delete('near');
  searchParams.delete('after');
  searchParams.delete('before');
  searchParams.delete('tz');

  c.searchQuery = searchParams.toString();
  c.searchQuery = c.searchQuery ? `?${c.searchQuery}` : '';

  return { v, c } as Param
}

export { parseSearchQuery }
