'use strict'; // eslint-disable-line strict

const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');
const childProcess = require('child_process');
const webpackSources = require('webpack-sources');
const SourceMapSource = webpackSources.SourceMapSource;
const RawSource = webpackSources.RawSource;
const cache = require('./cache');
const tmpFile = require('./tmp-file');

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
 * Should be available cpus minus 1 or the number of assets to minify, whichever is smaller.
 */
function workerCount(assetCount) {
  return Math.min(assetCount, Math.max(1, os.cpus().length - 1));
}

/**
 * Minify an asset.  This attempts to read from the cache first, but if a cached version isn't found
 * it sends a request to the worker to minify.  It may make more sense for the worker to handle
 * the cache, but sending the full source over ipc is expensive. Reading from disk is much faster.
 */
const usedCacheKeys = [];
function minify(assetName, asset, useSourceMaps, worker, cacheDir, options) {
  const tmpFileName = tmpFile.create(JSON.stringify({
    source: asset.source(),
    map: useSourceMaps ? asset.map() : null,
  }));

  return new Promise((resolve, reject) => {
    worker.send({
      type: 'minify',
      tmpFileName,
      options,
      assetName,
      cacheDir,
    });

    worker.on('message', msg => {
      if (msg.assetName === assetName) {
        if (msg.type === 'success') {
          const result = JSON.parse(tmpFile.read(tmpFileName));
          usedCacheKeys.push(msg.cacheKey);
          resolve({
            source: result.code,
            map: result.map,
            name: assetName,
          });
        } else {
          reject(msg.errorMessage);
        }
      }
    });
  });
}

function processAssets(compilation, options) {
  const assetHash = compilation.assets;
  const useSourceMaps = !!compilation.options.devtool;
  if (options.cacheDir) {
    mkdirp.sync(options.cacheDir);
  }

  // Create a copy of the options object that omits the cacheDir field. This is necessary because
  // we include the options object when creating cache keys, and some cache directory paths may not
  // be stable across multiple runs.
  const optionsWithoutCacheDir = Object.assign({}, options);
  optionsWithoutCacheDir.cacheDir = undefined;

  const assets = Object.keys(assetHash).filter(assetName => /\.js$/.test(assetName));

  // For assets that are cached, we read from the cache here rather than doing so in the worker.
  // This is a relatively fast operation, so this lets us avoid creating several workers in cases
  // when we have a near 100% cache hit rate.
  const cacheKeysOnDisk = new Set(cache.getCacheKeysFromDisk(options.cacheDir));
  const uncachedAssets = [];

  assets.forEach((name) => {
    // sourceAndMap() is an expensive function, so we'll create the cache key from just source(),
    // and whether or not we should be using source maps.
    const source = assetHash[name].source();
    const cacheKey = cache.createCacheKey(source + useSourceMaps, optionsWithoutCacheDir);
    if (cacheKeysOnDisk.has(cacheKey)) {
      // Cache hit, so let's read from the disk and mark this cache key as used.
      const content = JSON.parse(cache.retrieveFromCache(cacheKey, options.cacheDir));
      if (content.map) {
        assetHash[name] = new SourceMapSource(content.source, name, content.map);
      } else {
        assetHash[name] = new RawSource(content.source);
      }
      usedCacheKeys.push(cacheKey);
    } else {
      // Cache miss, so we'll need to minify this in a worker.
      uncachedAssets.push(name);
    }
  });

  const numWorkers = options.workerCount || workerCount(uncachedAssets.length);
  const workers = createWorkers(numWorkers);

  const promises = uncachedAssets.map((assetName, index) => {
    const asset = assetHash[assetName];
    const worker = workers[index % workers.length];
    return minify(assetName, asset, useSourceMaps, worker, options.cacheDir, optionsWithoutCacheDir)
      .then(msgContent => {
        if (msgContent.map) {
          assetHash[assetName] = new SourceMapSource(msgContent.source, msgContent.name, msgContent.map); // eslint-disable-line no-param-reassign, max-len
        } else {
          assetHash[assetName] = new RawSource(msgContent.source); // eslint-disable-line no-param-reassign, max-len
        }
      }).catch((e) => {
        compilation.errors.push(new Error(`minifying ${assetName}\n${e}`));
      });
  });

  return Promise.all(promises).then(() => {
    // build is done, clean up the cache
    cache.pruneCache(usedCacheKeys, cache.getCacheKeysFromDisk(options.cacheDir), options.cacheDir);
    workers.forEach(worker => worker.kill()); // workers are done, kill them.
  });
}

module.exports = {
  createWorkers,
  minify,
  processAssets,
  workerCount,
};
