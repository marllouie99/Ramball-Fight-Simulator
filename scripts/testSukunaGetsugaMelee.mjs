// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
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
mockCanvas.parentNode = {
  insertBefore: () => {},
  appendChild: () => {},
  removeChild: () => {}
};

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
    const el = {
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      textContent: '',
      innerHTML: '',
      addEventListener: () => {},
      appendChild: () => ({}),
      removeChild: () => ({}),
      parentNode: { insertBefore: () => {}, appendChild: () => {}, removeChild: () => {} },
      children: [],
      querySelector: () => null,
      querySelectorAll: () => []
    };
    return el;
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    getContext: () => mockCtx,
    appendChild: () => ({}),
    removeChild: () => ({})
  }),
  body: { style: {} }
};

globalThis.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 64;
    this.height = 64;
    this.complete = true;
  }
};

globalThis.Audio = class {
  constructor() {
    this.play = () => Promise.resolve();
    this.pause = () => {};
    this.load = () => {};
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
  }
  cloneNode() {
    return new globalThis.Audio();
  }
};

globalThis.localStorage = {
  _data: {},
  getItem: (k) => globalThis.localStorage._data[k] || null,
  setItem: (k, v) => { globalThis.localStorage._data[k] = String(v); },
  removeItem: (k) => { delete globalThis.localStorage._data[k]; },
  clear: () => { globalThis.localStorage._data = {}; }
};

async function runTests() {
  const { CONFIG } = await import('../js/core/config.js');
  const { state } = await import('../js/core/state.js');
  const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
  const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');
  const { GetsugaBehavior } = await import('../js/systems/projectiles/behaviors/GetsugaBehavior.js');

  state.arena = { x: 0, y: 0, width: 600, height: 600 };
  state.gameState = 'playing';

  console.log("Testing Sukuna Melee Mode vs Ichigo Getsuga Tensho Wave Drag...");

  const sukuna = new SukunaFighter({ id: 'sukuna', name: 'Sukuna', color: '#ff2244', x: 300, y: 300 });
  const ichigo = new IchigoFighter({ id: 'ichigo', name: 'Ichigo', color: '#000000', x: 250, y: 300 });
  state.fighters = [sukuna, ichigo];

  // Force Sukuna into Melee Mode
  sukuna.isMeleeMode = true;
  sukuna.forcedMeleeTimer = 120;
  sukuna.meleeComboCount = 1;

  console.log(`Initial: Sukuna isMeleeMode = ${sukuna.isMeleeMode}`);

  // Create Getsuga projectile fired from Ichigo heading right towards Sukuna
  const proj = {
    x: 290,
    y: 300,
    r: 40,
    vx: 12,
    vy: 0,
    owner: 1,
    damage: 10,
    life: 100,
    isGetsuga: true,
    behaviorType: 'getsuga',
    getsugaForm: 'bankai',
    draggedTargets: new Map()
  };

  const behavior = new GetsugaBehavior();
  behavior.update(proj, state.fighters, projectileSystem);

  console.log(`After Getsuga onStep: Sukuna isDraggedByGetsuga = ${sukuna.isDraggedByGetsuga}, knockbackVx = ${sukuna.knockbackVx}`);
  if (!sukuna.isDraggedByGetsuga) {
    throw new Error("Sukuna was NOT marked as isDraggedByGetsuga by GetsugaBehavior!");
  }
  if (sukuna.knockbackVx <= 0) {
    throw new Error(`Sukuna knockbackVx should be positive (dragged right), got ${sukuna.knockbackVx}`);
  }

  // Next frame: Sukuna update runs
  const prevX = sukuna.x;
  sukuna.update(ichigo, 0, state.arena);

  console.log(`After Sukuna update: isMeleeMode = ${sukuna.isMeleeMode}, isDraggedByGetsuga = ${sukuna.isDraggedByGetsuga}, x moved from ${prevX} to ${sukuna.x}`);

  if (sukuna.isMeleeMode) {
    throw new Error("Sukuna is STILL in isMeleeMode while being dragged by Getsuga Tensho!");
  }

  if (sukuna.x <= prevX) {
    throw new Error(`Sukuna did NOT get physically displaced by Getsuga wave drag! (x: ${sukuna.x} <= ${prevX})`);
  }

  console.log("✅ Verified: Sukuna breaks out of melee mode and gets physically carried by Getsuga Tensho wave drag!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
