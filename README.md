# webpack-parallel-uglify-plugin [![Build Status](https://travis-ci.org/gdborton/webpack-parallel-uglify-plugin.svg?branch=master)](https://travis-ci.org/gdborton/webpack-parallel-uglify-plugin) [![Coverage Status](https://coveralls.io/repos/github/gdborton/webpack-parallel-uglify-plugin/badge.svg?branch=master)](https://coveralls.io/github/gdborton/webpack-parallel-uglify-plugin?branch=master)

This plugin serves to help projects with many entry points speed up their builds.  The UglifyJS plugin provided with webpack runs sequentially on each of the output files.  This plugin runs uglify in parallel with one thread for each of your available cpus.  This can lead to significantly reduced build times as minification is very CPU intensive.

## Config

Configuring is straightforward.

```javascript
import ParallelUglifyPlugin from 'webpack-parallel-uglify-plugin';

module.exports = {
  plugins: [
    new ParallelUglifyPlugin({
      // Optional regex, or array of regex to match file against. Only matching files get minified.
      // Defaults to /.js$/, any file ending in .js.
      test,
      include, // Optional regex, or array of regex to include in minification. Only matching files get minified.
      exclude, // Optional regex, or array of regex to exclude from minification. Matching files are not minified.
      cacheDir, // Optional absolute path to use as a cache. If not provided, caching will not be used.
      workerCount, // Optional int. Number of workers to run uglify. Defaults to num of cpus - 1 or asset count (whichever is smaller)
      uglifyJS: {
        // These pass straight through to uglify.
      },
    }),
  ],
};
```

### Example Timings

These times were found by running webpack on a very large build, producing 493 output files and totaling 144.24 MiB before minifying.  All times are listed with fully cached babel-loader for consistency.

```
No minification: Webpack build complete in: 86890ms (1m 26s)
Built in uglify plugin: Webpack build complete in: 2543548ms (42m 23s)
With parallel plugin: Webpack build complete in: 208671ms (3m 28s)
With parallel/cache: Webpack build complete in: 98524ms (1m 38s)
```
