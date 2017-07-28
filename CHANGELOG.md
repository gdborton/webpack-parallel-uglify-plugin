## 1.0.0

 - Breaking: Updated to [uglify-js](https://github.com/mishoo/UglifyJS2)@3, syntax remains the same, but the options you provide uglifyJS may have changed. ([#31](https://github.com/gdborton/webpack-parallel-uglify-plugin/pull/31))
 - Breaking: Plugin now ignores your config's `devtool` option. Enable source maps by initializing the plugin with `sourceMap: true`. ([#23](https://github.com/gdborton/webpack-parallel-uglify-plugin/pull/23))
 - New: Added [uglify-es](https://github.com/mishoo/UglifyJS2/tree/harmony) support. To use, provide the plugin with uglifyES options instead of uglifyJS. ([#35](https://github.com/gdborton/webpack-parallel-uglify-plugin/pull/35))
 - Fix: `workerCount` option is no longer being ignored. ([#33](https://github.com/gdborton/webpack-parallel-uglify-plugin/pull/33))

## 0.4.2

 - New: Added this change log.
 - New: Added support for test/include/exclude options. ([#26](https://github.com/gdborton/webpack-parallel-uglify-plugin/pull/26))
 - Fix: Addressed issue with creating too many event listeners for child processes. ([#25](https://github.com/gdborton/webpack-parallel-uglify-plugin/pull/25))
