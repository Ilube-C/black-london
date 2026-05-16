#!/usr/bin/env node
// Generates PWA PNG icons from the source SVG. Run on `npm run prepare:icons`.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const iconsDir = path.join(root, 'public', 'icons');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('sharp not installed; run `npm install` first.');
  process.exit(1);
}

if (!existsSync(iconsDir)) await mkdir(iconsDir, { recursive: true });
const svg = await readFile(path.join(iconsDir, 'icon.svg'));

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable.png', size: 512, maskable: true }
];

for (const t of targets) {
  const pipeline = sharp(svg, { density: 300 }).resize(t.size, t.size);
  if (t.maskable) {
    // Maskable icons need ~10% safe-area padding
    const inner = Math.round(t.size * 0.8);
    const padded = await sharp(svg, { density: 300 })
      .resize(inner, inner)
      .extend({
        top: Math.floor((t.size - inner) / 2),
        bottom: Math.ceil((t.size - inner) / 2),
        left: Math.floor((t.size - inner) / 2),
        right: Math.ceil((t.size - inner) / 2),
        background: { r: 0x1a, g: 0x1a, b: 0x1c, alpha: 1 }
      })
      .png()
      .toBuffer();
    await writeFile(path.join(iconsDir, t.name), padded);
  } else {
    await pipeline.png().toFile(path.join(iconsDir, t.name));
  }
  console.log(`  → ${t.name}`);
}
console.log('Icons ready.');
