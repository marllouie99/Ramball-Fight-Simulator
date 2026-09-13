// Script to render Escanor skin model and Divine Axe Rhitta to PNG for visual inspection
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
  const raw = new Uint8ClampedArray(w * h * 4);
  const bpp = 4;
  const stride = w * bpp;
  let srcOffset = 0;

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  for (let y = 0; y < h; y++) {
    const filter = decompressed[srcOffset++];
    const prevRow = y > 0 ? (y - 1) * stride : -1;
    const currRow = y * stride;

    for (let x = 0; x < stride; x++) {
      const rawByte = decompressed[srcOffset++];
      const a = x >= bpp ? raw[currRow + x - bpp] : 0;
      const b = prevRow >= 0 ? raw[prevRow + x] : 0;
      const c = prevRow >= 0 && x >= bpp ? raw[prevRow + x - bpp] : 0;

      let val = 0;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = (rawByte + a) & 0xFF;
      else if (filter === 2) val = (rawByte + b) & 0xFF;
      else if (filter === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xFF;
      else if (filter === 4) val = (rawByte + paeth(a, b, c)) & 0xFF;
      raw[currRow + x] = val;
    }
  }
  return { width: w, height: h, naturalWidth: w, naturalHeight: h, complete: true, data: raw };
}

const loadedSkin = decodePng('Assets/model/Escanor-skin-model.png');
const loadedMustache = decodePng('Assets/model/Escanor-model-mustache.png');
const rawWeapon = decodePng('Assets/model/Escanor-Weapon.png');

// Apply stepped pixelated black outline to rawWeapon
const strokedWeaponData = new Uint8ClampedArray(rawWeapon.width * rawWeapon.height * 4);
for (let i = 0; i < rawWeapon.data.length; i++) strokedWeaponData[i] = rawWeapon.data[i];
const strokeR = 3;
const ww = rawWeapon.width;
const wh = rawWeapon.height;
for (let y = 0; y < wh; y++) {
  for (let x = 0; x < ww; x++) {
    const idx = (y * ww + x) * 4;
    if (rawWeapon.data[idx + 3] > 30) continue;
    let hasNeighbor = false;
    for (let dy = -strokeR; dy <= strokeR; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= wh) continue;
      for (let dx = -strokeR; dx <= strokeR; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= ww) continue;
        if (dx * dx + dy * dy <= strokeR * strokeR) {
          const nIdx = (ny * ww + nx) * 4;
          if (rawWeapon.data[nIdx + 3] > 80) {
            hasNeighbor = true;
            break;
          }
        }
      }
      if (hasNeighbor) break;
    }
    if (hasNeighbor) {
      strokedWeaponData[idx + 0] = 15;
      strokedWeaponData[idx + 1] = 15;
      strokedWeaponData[idx + 2] = 20;
      strokedWeaponData[idx + 3] = 255;
    }
  }
}
const loadedWeapon = { width: ww, height: wh, naturalWidth: ww, naturalHeight: wh, complete: true, data: strokedWeaponData };

globalThis.Image = class {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.width = 0;
    this.height = 0;
  }
  set src(val) {
    if (val.includes('Escanor-skin-model')) {
      Object.assign(this, loadedSkin);
      if (this.onload) this.onload();
    } else if (val.includes('Escanor-model-mustache')) {
      Object.assign(this, loadedMustache);
      if (this.onload) this.onload();
    } else if (val.includes('Escanor-Weapon')) {
      Object.assign(this, loadedWeapon);
      if (this.onload) this.onload();
    }
  }
};

const { drawEscanorSkin, drawEscanorPixelBody } = await import('../js/graphics/fighters/escanorSkin.js');
const { drawDivineAxeRhitta, drawCruelSunOrb, drawPrideFlareShockwave } = await import('../js/graphics/weapons/escanorWeaponGraphics.js');

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

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [a, b, c, d, e, f] = this.currentState.transform;
    this.currentState.transform = [
      a * cos + c * sin,
      b * cos + d * sin,
      -a * sin + c * cos,
      -b * sin + d * cos,
      e, f
    ];
  }

  scale(sx, sy) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    this.currentState.transform = [a * sx, b * sx, c * sy, d * sy, e, f];
  }

  set fillStyle(val) {
    this.currentState.fillStyle = this._parseColor(val);
  }

  set strokeStyle(val) {
    this.currentState.strokeStyle = this._parseColor(val);
  }

  set lineWidth(val) {
    this.currentState.lineWidth = val;
  }

  set globalAlpha(val) {
    this.currentState.globalAlpha = Math.max(0, Math.min(1, val));
  }

  set imageSmoothingEnabled(val) {
    this.currentState.imageSmoothingEnabled = val;
  }

  _parseColor(c) {
    if (!c) return [255, 255, 255, 255];
    if (typeof c !== 'string') return [255, 255, 255, 255];
    c = c.trim();
    if (c.startsWith('#')) {
      let hex = c.substring(1);
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
      if (hex.length === 6) {
        return [
          parseInt(hex.substring(0, 2), 16),
          parseInt(hex.substring(2, 4), 16),
          parseInt(hex.substring(4, 6), 16),
          255
        ];
      }
    }
    const rgbaMatch = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgbaMatch) {
      return [
        parseFloat(rgbaMatch[1]),
        parseFloat(rgbaMatch[2]),
        parseFloat(rgbaMatch[3]),
        rgbaMatch[4] !== undefined ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255
      ];
    }
    return [255, 255, 255, 255];
  }

  _transformPoint(x, y) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    return [a * x + c * y + e, b * x + d * y + f];
  }

  _getInverseTransform() {
    const [a, b, c, d, e, f] = this.currentState.transform;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-8) return null;
    return [
      d / det,
      -b / det,
      -c / det,
      a / det,
      (c * f - d * e) / det,
      (b * e - a * f) / det
    ];
  }

  _toLocal(ix, iy, inv) {
    return [
      inv[0] * ix + inv[2] * iy + inv[4],
      inv[1] * ix + inv[3] * iy + inv[5]
    ];
  }

  fillRect(x, y, w, h) {
    const inv = this._getInverseTransform();
    if (!inv) return;
    const corners = [
      this._transformPoint(x, y),
      this._transformPoint(x + w, y),
      this._transformPoint(x + w, y + h),
      this._transformPoint(x, y + h)
    ];
    const minX = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0]))));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(...corners.map(p => p[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...corners.map(p => p[1]))));

    for (let iy = minY; iy <= maxY; iy++) {
      for (let ix = minX; ix <= maxX; ix++) {
        const [lx, ly] = this._toLocal(ix + 0.5, iy + 0.5, inv);
        if (lx >= x && lx < x + w && ly >= y && ly < y + h) {
          this._blendPixel(ix, iy, this.currentState.fillStyle);
        }
      }
    }
  }

  drawImage(image, dx, dy, dw, dh) {
    if (!image || !image.data) return;
    const inv = this._getInverseTransform();
    if (!inv) return;
    const iw = image.width;
    const ih = image.height;
    const corners = [
      this._transformPoint(dx, dy),
      this._transformPoint(dx + dw, dy),
      this._transformPoint(dx + dw, dy + dh),
      this._transformPoint(dx, dy + dh)
    ];
    const minX = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0]))));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(...corners.map(p => p[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...corners.map(p => p[1]))));

    for (let iy = minY; iy <= maxY; iy++) {
      for (let ix = minX; ix <= maxX; ix++) {
        const [lx, ly] = this._toLocal(ix + 0.5, iy + 0.5, inv);
        if (lx >= dx && lx < dx + dw && ly >= dy && ly < dy + dh) {
          const sx = Math.floor(((lx - dx) / dw) * iw);
          const sy = Math.floor(((ly - dy) / dh) * ih);
          if (sx >= 0 && sx < iw && sy >= 0 && sy < ih) {
            const srcIdx = (sy * iw + sx) * 4;
            const r = image.data[srcIdx + 0];
            const g = image.data[srcIdx + 1];
            const b = image.data[srcIdx + 2];
            const a = image.data[srcIdx + 3];
            if (a > 10) {
              this._blendPixel(ix, iy, [r, g, b, a]);
            }
          }
        }
      }
    }
  }

  beginPath() {
    this._currentArc = null;
    this._path = [];
  }

  closePath() {}

  arc(x, y, radius, startAngle, endAngle) {
    this._currentArc = { x, y, radius, startAngle, endAngle };
  }

  fill() {
    if (this._currentArc) {
      const { x, y, radius } = this._currentArc;
      const inv = this._getInverseTransform();
      if (!inv) return;
      const corners = [
        this._transformPoint(x - radius, y - radius),
        this._transformPoint(x + radius, y - radius),
        this._transformPoint(x + radius, y + radius),
        this._transformPoint(x - radius, y + radius)
      ];
      const minX = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0]))));
      const maxX = Math.min(this.width - 1, Math.ceil(Math.max(...corners.map(p => p[0]))));
      const minY = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
      const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...corners.map(p => p[1]))));

      for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
          const [lx, ly] = this._toLocal(ix + 0.5, iy + 0.5, inv);
          const dist = Math.hypot(lx - x, ly - y);
          if (dist <= radius) {
            this._blendPixel(ix, iy, this.currentState.fillStyle);
          }
        }
      }
    }
  }

  stroke() {
    if (this._currentArc) {
      const { x, y, radius } = this._currentArc;
      const inv = this._getInverseTransform();
      if (!inv) return;
      const lw = (this.currentState.lineWidth || 1) / 2;
      const rInner = radius - lw;
      const rOuter = radius + lw;
      const corners = [
        this._transformPoint(x - rOuter, y - rOuter),
        this._transformPoint(x + rOuter, y - rOuter),
        this._transformPoint(x + rOuter, y + rOuter),
        this._transformPoint(x - rOuter, y + rOuter)
      ];
      const minX = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0]))));
      const maxX = Math.min(this.width - 1, Math.ceil(Math.max(...corners.map(p => p[0]))));
      const minY = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
      const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...corners.map(p => p[1]))));

      for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
          const [lx, ly] = this._toLocal(ix + 0.5, iy + 0.5, inv);
          const dist = Math.hypot(lx - x, ly - y);
          if (dist >= rInner && dist <= rOuter) {
            this._blendPixel(ix, iy, this.currentState.strokeStyle);
          }
        }
      }
    }
  }

  moveTo(x, y) {
    this._lastPoint = [x, y];
  }

  lineTo(x, y) {
    if (!this._lastPoint) {
      this._lastPoint = [x, y];
      return;
    }
    const [x0, y0] = this._lastPoint;
    const [tx0, ty0] = this._transformPoint(x0, y0);
    const [tx1, ty1] = this._transformPoint(x, y);

    const dist = Math.hypot(tx1 - tx0, ty1 - ty0);
    const steps = Math.max(1, Math.ceil(dist * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = Math.floor(tx0 + (tx1 - tx0) * t);
      const py = Math.floor(ty0 + (ty1 - ty0) * t);
      if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
        this._blendPixel(px, py, this.currentState.strokeStyle);
      }
    }
    this._lastPoint = [x, y];
  }

  _blendPixel(x, y, color) {
    const idx = (y * this.width + x) * 4;
    const alpha = (color[3] / 255) * this.currentState.globalAlpha;
    const invAlpha = 1.0 - alpha;

    this.buffer[idx + 0] = Math.round(color[0] * alpha + this.buffer[idx + 0] * invAlpha);
    this.buffer[idx + 1] = Math.round(color[1] * alpha + this.buffer[idx + 1] * invAlpha);
    this.buffer[idx + 2] = Math.round(color[2] * alpha + this.buffer[idx + 2] * invAlpha);
    this.buffer[idx + 3] = 255;
  }

  toPNG() {
    const width = this.width;
    const height = this.height;
    const uncompressedData = Buffer.alloc(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) {
      uncompressedData[y * (width * 4 + 1)] = 0; // Filter: None
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = y * (width * 4 + 1) + 1 + x * 4;
        uncompressedData[dstIdx + 0] = this.buffer[srcIdx + 0];
        uncompressedData[dstIdx + 1] = this.buffer[srcIdx + 1];
        uncompressedData[dstIdx + 2] = this.buffer[srcIdx + 2];
        uncompressedData[dstIdx + 3] = this.buffer[srcIdx + 3];
      }
    }
    const compressed = zlib.deflateSync(uncompressedData);

    function createChunk(type, data) {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length, 0);
      const typeBuf = Buffer.from(type, 'ascii');
      const crcBuf = Buffer.alloc(4);
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < typeBuf.length; i++) {
        crc = crcTable[(crc ^ typeBuf[i]) & 0xFF] ^ (crc >>> 8);
      }
      for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
      }
      crc = (crc ^ 0xFFFFFFFF) >>> 0;
      crcBuf.writeUInt32BE(crc, 0);
      return Buffer.concat([len, typeBuf, data, crcBuf]);
    }

    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[i] = c >>> 0;
    }

    const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // Bit depth
    ihdr[9] = 6; // Color type: RGBA
    ihdr[10] = 0; // Compression
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace

    const ihdrChunk = createChunk('IHDR', ihdr);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
  }
}

console.log('🎨 Rendering Escanor preview sheet to PNG...');

const canvas = new RasterCanvas(1760, 420);

// Panel 1: Escanor Standard Stance (Facing Right)
canvas.save();
canvas.translate(200, 210);
canvas.scale(2.2, 2.2);
drawEscanorSkin(canvas, {
  x: 0, y: 0, r: 25, gunAngle: 0, prideStacks: 2, isTheOneActive: false
});
canvas.restore();

// Panel 2: Escanor Facing Left (Testing Horizontal/Vertical Mirroring Rule 19)
canvas.save();
canvas.translate(680, 210);
canvas.scale(2.2, 2.2);
drawEscanorSkin(canvas, {
  x: 0, y: 0, r: 25, gunAngle: Math.PI, prideStacks: 3, isTheOneActive: false
});
canvas.restore();

// Panel 3: Escanor "The One" High Noon Form
canvas.save();
canvas.translate(1140, 210);
canvas.scale(2.2, 2.2);
drawEscanorSkin(canvas, {
  x: 0, y: 0, r: 25, gunAngle: 0.2, prideStacks: 5, isTheOneActive: true
});
canvas.restore();

// Panel 4: Sacred Treasure Divine Axe Rhitta Standalone Weapon Preview
canvas.save();
canvas.translate(1530, 210);
canvas.scale(2.4, 2.4);
drawDivineAxeRhitta(canvas, 0, 0, 0, 20, { isPreview: true });
canvas.restore();

const pngBuffer = canvas.toPNG();
const targetPath = path.resolve('C:/Users/asus/.gemini/antigravity-ide/brain/e77f8700-68fe-4492-a1de-881b34b23000/escanor_preview.png');
fs.writeFileSync(targetPath, pngBuffer);
console.log('✅ Successfully wrote Escanor preview to:', targetPath);
