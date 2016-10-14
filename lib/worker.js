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
      const cachedContent = cache.retrieveFromCache(cacheKey, msg.options.cacheDir);
      const newContent = cachedContent || minify(assetContents, msg.options.uglifyJS);
      if (!cachedContent) {
        cache.saveToCache(cacheKey, newContent, msg.options.cacheDir);
      }
      tmpFile.update(msg.tmpFileName, newContent);

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
