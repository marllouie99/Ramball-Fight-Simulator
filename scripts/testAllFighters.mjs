// Comprehensive Automated Fighter Runtime, Simulation & Canvas Stack Integrity Test Suite

// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => {
      _stackDepth++;
    },
    restore: () => {
      _stackDepth--;
      if (_stackDepth < 0) {
        throw new Error(`[CANVAS STACK CORRUPTION] ctx.restore() called when stackDepth is ${_stackDepth} (extra restore call)`);
      }
    },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
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
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
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
    this.naturalWidth = 100;
    this.naturalHeight = 100;
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

function assertCanvasStackBalance(locationTag) {
  const depth = mockCtx.getStackDepth();
  if (depth !== 0) {
    mockCtx.resetStackDepth();
    throw new Error(`[CANVAS TRANSFORM STACK CORRUPTION] Unbalanced stack depth = ${depth} after ${locationTag}`);
  }
}

async function main() {
  const { CONFIG, FIGHTER_DEFS, TACTICAL_FIGHTER_DEFS } = await import('../js/core/config.js');
  const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');
  const { state } = await import('../js/core/state.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');
  const { drawGetsugaSlash } = await import('../js/graphics/weapons/ichigoWeaponGraphics.js');
  const { drawWeaponPreview, drawWeaponMenu } = await import('../js/graphics/ui/WeaponIndexScreen.js');
  const { drawSelectScreen } = await import('../js/graphics/ui/CharacterSelectScreen.js');
  const { drawTitleScreen } = await import('../js/graphics/ui/MainMenuScreen.js');
  const { drawIndexScreen } = await import('../js/graphics/ui/FighterIndexScreen.js');

  console.log('🥋 [Fighter Runtime Test Suite] Testing all fighters across simulation states & Canvas 2D stack balance...');

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

  const allDefs = [...FIGHTER_DEFS, ...(TACTICAL_FIGHTER_DEFS || [])];

  for (const def of allDefs) {
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
      mockCtx.resetStackDepth();
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' base draw`);

      // 2. Melee & shooting animation states
      mockCtx.resetStackDepth();
      fighter.isSlashing = true;
      fighter.slashSwingTimer = 15;
      fighter.slashSwingMaxTimer = 22;
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' melee slash state`);
      fighter.isSlashing = false;
      fighter.slashSwingTimer = 0;

      // 3. Parry / block states
      mockCtx.resetStackDepth();
      fighter.blockPoseTimer = 10;
      fighter.parryHitAnimTimer = 8;
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' block/parry state`);
      fighter.blockPoseTimer = 0;
      fighter.parryHitAnimTimer = 0;

      // 4. Stun / Infinity Freeze / TimeStop states
      mockCtx.resetStackDepth();
      fighter.isFrozenByInfinity = true;
      fighter.timeStopTimer = 20;
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' stun/timestop state`);
      fighter.isFrozenByInfinity = false;
      fighter.timeStopTimer = 0;

      // 5. Special Transformations, Forms & Skill Channeling
      if (fType === 'ichigo') {
        mockCtx.resetStackDepth();
        fighter.isChannelingGetsuga = true;
        fighter.getsugaChargeTimer = 15;
        fighter.getsugaChargeMaxTimer = 30;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Shikai Getsuga charge`);

        mockCtx.resetStackDepth();
        fighter.bankaiActive = true;
        fighter.hollowMaskActive = false;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Bankai`);

        mockCtx.resetStackDepth();
        fighter.hollowMaskActive = true;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Bankai + Hollow Mask`);

        // Test Hollow Mask awakening and channeling immobility
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        fighter.vx = 0;
        fighter.vy = 0;
        fighter.hp = 25; // Trigger <= 30% HP Hollow Awakening
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.hollowMaskActive || fighter.hollowMaskFormationTimer <= 0) {
          throw new Error(`Ichigo did not activate Hollow Mask formation upon <= 30% HP`);
        }
        const posX = fighter.x;
        const posY = fighter.y;
        for (let t = 0; t < 20; t++) {
          fighter.update(dummyOpponent, 0, state.arena);
          if (fighter.x !== posX || fighter.y !== posY || fighter.vx !== 0 || fighter.vy !== 0) {
            throw new Error(`Ichigo moved during Hollow Mask formation at tick ${t}: (${fighter.x}, ${fighter.y})`);
          }
        }

        // Test Hollow Mask piece-by-piece formation drawing balance across all stages
        for (const prog of [0.05, 0.15, 0.35, 0.55, 0.75, 0.85, 0.95, 1.00]) {
          mockCtx.resetStackDepth();
          fighter.hollowMaskActive = true;
          fighter.hollowMaskFormationTimer = Math.round((1 - prog) * 325);
          fighter.hollowMaskFormationMax = 325;
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Ichigo Hollow formation at prog ${prog}`);
        }

        // Test Getsuga recovery frames in Shikai form
        fighter.reset();
        fighter.isChannelingGetsuga = false;
        fighter.bankaiActive = false;
        fighter.hollowMaskActive = false;
        fighter.getsugaRecoveryTimer = 24;
        fighter.vx = -3.5;
        fighter.vy = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.getsugaRecoveryTimer !== 23) {
          throw new Error(`Getsuga recovery timer failed to decrement properly in Shikai`);
        }
        // Ensure AI steering did not overwrite decelerating recoil velocity during recovery
        if (Math.abs(fighter.vx) > 3.5) {
          throw new Error(`Ichigo moved with external velocity during Shikai Getsuga recovery`);
        }

        // Test Getsuga recovery frames in Bankai form
        fighter.reset();
        fighter.bankaiActive = true;
        fighter.getsugaRecoveryTimer = 20;
        fighter.vx = -3.5;
        fighter.vy = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.getsugaRecoveryTimer !== 19) {
          throw new Error(`Getsuga recovery timer failed to decrement properly in Bankai`);
        }
        if (Math.abs(fighter.vx) > 3.5) {
          throw new Error(`Ichigo moved with external velocity during Bankai Getsuga recovery`);
        }

        // Test Champion Screen reveal pose for Bankai + Mask form
        mockCtx.resetStackDepth();
        fighter.reset();
        fighter._isWinnerReveal = true;
        fighter.bankaiActive = true;
        fighter.hollowMaskActive = true;
        fighter.skin = 'bankai_mask';
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Bankai + Mask Winner Reveal`);

        // Test custom bankaiFinalGetsugaRadius and bankaiFinalGetsugaSpeed
        mockCtx.resetStackDepth();
        const prevRad = CONFIG.ichigo.bankaiFinalGetsugaRadius;
        const prevSpd = CONFIG.ichigo.bankaiFinalGetsugaSpeed;
        CONFIG.ichigo.bankaiFinalGetsugaRadius = 140;
        CONFIG.ichigo.bankaiFinalGetsugaSpeed = 12;
        const finalProj = projectileSystem.fireGetsugaTensho(fighter, 0, 180, 12, 'final_bankai');
        if (finalProj.r !== 140) {
          throw new Error(`Expected projectile radius 140 but got ${finalProj.r}`);
        }
        if (Math.round(Math.hypot(finalProj.vx, finalProj.vy)) !== 12) {
          throw new Error(`Expected projectile speed 12 but got ${Math.hypot(finalProj.vx, finalProj.vy)}`);
        }
        drawGetsugaSlash(mockCtx, finalProj, true);
        assertCanvasStackBalance(`Custom scaled Final Getsuga slash`);
        CONFIG.ichigo.bankaiFinalGetsugaRadius = prevRad;
        CONFIG.ichigo.bankaiFinalGetsugaSpeed = prevSpd;

        fighter.isChannelingGetsuga = false;
        fighter.bankaiActive = false;
        fighter.hollowMaskActive = false;
        fighter._isWinnerReveal = false;
        fighter.getsugaRecoveryTimer = 0;
        fighter.hollowMaskFormationTimer = 0;
        fighter.hollowBurstTimer = 0;
      }
      if (fType === 'mahoraga') {
        mockCtx.resetStackDepth();
        fighter.wheelClickTimer = 15;
        fighter.gammaRayRainbowTimer = 100;
        fighter.gammaRayRainbowMax = 180;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Mahoraga gamma ray state`);
      }
      if (fType === 'sukuna') {
        mockCtx.resetStackDepth();
        fighter.isHeianEra = true;
        fighter.isFourArms = true;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Sukuna Heian 4-arms form`);
      }

      // 6. Winner / Champion Reveal Stance
      mockCtx.resetStackDepth();
      fighter._isWinnerReveal = true;
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' WinnerReveal stance`);

    } catch (err) {
      console.error(`❌ [RUNTIME ERROR in fighter '${fType}'] during simulation:`, err);
      errors++;
    }
  }

  // 7. Weapon Previews Canvas Stack Balance Check
  console.log('⚔️ [Weapon Preview Stack Test] Verifying all weapon graphics transform balance...');
  for (const def of allDefs) {
    try {
      mockCtx.resetStackDepth();
      drawWeaponPreview(mockCtx, def.type, def.color);
      assertCanvasStackBalance(`drawWeaponPreview('${def.type}')`);
    } catch (err) {
      console.error(`❌ [WEAPON PREVIEW ERROR in '${def.type}']:`, err);
      errors++;
    }
  }

  // 8. Core UI Screens Canvas Stack Balance Check
  console.log('🖥️ [UI Screen Stack Test] Verifying all menus & select screens transform balance...');
  const uiScreens = [
    { name: 'drawTitleScreen', fn: drawTitleScreen },
    { name: 'drawSelectScreen', fn: drawSelectScreen },
    { name: 'drawWeaponMenu', fn: drawWeaponMenu },
    { name: 'drawIndexScreen', fn: drawIndexScreen }
  ];

  for (const sc of uiScreens) {
    try {
      mockCtx.resetStackDepth();
      sc.fn();
      assertCanvasStackBalance(sc.name);
    } catch (err) {
      console.error(`❌ [UI SCREEN ERROR in '${sc.name}']:`, err);
      errors++;
    }
  }

  console.log('───────────────────────────────────────────────────────');
  if (errors === 0) {
    console.log(`✅ Successfully tested all ${totalTested} fighter classes, skins, weapon previews, and UI screens with ZERO runtime errors and 100% BALANCED Canvas 2D stacks!`);
    process.exit(0);
  } else {
    console.error(`🚨 Found ${errors} fighter / weapon / UI runtime errors!`);
    process.exit(1);
  }
}

main();
