const path = require('path');
const uglifier = require('./lib/uglify-master');

function FasterUglifyPlugin(options) {
  this.options = options;
}

FasterUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.plugin('done', stats => {
    const outputFiles = Object.keys(stats.compilation.assets);
    const filePaths = outputFiles.map(outputFile => (
      path.join(stats.compilation.outputOptions.path, outputFile)
    ));
    uglifier(filePaths, this.options.uglifyJS);
  });
};

module.exports = FasterUglifyPlugin;
