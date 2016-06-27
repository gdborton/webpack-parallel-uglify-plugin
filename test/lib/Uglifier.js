import Uglifier from '../../lib/Uglifier';
import worker from '../../lib/UglifyWorker';
import os from 'os';
import test from 'ava';
import sinon from 'sinon';

const uglifierOptions = {
  bunkOption: true,
  uglifyJS: {
    bunk: true,
  },
};

let uglifier;
test.beforeEach(() => {
  uglifier = new Uglifier(uglifierOptions);
});

test('threadCount should be cpus - 1', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
  t.is(uglifier.threadCount(), 7);
  cpuStub.restore();
});

test('threadCount should be at least 1', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 1 }));
  t.is(uglifier.threadCount(), 1);
  cpuStub.restore();
});

test('create workers should call the worker\'s contstructor 8 times', t => {
  let callCount = 0;
  const workerCount = 8;
  worker.UglifyWorker = (options) => {
    t.deepEqual(options, uglifierOptions.uglifyJS);
    callCount++;
  };
  const workers = uglifier.createWorkers(workerCount, uglifierOptions.uglifyJS);
  t.is(callCount, workerCount);
  t.is(workers.length, workerCount);
});

test('chunkFiles should group the files into arrays of equal length', t => {
  const result = uglifier.chunkFiles(['1', '2', '3'], 2);
  const expected = {
    0: ['1', '3'],
    1: ['2'],
  };
  t.deepEqual(result, expected);
});

test('processFiles should create workers and processFiles in chunks.', t => {
  const files = ['1', '2', '3'];
  let callCount = 0;
  const stubbedCpu = sinon.stub(os, 'cpus', () => ({ length: 1 }));
  worker.UglifyWorker = class {
    constructor(options) {
      t.is(options, uglifierOptions.uglifyJS);
    }
    process() {
      callCount++;
    }
  };
  uglifier.processFiles(files);
  t.is(callCount, 1);
  stubbedCpu.restore();
});

test('shouldMinify defaults to true if not provided in options', t => {
  t.is(uglifier.shouldMinify('anyfile'), true);
});

test('shouldMinify is used as a filter for processing files', t => {
  const uglifier2 = new Uglifier({
    shouldMinify(file) {
      return file === 'yes';
    },
    uglifyJS: {

    },
  });

  const chunkFilesStub = sinon.stub(uglifier2, 'chunkFiles', () => {});
  const createWorkersStub = sinon.stub(uglifier2, 'createWorkers', () => []);
  const files = ['yes', 'no'];
  uglifier2.processFiles(files);

  t.is(chunkFilesStub.calledWith(['yes']), true);
  chunkFilesStub.restore();
  createWorkersStub.restore();
});
