import test from 'ava';
import sinon from 'sinon';
import os from 'os';

const {
  workerCount,
  processAssets,
} = require('../../lib/uglifier');

const filename = 'somefile.js';
const testedFilename = 'testedFilename.js';

const unminifedSource = 'function    name()   {   }';
const minifiedSource = 'function name(){}';

function createFakeCompilationObject() {
  return {
    assets: {
      [filename]: {
        source() {
          return unminifedSource;
        },
      },
      [testedFilename]: {
        source() {
          return unminifedSource;
        },
      },
    },
    options: {},
  };
}

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
  const fakeCompilationObject = createFakeCompilationObject();
  processAssets(fakeCompilationObject, {}).then(() => {
    const minifiedResult = fakeCompilationObject.assets[filename].source();
    t.is(minifiedResult, minifiedSource);
    t.end();
  });
});

test.cb('processAssets respects test option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  processAssets(fakeCompilationObject, {
    test: /tested/,
  }).then(() => {
    const unmatchedResult = fakeCompilationObject.assets[filename].source();
    const matchedResult = fakeCompilationObject.assets[testedFilename].source();
    t.is(unmatchedResult, unminifedSource);
    t.is(matchedResult, minifiedSource);
    t.end();
  });
});

test.cb('processAssets respects include option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  processAssets(fakeCompilationObject, {
    include: [/tested/],
  }).then(() => {
    const unmatchedResult = fakeCompilationObject.assets[filename].source();
    const matchedResult = fakeCompilationObject.assets[testedFilename].source();
    t.is(unmatchedResult, unminifedSource);
    t.is(matchedResult, minifiedSource);
    t.end();
  });
});

test.cb('processAssets respects exclude option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  processAssets(fakeCompilationObject, {
    exclude: [/tested/],
  }).then(() => {
    const unmatchedResult = fakeCompilationObject.assets[filename].source();
    const matchedResult = fakeCompilationObject.assets[testedFilename].source();
    t.is(unmatchedResult, minifiedSource);
    t.is(matchedResult, unminifedSource);
    t.end();
  });
});
