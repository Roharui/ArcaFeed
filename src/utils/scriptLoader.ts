/**
 * Dynamic script loader utility.
 * Loads external JavaScript files at runtime with deduplication.
 */

/** Set of already loaded / in-flight script URLs to prevent double-loading. */
const loadedScripts = new Map<string, Promise<void>>();

/**
 * Dynamically load a single external JavaScript file.
 * If the same URL was already requested, returns the existing Promise
 * (no duplicate <script> tags).
 *
 * @param url - The script URL to load.
 * @returns A Promise that resolves when the script has loaded.
 */
function loadScript(url: string): Promise<void> {
  const existing = loadedScripts.get(url);
  if (existing) {
    console.log(`[ScriptLoader] Already loading/loaded: ${url}`);
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    script.onload = () => {
      console.log(`[ScriptLoader] Loaded: ${url}`);
      resolve();
    };

    script.onerror = (err) => {
      console.error(`[ScriptLoader] Failed to load: ${url}`, err);
      loadedScripts.delete(url); // Allow retry on failure
      reject(new Error(`Failed to load script: ${url}`));
    };

    document.head.appendChild(script);
  });

  loadedScripts.set(url, promise);
  return promise;
}

/**
 * Load multiple scripts in parallel.
 * Failed scripts do not prevent others from loading.
 *
 * @param urls - Array of script URLs to load.
 * @returns A Promise that resolves when all scripts have loaded (or failed).
 */
async function loadScripts(urls: string[]): Promise<PromiseSettledResult<void>[]> {
  return Promise.allSettled(urls.map((url) => loadScript(url)));
}

/**
 * Check whether a script has already been loaded (or is currently loading).
 */
function isScriptLoaded(url: string): boolean {
  return loadedScripts.has(url);
}

export { loadScript, loadScripts, isScriptLoaded };
