import test from 'ava';
import sinon from 'sinon';
import fs from 'fs';
import os from 'os';
import childProcess from 'child_process';
import path from 'path';
import glob from 'glob';

const stubbedOn = sinon.stub(process, 'on');
const {
  createWorkers,
  getCacheKeysFromDisk,
  minify,
  pruneCache,
  retrieveFromCache,
  saveToCache,
  workerCount,
} = require('../../lib/uglifier');

stubbedOn.restore();

let stubbedRead;
let stubbedWrite;
let stubbedDelete;
let stubbedGlob;
test.beforeEach(() => {
  stubbedRead = sinon.stub(fs, 'readFileSync', (filePath) => {
    const fileName = path.basename(filePath, '.js');
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

const fakeWorker = {
  on: () => {},
  send: () => {},
  setMaxListeners: () => {},
};

test.afterEach(() => {
  stubbedRead.restore();
  stubbedWrite.restore();
  stubbedDelete.restore();
  stubbedGlob.restore();
});

test('workerCount should be cpus - 1', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
  t.is(workerCount(), 7);
  cpuStub.restore();
});

test('createWorkers should fork x times', t => {
  const stubbedFork = sinon.stub(childProcess, 'fork', () => fakeWorker);
  createWorkers(12);
  t.is(stubbedFork.callCount, 12);
  stubbedFork.restore();
});

test('minify should return a Promise', t => {
  const promise = minify('uglifier.js', { source: () => 'asdf;' }, fakeWorker, {});
  // ava uses babel for tests so Promise probably isn't node Promise.
  t.is(typeof promise.then, 'function');
});

test('retrieveFromCache should return cached content', t => {
  const cacheDir = '/dev/null';
  const cacheKey = 'test';
  const result = retrieveFromCache(cacheKey, cacheDir);
  const cachedFile = path.join(cacheDir, `${cacheKey}.js`);
  t.true(stubbedRead.calledWith(cachedFile));
  t.is(result, 'filecontents');
});

test('retrieveFromCache should return a falsy value if the cache file does not exist', t => {
  const cacheDir = '/dev/null';
  const cacheKey = 'throw';
  const result = retrieveFromCache(cacheKey, cacheDir);
  t.falsy(result);
});

test('saveToCache should write results to a cached file', t => {
  const cacheDir = '/cacheDir';
  const minifiedCode = 'minifiedCode;';
  const cacheKey = 'mycachekey';
  saveToCache(cacheKey, minifiedCode, cacheDir);
  t.true(stubbedWrite.calledWith(path.join(cacheDir, `${cacheKey}.js`), minifiedCode));
});

test('saveToCache should not write anything if no cacheDir is defined', t => {
  const minifiedCode = 'minifiedCode;';
  const cacheKey = 'mycachekey';
  saveToCache(cacheKey, minifiedCode, undefined);
  t.false(stubbedWrite.called);
});

test('getCacheKeysFromDisk returns the filename of js files in the cacheDir', t => {
  const result = getCacheKeysFromDisk('doesnotmatter');
  t.is(result[0], 'path1');
  t.is(result[1], 'path2');
});

test('getCacheKeysFromDisk returns an emtpy array if a cacheDir is not provided', t => {
  const result = getCacheKeysFromDisk(undefined);
  t.deepEqual(result, []);
});

test('pruneCache is a noop if cacheDir is not provided', () => {
  pruneCache('invalidbutunused', 'alsoinvalidbutunused', undefined);
});

test('pruneCache removes cache files that are unused', t => {
  pruneCache(['usedKey'], ['usedKey', 'unusedKey1', 'unusedKey2'], 'cacheDir');
  t.true(stubbedDelete.calledWith(path.join('cacheDir', 'unusedKey1.js')));
  t.true(stubbedDelete.calledWith(path.join('cacheDir', 'unusedKey2.js')));
  t.false(stubbedDelete.calledWith(path.join('cacheDir', 'usedKey.js')));
});
