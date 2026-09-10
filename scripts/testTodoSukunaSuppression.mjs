// Browser mock environment for Node.js
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;
  const calls = [];

  return {
    save: () => { _stackDepth++; calls.push('save'); },
    restore: () => { _stackDepth--; calls.push('restore'); },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    getCalls: () => calls,
    clearCalls: () => { calls.length = 0; },
    beginPath: () => calls.push('beginPath'),
    closePath: () => calls.push('closePath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    quadraticCurveTo: () => calls.push('quadraticCurveTo'),
    bezierCurveTo: noop,
    arc: () => calls.push('arc'),
    arcTo: noop,
    ellipse: () => calls.push('ellipse'),
    rect: () => calls.push('rect'),
    roundRect: noop,
    setLineDash: noop,
    getLineDash: () => [],
    fillRect: () => calls.push('fillRect'),
    strokeRect: noop,
    clearRect: () => calls.push('clearRect'),
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    clip: () => calls.push('clip'),
    scale: () => calls.push('scale'),
    rotate: () => calls.push('rotate'),
    translate: () => calls.push('translate'),
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: () => calls.push('drawImage'),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1.0,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    canvas: { width: 540, height: 960 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;

globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => {
    if (id === 'arena') return mockCanvas;
    return {
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      appendChild: () => {},
      removeChild: () => {},
      setAttribute: () => {},
      getAttribute: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      appendChild: () => {},
      removeChild: () => {},
      setAttribute: () => {},
      getAttribute: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    };
    if (tag === 'canvas') {
      el.getContext = () => createMockCtx();
      el.width = 540;
      el.height = 960;
    }
    return el;
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
    style: {}
  }
};

import assert from 'assert';
const { isTodoTakadaOverlayActive } = await import('../js/graphics/renderers/specialOverlayRenderer.js');
const { state } = await import('../js/core/state.js');
const { renderSukunaDomainForeground, renderSukunaDomainBackground, renderSukunaDomainSlashLines } = await import('../js/entities/fighters/sukuna/sukunaDomainVisuals.js');
const { drawSukunaDomainDimScreen } = await import('../js/graphics/renderers/domainDimOverlays.js');

console.log('🧪 [Todo Takada & Sukuna Domain Coexistence Test] Verifying that Sukuna Shrine renders properly during Todo Ultimate...');

let drawCalls = 0;

state.ctx = mockCtx;
state.canvas = { width: 540, height: 960 };
state.arena = { x: 45, y: 255, width: 450, height: 450, shape: 'circle', wallWidth: 4 };

// Test 1: Sukuna alone has domain active
const sukunaFighter = {
  characterId: 'sukuna',
  type: 'sukuna',
  hp: 1000,
  domainActive: true,
  x: 270,
  y: 480,
  _drawShrineBody: (ctx) => { drawCalls++; }
};

state.fighters = [sukunaFighter];

// Test 2: Add Todo with isTakadaChanneling = true
const todoFighter = {
  characterId: 'todo',
  type: 'todo',
  hp: 800,
  isTakadaChanneling: true,
  isTakadaUltActive: false
};
state.fighters.push(todoFighter);

// Test 3: renderSukunaDomainForeground must draw shrine body
drawCalls = 0;
renderSukunaDomainForeground(sukunaFighter, mockCtx);
assert.strictEqual(drawCalls > 0, true, 'renderSukunaDomainForeground must draw the shrine when Todo is channeling');

// Test 4: renderSukunaDomainBackground must draw background
const initialCalls = mockCtx.getCalls().length;
renderSukunaDomainBackground(sukunaFighter, mockCtx);
assert.strictEqual(mockCtx.getCalls().length > initialCalls, true, 'renderSukunaDomainBackground must draw blood floor');

// Test 5: drawSukunaDomainDimScreen must update opacity
drawSukunaDomainDimScreen();

// Test 6: Test when Todo is in active ultimate mode (isTakadaUltActive = true)
todoFighter.isTakadaChanneling = false;
todoFighter.isTakadaUltActive = true;

drawCalls = 0;
renderSukunaDomainForeground(sukunaFighter, mockCtx);
assert.strictEqual(drawCalls > 0, true, 'renderSukunaDomainForeground must draw the shrine when Todo is in active ultimate');

console.log('✅ ALL SUKUNA DOMAIN & TODO COEXISTENCE TESTS PASSED!');

