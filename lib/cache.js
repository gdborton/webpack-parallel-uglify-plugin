const crypto = require('crypto');
const fs = require('fs');
const pkg = require('../package.json');
const path = require('path');
const glob = require('glob');

// Small helper function to quickly create a hash from any given string.
function createHashFromContent(content) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Create a cache key from both the source, and the options used to minify the file.
 */
function createCacheKey(source, options) {
  const content = `${source} ${JSON.stringify(options)} ${JSON.stringify(pkg)}`;
  return createHashFromContent(content);
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

module.exports = {
  createHashFromContent,
  createCacheKey,
  retrieveFromCache,
  pruneCache,
  getCacheKeysFromDisk,
  saveToCache,
};
