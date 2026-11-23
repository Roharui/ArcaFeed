export interface SubscribedChannel {
  id: string;
  name: string;
}

/** Use the site's subscription menu, which is also present on /b/my. */
export function parseSubscribedChannels(
  scope: ParentNode = document,
): SubscribedChannel[] {
  const menu = scope.querySelector('a[href="/b/my"]')?.parentElement;
  const links = menu
    ? menu.querySelectorAll('a[href^="/b/"]')
    : scope.querySelectorAll('.my-subscribe-channels a.channel');
  const channels = new Map<string, SubscribedChannel>();
  links.forEach((link) => {
    const match = /^\/b\/([a-zA-Z0-9]+)\/?(?:\?.*)?$/.exec(
      link.getAttribute('href') || '',
    );
    const id = match?.[1];
    if (!id || id === 'my' || channels.has(id)) return;
    const name = (
      link.querySelector('.me-auto, .channel-name')?.textContent ||
      link.textContent ||
      ''
    )
      .trim()
      .replace(/ 채널$/, '');
    channels.set(id, { id, name: name || id });
  });
  return [...channels.values()];
}
