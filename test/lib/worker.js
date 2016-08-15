import test from 'ava';
import uglify from 'uglify-js';
import sinon from 'sinon';

// ava is multi process and uses process.on,
// so we stub it to be sure it doesn't get in the way.
const stubbedOn = sinon.stub(process, 'on');
const messageHandler = require('../../lib/worker');
stubbedOn.restore();

test('messageHandler should handle minify messages, minifying the provided file.', t => {
  const stubbedSend = sinon.stub(process, 'send');
  const assetName = 'abc';
  const originalContent = 'function  test   ()    {   void(0); }';
  messageHandler({
    type: 'minify',
    assetName,
    assetContents: originalContent,
    options: {
      uglifyJS: {
        bunk: true,
      },
    },
  });

  t.true(stubbedSend.calledWith({
    type: 'success',
    assetName,
    newContent: uglify.minify(originalContent, { fromString: true }).code,
  }));
  stubbedSend.restore();
});
