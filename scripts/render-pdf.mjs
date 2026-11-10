// Render each PDF page to PNG so the pages can be read visually.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCanvas } = require('@napi-rs/canvas');
let pdfjs;
try { pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'); } catch (e) { pdfjs = await import('pdfjs-dist'); }

const src = process.argv[2];
const outDir = 'C:/Users/Programming/AppData/Local/Temp/opencode/pdfpages';
fs.mkdirSync(outDir, { recursive: true });
const data = new Uint8Array(fs.readFileSync(src));
const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
console.log('pages:', doc.numPages);
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const vp = page.getViewport({ scale: 2 });
  const canvas = createCanvas(vp.width, vp.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const out = path.join(outDir, 'page' + i + '.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('wrote', out, vp.width + 'x' + vp.height);
}
