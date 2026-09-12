// Script to render Reze preview to SVG and HTML for visual verification
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

// Create a minimal 2D canvas mock that records rects and paths into SVG
class SvgCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.elements = [];
    this.stateStack = [];
    this.currentState = {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      transform: [1, 0, 0, 1, 0, 0], // a, b, c, d, e, f
      clipPath: null,
    };
  }

  save() {
    this.stateStack.push({
      ...this.currentState,
      transform: [...this.currentState.transform]
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
    this.currentState.fillStyle = val;
  }

  get fillStyle() {
    return this.currentState.fillStyle;
  }

  set strokeStyle(val) {
    this.currentState.strokeStyle = val;
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
    return this.currentState.globalAlpha !== undefined ? this.currentState.globalAlpha : 1.0;
  }

  clip() {}

  beginPath() {
    this.currentPath = [];
  }

  closePath() {
    if (this.currentPath && this.currentPath.length > 0) {
      this.currentPath.push('Z');
    }
  }

  moveTo(x, y) {
    if (!this.currentPath) this.currentPath = [];
    const pt = this._transformPoint(x, y);
    this.currentPath.push(`M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
  }

  lineTo(x, y) {
    if (!this.currentPath) this.currentPath = [];
    const pt = this._transformPoint(x, y);
    this.currentPath.push(`L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
  }

  arc(cx, cy, r, startAngle, endAngle) {
    if (!this.currentPath) this.currentPath = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      const pt = this._transformPoint(px, py);
      if (i === 0) {
        this.currentPath.push(`M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
      } else {
        this.currentPath.push(`L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
      }
    }
  }

  fill() {
    if (this.currentPath && this.currentPath.length > 0) {
      this.elements.push({
        type: 'path',
        d: this.currentPath.join(' '),
        fill: this.currentState.fillStyle,
        opacity: this.currentState.globalAlpha || 1.0
      });
    }
  }

  stroke() {
    if (this.currentPath && this.currentPath.length > 0) {
      this.elements.push({
        type: 'path',
        d: this.currentPath.join(' '),
        stroke: this.currentState.strokeStyle,
        lineWidth: this.currentState.lineWidth,
        fill: 'none',
        opacity: this.currentState.globalAlpha || 1.0
      });
    }
  }

  fillRect(x, y, w, h) {
    const p1 = this._transformPoint(x, y);
    const p2 = this._transformPoint(x + w, y);
    const p3 = this._transformPoint(x + w, y + h);
    const p4 = this._transformPoint(x, y + h);

    const d = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`;
    this.elements.push({
      type: 'path',
      d: d,
      fill: this.currentState.fillStyle,
      opacity: this.currentState.globalAlpha || 1.0
    });
  }

  _transformPoint(x, y) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    return {
      x: a * x + c * y + e,
      y: b * x + d * y + f
    };
  }

  toSvg() {
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" style="background:#110E18;">\n`;
    for (let el of this.elements) {
      if (el.type === 'path') {
        const fill = el.fill || 'none';
        const stroke = el.stroke ? ` stroke="${el.stroke}" stroke-width="${el.lineWidth || 1}"` : '';
        const op = el.opacity !== 1.0 ? ` opacity="${el.opacity.toFixed(2)}"` : '';
        out += `  <path d="${el.d}" fill="${fill}"${stroke}${op} />\n`;
      }
    }
    out += '</svg>';
    return out;
  }

  toPng(scale = 2) {
    const W = Math.round(this.width * scale);
    const H = Math.round(this.height * scale);
    const buffer = Buffer.alloc(W * H * 4, 0);

    const bgR = 0x11, bgG = 0x0E, bgB = 0x18, bgA = 0xFF;
    for (let i = 0; i < W * H; i++) {
      const idx = i * 4;
      buffer[idx] = bgR;
      buffer[idx + 1] = bgG;
      buffer[idx + 2] = bgB;
      buffer[idx + 3] = bgA;
    }

    const parseColor = (colStr) => {
      if (!colStr || colStr === 'none') return null;
      if (colStr.startsWith('#')) {
        let hex = colStr.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) hex += 'FF';
        const num = parseInt(hex, 16);
        return [
          (num >> 24) & 0xFF,
          (num >> 16) & 0xFF,
          (num >> 8) & 0xFF,
          num & 0xFF
        ];
      }
      if (colStr.startsWith('rgba') || colStr.startsWith('rgb')) {
        const match = colStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
          return [
            parseInt(match[1], 10),
            parseInt(match[2], 10),
            parseInt(match[3], 10),
            match[4] !== undefined ? Math.round(parseFloat(match[4]) * 255) : 255
          ];
        }
      }
      return [255, 255, 255, 255];
    };

    for (let el of this.elements) {
      if (el.type === 'path' && el.fill && el.fill !== 'none') {
        const col = parseColor(el.fill);
        if (!col) continue;
        const op = (el.opacity !== undefined ? el.opacity : 1.0) * (col[3] / 255);
        if (op <= 0.001) continue;

        const d = el.d;
        const pts = [];
        const matches = [...d.matchAll(/([ML])\s*([\d.-]+)\s*([\d.-]+)/g)];
        for (let m of matches) {
          pts.push({ x: parseFloat(m[2]) * scale, y: parseFloat(m[3]) * scale });
        }
        if (pts.length < 3) continue;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }

        minX = Math.max(0, Math.floor(minX));
        maxX = Math.min(W - 1, Math.ceil(maxX));
        minY = Math.max(0, Math.floor(minY));
        maxY = Math.min(H - 1, Math.ceil(maxY));

        const insidePoly = (px, py) => {
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x, yi = pts[i].y;
            const xj = pts[j].x, yj = pts[j].y;
            const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 0.0000001) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        };

        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            if (insidePoly(px + 0.5, py + 0.5)) {
              const idx = (py * W + px) * 4;
              const srcA = op;
              const dstA = buffer[idx + 3] / 255;
              const outA = srcA + dstA * (1 - srcA);

              buffer[idx]     = Math.round((col[0] * srcA + buffer[idx] * dstA * (1 - srcA)) / outA);
              buffer[idx + 1] = Math.round((col[1] * srcA + buffer[idx + 1] * dstA * (1 - srcA)) / outA);
              buffer[idx + 2] = Math.round((col[2] * srcA + buffer[idx + 2] * dstA * (1 - srcA)) / outA);
              buffer[idx + 3] = Math.round(outA * 255);
            }
          }
        }
      }
    }

    const rowSize = W * 4;
    const rawData = Buffer.alloc((rowSize + 1) * H);
    for (let y = 0; y < H; y++) {
      rawData[y * (rowSize + 1)] = 0; // Filter: None
      buffer.copy(rawData, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
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
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    const compressed = zlib.deflateSync(rawData);
    const idatChunk = makeChunk('IDAT', compressed);
    const ihdrChunk = makeChunk('IHDR', ihdr);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  }
}

// Dynamically import rezeSkin & rezeWeaponGraphics
async function run() {
  const { drawRezeSkin } = await import('../js/graphics/fighters/rezeSkin.js');
  const { drawRezeKnifeSlash, drawRezePixelMartialArc } = await import('../js/graphics/weapons/rezeWeaponGraphics.js');

  const W = 680;
  const H = 260;
  const svg = new SvgCanvas(W, H);

  // Slot 1: Hit 1 (Forehand Quick Knife Slash) at (x = 75, y = 75)
  const fHit1 = {
    x: 75,
    y: 75,
    r: 25,
    gunAngle: 0,
    punchAnimTimer: 5,
    punchMaxTime: 10,
    punchComboCount: 1,
    isHybridModeActive: false
  };
  drawRezeSkin(svg, fHit1);
  drawRezeKnifeSlash(svg, {
    x: 75,
    y: 75,
    angle: 0,
    arc: (100 * Math.PI) / 180,
    radius: 52,
    timer: 8,
    maxTimer: 14,
    sweepDir: 1,
    isThrust: false
  });

  // Slot 2: Hit 2 (Backhand Cross Knife Slash) at (x = 210, y = 75)
  const fHit2 = {
    x: 210,
    y: 75,
    r: 25,
    gunAngle: 0,
    punchAnimTimer: 5,
    punchMaxTime: 10,
    punchComboCount: 2,
    isHybridModeActive: false
  };
  drawRezeSkin(svg, fHit2);
  drawRezeKnifeSlash(svg, {
    x: 210,
    y: 75,
    angle: 0,
    arc: (100 * Math.PI) / 180,
    radius: 52,
    timer: 8,
    maxTimer: 14,
    sweepDir: -1,
    isThrust: false
  });

  // Slot 3: Hit 3 (Finisher — Sleeve Blade Thrust) at (x = 350, y = 75)
  const fHit3 = {
    x: 350,
    y: 75,
    r: 25,
    gunAngle: 0,
    punchAnimTimer: 6,
    punchMaxTime: 12,
    punchComboCount: 0,
    isHybridModeActive: false
  };
  drawRezeSkin(svg, fHit3);
  drawRezeKnifeSlash(svg, {
    x: 350,
    y: 75,
    angle: 0,
    arc: (75 * Math.PI) / 180,
    radius: 58,
    timer: 8,
    maxTimer: 16,
    sweepDir: 1,
    isThrust: true
  });

  // Slot 4: Aerial Attack (Dive Bomb — Reverse Grip Knife) at (x = 520, y = 75)
  const fDiveBomb = {
    x: 520,
    y: 75,
    r: 25,
    gunAngle: 0.35,
    isDiveBombing: true,
    isHybridModeActive: false
  };
  drawRezeSkin(svg, fDiveBomb);
  drawRezeKnifeSlash(svg, {
    x: 520,
    y: 75,
    angle: 0.35,
    arc: (120 * Math.PI) / 180,
    radius: 60,
    timer: 10,
    maxTimer: 16,
    sweepDir: 1,
    isThrust: true
  });

  // Slot 5: Bomb Devil Hybrid Form (Explosive Martial Arts) at (x = 340, y = 190)
  const fBombHybrid = {
    x: 340,
    y: 190,
    r: 25,
    gunAngle: 0,
    punchAnimTimer: 8,
    punchAnimTimer: 7,
    punchMaxTime: 14,
    punchComboCount: 1,
    isHybridModeActive: true
  };
  drawRezeSkin(svg, fBombHybrid);
  drawRezePixelMartialArc(svg, {
    x: 340,
    y: 190,
    angle: 0,
    arc: (120 * Math.PI) / 180,
    radius: 75,
    timer: 10,
    maxTimer: 18,
    isFinisher: false,
    isHybrid: true,
    sweepDir: 1
  });

  const outPng = path.resolve('scratch/reze_basic_attack_preview.png');
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  fs.writeFileSync(outPng, svg.toPng(2)); // High-DPI preview

  const artifactPng = path.resolve('C:/Users/asus/.gemini/antigravity-ide/brain/5afe6465-99f7-4b16-9ba7-329b93e35a49/reze_basic_attack_preview.png');
  fs.writeFileSync(artifactPng, svg.toPng(2));
  console.log('Saved PNG to:', outPng, 'and', artifactPng);
}

run().catch(console.error);
