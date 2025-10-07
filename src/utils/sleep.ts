export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    console.log(`Sleeping for ${ms} ms`);
    setTimeout(resolve, ms);
  });
}
