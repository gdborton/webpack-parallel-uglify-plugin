const tmp = require('tmp');
const fs = require('fs');

// make sure that we clean up the temp files even if the process exits unexpectedly
tmp.setGracefulCleanup();

function update(filename, newContent) {
  fs.writeFileSync(filename, newContent, 'utf8');
}

module.exports = {
  create(content) {
    const filename = tmp.fileSync().name;
    update(filename, content);
    return filename;
  },

  remove(filename) {
    fs.unlinkSync(filename);
  },

  update,

  read(filename) {
    return fs.readFileSync(filename, 'utf8');
  },
};
