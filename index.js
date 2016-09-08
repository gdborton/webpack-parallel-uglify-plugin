const uglifier = require('./lib/uglifier');

function FasterUglifyPlugin(options) {
  this.options = options;
}

FasterUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.plugin('compilation', compilation => {
    compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
      uglifier.processAssets(compilation, this.options).then(() => {
        callback();
      });
    });
  });
};

module.exports = FasterUglifyPlugin;
