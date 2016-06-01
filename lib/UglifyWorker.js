const cluster = require('cluster');
const uglify = require('uglify-js');
const fs = require('fs');
const path = require('path');

var worker; // eslint-disable-line no-var
if (cluster.setupMaster) {
  cluster.setupMaster({
    exec: path.join(__dirname, 'UglifyWorker.js'),
  });
}


function UglifyWorker(options) {
  this.options = options;
  if (cluster.isMaster) {
    this.worker = cluster.fork();
    this.worker.send({
      type: 'options',
      value: options,
    });
  }
}

UglifyWorker.prototype.process = function process(files) {
  if (cluster.isMaster) {
    this.worker.send({
      type: 'files',
      value: files,
    });
  } else {
    this.processFiles(files);
  }
};

// This is meant to be called as a worker, which is why it dies at the end.
UglifyWorker.prototype.processFiles = function processFiles(files) {
  files.forEach(file => {
    const fileContents = fs.readFileSync(file, 'utf-8');
    const result = this.minify(fileContents, this.options);
    fs.writeFileSync(file, result);
  });
  process.exit(0);
};

UglifyWorker.prototype.minify = function minify(code, opts) {
  const options = Object.assign({}, opts, { fromString: true });
  const results = uglify.minify(code, options);
  return results.code;
};

// export an object to make stubbing easier in tests :/
const exportObject = {
  UglifyWorker,
  slaveInitializer: function slaveInitializer() {
    if (!cluster.isMaster) {
      process.on('message', exportObject.messageHandler);
    }
  },

  messageHandler: function messageHandler(message) {
    if (message.type === 'options') {
      worker = new exportObject.UglifyWorker(message.value);
    } else if (message.type === 'files') {
      worker.process(message.value);
    }
  },
};

exportObject.slaveInitializer();
module.exports = exportObject;
