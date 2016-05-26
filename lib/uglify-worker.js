const uglifyJS = require('uglify-js');
const fs = require('fs');

const options = {};

function minifyFile(file) {
  const result = uglifyJS.minify([file], options);
  fs.writeFileSync(file, result.code);
}

process.on('message', message => {
  if (message.type === 'options') {
    Object.assign(options, message.value);
  } else if (message.type === 'files') {
    message.value.forEach(file => {
      minifyFile(file);
    });
    process.send({
      type: 'done',
    });
  }
});
