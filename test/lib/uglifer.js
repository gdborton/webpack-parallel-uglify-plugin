import test from 'ava';
import sinon from 'sinon';
import os from 'os';

const {
  workerCount,
  processAssets,
} = require('../../lib/uglifier');

const filename = 'somefile.js';
const fakeCompilationObject = {
  assets: {
    [filename]: {
      source() {
        return 'function    name()   {   }';
      },
    },
  },
  options: {},
};

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

test.cb('processAssets minifies each of the assets in the compilation object', (t) => {
  processAssets(fakeCompilationObject, {}).then(() => {
    const minifiedSource = fakeCompilationObject.assets[filename].source();
    t.is(minifiedSource, 'function name(){}');
    t.end();
  });
});
