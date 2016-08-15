const uglify = require('uglify-js');

function minify(source, uglifyOptions) {
  const opts = Object.assign({}, uglifyOptions, { fromString: true });
  return uglify.minify(source, opts).code;
}

function messageHandler(msg) {
  if (msg.type === 'minify') {
    const assetName = msg.assetName;
    const newContent = minify(msg.assetContents, msg.options.uglifyJS);

    process.send({
      type: 'success',
      newContent,
      assetName,
    });
  }
}

process.on('message', messageHandler);

module.exports = messageHandler;
