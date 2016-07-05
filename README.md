# webpack-parallel-uglify-plugin [![Build Status](https://travis-ci.org/gdborton/webpack-parallel-uglify-plugin.svg?branch=master)](https://travis-ci.org/gdborton/webpack-parallel-uglify-plugin) [![Coverage Status](https://coveralls.io/repos/github/gdborton/webpack-parallel-uglify-plugin/badge.svg?branch=master)](https://coveralls.io/github/gdborton/webpack-parallel-uglify-plugin?branch=master)

This plugin serves to help projects with many entry points speed up their builds.  The UglifyJS plugin provided with webpack runs sequentially on each of the output files.  This plugin runs uglify in parallel with one thread for each of your available cpus.  This can lead to significantly reduced build times as minification is very CPU intensive.

## Config

Configuring is straightforward.

```javascript
import ParallelUglifyPlugin from 'webpack-parallel-uglify-plugin';

module.exports = {
  plugins: [
    new ParallelUglifyPlugin({
      cacheDir, // Optional absolute path to use as a cache. If not provided, caching will not be used.
      uglifyJS: {
        // These pass straight through to uglify.
      },
    }),
  ],
};
```
