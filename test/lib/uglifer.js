import test from 'ava';
import sinon from 'sinon';
import fs from 'fs';
import os from 'os';
import childProcess from 'child_process';
import path from 'path';
import cacheKeyGenerator from '../../lib/cache';

const stubbedOn = sinon.stub(process, 'on');
const {
  copyFromCache,
  minify,
  workerCount,
  createWorkers,
  copyFile,
} = require('../../lib/uglifier');
stubbedOn.restore();

let stubbedRead;
let stubbedWrite;
test.beforeEach(() => {
  stubbedRead = sinon.stub(fs, 'readFileSync', (fileName) => {
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

test('copyFile should copy contents from source file into destination file and return true', t => {
  const result = copyFile('source', 'dest');
  t.true(stubbedWrite.calledWith('dest', 'filecontents'));
  t.true(result);
});

test('copyFile should return false if it fails to copy.', t => {
  const result = copyFile('throw', 'dest');
  t.false(result);
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
  const promise = minify(path.join(__dirname, 'uglifier.js'), fakeWorker, {});
  // ava uses babel for tests so Promise probably isn't node Promise.
  t.is(typeof promise.then, 'function');
});

test('copyFromCache should attempt to copy a file from cache', t => {
  const cacheDir = '/dev/null';
  const fileName = 'test';
  copyFromCache(fileName, cacheDir);
  const cachedFile = path.join(cacheDir, `${cacheKeyGenerator('test')}.js`);
  t.true(stubbedRead.calledWith(cachedFile));
  t.true(stubbedWrite.calledWith(fileName, 'filecontents'));
});
