const pendingGets = new Map<string, Promise<{ responseText: string }>>();

function fetchUrl(
  url: string,
  method = 'GET',
  ms = 5000,
): Promise<{ responseText: string }> {
  const key = `${ms}:${new URL(url, window.location.href).href}`;
  if (method === 'GET') {
    const pending = pendingGets.get(key);
    if (pending) return pending;
  }
  const request = fetch(url, {
    method,
    signal: AbortSignal.timeout(ms),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response.text();
    })
    .then((text) => ({ responseText: text }))
    .finally(() => {
      if (method === 'GET') pendingGets.delete(key);
    });
  if (method === 'GET') pendingGets.set(key, request);
  return request;
}

export { fetchUrl };
