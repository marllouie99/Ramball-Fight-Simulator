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

  beginPath() {
    this.currentPath = [];
  }

  closePath() {
    if (this.currentPath) this.currentPath.push('Z');
  }

  moveTo(x, y) {
    if (!this.currentPath) this.currentPath = [];
    const pt = this._applyTransform(x, y);
    this.currentPath.push(`M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
  }

  lineTo(x, y) {
    if (!this.currentPath) this.currentPath = [];
    const pt = this._applyTransform(x, y);
    this.currentPath.push(`L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
  }

  quadraticCurveTo(cpx, cpy, x, y) {
    if (!this.currentPath) this.currentPath = [];
    const cp = this._applyTransform(cpx, cpy);
    const pt = this._applyTransform(x, y);
    this.currentPath.push(`Q ${cp.x.toFixed(2)} ${cp.y.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
  }

  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    if (!this.currentPath) this.currentPath = [];
    const cp1 = this._applyTransform(cp1x, cp1y);
    const cp2 = this._applyTransform(cp2x, cp2y);
    const pt = this._applyTransform(x, y);
    this.currentPath.push(`C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
  }

  arc(cx, cy, r, sa, ea) {
    // Approximate circle or arc
    if (!this.currentPath) this.currentPath = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const a = sa + (ea - sa) * (i / steps);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const pt = this._applyTransform(x, y);
      this.currentPath.push(`${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
    }
  }

  clip() {
    // For SVG mock, ignore clip or record as clipPath
  }

  fill() {
    if (this.currentPath && this.currentPath.length > 0) {
      this.elements.push(`<path d="${this.currentPath.join(' ')}" fill="${this.currentState.fillStyle}" />`);
    }
  }

  stroke() {
    if (this.currentPath && this.currentPath.length > 0) {
      this.elements.push(`<path d="${this.currentPath.join(' ')}" fill="none" stroke="${this.currentState.strokeStyle}" stroke-width="${this.currentState.lineWidth}" />`);
    }
  }

  fillRect(x, y, w, h) {
    const p1 = this._applyTransform(x, y);
    const p2 = this._applyTransform(x + w, y);
    const p3 = this._applyTransform(x + w, y + h);
    const p4 = this._applyTransform(x, y + h);
    this.elements.push(`<polygon points="${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} ${p3.x.toFixed(2)},${p3.y.toFixed(2)} ${p4.x.toFixed(2)},${p4.y.toFixed(2)}" fill="${this.currentState.fillStyle}" />`);
  }

  _applyTransform(x, y) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    return {
      x: a * x + c * y + e,
      y: b * x + d * y + f
    };
  }

  toSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" style="background:#111; shape-rendering:crispEdges;">
${this.elements.join('\n')}
</svg>`;
  }

  // Render software raster buffer and save as PNG using built-in zlib
  toPng(scale = 4) {
    const W = this.width * scale;
    const H = this.height * scale;
    const rawData = Buffer.alloc(H * (W * 4 + 1)); // 1 filter byte (0) per row + RGBA

    // Fill background with #1A1D24FF
    for (let y = 0; y < H; y++) {
      const rowStart = y * (W * 4 + 1);
      rawData[rowStart] = 0; // Filter: None
      for (let x = 0; x < W; x++) {
        const p = rowStart + 1 + x * 4;
        rawData[p] = 0x1A;     // R
        rawData[p + 1] = 0x1D; // G
        rawData[p + 2] = 0x24; // B
        rawData[p + 3] = 0xFF; // A
      }
    }

    // Rasterize polygons
    for (let el of this.elements) {
      const colMatch = el.match(/fill="([^"]+)"/);
      const pointsMatch = el.match(/points="([^"]+)"/);
      if (!colMatch || !pointsMatch) continue;
      const hex = colMatch[1];
      let r = 0, g = 0, b = 0, a = 255;
      if (hex.startsWith('#') && hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
      } else {
        continue;
      }

      const pts = pointsMatch[1].split(' ').map(s => {
        const [px, py] = s.split(',').map(Number);
        return { x: Math.round(px * scale), y: Math.round(py * scale) };
      });
      if (pts.length < 3) continue;

      let minY = Math.max(0, Math.min(...pts.map(p => p.y)));
      let maxY = Math.min(H - 1, Math.max(...pts.map(p => p.y)));

      for (let y = minY; y <= maxY; y++) {
        const nodes = [];
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          const p1 = pts[i];
          const p2 = pts[j];
          if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
            const x = Math.round(p1.x + (y - p1.y) / (p2.y - p1.y) * (p2.x - p1.x));
            nodes.push(x);
          }
        }
        nodes.sort((a, b) => a - b);
        const rowStart = y * (W * 4 + 1);
        for (let i = 0; i < nodes.length; i += 2) {
          if (nodes[i + 1] === undefined) break;
          const startX = Math.max(0, nodes[i]);
          const endX = Math.min(W - 1, nodes[i + 1]);
          for (let x = startX; x <= endX; x++) {
            const p = rowStart + 1 + x * 4;
            rawData[p] = r;
            rawData[p + 1] = g;
            rawData[p + 2] = b;
            rawData[p + 3] = a;
          }
        }
      }
    }

    // CRC32 table
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      crcTable[n] = c;
    }
    function crc32(buf) {
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function makeChunk(type, data) {
      const typeBuf = Buffer.from(type, 'ascii');
      const len = data.length;
      const chunk = Buffer.alloc(12 + len);
      chunk.writeUInt32BE(len, 0);
      typeBuf.copy(chunk, 4);
      data.copy(chunk, 8);
      const crc = crc32(Buffer.concat([typeBuf, data]));
      chunk.writeUInt32BE(crc, 8 + len);
      return chunk;
    }

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

// Dynamically import rezeSkin
async function run() {
  const { drawRezeSkin } = await import('../js/graphics/fighters/rezeSkin.js');

  const svg = new SvgCanvas(240, 120);

  // 1. Human Form on Left (x = 60, y = 60)
  const fighterHuman = {
    x: 60,
    y: 60,
    r: 25,
    gunAngle: 0,
    isHybridModeActive: false,
    _isWinnerReveal: true,
  };
  drawRezeSkin(svg, fighterHuman);

  // 2. Bomb Devil Form on Right (x = 180, y = 60)
  const fighterBomb = {
    x: 180,
    y: 60,
    r: 25,
    gunAngle: 0,
    isHybridModeActive: true,
    _isWinnerReveal: true,
  };
  drawRezeSkin(svg, fighterBomb);

  const outPng = path.resolve('scratch/reze_both_forms.png');
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  fs.writeFileSync(outPng, svg.toPng(4)); // 960x480 resolution!
  console.log('Saved PNG to:', outPng);
}

run().catch(console.error);
