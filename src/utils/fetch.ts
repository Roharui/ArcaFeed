interface FetchUrlOptions {
  method?: string;
  timeoutMs?: number;
}

class FetchUrlError extends Error {
  readonly url: string;
  readonly status: number | undefined;

  constructor(message: string, url: string, status?: number) {
    super(message);
    this.name = 'FetchUrlError';
    this.url = url;
    this.status = status;
  }
}

async function fetchUrl(
  url: string,
  { method = 'GET', timeoutMs = 8000 }: FetchUrlOptions = {},
): Promise<{ responseText: string }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new FetchUrlError(
        `Request failed with HTTP ${response.status}.`,
        url,
        response.status,
      );
    }

    return { responseText: await response.text() };
  } catch (error) {
    if (error instanceof FetchUrlError) throw error;
    if (controller.signal.aborted) {
      throw new FetchUrlError(`Request timed out after ${timeoutMs}ms.`, url);
    }
    throw new FetchUrlError('Network request failed.', url);
  } finally {
    window.clearTimeout(timeout);
  }
}

export { FetchUrlError, fetchUrl };
export type { FetchUrlOptions };
