const uglifier = require('./lib/uglifier');

function sourceMapError(lib) {
  return `You should not pass options.${lib}.sourceMap, did you mean options.sourceMap?`;
}

function FasterUglifyPlugin(options) {
  if (options.uglifyJS && options.uglifyES) {
    throw new TypeError('You cannot use both uglifyJS and uglifyES for the same plugin.');
  }

  if (options.uglifyJS && options.uglifyJS.sourceMap) {
    throw new TypeError(sourceMapError('uglifyJS'));
  }

  if (options.uglifyES && options.uglifyES.sourceMap) {
    throw new TypeError(sourceMapError('uglifyES'));
  }
  this.options = options;

  if (!(this.options.uglifyJS || this.options.uglifyES)) {
    this.options.uglifyJS = {};
  }
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
