// Shared loading state also covers requests started before the navigation UI exists.
let activeLoads = 0;
const subscribers = new Set<(loading: boolean) => void>();

export function isArticleLoading(): boolean {
  return activeLoads > 0;
}

function notify(): void {
  for (const subscriber of subscribers) subscriber(isArticleLoading());
}

export function showFetchLoader(): void {
  if (activeLoads++ === 0) notify();
}

export function hideFetchLoader(): void {
  if (activeLoads === 0) return;
  if (--activeLoads === 0) notify();
}

export function subscribeArticleLoading(
  subscriber: (loading: boolean) => void,
): () => void {
  subscribers.add(subscriber);
  subscriber(isArticleLoading());
  return () => subscribers.delete(subscriber);
}
