'use strict'; // eslint-disable-line strict

const os = require('os');
const mkdirp = require('mkdirp');
const webpackSources = require('webpack-sources');
const workerFarm = require('worker-farm');
const pify = require('pify');
const ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers');

const SourceMapSource = webpackSources.SourceMapSource;
const RawSource = webpackSources.RawSource;
const cache = require('./cache');
const tmpFile = require('./tmp-file');
/**
 * Determines how many workers to create.
 * Should be available cpus minus 1 or the number of assets to minify, whichever is smaller.
 */
function workerCount(options, assetCount) {
  if (options.workerCount) {
    return options.workerCount;
  }
  return Math.min(assetCount, Math.max(1, os.cpus().length - 1));
}

const usedCacheKeys = [];

function processAssets(compilation, options) {
  const assetHash = compilation.assets;
  const useSourceMaps = options.sourceMap || false;
  if (options.cacheDir) {
    mkdirp.sync(options.cacheDir);
  }

  // Create a copy of the options object that omits the cacheDir field. This is necessary because
  // we include the options object when creating cache keys, and some cache directory paths may not
  // be stable across multiple runs.
  const optionsWithoutCacheDir = Object.assign({}, options);
  optionsWithoutCacheDir.cacheDir = undefined;

  // By default the `test` config should match every file ending in .js
  options.test = options.test || /\.js$/i; // eslint-disable-line no-param-reassign
  const assets = Object.keys(assetHash)
    .filter(ModuleFilenameHelpers.matchObject.bind(null, options));

  // For assets that are cached, we read from the cache here rather than doing so in the worker.
  // This is a relatively fast operation, so this lets us avoid creating several workers in cases
  // when we have a near 100% cache hit rate.
  const cacheKeysOnDisk = new Set(cache.getCacheKeysFromDisk(options.cacheDir));
  const uncachedAssets = [];

  assets.forEach((assetName) => {
    // sourceAndMap() is an expensive function, so we'll create the cache key from just source(),
    // and whether or not we should be using source maps.
    const source = assetHash[assetName].source();
    const cacheKey = cache.createCacheKey(source + useSourceMaps, optionsWithoutCacheDir);
    usedCacheKeys.push(cacheKey);
    if (cacheKeysOnDisk.has(cacheKey)) {
      // Cache hit, so let's read from the disk and mark this cache key as used.
      const content = JSON.parse(cache.retrieveFromCache(cacheKey, options.cacheDir));
      if (content.map) {
        assetHash[assetName] = new SourceMapSource(content.source, assetName, content.map);
      } else {
        assetHash[assetName] = new RawSource(content.source);
      }
    } else {
      // Cache miss, so we'll need to minify this in a worker.
      uncachedAssets.push(assetName);
    }
  });

  const farm = workerFarm({
    autoStart: true,
    maxConcurrentCallsPerWorker: 1,
    maxConcurrentWorkers: workerCount(options, uncachedAssets.length),
    maxRetries: 2, // Allow for a couple of transient errors.
  },
   require.resolve('./worker'),
   ['processMessage']
  );

  const minify = pify(farm.processMessage);

  const minificationPromises = uncachedAssets.map((assetName) => {
    const asset = assetHash[assetName];
    const tmpFileName = tmpFile.create(JSON.stringify({
      assetName,
      options: optionsWithoutCacheDir,
      source: asset.source(),
      map: useSourceMaps ? asset.map() : null,
      cacheDir: options.cacheDir,
    }));

    return minify(tmpFileName)
      .then(() => {
        const content = tmpFile.read(tmpFileName);
        const msg = JSON.parse(content);
        if (msg.map) {
          assetHash[assetName] = new SourceMapSource(msg.source, assetName, msg.map); // eslint-disable-line no-param-reassign, max-len
        } else {
          assetHash[assetName] = new RawSource(msg.source); // eslint-disable-line no-param-reassign, max-len
        }
      })
      .catch((e) => {
        const builtError = new Error(`Encountered an error while minifying ${assetName}:\n${e}`);
        compilation.errors.push(builtError);
      });
  });

  function endWorkers() {
    workerFarm.end(farm); // at this point we're done w/ the farm, it can be killed
  }

  return Promise.all(minificationPromises)
    .then(endWorkers)
    .catch(endWorkers);
}

function pruneCache(options) {
  cache.pruneCache(usedCacheKeys, cache.getCacheKeysFromDisk(options.cacheDir), options.cacheDir);
}

module.exports = {
  processAssets,
  pruneCache,
  workerCount,
};
