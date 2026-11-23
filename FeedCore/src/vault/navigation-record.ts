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

export function createContextKey(
  extractChannelId: (path: string) => string,
): (session: DataRow) => string[] {
  return (session: DataRow): string[] =>
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
          extractChannelId(String(session.path)),
          cleanQuery(session.query ?? session.searchQuery ?? ''),
        ];
}
