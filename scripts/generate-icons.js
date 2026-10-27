import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcVal = crc32(crcTarget);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function generatePng(width, height, isMaskable = false) {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((1 + rowBytes) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowBytes);
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const nx = x / width;
      const ny = y / height;
      
      let r = Math.round(30 + (37 - 30) * ny);
      let g = Math.round(58 + (99 - 58) * ny);
      let b = Math.round(138 + (235 - 138) * ny);
      let a = 255;

      const cardX = nx >= 0.28 && nx <= 0.72;
      const cardY = ny >= 0.24 && ny <= 0.76;

      if (cardX && cardY) {
        r = 255;
        g = 255;
        b = 255;

        if (ny >= 0.28 && ny <= 0.35 && nx >= 0.34 && nx <= 0.66) {
          r = 30;
          g = 64;
          b = 175;
        }
        if ((ny >= 0.40 && ny <= 0.43 && nx >= 0.34 && nx <= 0.62) ||
            (ny >= 0.46 && ny <= 0.49 && nx >= 0.34 && nx <= 0.58) ||
            (ny >= 0.52 && ny <= 0.55 && nx >= 0.34 && nx <= 0.64)) {
          r = 148;
          g = 163;
          b = 184;
        }
        const sealDx = nx - 0.5;
        const sealDy = ny - 0.65;
        if (Math.sqrt(sealDx * sealDx + sealDy * sealDy) < 0.06) {
          r = 30;
          g = 64;
          b = 175;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateScreenshot(width, height, isMobile = true) {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((1 + rowBytes) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowBytes);
    rawData[rowOffset] = 0;
    const ny = y / height;

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const nx = x / width;

      // Base app background (slate-50: #f8fafc)
      let r = 248;
      let g = 250;
      let b = 252;
      let a = 255;

      // Top App Bar (#1e40af)
      if (ny < 0.08) {
        r = 30;
        g = 64;
        b = 175;
      } else if (ny >= 0.10 && ny <= 0.22 && nx >= 0.05 && nx <= 0.95) {
        // Banner card
        r = 255;
        g = 255;
        b = 255;
      } else if (ny >= 0.25 && ny <= 0.42 && nx >= 0.05 && nx <= 0.95) {
        // Stats cards
        r = 255;
        g = 255;
        b = 255;
      } else if (ny >= 0.45 && ny <= 0.90 && nx >= 0.05 && nx <= 0.95) {
        // Table view card
        r = 255;
        g = 255;
        b = 255;
      }

      // Bottom bar if mobile
      if (isMobile && ny > 0.92) {
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(32, 32, false));

// Android Rich Install UI Screenshots
fs.writeFileSync(path.join(publicDir, 'screenshot-mobile.png'), generateScreenshot(540, 960, true));
fs.writeFileSync(path.join(publicDir, 'screenshot-desktop.png'), generateScreenshot(960, 540, false));

console.log('Successfully generated all PWA icons & Android screenshots!');
