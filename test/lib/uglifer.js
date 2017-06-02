import test from 'ava';
import sinon from 'sinon';
import fs from 'fs';
import os from 'os';
import path from 'path';

const stubbedOn = sinon.stub(process, 'on');
const {
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
