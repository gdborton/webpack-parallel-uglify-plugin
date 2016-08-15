import test from 'ava';
import sinon from 'sinon';
import fs from 'fs';
import os from 'os';
import childProcess from 'child_process';
import path from 'path';

const stubbedOn = sinon.stub(process, 'on');
const {
  createWorkers,
  minify,
  retrieveFromCache,
  saveToCache,
  workerCount,
} = require('../../lib/uglifier');

stubbedOn.restore();

let stubbedRead;
let stubbedWrite;
test.beforeEach(() => {
  stubbedRead = sinon.stub(fs, 'readFileSync', (filePath) => {
    const fileName = path.basename(filePath, '.js');
    if (fileName === 'throw') throw new Error('error');
    return 'filecontents';
  });

  stubbedWrite = sinon.stub(fs, 'writeFileSync');
});

const fakeWorker = {
  on: () => {},
  send: () => {},
  setMaxListeners: () => {},
};

test.afterEach(() => {
  stubbedRead.restore();
  stubbedWrite.restore();
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
