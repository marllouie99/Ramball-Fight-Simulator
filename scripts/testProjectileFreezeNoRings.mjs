// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  const calls = [];
  return {
    calls,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    arc: (...args) => { calls.push({ fn: 'arc', args }); },
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: noop,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    canvas: { width: 540, height: 960 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;

globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => {
    if (id === 'arena') return mockCanvas;
    const el = { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {}, appendChild: () => ({}), removeChild: () => ({}), children: [], querySelector: () => null, querySelectorAll: () => [] };
    el.firstElementChild = el;
    return el;
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    const el = { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {}, appendChild: () => ({}), removeChild: () => ({}), children: [], querySelector: () => null, querySelectorAll: () => [] };
    el.firstElementChild = el;
    return el;
  },
  body: { style: {} }
};
globalThis.Image = class {
  constructor() {
    this.width = 100;
    this.height = 100;
    this.complete = true;
  }
};
globalThis.Audio = class {
  constructor() {
    this.play = () => Promise.resolve();
    this.pause = () => {};
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
    this.cloneNode = () => new globalThis.Audio();
  }
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const { drawProjectiles } = await import('../js/graphics/renderers/projectileRenderer.js');
const { projectileSystem } = await import('../js/systems/projectileSystem.js');
const { state } = await import('../js/core/state.js');
const assert = (await import('assert')).default;

console.log('Testing Removal of Visual Ring on Frozen Projectiles (Getsuga & all projectiles)...');

// Create frozen projectiles: Getsuga Tensho
const frozenGetsuga = {
  x: 200,
  y: 200,
  r: 100,
  isGetsuga: true,
  getsugaForm: 'bankai',
  isFrozenByInfinity: true,
  infinityFreezeTimer: 180,
  life: 180,
  maxLife: 240,
  owner: 0,
  vx: 0,
  vy: 0
};

projectileSystem.projectiles = [frozenGetsuga];
state.fighters = [{ r: 25, x: 100, y: 100, hp: 100 }];

mockCtx.calls.length = 0;
drawProjectiles(mockCtx, projectileSystem);

console.log('arc calls for frozen Getsuga:', mockCtx.calls.filter(c => c.fn === 'arc'));
assert.strictEqual(mockCtx.calls.filter(c => c.fn === 'arc').length, 0, 'No arc calls for frozen Getsuga (pixel art rendering)');

console.log('✔ Verified zero visual rings drawn around frozen Getsuga Tensho');
console.log('🎉 ALL PROJECTILE FREEZE RING REMOVAL TESTS PASSED!');
