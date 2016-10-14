import test from 'ava';
import uglify from 'uglify-js';
import sinon from 'sinon';
import tmpFile from '../../lib/tmp-file';
import cache from '../../lib/cache';

const originalContent = 'function  test   ()    {   void(0); }';
const minifiedContent = uglify.minify(originalContent, { fromString: true }).code;

// ava is multi process and uses process.on,
// so we stub it to be sure it doesn't get in the way.
const stubbedOn = sinon.stub(process, 'on');
const messageHandler = require('../../lib/worker');
stubbedOn.restore();

let stubbedRead;
let stubbedUpdate;
test.beforeEach(() => {
  stubbedRead = sinon.stub(tmpFile, 'read', () => originalContent);
  stubbedUpdate = sinon.stub(tmpFile, 'update');
});

test.afterEach(() => {
  stubbedRead.restore();
  stubbedUpdate.restore();
});

test('messageHandler should handle minify messages, minifying the provided file.', t => {
  const stubbedSend = sinon.stub(process, 'send');
  const stubbedRetrieve = sinon.stub(cache, 'retrieveFromCache', () => undefined);
  const assetName = 'abc';
  const tmpFileName = 'asdf';
  const options = {
    uglifyJS: {
      bunk: true,
    },
  };

  messageHandler({
    type: 'minify',
    assetName,
    tmpFileName,
    options,
  });

  t.true(stubbedUpdate.calledWith(tmpFileName, minifiedContent));
  t.true(stubbedSend.calledWith({
    assetName,
    type: 'success',
    cacheKey: cache.createCacheKey(originalContent, options),
  }));
  stubbedSend.restore();
  stubbedRetrieve.restore();
});
