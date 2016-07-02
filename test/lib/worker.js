import test from 'ava';
import fs from 'fs';
import sinon from 'sinon';

// ava is multi process and uses process.on,
// so we stub it to be sure it doesn't get in the way.
const stubbedOn = sinon.stub(process, 'on');
const messageHandler = require('../../lib/worker');
stubbedOn.restore();

test('messageHandler should handle minify messages, minifying the provided file.', t => {
  const stubbedRead = sinon.stub(fs, 'readFileSync', () => 'function    test()    {}');
  const stubbedWrite = sinon.stub(fs, 'writeFileSync');
  const stubbedSend = sinon.stub(process, 'send');
  const file = 'abc';
  messageHandler({
    type: 'minify',
    file,
    options: {
      uglifyJS: {
        bunk: true,
      },
    },
  });
  t.true(stubbedRead.calledWith(file));
  t.true(stubbedWrite.calledWith(file, 'function test(){}'));
  t.true(stubbedSend.calledWith({
    type: 'success',
    file,
  }));
  stubbedSend.restore();
  stubbedRead.restore();
  stubbedWrite.restore();
});
