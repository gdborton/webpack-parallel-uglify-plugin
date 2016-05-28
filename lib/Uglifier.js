const uglifyWorker = require('./UglifyWorker');
const os = require('os');

function Uglifier(options) {
  this.options = options;
}

Uglifier.prototype.threadCount = function threadCount() {
  return Math.max(1, os.cpus().length - 1);
};

Uglifier.prototype.createWorkers = function createWorkers(workerCount, options) {
  const workers = [];
  while (workers.length < workerCount) {
    workers.push(new uglifyWorker.UglifyWorker(options));
  }
  return workers;
};

Uglifier.prototype.chunkFiles = function chunkFiles(files, chunks) {
  const chunkMap = {};
  files.forEach((file, index) => {
    const chunk = index % chunks;
    if (!chunkMap[chunk]) {
      chunkMap[chunk] = [];
    }
    chunkMap[chunk].push(file);
  });
  return chunkMap;
};

Uglifier.prototype.processFiles = function processFiles(files) {
  const chunks = this.threadCount();
  const chunkMap = this.chunkFiles(files, chunks);
  const workers = this.createWorkers(chunks, this.options.uglifyJS);
  workers.forEach((worker, index) => {
    worker.process(chunkMap[index]);
  });
};

module.exports = Uglifier;
