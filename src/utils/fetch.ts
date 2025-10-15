async function fetchUrl(
  url: string,
  method = 'GET',
  ms = 5000,
): Promise<{ responseText: string }> {
  return fetch(url, {
    method: method,
    headers: { Origin: 'arca.live' },
    signal: AbortSignal.timeout(ms),
  })
    .then((response) => response.text())
    .then((text) => ({ responseText: text }));
}

export { fetchUrl };
