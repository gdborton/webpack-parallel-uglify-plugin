const uglify = require('uglify-js');
const cache = require('./cache');
const tmpFile = require('./tmp-file');
const BOGUS_SOURCEMAP_STRING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// This has to be broken apart or ava/nyc will try to use it when creating coverage reports.
const URL_PREFIX = '//# sourceMappingURL=';
const BOGUS_SOURCEMAP_URL = `\n${URL_PREFIX}${BOGUS_SOURCEMAP_STRING}`;

function minify(source, map, uglifyOptions) {
  // inSourceMap doesn't work without outSourceMap, and uglify adds this as a url to the resulting
  // code. We'd rather have the plugin respect our devtool setting, so we're going to provide a
  // bogus filename, then strip it out after.
  const opts = Object.assign({}, uglifyOptions, { fromString: true });
  if (map) {
    Object.assign(opts, {
      inSourceMap: map,
      outSourceMap: BOGUS_SOURCEMAP_STRING,
    });
  }
  const result = uglify.minify(source, opts);
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
    const minifiedContent = minify(source, map, message.options.uglifyJS);
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
