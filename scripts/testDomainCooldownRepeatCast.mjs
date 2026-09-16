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

  state.arena = { x: 0, y: 0, width: 600, height: 600 };
  state.gameState = 'playing';

  console.log("Testing Gojo & Sukuna Domain Cooldown Multi-Cast (No 2-use limit)...");

  // TEST 1: Sukuna 3rd and 4th Domain Casts
  {
    const sukuna = new SukunaFighter({ id: 'sukuna', name: 'Sukuna', color: '#ff2244', x: 300, y: 300 });
    const dummy = new NormalFighter({ id: 'dummy', name: 'Dummy', color: '#00ff00', x: 200, y: 300 });
    state.fighters = [sukuna, dummy];

    // Simulate Sukuna has already cast domain 2 times previously
    sukuna.domainUseCount = 2;
    sukuna.domainActive = false;
    sukuna.domainCooldown = 0; // Cooldown ready!
    sukuna.forcedMeleeTimer = 60;
    sukuna.isMeleeMode = true;

    sukuna.update(dummy, 0, state.arena);

    if (!sukuna.isChannelingDomainExpansion) {
      throw new Error(`Sukuna failed to initiate Domain Expansion on 3rd cast when cooldown ready! (isChannelingDomainExpansion: ${sukuna.isChannelingDomainExpansion})`);
    }
    if (sukuna.isMeleeMode) {
      throw new Error(`Sukuna is still in melee mode while channeling domain!`);
    }

    console.log("✅ Verified: Sukuna successfully initiates Domain Expansion beyond 2 uses when cooldown is ready.");
  }

  // TEST 2: Gojo 3rd and 4th Domain Casts
  {
    const gojo = new GojoFighter({ id: 'gojo', name: 'Gojo', color: '#00ffff', x: 300, y: 300 });
    const dummy = new NormalFighter({ id: 'dummy', name: 'Dummy', color: '#00ff00', x: 200, y: 300 });
    state.fighters = [gojo, dummy];

    // Simulate Gojo has already cast domain 2 times previously
    gojo.domainUseCount = 2;
    gojo.domainActive = false;
    gojo.domainCooldown = 0; // Cooldown ready!
    gojo.forcedMeleeTimer = 60;
    gojo.isMeleeMode = true;

    gojo.update(dummy, 0, state.arena);

    if (!gojo.isDomainPreSlide && !gojo.isChannelingDomainExpansion) {
      throw new Error(`Gojo failed to initiate Domain Pre-Slide / Expansion on 3rd cast when cooldown ready! (isDomainPreSlide: ${gojo.isDomainPreSlide})`);
    }
    if (gojo.isMeleeMode) {
      throw new Error(`Gojo is still in melee mode while initiating domain!`);
    }

    console.log("✅ Verified: Gojo successfully initiates Domain Expansion beyond 2 uses when cooldown is ready.");
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
