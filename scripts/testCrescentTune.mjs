import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

class PixelCanvas {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.buffer = Buffer.alloc(w * h * 4, 0);
    for (let i = 0; i < w * h; i++) {
      this.buffer[i * 4] = 0x14;
      this.buffer[i * 4 + 1] = 0x10;
      this.buffer[i * 4 + 2] = 0x1A;
      this.buffer[i * 4 + 3] = 0xFF;
    }
  }

  setPixel(x, y, hex) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    let r = 0, g = 0, b = 0, a = 255;
    if (hex.startsWith('#')) {
      let h = hex.slice(1);
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16);
      r = (n >> 16) & 0xFF;
      g = (n >> 8) & 0xFF;
      b = n & 0xFF;
    }
    const idx = (y * this.width + x) * 4;
    this.buffer[idx] = r;
    this.buffer[idx + 1] = g;
    this.buffer[idx + 2] = b;
    this.buffer[idx + 3] = a;
  }

  fillRect(x, y, w, h, hex) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, hex);
      }
    }
  }

  toPng() {
    const W = this.width;
    const H = this.height;
    const rowSize = W * 4;
    const rawData = Buffer.alloc((rowSize + 1) * H);
    for (let y = 0; y < H; y++) {
      rawData[y * (rowSize + 1)] = 0;
      this.buffer.copy(rawData, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
    }

    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      crcTable[i] = c;
    }
    const crc32 = (buf) => {
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
      return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const makeChunk = (type, data) => {
      const len = data.length;
      const chunk = Buffer.alloc(12 + len);
      chunk.writeUInt32BE(len, 0);
      chunk.write(type, 4, 4, 'ascii');
      data.copy(chunk, 8);
      const crc = crc32(chunk.subarray(4, 8 + len));
      chunk.writeUInt32BE(crc, 8 + len);
      return chunk;
    };

    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W, 0);
    ihdr.writeUInt32BE(H, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const compressed = zlib.deflateSync(rawData);
    const idatChunk = makeChunk('IDAT', compressed);
    const ihdrChunk = makeChunk('IHDR', ihdr);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  }
}

/**
 * 1:1 Pixel Art Flame Crescent Matching User Reference Image Exactly
 */
function renderExactReferenceCrescent(canvas, cx, cy, radius = 58, arc = (130 * Math.PI) / 180, angle = 0, P = 2) {
  const minAng = -arc * 0.5;
  const maxAng = arc * 0.5;
  const span = maxAng - minAng;
  const maxThick = 15.0; // 1:1 thickness matching user reference image

  const getToothNotch = (t) => {
    if (t < 0.12 || t > 0.88) return 0;
    const localT = (t - 0.12) / 0.76;
    // 3 prominent saw-tooth flame teeth
    const toothPhase = (localT * 3.0) % 1.0;
    const saw = Math.sin(toothPhase * Math.PI);
    return Math.pow(Math.max(0, saw), 1.5) * (P * 3.0);
  };

  const isInside = (rx, ry) => {
    const dist = Math.hypot(rx, ry);
    if (dist > radius || dist <= 0) return false;
    const ang = Math.atan2(ry, rx);
    if (ang < minAng || ang > maxAng) return false;

    const t = (ang - minAng) / span;
    const taper = Math.sin(t * Math.PI);
    if (taper <= 0) return false;

    const toothCut = getToothNotch(t);
    const innerR = radius - (maxThick * Math.pow(taper, 0.70) - toothCut);
    return dist >= innerR;
  };

  const R = radius;
  const minX = Math.floor(-R / P) * P;
  const maxX = Math.ceil(R / P) * P;
  const minY = Math.floor(-R / P) * P;
  const maxY = Math.ceil(R / P) * P;

  for (let gy = minY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rx = gx * cosA + gy * sinA;
      const ry = -gx * sinA + gy * cosA;

      if (!isInside(rx, ry)) continue;

      const px = cx + gx;
      const py = cy + gy;

      // 4-neighbor boundary test for solid 1px dark manga outline
      const isBorder = !isInside(rx + P, ry) ||
                       !isInside(rx - P, ry) ||
                       !isInside(rx, ry + P) ||
                       !isInside(rx, ry - P);

      if (isBorder) {
        canvas.fillRect(px, py, P, P, '#14101A');
        continue;
      }

      const dist = Math.hypot(rx, ry);
      const ang = Math.atan2(ry, rx);
      const t = (ang - minAng) / span;
      const depth = R - dist;

      // 1:1 color scheme from user reference image:
      // Outer cutting rim: Bright Yellow (#FFE600) with White (#FFFFFF) apex core
      if (depth < P * 1.5) {
        if (t > 0.25 && t < 0.75 && depth < P * 0.9) {
          canvas.fillRect(px, py, P, P, '#FFFFFF'); // White hot outer edge
        } else {
          canvas.fillRect(px, py, P, P, '#FFE600'); // Radiant Yellow outer rim
        }
      } 
      // Mid layer: Radiant Gold to Vibrant Fiery Orange
      else if (depth < P * 3.2) {
        if (t > 0.35 && t < 0.65 && depth < P * 2.2) {
          canvas.fillRect(px, py, P, P, '#FFF033'); // Warm gold midtone
        } else {
          canvas.fillRect(px, py, P, P, '#FF7A00'); // Vibrant Orange body
        }
      }
      // Flame Body & Inner Teeth Layer:
      else {
        const toothVal = getToothNotch(t);
        if (toothVal > P * 1.6) {
          canvas.fillRect(px, py, P, P, '#261830'); // Deep dark purple-black crevice cutout
        } else if (toothVal > P * 0.4) {
          canvas.fillRect(px, py, P, P, '#FFE600'); // Radiant yellow tooth highlight
        } else {
          canvas.fillRect(px, py, P, P, '#FF5500'); // Fiery deep orange
        }
      }
    }
  }
}

const canvas = new PixelCanvas(160, 220);
renderExactReferenceCrescent(canvas, 45, 110, 58, (130 * Math.PI) / 180, 0, 2);

const outPng = path.resolve('C:/Users/asus/.gemini/antigravity-ide/brain/5afe6465-99f7-4b16-9ba7-329b93e35a49/crescent_tune_preview.png');
fs.writeFileSync(outPng, canvas.toPng());
console.log('Saved tune preview to:', outPng);
