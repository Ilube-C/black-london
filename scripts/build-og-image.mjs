#!/usr/bin/env node
// Generates public/og-image.jpg (1200x630) — the share image used in
// Open Graph / Twitter Card metadata. Composition: brand mark + serif
// title on dark surface with a gold accent rule at the bottom. Uses
// the existing `sharp` devDependency. Regenerate with: npm run build:og

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out  = path.join(root, 'public/og-image.jpg');

const W = 1200;
const H = 630;

// Colours from src/styles/tokens.css
const SURFACE = '#1a1a1c';
const ACCENT  = '#d4a548';
const TEXT    = '#f4f1ec';
const DIM     = '#b6b1a8';

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="${ACCENT}" stop-opacity="0"/>
      <stop offset="0.18" stop-color="${ACCENT}" stop-opacity="0.55"/>
      <stop offset="0.82" stop-color="${ACCENT}" stop-opacity="0.55"/>
      <stop offset="1"    stop-color="${ACCENT}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${SURFACE}"/>

  <!-- Pin mark, centred horizontally, upper third -->
  <g transform="translate(${W / 2 - 60}, 130)">
    <circle cx="60" cy="60" r="46" fill="none" stroke="${ACCENT}" stroke-width="11"/>
    <circle cx="60" cy="60" r="17" fill="${ACCENT}"/>
    <path d="M60 115 L60 195" stroke="${ACCENT}" stroke-width="11" stroke-linecap="round"/>
  </g>

  <!-- Title -->
  <text x="${W / 2}" y="425"
        font-family="Iowan Old Style, Palatino Linotype, Palatino, Georgia, DejaVu Serif, serif"
        font-size="88" font-weight="600"
        fill="${TEXT}" text-anchor="middle"
        letter-spacing="0.2">Black London</text>

  <!-- Strapline -->
  <text x="${W / 2}" y="485"
        font-family="Iowan Old Style, Palatino Linotype, Palatino, Georgia, DejaVu Serif, serif"
        font-size="30" font-style="italic"
        fill="${DIM}" text-anchor="middle"
        letter-spacing="2">A Map of Black History</text>

  <!-- Accent rule near the bottom (same idiom as the app chrome) -->
  <rect x="0" y="${H - 6}" width="${W}" height="3" fill="url(#rule)"/>
</svg>
`;

const info = await sharp(Buffer.from(svg))
  .jpeg({ quality: 88, progressive: true, mozjpeg: true })
  .toFile(out);

console.log(`✓ ${path.relative(root, out)}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
