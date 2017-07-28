/* eslint no-new:0 */
import test from 'ava';
import WebpackParallelUglifyPlugin from '../index';

test('creating a WebpackParallelUglifyPlugin instance w/ both uglify options throws', (t) => {
  t.throws(() => {
    new WebpackParallelUglifyPlugin({
      uglifyJS: {},
      uglifyES: {},
    });
  });
});

test('creating a WebpackParallelUglifyPlugin instance with uglify.sourceMap throws', (t) => {
  t.throws(() => {
    new WebpackParallelUglifyPlugin({
      uglifyJS: { sourceMap: true },
    });
  });

  t.throws(() => {
    new WebpackParallelUglifyPlugin({
      uglifyES: { sourceMap: true },
    });
  });
});

test('providing no uglify options defaults to uglifyJS: {}', (t) => {
  const plugin = new WebpackParallelUglifyPlugin({});
  t.deepEqual(plugin.options, { uglifyJS: {} });
});
