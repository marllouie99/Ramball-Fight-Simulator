function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => { _stackDepth++; },
    restore: () => { _stackDepth--; },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, arcTo: noop,
    ellipse: noop, rect: noop, roundRect: noop, setLineDash: noop,
    getLineDash: () => [], fillRect: noop, strokeRect: noop, clearRect: noop,
    fill: noop, stroke: noop, clip: noop, scale: noop, rotate: noop,
    translate: noop, transform: noop, setTransform: noop, resetTransform: noop,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillText: noop, strokeText: noop, measureText: () => ({ width: 50 }),
    drawImage: noop, createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, globalAlpha: 1.0, globalCompositeOperation: 'source-over',
    fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1.0,
    lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
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
  removeItem: () => {},
  clear: () => {}
};

const { state } = await import('../js/core/state.js');
const { RubbickFighter } = await import('../js/entities/fighters/RubbickFighter.js');
const { projectileSystem } = await import('../js/systems/projectileSystem.js');
const { HitImpactSystem } = await import('../js/systems/hitImpactSystem.js');

// Setup test environment
state.fighters = [];
state.sparkEffects = [];
state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect' };
state.mode = '1v1';

const rubbick = new RubbickFighter({ id: 'rubbick', name: 'Rubbick', type: 'rubbick' });
const dummyOpponent = { x: 400, y: 300, r: 25, hp: 100, isDead: false };
state.fighters = [rubbick, dummyOpponent];

console.log('--- TEST 1: Fire Arcane Bolt & Inspect Projectile Properties ---');
projectileSystem.fireArcaneBolt(rubbick, 0, 15, dummyOpponent);
const proj = projectileSystem.projectiles[projectileSystem.projectiles.length - 1];

console.log('isArcaneBolt:', proj.isArcaneBolt);
console.log('isRubbick:', proj.isRubbick);
console.log('fadingOut:', proj.fadingOut);
console.log('fadingAlpha:', proj.fadingAlpha);
console.log('ownerFighter set:', proj.ownerFighter === rubbick);
console.log('history initialized:', proj.history && proj.history.length === 1);

if (!proj.isArcaneBolt || proj.fadingOut || proj.fadingAlpha !== undefined || proj.ownerFighter !== rubbick) {
  console.error('FAIL: Projectile not correctly initialized!');
  process.exit(1);
}

console.log('--- TEST 2: Projectile Pool Reuse Immunity ---');
// Simulate projectile dying and fading out
proj.fadingOut = true;
proj.fadingAlpha = 0;
projectileSystem._returnProjectile(proj);
projectileSystem.projectiles.pop();

// Fire a second projectile reusing the pooled instance
projectileSystem.fireArcaneBolt(rubbick, 0, 15, dummyOpponent);
const reusedProj = projectileSystem.projectiles[projectileSystem.projectiles.length - 1];

console.log('reusedProj fadingOut:', reusedProj.fadingOut);
console.log('reusedProj fadingAlpha (must be undefined):', reusedProj.fadingAlpha);
if (reusedProj.fadingOut || reusedProj.fadingAlpha !== undefined) {
  console.error('FAIL: Reused projectile retained old fadingAlpha <= 0, causing invisibility bug!');
  process.exit(1);
}

console.log('--- TEST 3: Domain Culling Immunity ---');
const isImmuneFromDomainCull = Boolean(
  reusedProj.isFrozenByInfinity || 
  reusedProj.isArcaneBolt || 
  reusedProj.isDomainEmpowered || 
  reusedProj.isSukunaSlash || 
  reusedProj.isRubbick
);
console.log('isImmuneFromDomainCull (should be true):', isImmuneFromDomainCull);
if (!isImmuneFromDomainCull) {
  console.error('FAIL: Arcane bolt is not immune from domain culling!');
  process.exit(1);
}

console.log('--- TEST 4: Hit Impact System Feedback ---');
const prevSparkCount = state.sparkEffects.length;
const hitResult = HitImpactSystem.processProjectileHit(dummyOpponent, reusedProj, rubbick, state.fighters);
console.log('Hit processed, return value (bounces left > 0 so false):', hitResult);
console.log('Sparks spawned on hit:', state.sparkEffects.length > prevSparkCount);
if (state.sparkEffects.length <= prevSparkCount) {
  console.error('FAIL: HitImpactSystem did not spawn sparks on Arcane Bolt impact!');
  process.exit(1);
}

console.log('--- ALL BASIC ATTACK VFX & DOMAIN VISIBILITY TESTS PASSED! ---');
