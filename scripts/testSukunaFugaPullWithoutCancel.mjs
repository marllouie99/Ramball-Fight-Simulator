// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
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

const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
const { projectileSystem } = await import('../js/systems/projectileSystem.js');
const { state } = await import('../js/core/state.js');
const { CONFIG } = await import('../js/core/config.js');

console.log('Testing Sukuna Fuga Channeling: Pulled by Attacks without Cancelling...');

const arena = { x: 50, y: 50, width: 800, height: 600 };
state.arena = arena;
state.gameState = 'playing';

// Test 1: Direct knockback impulse while channeling Fuga
{
  const sukuna = new SukunaFighter({ x: 300, y: 300, color: '#ff0000', controls: {} });
  sukuna.introReboundActive = false;
  sukuna.isChannelingDivineFlame = true;
  sukuna.divineFlameChargeTimer = 10;
  sukuna.divineFlameChargeMax = 50;
  sukuna.divineFlameCastAngle = 0;

  const initialX = sukuna.x;

  // Apply strong knockback impulse (e.g. from an attack)
  sukuna.applyKnockback(15, 0, 0);

  // Run update loop
  sukuna.update(null, 0, arena);

  if (sukuna.x <= initialX) {
    throw new Error(`Expected Sukuna to be displaced by knockback (x: ${sukuna.x}, initialX: ${initialX})`);
  }
  if (!sukuna.isChannelingDivineFlame) {
    throw new Error('Expected Sukuna to still be channeling Fuga after knockback displacement');
  }
  if (sukuna.divineFlameChargeTimer !== 11) {
    throw new Error(`Expected divineFlameChargeTimer to advance to 11, got ${sukuna.divineFlameChargeTimer}`);
  }
  console.log('✅ Test 1 Passed: Knockback displaces Sukuna without cancelling Fuga channeling.');
}

// Test 2: Gojo Lapse Blue suction pull while channeling Fuga
{
  const sukuna = new SukunaFighter({ x: 320, y: 300, color: '#ff0000', controls: {} });
  const gojo = new GojoFighter({ x: 200, y: 300, color: '#00ffff', controls: {} });
  sukuna.introReboundActive = false;
  gojo.introReboundActive = false;
  state.fighters = [sukuna, gojo];

  sukuna.isChannelingDivineFlame = true;
  sukuna.divineFlameChargeTimer = 20;
  sukuna.divineFlameChargeMax = 60;
  sukuna.divineFlameCastAngle = 0;

  // Spawn Lapse Blue at (250, 300)
  projectileSystem.projectiles = [];
  const blueProj = {
    x: 250,
    y: 300,
    vx: 0,
    vy: 0,
    r: 25,
    life: 100,
    maxLife: 100,
    owner: 1,
    behaviorType: 'gojo_blue',
    isGojoBlue: true,
    damage: 10,
    pullRadius: 150
  };
  projectileSystem.projectiles.push(blueProj);

  const initialDist = Math.hypot(blueProj.x - sukuna.x, blueProj.y - sukuna.y);

  // Update projectile system
  projectileSystem.update(state.fighters);

  const newDist = Math.hypot(blueProj.x - sukuna.x, blueProj.y - sukuna.y);
  if (newDist >= initialDist) {
    throw new Error(`Expected Gojo Lapse Blue to pull Sukuna closer (initialDist: ${initialDist}, newDist: ${newDist})`);
  }
  if (!sukuna.isChannelingDivineFlame) {
    throw new Error('Expected Sukuna to still be channeling Fuga while pulled by Lapse Blue');
  }
  console.log('✅ Test 2 Passed: Gojo Lapse Blue pulls Sukuna without cancelling Fuga channeling.');
}

// Test 3: Gojo Hollow Purple suction vortex while channeling Fuga
{
  const sukuna = new SukunaFighter({ x: 450, y: 300, color: '#ff0000', controls: {} });
  const gojo = new GojoFighter({ x: 100, y: 300, color: '#00ffff', controls: {} });
  sukuna.introReboundActive = false;
  gojo.introReboundActive = false;
  state.fighters = [sukuna, gojo];

  sukuna.isChannelingDivineFlame = true;
  sukuna.divineFlameChargeTimer = 25;
  sukuna.divineFlameChargeMax = 60;
  sukuna.divineFlameCastAngle = 0;

  projectileSystem.projectiles = [];
  const purpleProj = {
    x: 350,
    y: 300,
    vx: 0,
    vy: 0,
    r: 50,
    life: 100,
    maxLife: 100,
    owner: 1,
    behaviorType: 'gojo_purple',
    isGojoPurple: true,
    damage: 20,
    purpleDPS: 50,
    purpleDPSInterval: 6
  };
  projectileSystem.projectiles.push(purpleProj);

  const initialDist = Math.hypot(purpleProj.x - sukuna.x, purpleProj.y - sukuna.y);

  // Update projectile system (Purple suction)
  projectileSystem.update(state.fighters);

  const newDist = Math.hypot(purpleProj.x - sukuna.x, purpleProj.y - sukuna.y);
  if (newDist >= initialDist) {
    throw new Error(`Expected Gojo Hollow Purple to pull Sukuna closer (initialDist: ${initialDist}, newDist: ${newDist})`);
  }
  if (!sukuna.isChannelingDivineFlame) {
    throw new Error('Expected Sukuna to still be channeling Fuga while pulled by Hollow Purple');
  }
  console.log('✅ Test 3 Passed: Gojo Hollow Purple vortex pulls Sukuna without cancelling Fuga channeling.');
}

// Test 4: Ichigo Getsuga Tensho drag while channeling Fuga
{
  const sukuna = new SukunaFighter({ x: 300, y: 300, color: '#ff0000', controls: {} });
  const ichigo = new IchigoFighter({ x: 100, y: 300, color: '#ff8800', controls: {} });
  sukuna.introReboundActive = false;
  ichigo.introReboundActive = false;
  state.fighters = [sukuna, ichigo];

  sukuna.isChannelingDivineFlame = true;
  sukuna.divineFlameChargeTimer = 30;
  sukuna.divineFlameChargeMax = 60;
  sukuna.divineFlameCastAngle = 0;

  projectileSystem.projectiles = [];
  const getsugaProj = {
    x: 290,
    y: 300,
    vx: 12,
    vy: 0,
    r: 100,
    life: 30,
    maxLife: 30,
    owner: 1,
    behaviorType: 'getsuga_tensho',
    isGetsuga: true,
    damage: 15,
    angle: 0
  };
  projectileSystem.projectiles.push(getsugaProj);

  const initialX = sukuna.x;

  // Update projectile system (Getsuga hits and drags Sukuna)
  projectileSystem.update(state.fighters);

  // Update Sukuna movement physics
  sukuna.update(ichigo, 0, arena);

  if (sukuna.x <= initialX) {
    throw new Error(`Expected Ichigo Getsuga Tensho to drag/push Sukuna (initialX: ${initialX}, currentX: ${sukuna.x})`);
  }
  if (!sukuna.isChannelingDivineFlame) {
    throw new Error('Expected Sukuna to still be channeling Fuga while dragged by Getsuga Tensho');
  }
  console.log('✅ Test 4 Passed: Ichigo Getsuga Tensho drags Sukuna without cancelling Fuga channeling.');
}

// Test 5: Full Fuga completion & firing after being pulled
{
  const sukuna = new SukunaFighter({ x: 300, y: 300, color: '#ff0000', controls: {} });
  const dummy = new GojoFighter({ x: 600, y: 300, color: '#00ffff', controls: {} });
  sukuna.introReboundActive = false;
  dummy.introReboundActive = false;
  state.fighters = [sukuna, dummy];

  sukuna.isChannelingDivineFlame = true;
  sukuna.divineFlameChargeTimer = 58;
  sukuna.divineFlameChargeMax = 60;
  sukuna.divineFlameCastAngle = 0;

  // Apply knockback right before Fuga fires
  sukuna.applyKnockback(10, 0, 0);

  // Frame 59
  sukuna.update(dummy, 0, arena);
  if (!sukuna.isChannelingDivineFlame) {
    throw new Error('Expected Sukuna to still be channeling Fuga at frame 59');
  }

  // Frame 60 (Channel reaches max and fires)
  sukuna.update(dummy, 0, arena);
  if (sukuna.isChannelingDivineFlame) {
    throw new Error('Expected Fuga channeling to finish and fire at frame 60');
  }
  if (sukuna.divineFlameCooldown <= 0) {
    throw new Error('Expected divineFlameCooldown to be set after firing Fuga');
  }
  console.log('✅ Test 5 Passed: Sukuna successfully finishes charge and unleashes Fuga after displacement.');
}

console.log('All Sukuna Fuga Pull & Hyper-Armor Tests Passed Successfully! 🎉');
