const uglify = require('uglify-js');
const cache = require('./cache');
const tmpFile = require('./tmp-file');
const BOGUS_SOURCEMAP_STRING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BOGUS_SOURCEMAP_URL = `\n//# sourceMappingURL=${BOGUS_SOURCEMAP_STRING}`;
function minify(asset, uglifyOptions) {
  // inSourceMap doesn't work without outSourceMap, and uglify adds this as a url to the resulting
  // code. We'd rather have the plugin respect our devtool setting, so we're going to provide a
  // bogus filename, then strip it out after.
  const opts = Object.assign({}, uglifyOptions, {
    fromString: true,
    inSourceMap: asset.map,
    outSourceMap: BOGUS_SOURCEMAP_STRING,
  });
  const result = uglify.minify(asset.source, opts);
  result.code = result.code.replace(new RegExp(BOGUS_SOURCEMAP_URL), '');
  return result;
}

function messageHandler(msg) {
  if (msg.type === 'minify') {
    const assetName = msg.assetName;
    try {
      const messageContents = tmpFile.read(msg.tmpFileName);
      const sourceAndMap = JSON.parse(messageContents);
      const cacheKey = cache.createCacheKey(messageContents, msg.options);
      // We do not check the cache here because we already determined that this asset yields a cache
      // miss in the parent process.
      const minifiedContent = minify({
        source: sourceAndMap.source,
        map: sourceAndMap.map,
        name: assetName,
      }, msg.options.uglifyJS);
      cache.saveToCache(cacheKey, JSON.stringify(minifiedContent), msg.cacheDir);
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

module.exports = messageHandler;
