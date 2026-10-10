import $ from 'jquery';

export interface SubscribedChannel {
  id: string;
  name: string;
}

/** Use the site's subscription menu, which is also present on /b/my. */
export function parseSubscribedChannels(
  $scope = $(document.documentElement),
): SubscribedChannel[] {
  const $menu = $scope.find('a[href="/b/my"]').first().parent();
  const $links = $menu.length
    ? $menu.find('a[href^="/b/"]')
    : $scope.find('.my-subscribe-channels a.channel');
  const channels = new Map<string, SubscribedChannel>();
  $links.each((_, element) => {
    const $link = $(element);
    const match = /^\/b\/([a-zA-Z0-9]+)\/?(?:\?.*)?$/.exec(
      $link.attr('href') || '',
    );
    const id = match?.[1];
    if (!id || id === 'my' || channels.has(id)) return;
    const name = (
      $link.find('.me-auto, .channel-name').first().text() || $link.text()
    )
      .trim()
      .replace(/ 채널$/, '');
    channels.set(id, { id, name: name || id });
  });
  return [...channels.values()];
}
