import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../scripts/build-standalone.mjs', import.meta.url), 'utf8');
const scanner = source.slice(source.indexOf('function inspectJavaScript('), source.indexOf('async function collectRuntimeImages('));
const inspect = code => vm.runInNewContext(`${scanner}\ninspectJavaScript(code, 'fixture');`, { code, fail: message => { throw new Error(message); } });

test('portable scanner accepts import property names while rejecting every actual module-loading syntax', () => {
  assert.doesNotThrow(() => inspect('const labels={import:"Import a build"}; labels.import;'));
  assert.doesNotThrow(() => inspect('const s="import x from source"; // import("ignored")\nconst url=import.meta.url;'));
  for (const code of ['import "./missing.js";', 'import x from "./missing.js";', 'import("./missing.js");', 'import ("./missing.js");', 'export {x} from "./missing.js";', 'require("./missing.js")', 'new URL("./missing.png",import.meta.url)']) {
    assert.throws(() => inspect(code), undefined, code);
  }
});
