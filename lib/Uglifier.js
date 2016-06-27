'use strict'; // eslint-disable-line strict

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
  let key = 0;
  while (key < chunks) {
    chunkMap[key] = [];
    key++;
  }
  files.forEach((file, index) => {
    const chunk = index % chunks;
    chunkMap[chunk].push(file);
  });
  return chunkMap;
};

Uglifier.prototype.shouldMinify = function shouldMinify(file) {
  if (this.options.shouldMinify) {
    return this.options.shouldMinify(file);
  }

  return true;
};

Uglifier.prototype.processFiles = function processFiles(files) {
  const chunks = this.threadCount();
  const filesToMinify = files.filter(this.shouldMinify, this);
  const chunkMap = this.chunkFiles(filesToMinify, chunks);
  const workers = this.createWorkers(chunks, this.options.uglifyJS);

  workers.forEach((worker, index) => {
    worker.process(chunkMap[index]);
  });
};

module.exports = Uglifier;
