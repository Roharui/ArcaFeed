import type { DataRow } from './record-schema';
export const cleanQuery = (query: string): string => {
  const params = new URLSearchParams(query);
  params.delete('articleKey');
  params.sort();
  return params.size ? `?${params}` : '';
};
export const storedMode = (
  series: boolean,
  scrap: boolean,
  channels: readonly string[],
): string =>
  scrap
    ? 'scrap'
    : series
      ? channels.length
        ? 'subscription'
        : 'series'
      : 'channel';
export const contextKey = (session: DataRow): string[] =>
  session.mode !== 'channel'
    ? [
        'series',
        session.navigationId ??
          (String(session.id).startsWith('series:')
            ? String(session.id).slice(7)
            : session.id),
      ]
    : [
        'channel',
        String(session.path).split('/')[2] ?? '',
        cleanQuery(session.query ?? session.searchQuery ?? ''),
      ];
