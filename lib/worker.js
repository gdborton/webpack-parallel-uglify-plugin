const uglify = require('uglify-js');
const cache = require('./cache');
const tmpFile = require('./tmp-file');

function minify(source, uglifyOptions) {
  const opts = Object.assign({}, uglifyOptions, { fromString: true });
  return uglify.minify(source, opts).code;
}

function messageHandler(msg) {
  if (msg.type === 'minify') {
    const assetName = msg.assetName;
    try {
      const assetContents = tmpFile.read(msg.tmpFileName);
      const cacheKey = cache.createCacheKey(assetContents, msg.options);
      // We do not check the cache here because we already determined that this asset yields a cache
      // miss in the parent process.
      const minifiedContent = minify(assetContents, msg.options.uglifyJS);
      cache.saveToCache(cacheKey, minifiedContent, msg.options.cacheDir);
      tmpFile.update(msg.tmpFileName, minifiedContent);

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
