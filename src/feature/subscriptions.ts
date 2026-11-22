import { parseHref } from '@/utils/regex';

export interface SubscribedChannel {
  id: string;
  name: string;
}

export function parseSubscribedChannels(
  scope: ParentNode = document,
): SubscribedChannel[] {
  const channels = new Map<string, SubscribedChannel>();
  for (const link of Array.from(
    scope.querySelectorAll(
      '#nav_favorite a[href], .quickmenu2_row.favorite a[href]',
    ),
  )) {
    const href = parseHref(link.getAttribute('href') ?? '');
    if (href.mode !== 'CHANNEL' || channels.has(href.channelId)) continue;
    channels.set(href.channelId, {
      id: href.channelId,
      name: link.textContent?.trim() || href.channelId,
    });
  }
  return [...channels.values()];
}
