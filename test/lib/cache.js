import cache from '../../lib/cache';
import test from 'ava';
import path from 'path';
import sinon from 'sinon';
import fs from 'fs';
import glob from 'glob';

const testFiles = ['throw', 'test'];

let stubbedRead;
let stubbedWrite;
let stubbedDelete;
let stubbedGlob;
test.beforeEach(() => {
  const originalRead = fs.readFileSync;
  stubbedRead = sinon.stub(fs, 'readFileSync', (filePath, encoding) => {
    const fileName = path.basename(filePath, '.js');
    if (testFiles.indexOf(fileName) === -1) {
      return originalRead(filePath, encoding);
    }
    if (fileName === 'throw') throw new Error('error');
    return 'filecontents';
  });
  stubbedDelete = sinon.stub(fs, 'unlinkSync');
  stubbedWrite = sinon.stub(fs, 'writeFileSync');
  stubbedGlob = sinon.stub(glob, 'sync', () => (
    [
      '/abs/file/path1.js',
      '/abs/file/path2.js',
    ]
  ));
});

test.afterEach(() => {
  stubbedRead.restore();
  stubbedWrite.restore();
  stubbedDelete.restore();
  stubbedGlob.restore();
});

test('cacheKeyGenerator should return a sha256 hash for a given file name', t => {
  const result = cache.createHashFromContent('asdf');
  t.is(typeof result, 'string');
  t.is(result.length, 64);
});

test('retrieveFromCache should return cached content', t => {
  const cacheDir = '/dev/null';
  const cacheKey = 'test';
  const result = cache.retrieveFromCache(cacheKey, cacheDir);
  const cachedFile = path.join(cacheDir, `${cacheKey}.js`);
  t.true(stubbedRead.calledWith(cachedFile));
  t.is(result, 'filecontents');
});

test('retrieveFromCache should return a falsy value if the cache file does not exist', t => {
  const cacheDir = '/dev/null';
  const cacheKey = 'throw';
  const result = cache.retrieveFromCache(cacheKey, cacheDir);
  t.falsy(result);
});

test('saveToCache should write results to a cached file', t => {
  const cacheDir = '/cacheDir';
  const minifiedCode = 'minifiedCode;';
  const cacheKey = 'mycachekey';
  cache.saveToCache(cacheKey, minifiedCode, cacheDir);
  t.true(stubbedWrite.calledWith(path.join(cacheDir, `${cacheKey}.js`), minifiedCode));
});

test('saveToCache should not write anything if no cacheDir is defined', t => {
  const minifiedCode = 'minifiedCode;';
  const cacheKey = 'mycachekey';
  cache.saveToCache(cacheKey, minifiedCode, undefined);
  t.false(stubbedWrite.called);
});

test('pruneCache is a noop if cacheDir is not provided', () => {
  cache.pruneCache('invalidbutunused', 'alsoinvalidbutunused', undefined);
});

test('pruneCache removes cache files that are unused', t => {
  cache.pruneCache(['usedKey'], ['usedKey', 'unusedKey1', 'unusedKey2'], 'cacheDir');
  t.true(stubbedDelete.calledWith(path.join('cacheDir', 'unusedKey1.js')));
  t.true(stubbedDelete.calledWith(path.join('cacheDir', 'unusedKey2.js')));
  t.false(stubbedDelete.calledWith(path.join('cacheDir', 'usedKey.js')));
});

test('getCacheKeysFromDisk returns the filename of js files in the cacheDir', t => {
  const result = cache.getCacheKeysFromDisk('doesnotmatter');
  t.is(result[0], 'path1');
  t.is(result[1], 'path2');
});

test('getCacheKeysFromDisk returns an emtpy array if a cacheDir is not provided', t => {
  const result = cache.getCacheKeysFromDisk(undefined);
  t.deepEqual(result, []);
});
