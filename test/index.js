/* eslint no-new:0 */
import fs from 'fs';
import glob from 'glob';
import sinon from 'sinon';
import test from 'ava';
import WebpackParallelUglifyPlugin from '../index';

let sandbox;

test.beforeEach(() => {
  sandbox = sinon.sandbox.create();
});

test.afterEach(() => {
  sandbox.restore();
});

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

function FakeCompiler() {
  const callbacks = {};
  this.assets = [];

  this.plugin = (event, callback) => {
    callbacks[event] = callback;
  };

  this.fireEvent = (event, ...args) => {
    callbacks[event].apply(this, args);
  };
}

test('deleting unused cache files after all asset optimizations', (t) => {
  const originalRead = fs.readFileSync;
  sandbox.stub(fs, 'unlinkSync');
  sandbox.stub(fs, 'writeFileSync');
  sandbox.stub(fs, 'mkdirSync');
  sandbox.stub(fs, 'readFileSync', (filePath, encoding) => (
    filePath.match(/fake_cache_dir/)
      ? 'filecontents'
      : originalRead(filePath, encoding)
  ));

  sandbox.stub(glob, 'sync').returns(
    [
      '/fake_cache_dir/file1.js',
      '/fake_cache_dir/file2.js',
    ]
  );

  const uglifyPlugin = new WebpackParallelUglifyPlugin({
    uglifyJS: {},
    cacheDir: '/fake_cache_dir/',
  });

  const compiler = new FakeCompiler();
  uglifyPlugin.apply(compiler);
  compiler.fireEvent('compilation', compiler);
  compiler.fireEvent('optimize-chunk-assets', null, () => {});
  compiler.fireEvent('optimize-chunk-assets', null, () => {});
  t.is(fs.unlinkSync.callCount, 0, 'Cache should not be cleared by optimize-chunk-assets');

  compiler.fireEvent('done');
  t.deepEqual(
    fs.unlinkSync.args,
    [['/fake_cache_dir/file1.js'], ['/fake_cache_dir/file2.js']],
    'Unused cache files should be removed after compilation'
  );
});
