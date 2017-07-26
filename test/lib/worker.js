import test from 'ava';
import uglify from 'uglify-js';
import sinon from 'sinon';
import tmpFile from '../../lib/tmp-file';
import cache from '../../lib/cache';
import { RawSource, OriginalSource } from 'webpack-sources';

const codeSource = 'function  test   ()    {   void(0); }';
const rawSource = new RawSource(codeSource);
const originalSource = new OriginalSource(codeSource);
const sourceAndMap = rawSource.sourceAndMap();
const options = {
  uglifyJS: { },
};
const originalContent = JSON.stringify({
  source: sourceAndMap.source,
  map: sourceAndMap.map,
  options,
});
const minifiedContent = uglify.minify(codeSource, { });

// ava is multi process and uses process.on,
// so we stub it to be sure it doesn't get in the way.
const stubbedOn = sinon.stub(process, 'on');
const worker = require('../../lib/worker');
const { minify, processMessage } = worker;

stubbedOn.restore();

let stubbedRead;
let stubbedUpdate;
test.beforeEach(() => {
  stubbedRead = sinon.stub(tmpFile, 'read', () => originalContent);
  stubbedUpdate = sinon.stub(tmpFile, 'update');
});

test.afterEach(() => {
  stubbedRead.restore();
  stubbedUpdate.restore();
});

test('minify should not return a map if called with a RawSource object', t => {
  const { map } = rawSource.sourceAndMap();
  const result = minify(codeSource, map, undefined, uglify);
  t.is(result.map, undefined);
  t.is(result.code, minifiedContent.code); // should produce the same minified content.
});

test('minify should return a valid source map if called with an OriginalSource object', t => {
  const { map } = originalSource.sourceAndMap();
  const result = minify(codeSource, map, undefined, uglify);
  t.truthy(result.map);
  t.is(result.code, minifiedContent.code); // should produce the same minified content.
});

test.cb('processMessage should minify the file passed via a tmpFile message', (t) => {
  const tmpFileName = 'asdf';

  processMessage(tmpFileName, (error) => {
    if (error) { t.end(error); }
    const cacheKey = cache.createCacheKey(codeSource + false, options);
    t.true(stubbedUpdate.calledWith(tmpFileName, JSON.stringify({
      source: minifiedContent.code,
      map: minifiedContent.map,
      cacheKey,
    })));

    t.end();
  });
});
