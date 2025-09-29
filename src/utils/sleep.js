export function sleep(ms) {
  return new Promise((resolve) => {
    console.log(`Sleeping for ${ms} ms`);
    setTimeout(resolve, ms);
  });
}
