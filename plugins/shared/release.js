/**
 * Shared release URL helper for ArcaFeed plugins.
 * Import in your webpack config to auto-generate downloadURL / updateURL.
 *
 * ```js
 * import { releaseUrl } from '../shared/release.js';
 *
 * const url = releaseUrl('arcafeed-sample.user.js');
 * // → 'https://github.com/Roharui/ArcaFeed/releases/latest/download/arcafeed-sample.user.js'
 * ```
 */

const REPO_BASE = 'https://github.com/Roharui/ArcaFeed';

/**
 * Generate the release download URL for a plugin artifact.
 * @param {string} filename - The output filename (e.g. 'arcafeed-sample.user.js')
 * @returns {string}
 */
function releaseUrl(filename) {
  return `${REPO_BASE}/releases/latest/download/${filename}`;
}

export { releaseUrl, REPO_BASE };
