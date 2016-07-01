const uglify = require('uglify-js');
const fs = require('fs');

function messageHandler(msg) {
  if (msg.type === 'minify') {
    const file = msg.file;
    const fileContents = fs.readFileSync(file, 'utf-8');
    const options = Object.assign({}, msg.options.uglifyJS, { fromString: true });
    const results = uglify.minify(fileContents, options);
    fs.writeFileSync(msg.file, results.code);
    process.send({
      file,
      type: 'success',
    });
  }
}

process.on('message', messageHandler);

module.exports = messageHandler;
