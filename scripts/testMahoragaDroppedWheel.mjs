// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  let _stackDepth = 0;
  return {
    save: () => { _stackDepth++; },
    restore: () => { _stackDepth--; },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    drawImage: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    measureText: () => ({ width: 10 }),
    canvas: { width: 800, height: 600 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;
mockCanvas.querySelector = () => mockCanvas;
mockCanvas.querySelectorAll = () => [];
mockCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => mockCanvas,
  querySelectorAll: () => [],
  querySelector: () => mockCanvas,
  createElement: () => ({
    width: 100,
    height: 100,
    style: {},
    getContext: () => mockCtx
  }),
  body: {
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    style: {}
  },
  documentElement: { style: {} }
};

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

globalThis.AudioContext = class {
  createGain() { return { gain: { value: 1, setValueAtTime: () => {} }, connect: () => {} }; }
  createBufferSource() { return { start: () => {}, stop: () => {}, connect: () => {} }; }
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

const { state } = await import('../js/core/state.js');
const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
const { updateDroppedMahoragaWheels, drawDroppedMahoragaWheels, clearDroppedMahoragaWheels } = await import('../js/graphics/particles/mahoragaDroppedWheel.js');
const { reinitFighters } = await import('../js/core/gameFlow.js');

console.log('🧪 Testing Mahoraga Dropped Wheel on Death Physics & Lifecycle...');

// 1. Setup mock arena and state
state.arena = { x: 0, y: 0, width: 800, height: 600, radius: 400, shape: 'circle' };
state.fighters = [];
state.droppedMahoragaWheels = [];

const mahoraga = new MahoragaFighter({ id: 'mahoraga', name: 'Mahoraga', x: 400, y: 300, r: 30, maxHp: 1000, hp: 1000 });
state.fighters.push(mahoraga);

// Set some adaptation stages to verify color/stage preservation on dropped wheel
mahoraga.adaptationStage = { melee: 2, ranged: 1, skill: 1 };
mahoraga.gojoAdaptColorHistory = ['#FF0000', '#0000FF', '#FFD700', '#9400D3'];
mahoraga.wheelRotation = 1.25;

console.log('1. Verifying wheel detachment on death...');
mahoraga.hp = 0;
mahoraga.onDeath();

if (!state.droppedMahoragaWheels || state.droppedMahoragaWheels.length !== 1) {
  throw new Error(`Expected 1 dropped wheel in state, found: ${state.droppedMahoragaWheels?.length}`);
}

const droppedWheel = state.droppedMahoragaWheels[0];
console.log(`   ✅ Dropped wheel spawned at (${droppedWheel.x.toFixed(1)}, ${droppedWheel.y.toFixed(1)}) with initial vy=${droppedWheel.vy.toFixed(2)}`);

if (droppedWheel.adaptationStage.melee !== 2 || droppedWheel.gojoAdaptColorHistory.length !== 4) {
  throw new Error('Adaptation data was not preserved on dropped wheel!');
}
console.log('   ✅ Adaptation stage & sphere color history preserved on dropped wheel.');

// 2. Simulate physics steps until it hits arena bottom and settles
console.log('2. Simulating physics steps & arena boundary bounce...');
let bounced = false;
for (let step = 0; step < 120; step++) {
  updateDroppedMahoragaWheels();
  if (droppedWheel.bounces > 0) bounced = true;
}

if (!bounced) {
  throw new Error('Wheel did not bounce against arena boundary!');
}
console.log(`   ✅ Wheel bounced ${droppedWheel.bounces} times and settled at (${droppedWheel.x.toFixed(1)}, ${droppedWheel.y.toFixed(1)}), onGround=${droppedWheel.onGround}`);

// 3. Verify Canvas 2D render transform balance
console.log('3. Testing Canvas 2D render balance...');
mockCtx.resetStackDepth();
drawDroppedMahoragaWheels(mockCtx);
if (mockCtx.getStackDepth() !== 0) {
  throw new Error(`Canvas transform imbalance: stack depth = ${mockCtx.getStackDepth()}`);
}
console.log(`   ✅ Canvas 2D draw perfectly balanced (stack depth = 0).`);

// 4. Verify round reset clears dropped wheels
console.log('4. Testing round reset cleanup...');
reinitFighters();
if (state.droppedMahoragaWheels.length !== 0) {
  throw new Error(`Expected 0 dropped wheels after reinitFighters, found: ${state.droppedMahoragaWheels.length}`);
}
console.log('   ✅ Dropped wheels cleared cleanly on round reinit.');

console.log('🎉 ALL MAHORAGA DROPPED WHEEL TESTS PASSED CLEANLY!');
