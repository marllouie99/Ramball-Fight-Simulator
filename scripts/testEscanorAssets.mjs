// Test script to accurately composite Escanor-skin-model.png and Escanor-model-mustache.png
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let idatChunks = [];
  let w = buf.readUInt32BE(16);
  let h = buf.readUInt32BE(20);
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  // Unfilter scanlines
  const raw = new Uint8ClampedArray(w * h * 4);
  const stride = w * 4 + 1;
  for (let y = 0; y < h; y++) {
    const rowStart = y * stride + 1;
    for (let x = 0; x < w; x++) {
      const srcIdx = rowStart + x * 4;
      const dstIdx = (y * w + x) * 4;
      raw[dstIdx + 0] = decompressed[srcIdx + 0];
      raw[dstIdx + 1] = decompressed[srcIdx + 1];
      raw[dstIdx + 2] = decompressed[srcIdx + 2];
      raw[dstIdx + 3] = decompressed[srcIdx + 3];
    }
  }
  return { w, h, data: raw };
}

const skin = decodePng('Assets/model/Escanor-skin-model.png');
const mustache = decodePng('Assets/model/Escanor-model-mustache.png');

console.log('Decoded skin:', skin.w, skin.h);
console.log('Decoded mustache:', mustache.w, mustache.h);

// Composite test onto a 600x600 canvas
const canvasW = 600;
const canvasH = 600;
const buffer = new Uint8ClampedArray(canvasW * canvasH * 4);
for (let i = 0; i < canvasW * canvasH; i++) {
  buffer[i * 4 + 0] = 0x0F;
  buffer[i * 4 + 1] = 0x13;
  buffer[i * 4 + 2] = 0x1C;
  buffer[i * 4 + 3] = 0xFF;
}

function blendPixel(dx, dy, r, g, b, a) {
  if (dx < 0 || dx >= canvasW || dy < 0 || dy >= canvasH) return;
  const idx = (dy * canvasW + dx) * 4;
  const alpha = a / 255;
  const invAlpha = 1.0 - alpha;
  buffer[idx + 0] = Math.round(r * alpha + buffer[idx + 0] * invAlpha);
  buffer[idx + 1] = Math.round(g * alpha + buffer[idx + 1] * invAlpha);
  buffer[idx + 2] = Math.round(b * alpha + buffer[idx + 2] * invAlpha);
  buffer[idx + 3] = 255;
}

function drawSprite(sprite, destX, destY, destW, destH) {
  for (let dy = 0; dy < destH; dy++) {
    const sy = Math.floor((dy / destH) * sprite.h);
    for (let dx = 0; dx < destW; dx++) {
      const sx = Math.floor((dx / destW) * sprite.w);
      const srcIdx = (sy * sprite.w + sx) * 4;
      const r = sprite.data[srcIdx + 0];
      const g = sprite.data[srcIdx + 1];
      const b = sprite.data[srcIdx + 2];
      const a = sprite.data[srcIdx + 3];
      if (a > 10) {
        blendPixel(destX + dx, destY + dy, r, g, b, a);
      }
    }
  }
}

// Center of canvas: (300, 300)
// Target fighter radius R = 100
const R = 100;
// In Escanor-skin-model.png, circle is centered at (245, 275) with radius ~ 140
const scale = R / 140.0;
const skinW = Math.round(skin.w * scale);
const skinH = Math.round(skin.h * scale);
const skinX = Math.round(300 - 245 * scale);
const skinY = Math.round(300 - 275 * scale);

drawSprite(skin, skinX, skinY, skinW, skinH);

// In Escanor-skin-model.png, the mustache sits on the face right above the golden armor
// Mustache natural aspect ratio: 1774 / 887 = 2.0
const mustacheW = Math.round(R * 1.18);
const mustacheH = Math.round(mustacheW / 2.0);
const mustacheX = Math.round(300 - mustacheW / 2.0);
const mustacheY = Math.round(300 - R * 0.12);

drawSprite(mustache, mustacheX, mustacheY, mustacheW, mustacheH);

// Save output
function savePNG(filename) {
  const uncompressed = Buffer.alloc(canvasH * (canvasW * 4 + 1));
  for (let y = 0; y < canvasH; y++) {
    uncompressed[y * (canvasW * 4 + 1)] = 0;
    for (let x = 0; x < canvasW; x++) {
      const srcIdx = (y * canvasW + x) * 4;
      const dstIdx = y * (canvasW * 4 + 1) + 1 + x * 4;
      uncompressed[dstIdx + 0] = buffer[srcIdx + 0];
      uncompressed[dstIdx + 1] = buffer[srcIdx + 1];
      uncompressed[dstIdx + 2] = buffer[srcIdx + 2];
      uncompressed[dstIdx + 3] = buffer[srcIdx + 3];
    }
  }
  const compressed = zlib.deflateSync(uncompressed);
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c >>> 0;
  }
  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < typeBuf.length; i++) crc = crcTable[(crc ^ typeBuf[i]) & 0xFF] ^ (crc >>> 8);
    for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvasW, 0);
  ihdr.writeUInt32BE(canvasH, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const finalBuf = Buffer.concat([header, createChunk('IHDR', ihdr), createChunk('IDAT', compressed), createChunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(filename, finalBuf);
}

savePNG('C:/Users/asus/.gemini/antigravity-ide/brain/e77f8700-68fe-4492-a1de-881b34b23000/escanor_composite_test.png');
console.log('✅ Wrote composite test to escanor_composite_test.png');
