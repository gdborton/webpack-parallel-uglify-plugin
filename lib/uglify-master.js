const childProcess = require('child_process');
const os = require('os');
const defaultThreads = Math.max(1, os.cpus().length - 1);
const path = require('path');

const processes = [];
function childProcessMessageHandler(process, message) {
  if (message.type === 'done') {
    process.kill();
  }
}

function uglify(files, options) {
  var process; // eslint-disable-line no-var
  while (processes.length < defaultThreads) {
    process = childProcess.fork(path.join(__dirname, 'uglify-worker.js'));
    process.on('message', childProcessMessageHandler.bind(null, process));
    process.send({
      type: 'options',
      value: options,
    });
    processes.push(process);
  }
  const chunkMap = {};
  files.forEach((file, fileIndex) => {
    const processIndex = fileIndex % processes.length;
    if (!chunkMap[processIndex]) {
      chunkMap[processIndex] = [];
    }
    chunkMap[processIndex].push(file);
  });

  Object.keys(chunkMap).forEach(index => {
    processes[index].send({
      type: 'files',
      value: chunkMap[index],
    });
  });
}

module.exports = uglify;
