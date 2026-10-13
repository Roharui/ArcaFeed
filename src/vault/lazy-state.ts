/** Memoized getters survive snapshots without reading unrelated stored fields. */
export function deferField<T extends object, K extends keyof T>(
  target: T,
  key: K,
  load: () => T[K],
): void {
  let loaded = false;
  let value: T[K];
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get() {
      if (!loaded) {
        value = load();
        loaded = true;
      }
      return value;
    },
  });
}

export function mergeState<T extends object>(base: T, patch?: Partial<T>): T {
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(base),
      ...Object.getOwnPropertyDescriptors(patch ?? {}),
    },
  ) as T;
}

export function sameField<T extends object>(
  previous: T | undefined,
  next: T,
  key: keyof T,
): boolean {
  if (!previous) return false;
  const a = Object.getOwnPropertyDescriptor(previous, key);
  const b = Object.getOwnPropertyDescriptor(next, key);
  if (a?.get && b?.get && a.get === b.get) return true;
  if (!!a?.get !== !!b?.get) return false;
  return Object.is(previous[key], next[key]);
}
