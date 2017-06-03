import test from 'ava';
import fs from 'fs';
import tmpFile from '../../lib/tmp-file';

const myContent = 'somecontent';

test('tmpFile.create creates a real file and retuns its filename', (t) => {
  const fileName = tmpFile.create(myContent);
  t.truthy(fs.existsSync(fileName));
  t.is(fs.readFileSync(fileName, 'utf8'), myContent);
  fs.unlinkSync(fileName);
});

test('tmpFile.update updates the tmpFile\'s content synchronously', (t) => {
  const tmpFileName = tmpFile.create('randoContent');
  tmpFile.update(tmpFileName, myContent);
  t.is(fs.readFileSync(tmpFileName, 'utf8'), myContent);
  fs.unlinkSync(tmpFileName);
});

test('tmpFile.remove deletes the file from disk', (t) => {
  const tmpFileName = tmpFile.create(myContent);
  t.truthy(fs.existsSync(tmpFileName));
  tmpFile.remove(tmpFileName);
  t.falsy(fs.existsSync(tmpFileName));
});

test('tmpFile.read functions reads tmpFile contents synchronously', (t) => {
  const tmpFileName = tmpFile.create(myContent);
  t.is(tmpFile.read(tmpFileName), fs.readFileSync(tmpFileName, 'utf8'));
  fs.unlinkSync(tmpFileName);
});
