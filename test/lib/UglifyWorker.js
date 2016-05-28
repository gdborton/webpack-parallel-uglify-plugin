import test from 'ava';
import cluster from 'cluster';
import sinon from 'sinon';
import uglify from 'uglify-js';
import workerStuff, {
  UglifyWorker,
  slaveInitializer,
  messageHandler,
} from '../../lib/UglifyWorker';
import fs from 'fs';

const options = {
  bunk: true,
};

const files = ['file1', 'file2'];
let worker;
test.beforeEach(() => {
  worker = new UglifyWorker(options);
});

test('Creating a new UglifyWorker should spawn a new process and send it options.', t => {
  let sendCalled = false;
  const fakeProcess = {
    send(message) {
      sendCalled = true;
      t.is(message.type, 'options');
      t.deepEqual(message.value, options);
    },
  };
  const stubbedFork = sinon.stub(cluster, 'fork', () => fakeProcess);

  const uglifyWorker = new UglifyWorker(options);
  t.true(stubbedFork.called);
  t.true(sendCalled);
  t.is(uglifyWorker.worker, fakeProcess);
  stubbedFork.restore();
});

test('minify minifies using uglify and passed options and returns the value', t => {
  const stubbedMinify = sinon.stub(uglify, 'minify');
  const builtOptions = Object.assign({}, options, { fromString: true });
  const code = 'function    withTooManySpaces    (){}';
  worker.minify(code, options);
  t.true(stubbedMinify.called);
  t.true(stubbedMinify.calledWith(code, builtOptions));
  stubbedMinify.restore();
});

test('worker should send files to its slave if it is master', t => {
  const stubbedSend = sinon.stub(worker.worker, 'send');
  worker.process(files);
  const expected = stubbedSend.calledWith({
    type: 'files',
    value: files,
  });
  t.true(expected);
  stubbedSend.restore();
});

test('worker should call processFiles when it is not the master', t => {
  cluster.isMaster = false;
  const stubbedProcessFiles = sinon.stub(worker, 'processFiles');
  worker.process(files);
  t.true(stubbedProcessFiles.calledWith(files));
  stubbedProcessFiles.restore();
  cluster.isMaster = true;
});

test('processFiles should attempt to read each file, minify its contents, then write to it', t => {
  const fakeResult = 'fakeResult';
  const stubbedRead = sinon.stub(fs, 'readFileSync');
  const stubbedWrite = sinon.stub(fs, 'writeFileSync');
  const stubbedMinify = sinon.stub(worker, 'minify', () => fakeResult);
  const stubbedExit = sinon.stub(process, 'exit');
  worker.processFiles(files);
  files.forEach(file => {
    t.true(stubbedRead.calledWith(file, 'utf-8'));
    t.true(stubbedWrite.calledWith(file, fakeResult));
  });
  t.true(stubbedExit.calledWith(0), 'Should exit the process with a success code.');
  stubbedRead.restore();
  stubbedExit.restore();
  stubbedWrite.restore();
  stubbedMinify.restore();
});

test('slaveInitializer does nothing if master', t => {
  const stubbedProcessOn = sinon.stub(process, 'on');
  slaveInitializer();
  t.false(stubbedProcessOn.called);
  stubbedProcessOn.restore();
});

test('slaveInitializer should hook up the messageHandler function if not master', t => {
  cluster.isMaster = false;
  const stubbedProcessOn = sinon.stub(process, 'on');
  slaveInitializer();
  t.true(stubbedProcessOn.calledWith('message', messageHandler));
  stubbedProcessOn.restore();
  cluster.isMaster = true;
});

test('messageHandler should handle `options` and `files` messages', t => {
  const stubbedConstructor = sinon.stub(workerStuff, 'UglifyWorker', () => {
    void(0);
    return {};
  });
  messageHandler({
    type: 'options',
    value: options,
  });
  t.true(stubbedConstructor.calledWith(options));
  stubbedConstructor.restore();
});
