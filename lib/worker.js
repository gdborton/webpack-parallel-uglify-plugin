const cache = require('./cache');
const tmpFile = require('./tmp-file');
const BOGUS_SOURCEMAP_STRING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// This has to be broken apart or ava/nyc will try to use it when creating coverage reports.
const URL_PREFIX = '//# sourceMappingURL=';
const BOGUS_SOURCEMAP_URL = `\n${URL_PREFIX}${BOGUS_SOURCEMAP_STRING}`;

function minify(source, map, uglifyOptions, uglifier) {
  // inSourceMap doesn't work without outSourceMap, and uglify adds this as a url to the resulting
  // code. We'd rather have the plugin respect our devtool setting, so we're going to provide a
  // bogus filename, then strip it out after.
  const opts = Object.assign({}, uglifyOptions);
  if (map) {
    Object.assign(opts, {
      sourceMap: {
        content: map,
        url: BOGUS_SOURCEMAP_STRING,
      },
    });
  }

  const result = uglifier.minify(source, opts);
  if (result.error) throw result.error;
  result.code = result.code.replace(new RegExp(BOGUS_SOURCEMAP_URL), '');

  return result;
}

/**
 * Note: We're passing messages via tmpFiles as this is faster than passing through ipc.
 * In this function msgLocation is the tmp file's name, so that we know where to look
 * for our message.
 *
 * We expect the messages to have the following format:
 * {
 *   assetName: 'someFileName.js',
 *   source: 'function() {}',
 *   map: 'a source map string if enabled',
 *   cacheDir: 'location to cache results',
 *   options: {
 *     pluginOptions,
 *   },
 * }
 */

function processMessage(msgLocation, callback) {
  try {
    const messageContents = tmpFile.read(msgLocation);
    const message = JSON.parse(messageContents);
    const source = message.source;
    const map = message.map;

    const cacheKey = cache.createCacheKey(source + !!map, message.options);
    // We do not check the cache here because we already determined that this asset yields a cache
    // miss in the parent process.
    const uglifyES = message.options.uglifyES;
    const uglifyJS = message.options.uglifyJS;
    const uglifier = uglifyES ? require('uglify-es') : require('uglify-js'); // eslint-disable-line global-require, max-len
    const minifiedContent = minify(source, map, uglifyES || uglifyJS, uglifier);
    cache.saveToCache(cacheKey, JSON.stringify({
      source: minifiedContent.code,
      map: minifiedContent.map,
    }), message.cacheDir);

    tmpFile.update(msgLocation, JSON.stringify({
      source: minifiedContent.code,
      map: minifiedContent.map,
      cacheKey,
    }));
    callback(null, msgLocation);
  } catch (e) {
    callback(e.message, msgLocation);
  }
}

module.exports = {
  minify,
  processMessage,
};
