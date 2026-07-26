// Repackages the single-file build as an artifact fragment: the Artifact host
// supplies <!doctype>, <head> and <body>, so we hand it the title, the inlined
// style, the markup and the inlined script — and drop the manifest link, which
// has no host to resolve against there.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'dist', 'index.html'), 'utf8');
const out = process.argv[2] || join(here, '..', 'dist', 'artifact.html');

const pick = (re, label) => {
  const m = src.match(re);
  if (!m) throw new Error(`could not find ${label} in the build output`);
  return m[1];
};

const css = pick(/<style[^>]*>([\s\S]*?)<\/style>/, 'inlined <style>');
const js = pick(/<script type="module"[^>]*>([\s\S]*?)<\/script>/, 'inlined module <script>');
const body = pick(/<body[^>]*>([\s\S]*?)<\/body>/, '<body>')
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();

writeFileSync(
  out,
  `<title>PACT — Gods of the Dark Hour</title>
<script>window.__pactNoSW = true;</script>
<style>
${css}
</style>

${body}

<script type="module">
${js}
</script>
`,
);
console.log('wrote', out, `(${(readFileSync(out).length / 1024).toFixed(1)} KB)`);
