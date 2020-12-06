const uglifier = require("./lib/uglifier");

function sourceMapError(lib) {
  return `You should not pass options.${lib}.sourceMap, did you mean options.sourceMap?`;
}

function ParallelUglifyPlugin(options) {
  if (options.uglifyJS && options.terser) {
    throw new TypeError(
      "You cannot use both uglifyJS and terser for the same plugin."
    );
  }

  if (options.uglifyJS && options.uglifyJS.sourceMap) {
    throw new TypeError(sourceMapError("uglifyJS"));
  }

  if (options.terser && options.terser.sourceMap) {
    throw new TypeError(sourceMapError("terser"));
  }
  this.options = options;

  if (!(this.options.uglifyJS || this.options.terser)) {
    this.options.uglifyJS = {};
  }
}

ParallelUglifyPlugin.prototype.apply = function apply(compiler) {
  compiler.hooks.compilation.tap("ParallelUglifyPlugin", (compilation) => {
    compilation.hooks.processAssets.tapAsync(
      {
        name: "ParallelUglifyPlugin",
        stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
      },
      (chunks, callback) => {
        uglifier.processAssets(compilation, this.options).then(() => {
          callback();
        });
      }
    );
  });

  compiler.hooks.done.tap("ParallelUglifyPlugin", () => {
    uglifier.pruneCache(this.options);
  });
};

module.exports = ParallelUglifyPlugin;
