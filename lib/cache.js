const crypto = require('crypto');
const fs = require('fs');

// Small helper function to quickly create a hash from any given string.
function createHashFrom(content) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

module.exports = function cacheSignatureGenerator(absFile) {
  const fileContent = fs.readFileSync(absFile, 'utf-8');
  return createHashFrom(fileContent);
};
