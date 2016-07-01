'use strict'; // eslint-disable-line strict

const os = require('os');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const childProcess = require('child_process');
const cacheKeyGenerator = require('./cache');

function copyFile(sourceFile, destinationFile) {
  try {
    mkdirp(path.dirname(destinationFile));
    fs.writeFileSync(destinationFile, fs.readFileSync(sourceFile, 'utf-8'));
    return true;
  } catch (e) {
    return false;
  }
}

function createWorkers(count) {
  const workers = [];
  while (workers.length < count) {
    const worker = childProcess.fork(path.join(__dirname, './worker.js'));
    worker.setMaxListeners(100);
    workers.push(worker);
  }
  return workers;
}

function workerCount() {
  return Math.max(1, os.cpus().length - 1);
}

function minify(file, worker, options) {
  const cacheKey = cacheKeyGenerator(file);
  return new Promise((resolve, reject) => {
    worker.send({
      type: 'minify',
      options,
      file,
    });
    worker.on('message', msg => {
      if (msg.file === file) {
        if (msg.type === 'success') {
          if (options.cacheDir) {
            copyFile(file, path.join(options.cacheDir, `${cacheKey}.js`));
          }
          resolve();
        } else {
          reject();
        }
      }
    });
  });
}

function copyFromCache(absFile, cacheDir) {
  const cacheKey = cacheKeyGenerator(absFile);
  const cachedFile = path.join(cacheDir, `${cacheKey}.js`);
  return copyFile(cachedFile, absFile);
}

module.exports = function processFiles(files, options) {
  // const cacheMap = loadCacheMap(options.cacheDir);
  const workers = createWorkers(workerCount());
  let filesToMinify = files;
  if (options.cacheDir) {
    filesToMinify = files.filter(absPath => {
      // returns true if cached and copied, false otherwise.
      const successfullyCopied = copyFromCache(absPath, options.cacheDir);
      return !successfullyCopied;
    });
  }


  const promises = filesToMinify.map((absPath, index) => {
    const worker = workers[index % workers.length];
    return minify(absPath, worker, options);
  });
  Promise.all(promises).then(() => {
    workers.forEach(worker => worker.kill()); // workers are done, kill them.
  });
};
