const path = require('path');
const Uglifier = require('./lib/Uglifier');

function FasterUglifyPlugin(options) {
  this.options = options;
}

FasterUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.plugin('done', stats => {
    const outputFiles = Object.keys(stats.compilation.assets);
    const filePaths = outputFiles.map(outputFile => (
      path.join(stats.compilation.outputOptions.path, outputFile)
    ));
    const uglifier = new Uglifier(this.options);
    uglifier.processFiles(filePaths);
  });
};

module.exports = FasterUglifyPlugin;
