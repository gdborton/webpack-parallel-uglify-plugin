import cache from '../../lib/cache';
import test from 'ava';

test('cacheKeyGenerator should return a sha256 hash for a given file name', t => {
  const result = cache.createHashFromContent('asdf');
  t.is(typeof result, 'string');
  t.is(result.length, 64);
});
