import fs from 'fs';
import path from 'path';

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

// Minimal canvas mock
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
      globalAlpha: 1.0,
      transform: [1, 0, 0, 1, 0, 0],
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

  set fillStyle(val) { this.currentState.fillStyle = val; }
  get fillStyle() { return this.currentState.fillStyle; }
  set strokeStyle(val) { this.currentState.strokeStyle = val; }
  get strokeStyle() { return this.currentState.strokeStyle; }
  set lineWidth(val) { this.currentState.lineWidth = val; }
  get lineWidth() { return this.currentState.lineWidth; }
  set globalAlpha(val) { this.currentState.globalAlpha = val; }
  get globalAlpha() { return this.currentState.globalAlpha; }

  beginPath() {}
  closePath() {}
  clip() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  stroke() {}
  fill() {}

  fillRect(x, y, w, h) {
    const [a, b, c, d, e, f] = this.currentState.transform;
    const x1 = a * x + c * y + e;
    const y1 = b * x + d * y + f;
    const x2 = a * (x + w) + c * y + e;
    const y2 = b * (x + w) + d * y + f;
    const x3 = a * (x + w) + c * (y + h) + e;
    const y3 = b * (x + w) + d * (y + h) + f;
    const x4 = a * x + c * (y + h) + e;
    const y4 = b * x + d * (y + h) + f;

    const minX = Math.min(x1, x2, x3, x4);
    const maxX = Math.max(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4);
    const maxY = Math.max(y1, y2, y3, y4);

    this.elements.push({
      type: 'rect',
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      fill: this.currentState.fillStyle,
      alpha: this.currentState.globalAlpha
    });
  }
}

async function test() {
  console.log('Testing Reze basic attack pixel art components...');
  const { drawRezeSkin } = await import('../js/graphics/fighters/rezeSkin.js');
  const { drawRezePixelMartialArc } = await import('../js/graphics/weapons/rezeWeaponGraphics.js');
  const { RezeFighter } = await import('../js/entities/fighters/RezeFighter.js');

  const reze = new RezeFighter({ hp: 340 });
  console.log('RezeFighter instantiated successfully. HP:', reze.hp);

  const canvas = new SvgCanvas(600, 300);

  // Test Combo 1 (Left Palm Snap)
  reze.punchComboCount = 1;
  reze.punchAnimTimer = 7; // mid-punch
  reze.gunAngle = 0;
  drawRezeSkin(canvas, reze);
  drawRezePixelMartialArc(canvas, {
    x: reze.x,
    y: reze.y,
    angle: 0,
    arc: (120 * Math.PI) / 180,
    radius: 65 * 1.15,
    timer: 6,
    maxTimer: 12,
    isFinisher: false,
    isHybrid: false,
    sweepDir: 1
  });

  // Test Combo 2 (Right Cross Chop)
  reze.punchComboCount = 2;
  reze.punchAnimTimer = 7;
  drawRezeSkin(canvas, reze);
  drawRezePixelMartialArc(canvas, {
    x: reze.x,
    y: reze.y,
    angle: 0,
    arc: (120 * Math.PI) / 180,
    radius: 65 * 1.15,
    timer: 6,
    maxTimer: 12,
    isFinisher: false,
    isHybrid: false,
    sweepDir: -1
  });

  // Test Combo 3 (Finisher - Spark Slap)
  reze.punchComboCount = 0;
  reze.punchAnimTimer = 8;
  drawRezeSkin(canvas, reze);
  drawRezePixelMartialArc(canvas, {
    x: reze.x,
    y: reze.y,
    angle: 0,
    arc: (120 * Math.PI) / 180,
    radius: 65 * 1.35,
    timer: 8,
    maxTimer: 16,
    isFinisher: true,
    isHybrid: false,
    sweepDir: 1
  });

  // Test Bomb Hybrid Form Finisher
  reze.isHybridModeActive = true;
  drawRezeSkin(canvas, reze);
  drawRezePixelMartialArc(canvas, {
    x: reze.x,
    y: reze.y,
    angle: 0,
    arc: (120 * Math.PI) / 180,
    radius: 75 * 1.35,
    timer: 8,
    maxTimer: 16,
    isFinisher: true,
    isHybrid: true,
    sweepDir: 1
  });

  console.log(`Rendered ${canvas.elements.length} pixel elements across all 4 combat states successfully!`);
  console.log('ALL TESTS PASSED.');
}

test().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
