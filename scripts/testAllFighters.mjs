// Comprehensive Automated Fighter Runtime & Simulation Test Suite

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
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arc: noop,
    arcTo: noop,
    ellipse: noop,
    rect: noop,
    roundRect: noop,
    setLineDash: noop,
    getLineDash: () => [],
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: noop,
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
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => {
    if (id === 'arena') return mockCanvas;
    return { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    return { style: {}, classList: { add: () => {}, remove: () => {} } };
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

async function main() {
  const { FIGHTER_DEFS } = await import('../js/core/config.js');
  const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');
  const { state } = await import('../js/core/state.js');

  console.log('🥋 [Fighter Runtime Test Suite] Testing all fighters across simulation states...');

  state.canvas = mockCanvas;
  state.ctx = mockCtx;
  state.arena = { x: 0, y: 0, width: 540, height: 960 };
  state.fighters = [];
  state.gameState = 'match';
  state.pixiLayers = {
    projectiles: { addChild: () => {} },
    environment: { addChild: () => {} }
  };

  let totalTested = 0;
  let errors = 0;

  for (const def of FIGHTER_DEFS) {
    const fType = def.type || def.characterId || def.id;
    const FighterClass = FIGHTER_CLASS_MAP[fType];
    if (!FighterClass) continue;

    try {
      const fighter = new FighterClass({
        ...def,
        startX: 270,
        startY: 480,
        startVx: 0,
        startVy: 0
      });

    const dummyOpponent = new FighterClass({ ...def, startX: 200, startY: 200 });
    state.fighters = [fighter, dummyOpponent];
    totalTested++;

    // 1. Base update & draw
    fighter.update(dummyOpponent, 0, state.arena);
    fighter.draw(mockCtx, null);

    // 2. Melee & shooting animation states
    fighter.isSlashing = true;
    fighter.slashSwingTimer = 15;
    fighter.slashSwingMaxTimer = 22;
    fighter.draw(mockCtx, null);

    // 3. Parry / block states
    fighter.blockPoseTimer = 10;
    fighter.parryHitAnimTimer = 8;
    fighter.draw(mockCtx, null);
    fighter.blockPoseTimer = 0;
    fighter.parryHitAnimTimer = 0;

    // 4. Stun / Infinity Freeze / TimeStop states
    fighter.isFrozenByInfinity = true;
    fighter.timeStopTimer = 20;
    fighter.update(dummyOpponent, 0, state.arena);
    fighter.draw(mockCtx, null);
    fighter.isFrozenByInfinity = false;
    fighter.timeStopTimer = 0;

    // 5. Special Transformations, Forms & Skill Channeling
    if (fType === 'ichigo') {
      // Shikai Getsuga charging
      fighter.isChannelingGetsuga = true;
      fighter.getsugaChargeTimer = 15;
      fighter.getsugaChargeMaxTimer = 30;
      fighter.draw(mockCtx, null);

      // Bankai Getsuga charging
      fighter.bankaiActive = true;
      fighter.hollowMaskActive = false;
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);

      // Bankai + Hollow Mask Getsuga charging
      fighter.hollowMaskActive = true;
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);

      fighter.isChannelingGetsuga = false;
    }
    if (fType === 'mahoraga') {
      fighter.wheelClickTimer = 15;
      fighter.gammaRayRainbowTimer = 100;
      fighter.gammaRayRainbowMax = 180;
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);
    }
    if (fType === 'sukuna') {
      fighter.isHeianEra = true;
      fighter.isFourArms = true;
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);
    }

      // 6. Winner / Champion Reveal Stance
      fighter._isWinnerReveal = true;
      fighter.draw(mockCtx, null);

    } catch (err) {
      console.error(`❌ [RUNTIME ERROR in fighter '${fType}'] during simulation:`, err);
      errors++;
    }
  }

  console.log('───────────────────────────────────────────────────────');
  if (errors === 0) {
    console.log(`✅ Successfully tested all ${totalTested} fighter classes and skins with ZERO runtime errors!`);
    process.exit(0);
  } else {
    console.error(`🚨 Found ${errors} fighter runtime errors!`);
    process.exit(1);
  }
}

main();
