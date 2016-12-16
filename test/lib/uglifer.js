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
  workerCount,
} = require('../../lib/uglifier');

stubbedOn.restore();

let stubbedRead;
let stubbedWrite;
let stubbedDelete;
test.beforeEach(() => {
  stubbedRead = sinon.stub(fs, 'readFileSync', (filePath) => {
    const fileName = path.basename(filePath, '.js');
    if (fileName === 'throw') throw new Error('error');
    return 'filecontents';
  });
  stubbedDelete = sinon.stub(fs, 'unlinkSync');
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
  stubbedDelete.restore();
});

test('workerCount should be cpus - 1 if assetCount is >= cpus', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
  const assetCount = 10;
  t.is(workerCount(assetCount), 7);
  cpuStub.restore();
});

test('workerCount should be assetCount if assetCount is < cpus', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
  const assetCount = 5;
  t.is(workerCount(assetCount), 5);
  cpuStub.restore();
});

test('createWorkers should fork x times', t => {
  const stubbedFork = sinon.stub(childProcess, 'fork', () => fakeWorker);
  createWorkers(12);
  t.is(stubbedFork.callCount, 12);
  stubbedFork.restore();
});

test('minify should return a Promise', t => {
  const promise = minify(
    'uglifier.js', // assetName
    { source: () => 'asdf;' }, // asset
    false, // useSourceMaps
    fakeWorker, // worker
    {}
  );
  // ava uses babel for tests so Promise probably isn't node Promise.
  t.is(typeof promise.then, 'function');
});
