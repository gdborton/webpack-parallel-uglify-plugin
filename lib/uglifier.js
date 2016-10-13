'use strict'; // eslint-disable-line strict

const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');
const childProcess = require('child_process');
const RawSource = require('webpack-sources').RawSource;
const cache = require('./cache');
const fs = require('fs');
const glob = require('glob');
const pkg = require('../package.json');

function createWorkers(count) {
  const workers = [];
  while (workers.length < count) {
    const worker = childProcess.fork(path.join(__dirname, './worker.js'));
    worker.setMaxListeners(100);
    workers.push(worker);
  }
  return workers;
}

/**
 * Determines how many workers to create.
 * Should be available cpus minus 1.
 */
function workerCount() {
  return Math.max(1, os.cpus().length - 1);
}

/**
 * Create a cache key from both the source, and the options used to minify the file.
 */
function createCacheKey(source, options) {
  const content = `${source} ${JSON.stringify(options)} ${JSON.stringify(pkg)}`;
  return cache.createHashFromContent(content);
}

/**
 * Attempt to read from cache. If the read fails, or cacheDir isn't defined return null.
 */
function retrieveFromCache(cacheKey, cacheDir) {
  if (cacheDir) {
    try {
      return fs.readFileSync(path.join(cacheDir, `${cacheKey}.js`), 'utf8');
    } catch (e) { void(0); } // this just means it is uncached.
  }
  return null;
}

/**
 * Remove unused files from the cache. This prevents the cache from growing indefinitely.
 */
function pruneCache(usedCacheKeys, allCacheKeys, cacheDir) {
  if (cacheDir) {
    const unusedKeys = allCacheKeys.filter(key => usedCacheKeys.indexOf(key) === -1);
    unusedKeys.forEach(key => {
      fs.unlinkSync(path.join(cacheDir, `${key}.js`));
    });
  }
}

function getCacheKeysFromDisk(cacheDir) {
  if (cacheDir) {
    return glob.sync(path.join(cacheDir, '*.js')).map(fileName => path.basename(fileName, '.js'));
  }
  return [];
}

/**
 * Attempt to write the file to the cache.
 */
function saveToCache(cacheKey, minifiedCode, cacheDir) {
  if (cacheDir) {
    fs.writeFileSync(path.join(cacheDir, `${cacheKey}.js`), minifiedCode);
  }
}

/**
 * Minify an asset.  This attempts to read from the cache first, but if a cached version isn't found
 * it sends a request to the worker to minify.  It may make more sense for the worker to handle
 * the cache, but sending the full source over ipc is expensive. Reading from disk is much faster.
 */
const usedCacheKeys = [];
function minify(assetName, asset, worker, options) {
  const assetContents = asset.source();
  const cacheKey = createCacheKey(assetContents, options);
  usedCacheKeys.push(cacheKey);

  return new Promise((resolve, reject) => {
    const cachedContent = retrieveFromCache(cacheKey, options.cacheDir);

    if (cachedContent) {
      resolve(cachedContent);
    } else {
      worker.send({
        type: 'minify',
        options,
        assetContents,
        assetName,
      });

      worker.on('message', msg => {
        if (msg.assetName === assetName) {
          if (msg.type === 'success') {
            const minifiedCode = msg.newContent;
            saveToCache(cacheKey, minifiedCode, options.cacheDir);
            resolve(minifiedCode);
          } else {
            reject(msg.errorMessage);
          }
        }
      });
    }
  });
}

function processAssets(compilation, options) {
  const assetHash = compilation.assets;
  const workers = createWorkers(workerCount());
  if (options.cacheDir) {
    mkdirp.sync(options.cacheDir);
  }

  const promises = Object.keys(assetHash).map((assetName, index) => {
    const asset = assetHash[assetName];
    const worker = workers[index % workers.length];
    return minify(assetName, asset, worker, options).then(msgContent => {
      assetHash[assetName] = new RawSource(msgContent); // eslint-disable-line no-param-reassign
    }).catch((e) => {
      compilation.errors.push(new Error(`minifying ${assetName}\n${e}`));
    });
  });

  return Promise.all(promises).then(() => {
    // build is done, clean up the cache
    pruneCache(usedCacheKeys, getCacheKeysFromDisk(options.cacheDir), options.cacheDir);
    workers.forEach(worker => worker.kill()); // workers are done, kill them.
  });
}

module.exports = {
  createCacheKey,
  createWorkers,
  getCacheKeysFromDisk,
  minify,
  processAssets,
  pruneCache,
  retrieveFromCache,
  saveToCache,
  workerCount,
};
