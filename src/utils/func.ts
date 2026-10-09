export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run independent requests in parallel without flooding the host. */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  map: (item: T, index: number) => Promise<R>,
  concurrency = 4,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('concurrency must be a positive integer');
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let failed = false;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (!failed && nextIndex < items.length) {
        const index = nextIndex++;
        try {
          results[index] = await map(items[index]!, index);
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    }),
  );
  return results;
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = temp;
  }
  return array;
}
