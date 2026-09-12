// Script to render Denji and Power skin models to PNG for visual inspection
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
const mockCanvas = {
  width: 540,
  height: 960,
  style: {},
  getContext: () => ({
    save: () => {}, restore: () => {}, beginPath: () => {}, closePath: () => {},
    moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {},
    arc: () => {}, rect: () => {}, fillRect: () => {}, clearRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 50 }),
  })
};

globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => (id === 'arena' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => (tag === 'canvas' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {} } }),
  body: { style: {} }
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const powerRGBA = fs.existsSync('Assets/model/POWER-MODEL-SKIN.rgba') 
  ? fs.readFileSync('Assets/model/POWER-MODEL-SKIN.rgba') 
  : null;

globalThis.Image = class {
  constructor() {
    this.complete = true;
    this.naturalWidth = 500;
    this.naturalHeight = 500;
    this.width = 500;
    this.height = 500;
    this.data = powerRGBA;
  }
};

const { drawDenjiSkin, drawDenjiHumanPixelBody, drawDenjiChainsawHybridBody } = await import('../js/graphics/fighters/denjiSkin.js');
const { drawPowerSkin, drawPowerPixelBody, drawPowerBloodHammer, drawPowerBloodScythe } = await import('../js/graphics/fighters/powerSkin.js');
const { drawDenjiWeaponPreview } = await import('../js/graphics/weapons/denjiWeaponGraphics.js');
const { drawPowerWeaponPreview } = await import('../js/graphics/weapons/powerWeaponGraphics.js');

export class RasterCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8ClampedArray(width * height * 4);
    this.stateStack = [];
    this.currentState = {
      fillStyle: [0, 0, 0, 255],
      strokeStyle: [0, 0, 0, 255],
      lineWidth: 1,
      transform: [1, 0, 0, 1, 0, 0],
      globalAlpha: 1.0,
      imageSmoothingEnabled: false,
    };
    // Initialize background to dark gunmetal #0F131C
    for (let i = 0; i < width * height; i++) {
      this.buffer[i * 4 + 0] = 0x0F;
      this.buffer[i * 4 + 1] = 0x13;
      this.buffer[i * 4 + 2] = 0x1C;
      this.buffer[i * 4 + 3] = 0xFF;
    }
  }

  save() {
    this.stateStack.push({
      fillStyle: [...this.currentState.fillStyle],
      strokeStyle: [...this.currentState.strokeStyle],
      lineWidth: this.currentState.lineWidth,
      transform: [...this.currentState.transform],
      globalAlpha: this.currentState.globalAlpha,
      imageSmoothingEnabled: this.currentState.imageSmoothingEnabled,
    });
  }

  restore() {
    if (this.stateStack.length > 0) {
      this.currentState = this.stateStack.pop();
    }
  }

  translate(x, y) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    this.currentState.transform = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
  }

  scale(sx, sy) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    this.currentState.transform = [a * sx, b * sx, c * sy, d * sy, e, f];
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [a, b, c, d, e, f] = this.currentState.transform;
    this.currentState.transform = [
      a * cos + c * sin,
      b * cos + d * sin,
      -a * sin + c * cos,
      -b * sin + d * cos,
      e,
      f
    ];
  }

  set fillStyle(val) {
    this.currentState.fillStyle = this._parseColor(val);
  }

  get fillStyle() {
    return this.currentState.fillStyle;
  }

  set strokeStyle(val) {
    this.currentState.strokeStyle = this._parseColor(val);
  }

  get strokeStyle() {
    return this.currentState.strokeStyle;
  }

  set lineWidth(val) {
    this.currentState.lineWidth = val;
  }

  get lineWidth() {
    return this.currentState.lineWidth;
  }

  set globalAlpha(val) {
    this.currentState.globalAlpha = val;
  }

  get globalAlpha() {
    return this.currentState.globalAlpha;
  }

  _parseColor(c) {
    if (typeof c !== 'string') return [0, 0, 0, 255];
    if (c.startsWith('#')) {
      let hex = c.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(ch => ch + ch).join('');
      }
      if (hex.length === 6) {
        const num = parseInt(hex, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
      }
      if (hex.length === 8) {
        const num = parseInt(hex, 16);
        return [(num >> 24) & 255, (num >> 16) & 255, (num >> 8) & 255, num & 255];
      }
    }
    if (c.startsWith('rgba')) {
      const match = c.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), Math.round(parseFloat(match[4]) * 255)];
      }
    }
    if (c.startsWith('rgb')) {
      const match = c.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), 255];
      }
    }
    return [0, 0, 0, 255];
  }

  fillRect(x, y, w, h) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    const alpha = (this.currentState.fillStyle[3] / 255) * this.currentState.globalAlpha;
    const r = this.currentState.fillStyle[0];
    const g = this.currentState.fillStyle[1];
    const bl = this.currentState.fillStyle[2];

    const x0 = a * x + c * y + e;
    const y0 = b * x + d * y + f;
    const x1 = a * (x + w) + c * (y + h) + e;
    const y1 = b * (x + w) + d * (y + h) + f;

    const minX = Math.max(0, Math.floor(Math.min(x0, x1)));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(x0, x1)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1)));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(y0, y1)));

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const idx = (ty * this.width + tx) * 4;
        const bgR = this.buffer[idx + 0];
        const bgG = this.buffer[idx + 1];
        const bgB = this.buffer[idx + 2];

        this.buffer[idx + 0] = Math.round(r * alpha + bgR * (1 - alpha));
        this.buffer[idx + 1] = Math.round(g * alpha + bgG * (1 - alpha));
        this.buffer[idx + 2] = Math.round(bl * alpha + bgB * (1 - alpha));
        this.buffer[idx + 3] = 255;
      }
    }
  }

  beginPath() {
    this._polyPoints = [];
  }

  moveTo(x, y) {
    this._polyPoints = [{ x, y }];
  }

  lineTo(x, y) {
    if (!this._polyPoints) this._polyPoints = [];
    this._polyPoints.push({ x, y });
  }

  closePath() {}

  fill() {
    if (!this._polyPoints || this._polyPoints.length < 3) return;
    const [a, b, c, d, e, f] = this.currentState.transform;
    const tfPoints = this._polyPoints.map(p => ({
      x: a * p.x + c * p.y + e,
      y: b * p.x + d * p.y + f
    }));

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    tfPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    minX = Math.max(0, Math.floor(minX));
    maxX = Math.min(this.width - 1, Math.ceil(maxX));
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(this.height - 1, Math.ceil(maxY));

    const alpha = (this.currentState.fillStyle[3] / 255) * this.currentState.globalAlpha;
    const red = this.currentState.fillStyle[0];
    const grn = this.currentState.fillStyle[1];
    const blu = this.currentState.fillStyle[2];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this._pointInPoly(x + 0.5, y + 0.5, tfPoints)) {
          const idx = (y * this.width + x) * 4;
          const bgR = this.buffer[idx + 0];
          const bgG = this.buffer[idx + 1];
          const bgB = this.buffer[idx + 2];

          this.buffer[idx + 0] = Math.round(red * alpha + bgR * (1 - alpha));
          this.buffer[idx + 1] = Math.round(grn * alpha + bgG * (1 - alpha));
          this.buffer[idx + 2] = Math.round(blu * alpha + bgB * (1 - alpha));
          this.buffer[idx + 3] = 255;
        }
      }
    }
  }

  _pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  drawImage(img, dx, dy, dw, dh) {
    if (!img || !img.data) return;
    const [a, b, c, d, e, f] = this.currentState.transform;
    const srcW = img.width;
    const srcH = img.height;
    const srcData = img.data;

    const x0 = a * dx + c * dy + e;
    const y0 = b * dx + d * dy + f;
    const x1 = a * (dx + dw) + c * (dy + dh) + e;
    const y1 = b * (dx + dw) + d * (dy + dh) + f;

    const minX = Math.max(0, Math.floor(Math.min(x0, x1)));
    const maxX = Math.min(this.width, Math.ceil(Math.max(x0, x1)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1)));
    const maxY = Math.min(this.height, Math.ceil(Math.max(y0, y1)));

    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return;

    for (let ty = minY; ty < maxY; ty++) {
      for (let tx = minX; tx < maxX; tx++) {
        const rx = tx + 0.5 - e;
        const ry = ty + 0.5 - f;
        const lx = (d * rx - c * ry) / det;
        const ly = (-b * rx + a * ry) / det;

        if (lx < dx || lx >= dx + dw || ly < dy || ly >= dy + dh) continue;

        const u = (lx - dx) / dw;
        const v = (ly - dy) / dh;
        const sx = Math.floor(u * srcW);
        const sy = Math.floor(v * srcH);
        if (sx < 0 || sx >= srcW || sy < 0 || sy >= srcH) continue;

        const srcIdx = (sy * srcW + sx) * 4;
        const sA = (srcData[srcIdx + 3] / 255) * this.currentState.globalAlpha;
        if (sA <= 0.01) continue;

        const dstIdx = (ty * this.width + tx) * 4;
        const sR = srcData[srcIdx + 0];
        const sG = srcData[srcIdx + 1];
        const sB = srcData[srcIdx + 2];

        const bgR = this.buffer[dstIdx + 0];
        const bgG = this.buffer[dstIdx + 1];
        const bgB = this.buffer[dstIdx + 2];

        this.buffer[dstIdx + 0] = Math.round(sR * sA + bgR * (1 - sA));
        this.buffer[dstIdx + 1] = Math.round(sG * sA + bgG * (1 - sA));
        this.buffer[dstIdx + 2] = Math.round(sB * sA + bgB * (1 - sA));
        this.buffer[dstIdx + 3] = 255;
      }
    }
  }

  stroke() {}
  arc() {}
  rect() {}
  clearRect() {}

  toPNGBuffer() {
    const { width, height, buffer } = this;
    const lineSize = width * 4 + 1;
    const rawData = Buffer.alloc(lineSize * height);

    for (let y = 0; y < height; y++) {
      rawData[y * lineSize] = 0; // Filter type: None
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = y * lineSize + 1 + x * 4;
        rawData[dstIdx + 0] = buffer[srcIdx + 0];
        rawData[dstIdx + 1] = buffer[srcIdx + 1];
        rawData[dstIdx + 2] = buffer[srcIdx + 2];
        rawData[dstIdx + 3] = buffer[srcIdx + 3];
      }
    }

    const compressed = zlib.deflateSync(rawData);
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function makeChunk(type, data) {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length, 0);
      const typeBuf = Buffer.from(type, 'ascii');
      const payload = Buffer.concat([typeBuf, data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(payload), 0);
      return Buffer.concat([len, payload, crc]);
    }

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type: RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdrChunk = makeChunk('IHDR', ihdrData);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
  }
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

// ─────────────────────────────────────────────
// RENDER DENJI & POWER SHOWCASE POSTER
// ─────────────────────────────────────────────
const canvasW = 720;
const canvasH = 480;
const canvas = new RasterCanvas(canvasW, canvasH);

// 1. Stage 1: Denji Human Form (Left Top)
canvas.save();
canvas.translate(120, 140);
canvas.scale(2.4, 2.4);
const denjiHumanMock = { x: 0, y: 0, r: 25, gunAngle: 0, _isWinnerReveal: true, isHybridModeActive: false };
drawDenjiSkin(canvas, denjiHumanMock);
canvas.restore();

// 2. Stage 2: Denji Chainsaw Devil Form (Left Bottom)
canvas.save();
canvas.translate(120, 340);
canvas.scale(2.4, 2.4);
const denjiHybridMock = { x: 0, y: 0, r: 25, gunAngle: 0, _isWinnerReveal: true, isHybridModeActive: true };
drawDenjiSkin(canvas, denjiHybridMock);
canvas.restore();

// 3. Stage 3: Power Blood Fiend Form (Center Right)
canvas.save();
canvas.translate(360, 240);
canvas.scale(2.4, 2.4);
const powerMock = { x: 0, y: 0, r: 25, gunAngle: 0, _isWinnerReveal: true };
drawPowerSkin(canvas, powerMock);
canvas.restore();

// 4. Stage 4: Power Blood Hammer & Scythe (Far Right)
canvas.save();
canvas.translate(560, 160);
canvas.scale(2.0, 2.0);
drawPowerBloodHammer(canvas, 0, 0, 0, 25);
canvas.restore();

canvas.save();
canvas.translate(560, 320);
canvas.scale(1.8, 1.8);
drawPowerBloodScythe(canvas, 0, 0, 0, 25);
canvas.restore();

const pngBuf = canvas.toPNGBuffer();
const artifactPath = 'C:\\Users\\asus\\.gemini\\antigravity-ide\\brain\\5afe6465-99f7-4b16-9ba7-329b93e35a49\\denji_power_skin_preview.png';
fs.writeFileSync(artifactPath, pngBuf);
console.log('✅ Successfully rendered Denji & Power showcase preview to:', artifactPath);
