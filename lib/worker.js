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

function messageHandler(msg) {
  if (msg.type === 'minify') {
    const assetName = msg.assetName;
    try {
      const messageContents = tmpFile.read(msg.tmpFileName);
      const sourceAndMap = JSON.parse(messageContents);
      const source = sourceAndMap.source;
      const map = sourceAndMap.map;

      const cacheKey = cache.createCacheKey(source + !!map, msg.options);
      // We do not check the cache here because we already determined that this asset yields a cache
      // miss in the parent process.
      const minifiedContent = minify(source, map, msg.options.uglifyJS);
      cache.saveToCache(cacheKey, JSON.stringify({
        source: minifiedContent.code,
        map: minifiedContent.map,
      }), msg.cacheDir);

      tmpFile.update(msg.tmpFileName, JSON.stringify(minifiedContent));

      process.send({
        type: 'success',
        assetName,
        cacheKey,
      });
    } catch (e) {
      process.send({
        type: 'error',
        errorMessage: e.message,
        assetName,
      });
    }
  }
}

process.on('message', messageHandler);

module.exports = {
  messageHandler,
  minify,
};
