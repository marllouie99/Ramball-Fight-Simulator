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
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');

  state.arena = { x: 0, y: 0, width: 1200, height: 1200 };
  state.gameState = 'playing';

  console.log("Testing Gojo & Sukuna comboDisengageDistance on melee duration expiry...");

  // 1. Test Sukuna Disengage Distance
  {
    const sukuna = new SukunaFighter({ id: 'sukuna', name: 'Sukuna', color: '#ff2244', x: 600, y: 600 });
    const dummy = new NormalFighter({ id: 'normal', name: 'Dummy', color: '#ffffff', x: 630, y: 600 });
    state.fighters = [sukuna, dummy];

    sukuna.isMeleeMode = true;
    sukuna.forcedMeleeTimer = 1; // Expiring on next tick
    sukuna.meleeComboCount = 2;

    const initialDist = Math.hypot(sukuna.x - dummy.x, sukuna.y - dummy.y);
    console.log(`Sukuna before expiry: dist = ${initialDist.toFixed(1)}px, isMeleeMode = ${sukuna.isMeleeMode}`);

    sukuna.update(dummy, 0, state.arena);

    const afterDist = Math.hypot(sukuna.x - dummy.x, sukuna.y - dummy.y);
    console.log(`Sukuna after expiry: dist = ${afterDist.toFixed(1)}px, isMeleeMode = ${sukuna.isMeleeMode}`);

    if (sukuna.isMeleeMode) {
      throw new Error("Sukuna failed to exit isMeleeMode on forcedMeleeTimer expiry!");
    }
    if (afterDist < (CONFIG.sukuna.comboDisengageDistance - 50)) {
      throw new Error(`Sukuna failed to teleport away by comboDisengageDistance! (dist: ${afterDist} vs expected >= ${CONFIG.sukuna.comboDisengageDistance - 50})`);
    }
    console.log("✔ Sukuna successfully disengaged and teleported away by comboDisengageDistance!");
  }

  // 2. Test Gojo Disengage Distance
  {
    const gojo = new GojoFighter({ id: 'gojo', name: 'Gojo', color: '#00ffff', x: 600, y: 600 });
    const dummy = new NormalFighter({ id: 'normal', name: 'Dummy', color: '#ffffff', x: 630, y: 600 });
    state.fighters = [gojo, dummy];

    gojo.isMeleeMode = true;
    gojo.forcedMeleeTimer = 1; // Expiring on next tick
    gojo.meleeComboCount = 2;

    const initialDist = Math.hypot(gojo.x - dummy.x, gojo.y - dummy.y);
    console.log(`Gojo before expiry: dist = ${initialDist.toFixed(1)}px, isMeleeMode = ${gojo.isMeleeMode}`);

    gojo.update(dummy, 0, state.arena);

    const afterDist = Math.hypot(gojo.x - dummy.x, gojo.y - dummy.y);
    console.log(`Gojo after expiry: dist = ${afterDist.toFixed(1)}px, isMeleeMode = ${gojo.isMeleeMode}`);

    if (gojo.isMeleeMode) {
      throw new Error("Gojo failed to exit isMeleeMode on forcedMeleeTimer expiry!");
    }
    if (afterDist < (CONFIG.gojo.comboDisengageDistance - 50)) {
      throw new Error(`Gojo failed to teleport away by comboDisengageDistance! (dist: ${afterDist} vs expected >= ${CONFIG.gojo.comboDisengageDistance - 50})`);
    }
    console.log("✔ Gojo successfully disengaged and teleported away by comboDisengageDistance!");
  }

  console.log("\n✅ All comboDisengageDistance tests passed!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
