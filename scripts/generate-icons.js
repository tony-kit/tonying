import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Ensure public directory exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create clean, high-resolution SVG Icon for Tony's Kitchen
const svgIconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F27D26" />
      <stop offset="100%" stop-color="#D96614" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background Rounded Canvas -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Inner subtle border -->
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-opacity="0.2" />

  <!-- Chef Hat / Cloche & Utensils Emblem -->
  <g filter="url(#shadow)" fill="#FFFFFF">
    <!-- Chef Hat Base Band -->
    <path d="M166 310 h180 c8.8 0 16 7.2 16 16 v12 c0 8.8-7.2 16-16 16 H166 c-8.8 0-16-7.2-16-16 v-12 c0-8.8 7.2-16 16-16 z" />

    <!-- Chef Hat Pleats / Puffs -->
    <path d="M166 300 C130 300 116 260 134 226 C112 188 140 142 184 146 C206 112 260 108 288 136 C314 110 368 116 388 152 C424 162 440 206 422 242 C440 278 408 300 368 300 Z" />

    <!-- Text TK or Tony's -->
    <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="2">TONY'S</text>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIconContent, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIconContent, 'utf-8');

// Function to generate pure RGBA PNG buffer without external binary dependencies
function createPngBuffer(width, height, drawFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA (truecolor with alpha)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Raw Image Data (with filter byte 0 at start of each scanline)
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Helper to build chunk with CRC32
  function makeChunk(typeStr, dataBuf) {
    const len = dataBuf.length;
    const chunk = Buffer.alloc(8 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(typeStr, 4);
    dataBuf.copy(chunk, 8);

    // Calculate CRC
    const crc = crc32(chunk.subarray(4, 8 + len));
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  // CRC32 implementation
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Build CRC Table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

// Draw Tony's Kitchen App Icon pixel shader
function drawTonyIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;

  // Corner radius ratio (smooth rounded rectangle for maskable icon)
  const radius = 0.22;
  const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - radius));
  const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - radius));
  const distToEdge = Math.sqrt(dx * dx + dy * dy);

  if (distToEdge > radius) {
    return [0, 0, 0, 0]; // transparent
  }

  // Orange gradient background: #F27D26 (242, 125, 38) to #D96614 (217, 102, 20)
  const t = (nx + ny) * 0.5;
  const bgR = Math.round(242 - t * 25);
  const bgG = Math.round(125 - t * 23);
  const bgB = Math.round(38 - t * 18);

  // Chef Hat / Plate Central Emblem
  // 1. Chef hat puff circles:
  // Center puff: center (0.5, 0.38), r = 0.16
  // Left puff: center (0.37, 0.43), r = 0.13
  // Right puff: center (0.63, 0.43), r = 0.13
  // Bottom hat band: rect [0.35 to 0.65, 0.54 to 0.63]
  const dCenter = Math.hypot(nx - 0.5, ny - 0.38);
  const dLeft = Math.hypot(nx - 0.37, ny - 0.43);
  const dRight = Math.hypot(nx - 0.63, ny - 0.43);
  const inHatPuff = dCenter < 0.16 || dLeft < 0.13 || dRight < 0.13;
  const inHatBand = nx >= 0.34 && nx <= 0.66 && ny >= 0.54 && ny <= 0.64;

  // Fork & Knife accent or lettering base
  const inUnderline = nx >= 0.28 && nx <= 0.72 && ny >= 0.72 && ny <= 0.76;
  const inSubDot = Math.hypot(nx - 0.5, ny - 0.82) < 0.035;

  if (inHatPuff || inHatBand || inUnderline || inSubDot) {
    // Pure White Emblem
    return [255, 255, 255, 255];
  }

  // Subtle border
  if (distToEdge > radius - 0.015) {
    return [255, 255, 255, 180];
  }

  return [bgR, bgG, bgB, 255];
}

console.log('Generating PNG icons...');
const png192 = createPngBuffer(192, 192, drawTonyIcon);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

const png512 = createPngBuffer(512, 512, drawTonyIcon);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);

console.log('Icons generated successfully in /public');
