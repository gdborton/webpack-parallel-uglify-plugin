# webpack-parallel-uglify-plugin [![Build Status](https://travis-ci.org/gdborton/webpack-parallel-uglify-plugin.svg?branch=master)](https://travis-ci.org/gdborton/webpack-parallel-uglify-plugin)

This plugin serves to help projects with many entry points speed up their builds.  The UglifyJS plugin provided with webpack runs sequentially on each of the output files.  This plugin runs uglify in parallel with one thread for each of your available cpus.  This can lead to significantly reduced builds as minification is very CPU intensive.

## Config

Configuring is straightforward.

```javascript
import ParallelUglifyPlugin from 'webpack-parallel-uglify-plugin';
module.exports = {
  plugins: [
    new ParallelUglifyPlugin({
      uglifyJS: {
        // These pass straight through to uglify.
      }
    })
  ]
};
```
