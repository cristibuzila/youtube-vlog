const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPNG(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image bytes with 1 filter byte (0 = None) per scanline
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) / 2;
  const safeMargin = isMaskable ? maxR * 0.75 : maxR * 0.9;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter byte: 0

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default dark tactical background #09090b
      let r = 9;
      let g = 9;
      let b = 11;
      let a = 255;

      // Rounded background for non-maskable or full-bleed for maskable
      if (!isMaskable) {
        // Subtle outer border glow
        if (dist > maxR - 2 && dist <= maxR) {
          r = 245; g = 158; b = 11; a = 200; // amber
        }
      }

      // Radar circles
      const r1 = safeMargin * 0.3;
      const r2 = safeMargin * 0.6;
      const r3 = safeMargin * 0.88;

      if (Math.abs(dist - r1) < 2 || Math.abs(dist - r2) < 2 || Math.abs(dist - r3) < 3) {
        r = 16; g = 185; b = 129; // emerald
      }

      // Radar Crosshair
      if ((Math.abs(dx) <= 1.5 && dist < safeMargin) || (Math.abs(dy) <= 1.5 && dist < safeMargin)) {
        r = 52; g = 211; b = 153; // emerald glow
      }

      // Center glowing beacon (Amber)
      if (dist <= safeMargin * 0.18) {
        r = 245; g = 158; b = 11; // amber-500
      } else if (dist <= safeMargin * 0.24) {
        r = 251; g = 191; b = 36; a = 180; // amber-400
      }

      // Blip at top right (Hider found)
      const blipDx = dx - safeMargin * 0.45;
      const blipDy = dy + safeMargin * 0.35;
      const blipDist = Math.sqrt(blipDx * blipDx + blipDy * blipDy);
      if (blipDist <= safeMargin * 0.1) {
        r = 239; g = 68; b = 68; // red-500 seeker beacon
        a = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files in public/
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG vector logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="96" fill="#09090b"/>
  <circle cx="256" cy="256" r="210" fill="none" stroke="#10b981" stroke-width="4" stroke-opacity="0.25"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#10b981" stroke-width="4" stroke-opacity="0.4"/>
  <circle cx="256" cy="256" r="80" fill="none" stroke="#10b981" stroke-width="6" stroke-opacity="0.7"/>
  
  <!-- Crosshairs -->
  <line x1="256" y1="46" x2="256" y2="466" stroke="#34d399" stroke-width="3" stroke-opacity="0.6" stroke-dasharray="8 8"/>
  <line x1="46" y1="256" x2="466" y2="256" stroke="#34d399" stroke-width="3" stroke-opacity="0.6" stroke-dasharray="8 8"/>
  
  <!-- Radar Sweep -->
  <path d="M 256 256 L 390 122 A 190 190 0 0 0 256 66 Z" fill="url(#sweepGrad)" opacity="0.4"/>
  <defs>
    <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Center Pin (Amber) -->
  <circle cx="256" cy="256" r="32" fill="#f59e0b" filter="drop-shadow(0 0 12px #f59e0b)"/>
  <circle cx="256" cy="256" r="14" fill="#ffffff"/>

  <!-- Target Blip (Red) -->
  <circle cx="350" cy="170" r="18" fill="#ef4444" filter="drop-shadow(0 0 10px #ef4444)"/>
  <circle cx="350" cy="170" r="28" fill="none" stroke="#ef4444" stroke-width="3" stroke-opacity="0.6"/>

  <!-- Text -->
  <text x="256" y="475" text-anchor="middle" fill="#f59e0b" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" letter-spacing="4">CAHUL HUNT</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, false));

console.log('Successfully generated all PWA icons & manifest assets in /public');
