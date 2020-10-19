const uglifier = require('./lib/uglifier');

function sourceMapError(lib) {
  return `You should not pass options.${lib}.sourceMap, did you mean options.sourceMap?`;
}

function FasterUglifyPlugin(options) {
  if (options.uglifyJS && options.terser) {
    throw new TypeError('You cannot use both uglifyJS and terser for the same plugin.');
  }

  if (options.uglifyJS && options.uglifyJS.sourceMap) {
    throw new TypeError(sourceMapError('uglifyJS'));
  }

  if (options.terser && options.terser.sourceMap) {
    throw new TypeError(sourceMapError('terser'));
  }
  this.options = options;

  if (!(this.options.uglifyJS || this.options.terser)) {
    this.options.uglifyJS = {};
  }
}

FasterUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
      uglifier.processAssets(compilation, this.options).then(() => {
        callback();
      });
    });
  });

  compiler.plugin('done', () => {
    uglifier.pruneCache(this.options);
  });
};

module.exports = FasterUglifyPlugin;
