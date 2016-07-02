import test from 'ava';
import sinon from 'sinon';
import fs from 'fs';
import os from 'os';
import childProcess from 'child_process';
import path from 'path';
import cacheKeyGenerator from '../../lib/cache';

const stubbedOn = sinon.stub(process, 'on');
const {
  processFiles,
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

// import Uglifier from '../../lib/Uglifier';
// import worker from '../../lib/UglifyWorker';
// import os from 'os';
// import test from 'ava';
// import sinon from 'sinon';
//
// const uglifierOptions = {
//   bunkOption: true,
//   uglifyJS: {
//     bunk: true,
//   },
// };
//
// let uglifier;
// test.beforeEach(() => {
//   uglifier = new Uglifier(uglifierOptions);
// });
//
// test('threadCount should be cpus - 1', t => {
//   const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
//   t.is(uglifier.threadCount(), 7);
//   cpuStub.restore();
// });
//
// test('threadCount should be at least 1', t => {
//   const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 1 }));
//   t.is(uglifier.threadCount(), 1);
//   cpuStub.restore();
// });
//
// test('create workers should call the worker\'s contstructor 8 times', t => {
//   let callCount = 0;
//   const workerCount = 8;
//   worker.UglifyWorker = (options) => {
//     t.deepEqual(options, uglifierOptions.uglifyJS);
//     callCount++;
//   };
//   const workers = uglifier.createWorkers(workerCount, uglifierOptions.uglifyJS);
//   t.is(callCount, workerCount);
//   t.is(workers.length, workerCount);
// });
//
// test('chunkFiles should group the files into arrays of equal length', t => {
//   const result = uglifier.chunkFiles(['1', '2', '3'], 2);
//   const expected = {
//     0: ['1', '3'],
//     1: ['2'],
//   };
//   t.deepEqual(result, expected);
// });
//
// test('processFiles should create workers and processFiles in chunks.', t => {
//   const files = ['1', '2', '3'];
//   let callCount = 0;
//   const stubbedCpu = sinon.stub(os, 'cpus', () => ({ length: 1 }));
//   worker.UglifyWorker = class {
//     constructor(options) {
//       t.is(options, uglifierOptions.uglifyJS);
//     }
//     process() {
//       callCount++;
//     }
//   };
//   uglifier.processFiles(files);
//   t.is(callCount, 1);
//   stubbedCpu.restore();
// });
//
// test('shouldMinify defaults to true if not provided in options', t => {
//   t.is(uglifier.shouldMinify('anyfile'), true);
// });
//
// test('shouldMinify is used as a filter for processing files', t => {
//   const uglifier2 = new Uglifier({
//     shouldMinify(file) {
//       return file === 'yes';
//     },
//     uglifyJS: {
//
//     },
//   });
//
//   const chunkFilesStub = sinon.stub(uglifier2, 'chunkFiles', () => {});
//   const createWorkersStub = sinon.stub(uglifier2, 'createWorkers', () => []);
//   const files = ['yes', 'no'];
//   uglifier2.processFiles(files);
//
//   t.is(chunkFilesStub.calledWith(['yes']), true);
//   chunkFilesStub.restore();
//   createWorkersStub.restore();
// });
