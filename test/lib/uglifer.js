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

const sourceMap = JSON.stringify({
  version: 3,
  file: 'somefile.js.map',
  sources: [],
  sourceRoot: '/',
  names: ['name'],
  mappings: '',
});

function createFakeCompilationObject() {
  return {
    assets: {
      [filename]: {
        source() {
          return unminifedSource;
        },
        map() {
          return sourceMap;
        },
      },
      [testedFilename]: {
        source() {
          return unminifedSource;
        },
        map() {
          return sourceMap;
        },
      },
    },
    options: {},
  };
}

test('workerCount should be cpus - 1 if assetCount is >= cpus', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
  const assetCount = 10;
  const options = {};
  t.is(workerCount(options, assetCount), 7);
  cpuStub.restore();
});

test('workerCount should be assetCount if assetCount is < cpus', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 8 }));
  const assetCount = 5;
  const options = {};
  t.is(workerCount(options, assetCount), 5);
  cpuStub.restore();
});

test('workerCount should follow options', t => {
  const assetCount = 5;
  const options = {
    workerCount: 2,
  };
  t.is(workerCount(options, assetCount), 2);
});

test('workerCount should take options before checking assets or cpu', t => {
  const cpuStub = sinon.stub(os, 'cpus', () => ({ length: 2 }));
  const assetCount = 2;
  const options = {
    workerCount: 4,
  };
  t.is(workerCount(options, assetCount), 4);
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

test.cb('processAssets respects uglifyJS.sourceMap option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  processAssets(fakeCompilationObject, {
    sourceMap: true,
    uglifyJS: { },
  }).then(() => {
    const assetSourceMap = fakeCompilationObject.assets[filename];
    t.is(assetSourceMap.map(), sourceMap);
    t.end();
  });

  processAssets(fakeCompilationObject, {
    sourceMap: false,
    uglifyJS: { },
  }).then(() => {
    const assetSourceMap = fakeCompilationObject.assets[filename];
    t.is(assetSourceMap.map(), null);
    t.end();
  });
});
