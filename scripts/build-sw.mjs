// Post-build: writes dist/sw.js from src/pwa/sw.template.js with the precache list and a content-hash version.
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const SKIP = new Set(['sw.js', '.DS_Store']);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (!SKIP.has(e.name) && !e.name.endsWith('.map')) out.push(p);
  }
  return out;
}

const files = (await walk(dist)).map((p) => relative(dist, p).split(sep).join('/')).sort();
let total = 0;
const lines = [];
for (const f of files) {
  const buf = await readFile(join(dist, f));
  total += (await stat(join(dist, f))).size;
  lines.push(`${f}:${createHash('sha256').update(buf).digest('hex').slice(0, 16)}`);
}
const version = createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 10);
const tpl = await readFile(new URL('../src/pwa/sw.template.js', import.meta.url), 'utf8');
const sw = tpl
  .replace('/*__PRECACHE__*/ []', JSON.stringify(files))
  .replace("/*__VERSION__*/ ''", JSON.stringify(version));
if (sw === tpl) throw new Error('sw template markers not found');
await writeFile(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${files.length} files, ${(total / 1048576).toFixed(1)} MB, version ${version}`);
