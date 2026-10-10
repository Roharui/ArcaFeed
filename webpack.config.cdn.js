import { UserscriptPlugin } from 'webpack-userscript';
import createDevConfig, { getDevHeaders } from './webpack.config.dev.js';

export default function (env = {}) {
  const baseURL = new URL(
    env.CDN_URL || process.env.CDN_URL || 'http://localhost:3000/',
  );
  if (!['http:', 'https:'].includes(baseURL.protocol)) {
    throw new Error('CDN_URL must use HTTP or HTTPS');
  }
  baseURL.search = '';
  baseURL.hash = '';
  baseURL.pathname = `${baseURL.pathname.replace(/\/+$/, '')}/`;
  const downloadURL = new URL('ArcaFeed.dev.user.js', baseURL).href;
  const config = createDevConfig({ ...env, VERSION_RELOAD: 'false' });
  const headers = getDevHeaders(env.DEVICE || 'desktop', String(Date.now()));

  // Use release-style packaging while preserving development diagnostics.
  config.mode = 'production';
  config.devtool = false;
  config.optimization = { nodeEnv: false };

  // A numeric, increasing version lets userscript managers detect each build.
  config.plugins = config.plugins.map((plugin) =>
    plugin instanceof UserscriptPlugin
      ? new UserscriptPlugin({
          // The plugin's URL validator rejects localhost and LAN hostnames.
          // CDN_URL is validated above using the standard URL parser instead.
          strict: false,
          headers: {
            ...headers,
            updateURL: downloadURL,
            downloadURL,
          },
        })
      : plugin,
  );
  return config;
}
