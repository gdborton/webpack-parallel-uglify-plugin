import test from 'ava';
import sinon from 'sinon';
import os from 'os';
import uglifyJS from 'uglify-js';
import escodegen from 'escodegen';
import { parse } from 'acorn';
import { SourceMapSource } from 'webpack-sources';

const {
  workerCount,
  processAssets,
} = require('../../lib/uglifier');

const filename = 'somefile.js';
const testedFilename = 'testedFilename.js';

const badCode = 'func () {con.log("a)}';
const unminifedSource = '(function name(){console.log(0)})()';

// Generate a source map, this is setup to match as closely as possible the input source map that
// webpack provides.
const ast = parse(unminifedSource);
const unminifiedSourceMap = JSON.parse(escodegen.generate(ast, {
  file: 'x',
  sourceMap: true,
}));

const { map, code: minifiedSource } = uglifyJS.minify({ x: unminifedSource }, {
  sourceMap: {
    content: unminifiedSourceMap,
  },
});

const minifiedSourceMap = new SourceMapSource(minifiedSource, filename, map).map();

function createFakeCompilationObject() {
  return {
    assets: {
      [filename]: {
        source() {
          return unminifedSource;
        },
        map() {
          return unminifiedSourceMap;
        },
      },
      [testedFilename]: {
        source() {
          return unminifedSource;
        },
        map() {
          return unminifiedSourceMap;
        },
      },
    },
    options: {},
    errors: [],
  };
}

function createFakeES6CompilationObject() {
  return {
    assets: {
      'someFile.js': {
        source() {
          return '() => {}';
        },
        map() {
          return null;
        },
      },
    },
    options: {},
    errors: [],
  };
}

function assertNoError(compilationObject, t) {
  t.is(compilationObject.errors.length, 0);
}

test('assumptions', (t) => {
  // This is basically to ensure that our direct uglify.minify calls in this file output what we
  // expect. If it doesn't output what we expect, then we might have to rework the source map logic.
  const expectedMinifiedSource = 'console.log(0);';
  t.is(expectedMinifiedSource, minifiedSource);
});

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

test('processAssets minifies each of the assets in the compilation object', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  return processAssets(fakeCompilationObject, {}).then(() => {
    const minifiedResult = fakeCompilationObject.assets[filename].source();
    t.is(minifiedResult, minifiedSource);
    assertNoError(fakeCompilationObject, t);
  });
});

test('processAssets respects test option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  processAssets(fakeCompilationObject, {
    test: /tested/,
  }).then(() => {
    const unmatchedResult = fakeCompilationObject.assets[filename].source();
    const matchedResult = fakeCompilationObject.assets[testedFilename].source();
    assertNoError(fakeCompilationObject, t);
    t.is(unmatchedResult, unminifedSource);
    t.is(matchedResult, minifiedSource);
  });
});

test('processAssets respects include option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  return processAssets(fakeCompilationObject, {
    include: [/tested/],
  }).then(() => {
    const unmatchedResult = fakeCompilationObject.assets[filename].source();
    const matchedResult = fakeCompilationObject.assets[testedFilename].source();
    assertNoError(fakeCompilationObject, t);
    t.is(unmatchedResult, unminifedSource);
    t.is(matchedResult, minifiedSource);
  });
});

test('processAssets respects exclude option', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  return processAssets(fakeCompilationObject, {
    exclude: [/tested/],
  }).then(() => {
    const unmatchedResult = fakeCompilationObject.assets[filename].source();
    const matchedResult = fakeCompilationObject.assets[testedFilename].source();
    assertNoError(fakeCompilationObject, t);
    t.is(unmatchedResult, minifiedSource);
    t.is(matchedResult, unminifedSource);
  });
});

test('processAssets respects sourceMap:true', (t) => {
  const fakeCompilationObject = createFakeCompilationObject();
  return processAssets(fakeCompilationObject, {
    sourceMap: true,
    uglifyJS: {},
  }).then(() => {
    const assetSourceMap = fakeCompilationObject.assets[filename];
    assertNoError(fakeCompilationObject, t);
    t.deepEqual(assetSourceMap.map(), minifiedSourceMap);
  });
});

test('processAssets respects sourceMap:false', t => {
  const fakeCompilationObject = createFakeCompilationObject();
  return processAssets(fakeCompilationObject, {
    sourceMap: false,
    uglifyJS: {},
  }).then(() => {
    const assetSourceMap = fakeCompilationObject.assets[filename];
    t.is(assetSourceMap.source(), minifiedSource);
    assertNoError(fakeCompilationObject, t);
    t.is(assetSourceMap.map(), null);
  });
});


test('invalid JS should generate an error', (t) => {
  const errorCompilationObject = {
    assets: {
      'somefile.js': {
        source() {
          return badCode;
        },
      },
    },
    errors: [],
  };

  let realErrorMessage;
  try {
    const result = uglifyJS.minify(badCode);
    if (result.error) throw result.error;
  } catch (e) {
    realErrorMessage = e.message;
  }

  return processAssets(errorCompilationObject, {
    sourceMap: false,
    uglifyJS: {},
  }).then(() => {
    t.truthy(errorCompilationObject.errors[0].message.includes(realErrorMessage));
  });
});

test('Passing uglifyJS options throws an error when minifying es6', (t) => {
  const es6CompilationObject = createFakeES6CompilationObject();
  return processAssets(es6CompilationObject, {
    sourceMap: false,
    uglifyJS: {},
  }).then(() => {
    t.is(es6CompilationObject.errors.length, 1);
  });
});

test('Passing uglifyES options does not throw an error when minifying es6', (t) => {
  const es6CompilationObject = createFakeES6CompilationObject();
  return processAssets(es6CompilationObject, {
    sourceMap: false,
    uglifyES: {},
  }).then(() => {
    assertNoError(es6CompilationObject, t);
  });
});
