const codeFrame = require('babel-code-frame');
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
  const opts = { ...uglifyOptions };
  if (map) {
    Object.assign(opts, {
      sourceMap: {
        content: map,
        includeSources: true,
        url: BOGUS_SOURCEMAP_STRING,
      },
    });
  }

  const result = uglifier.minify(source, opts);
  const prom = result.then ? result : Promise.resolve(result);
  return prom.then(resolved => {
    if (resolved.error) {
      if (resolved.error.name === 'SyntaxError') {
        const frame = codeFrame(source, resolved.error.line, resolved.error.col);
        const errorMessage = `${resolved.error.name}: ${resolved.error.message}\n${frame}`;
        throw new SyntaxError(errorMessage);
      }
  
      throw resolved.error;
    }

    resolved.code = resolved.code.replace(new RegExp(BOGUS_SOURCEMAP_URL), '');
  
    return result;
  });
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
    const { source } = message;
    const { map } = message;

    const cacheKey = cache.createCacheKey(source + !!map, message.options);
    // We do not check the cache here because we already determined that this asset yields a cache
    // miss in the parent process.
    const { terser } = message.options;
    const { uglifyJS } = message.options;
    // eslint-disable-next-line global-require
    const uglifier = terser ? require('terser') : require('uglify-js');
    minify(source, map, terser || uglifyJS, uglifier)
      .then(minifiedContent => {
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
      }).catch(e => {
        callback(e.message, msgLocation);
      });
  } catch (e) {
    callback(e.message, msgLocation);
  }
}

module.exports = {
  minify,
  processMessage,
};
