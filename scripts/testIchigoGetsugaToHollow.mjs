// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    save: noop, restore: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, fill: noop, stroke: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop, fillText: noop,
    strokeText: noop, measureText: () => ({ width: 50 }), drawImage: noop,
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    globalAlpha: 1.0, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, setLineDash: noop,
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
    if (id === 'arena' || id === 'floating-text-canvas' || id === 'hud-canvas') return mockCanvas;
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
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.Image = class {
  constructor() {
    this.src = '';
    this.width = 100;
    this.height = 100;
  }
};
globalThis.Audio = class {
  constructor() {
    this.src = '';
    this.play = () => Promise.resolve();
    this.pause = () => {};
    this.cloneNode = () => new globalThis.Audio();
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
  }
};

const { state } = await import('../js/core/state.js');
const { CONFIG } = await import('../js/core/config.js');
const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');

console.log('Testing Ichigo Getsuga Tensho -> Hollow Mask seamless awakening...');

const ichigo = new IchigoFighter({ startX: 200, startY: 200 });
const opponent = new SukunaFighter({ startX: 400, startY: 200 });

state.fighters = [ichigo, opponent];
state.arena = { cx: 400, cy: 300, radius: 250 };
state.gameState = 'playing';

// 1. Activate Bankai
ichigo.bankaiActive = true;
ichigo.bankaiTimer = 108; // threshold where Final Getsuga triggers
ichigo.bankaiFinalGetsugaTriggered = false;
ichigo.hollowMaskActive = false;
ichigo.hollowMaskUsed = false;

// Update until Final Getsuga starts channeling
ichigo.update(opponent, 0, state.arena);

if (!ichigo.isChannelingGetsuga || !ichigo.bankaiFinalGetsugaTriggered) {
  throw new Error('Expected Ichigo to begin channeling Final Massive Getsuga at Bankai threshold!');
}
console.log('✅ Ichigo successfully triggered Final Massive Getsuga at Bankai threshold.');

// Step through charge frames until wave is unleashed
while (ichigo.isChannelingGetsuga) {
  ichigo.update(opponent, 0, state.arena);
}

console.log('✅ Final Massive Getsuga wave unleashed.');

// Now step through remaining Bankai frames until Bankai expires
let framesUntilHollow = 0;
while (!ichigo.hollowMaskActive && framesUntilHollow < 200) {
  ichigo.update(opponent, 0, state.arena);
  framesUntilHollow++;
}

if (!ichigo.hollowMaskActive) {
  throw new Error('Expected Hollow Mask to awaken seamlessly after Getsuga and Bankai expiration!');
}

console.log(`✅ Hollow Mask awakened seamlessly in ${framesUntilHollow} frames after release (no mini pause).`);
console.log('🎉 All Ichigo Getsuga -> Hollow tests passed successfully!');
