#!/usr/bin/env node
/**
 * Generate PWA icons for Wordbydandan
 * Creates gradient PNG icons with a speech bubble design
 * No external dependencies - uses only Node.js built-ins
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBuf, data]);
  const crc = crc32(combined);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createIcon(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Pixel data
  const rowLen = size * 4 + 1; // +1 for filter byte
  const raw = Buffer.alloc(rowLen * size);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.45; // Background circle radius

  // Colors from the app's palette
  // Gradient: hot-pink (#FF6B9D) -> soft-purple (#6C5CE7)
  const c1 = { r: 255, g: 107, b: 157 }; // hot-pink
  const c2 = { r: 108, g: 92, b: 231 };  // soft-purple

  // Background color (outside circle)
  const bg = { r: 255, g: 249, b: 251 }; // --bg color

  // Speech bubble parameters
  const bubbleR = size * 0.22;
  const bubbleCx = cx;
  const bubbleCy = cy - size * 0.06;
  const bubbleTailY = bubbleCy + bubbleR * 0.7;

  // Star/sparkle positions (relative to size)
  const sparkles = [
    { x: 0.32, y: 0.35, r: 0.04 },
    { x: 0.68, y: 0.35, r: 0.03 },
    { x: 0.5, y: 0.3, r: 0.05 },
    { x: 0.42, y: 0.48, r: 0.025 },
    { x: 0.58, y: 0.48, r: 0.03 },
  ];

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // Filter: none
    for (let x = 0; x < size; x++) {
      const off = y * rowLen + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= outerR) {
        // Inside the circle - gradient background
        const t = (y / size + x / size) / 2; // Diagonal gradient
        let r = Math.round(lerp(c1.r, c2.r, t));
        let g = Math.round(lerp(c1.g, c2.g, t));
        let b = Math.round(lerp(c1.b, c2.b, t));
        let a = 255;

        // Anti-alias the circle edge
        if (dist > outerR - 1.5) {
          a = Math.round(Math.max(0, (outerR - dist) / 1.5 * 255));
          // Blend with bg
          r = Math.round(lerp(bg.r, r, a / 255));
          g = Math.round(lerp(bg.g, g, a / 255));
          b = Math.round(lerp(bg.b, b, a / 255));
          a = 255;
        }

        // Speech bubble (white, semi-transparent)
        const bDx = x - bubbleCx;
        const bDy = y - bubbleCy;
        const bDist = Math.sqrt(bDx * bDx + bDy * bDy);

        // Bubble body
        let inBubble = bDist <= bubbleR;

        // Bubble tail (small triangle pointing down)
        if (!inBubble && y >= bubbleTailY && y <= bubbleTailY + bubbleR * 0.5) {
          const tailProgress = (y - bubbleTailY) / (bubbleR * 0.5);
          const tailHalfWidth = bubbleR * 0.2 * (1 - tailProgress);
          if (Math.abs(x - (bubbleCx + bubbleR * 0.15)) < tailHalfWidth) {
            inBubble = true;
          }
        }

        if (inBubble) {
          // White bubble with slight transparency
          const bubbleAlpha = 0.85;
          const edgeFade = bDist > bubbleR - 2 ? Math.max(0, (bubbleR - bDist) / 2) : 1;
          const finalAlpha = bubbleAlpha * edgeFade;
          r = Math.round(lerp(r, 255, finalAlpha));
          g = Math.round(lerp(g, 255, finalAlpha));
          b = Math.round(lerp(b, 255, finalAlpha));
        }

        // Sparkle dots inside bubble
        for (const sp of sparkles) {
          const spx = sp.x * size;
          const spy = sp.y * size;
          const spr = sp.r * size;
          const sDist = Math.sqrt((x - spx) ** 2 + (y - spy) ** 2);
          if (sDist <= spr) {
            const sparkleAlpha = Math.max(0, 1 - sDist / spr);
            // Golden yellow sparkle
            r = Math.round(lerp(r, 255, sparkleAlpha * 0.8));
            g = Math.round(lerp(g, 215, sparkleAlpha * 0.8));
            b = Math.round(lerp(b, 0, sparkleAlpha * 0.5));
          }
        }

        raw[off] = Math.min(255, Math.max(0, r));
        raw[off + 1] = Math.min(255, Math.max(0, g));
        raw[off + 2] = Math.min(255, Math.max(0, b));
        raw[off + 3] = a;
      } else {
        // Transparent outside the circle
        raw[off] = 0;
        raw[off + 1] = 0;
        raw[off + 2] = 0;
        raw[off + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Generate icons
const sizes = [192, 512];
const outDir = path.dirname(__filename);

for (const size of sizes) {
  const png = createIcon(size);
  const filename = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log(`Generated ${filename} (${png.length} bytes)`);
}

console.log('Done!');
