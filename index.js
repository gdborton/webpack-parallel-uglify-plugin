const path = require('path');
const uglifier = require('./lib/uglifier');

function FasterUglifyPlugin(options) {
  this.options = options;
}

FasterUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.plugin('done', stats => {
    const outputFiles = Object.keys(stats.compilation.assets);
    const filePaths = outputFiles.map(outputFile => (
      path.join(stats.compilation.outputOptions.path, outputFile)
    ));
    uglifier.processFiles(filePaths, this.options);
  });
};

module.exports = FasterUglifyPlugin;
