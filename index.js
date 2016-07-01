const path = require('path');
const processFiles = require('./lib/Uglifier');

function FasterUglifyPlugin(options) {
  this.options = options;
}

FasterUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.plugin('done', stats => {
    const outputFiles = Object.keys(stats.compilation.assets);
    const filePaths = outputFiles.map(outputFile => (
      path.join(stats.compilation.outputOptions.path, outputFile)
    ));
    processFiles(filePaths, this.options);
  });
};

module.exports = FasterUglifyPlugin;
