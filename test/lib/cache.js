import cacheKeyGenerator from '../../lib/cache';
import path from 'path';
import test from 'ava';

test('cacheKeyGenerator should return a sha256 hash for a given file name', t => {
  const result = cacheKeyGenerator(path.join(__dirname, 'cache.js'));
  t.is(typeof result, 'string');
  t.is(result.length, 64);
});
