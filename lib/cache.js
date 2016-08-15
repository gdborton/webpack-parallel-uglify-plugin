const crypto = require('crypto');

// Small helper function to quickly create a hash from any given string.
function createHashFromContent(content) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

module.exports = {
  createHashFromContent,
};
