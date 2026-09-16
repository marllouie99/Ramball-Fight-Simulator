function createMockCtx() {
  const calls = [];
  const noop = () => {};
  const handler = {
    get(target, prop) {
      if (prop === '_calls') return calls;
      if (typeof prop === 'string' && !(prop in target)) {
        return (...args) => {
          calls.push({ method: prop, args });
          return createMockCtx();
        };
      }
      return target[prop];
    },
    set(target, prop, value) {
      calls.push({ set: prop, value });
      target[prop] = value;
      return true;
    }
  };
  return new Proxy({
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop })
  }, handler);
}

globalThis.window = globalThis;
globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = {
  getElementById: (id) => ({ getContext: () => createMockCtx(), width: 1200, height: 800, style: {} }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ getContext: () => createMockCtx(), width: 1200, height: 800, style: {}, addEventListener: () => {} }),
  addEventListener: () => {}
};
globalThis.Image = class { constructor() { this.onload = null; this.src = ''; } };
globalThis.Audio = class {
  constructor() {
    this.play = () => Promise.resolve();
    this.pause = () => {};
    this.currentTime = 0;
    this.volume = 1;
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
  }
  cloneNode() { return new globalThis.Audio(); }
};

const { state, registerProjectileSystem } = await import('../js/core/state.js');
const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { drawMahoragaSword, drawMahoragaLeftPunch } = await import('../js/graphics/weapons/mahoragaWeaponGraphics.js');
const { drawProjectiles } = await import('../js/graphics/renderers/projectileRenderer.js');
const { startAdaptationFlashDash } = await import('../js/entities/fighters/mahoraga/mahoragaSkills.js');

// Setup state
state.arena = { x: 50, y: 50, width: 440, height: 860, shape: 'rectangle' };
state.canvas = { width: 540, height: 960 };
state.projectiles = [];
state.fighters = [];

registerProjectileSystem({
  getProjectiles: () => state.projectiles,
  clear: () => { state.projectiles = []; }
});

const mahoraga = new MahoragaFighter(150, 300, { color: '#F5F5DC' });
const gojo = new GojoFighter(250, 300, { color: '#00E5FF' });

state.fighters = [mahoraga, gojo];

console.log('=== TEST 1: Mahoraga inside Gojo domain BEFORE adaptation ===');
gojo.domainActive = true;
state.domainActive = 'unlimited_void';
mahoraga.gojoDomainAdapted = false;

if (mahoraga.canPerformBasicAttack() !== false) {
  throw new Error(`Expected canPerformBasicAttack to be false before domain adaptation, got ${mahoraga.canPerformBasicAttack()}`);
}
if (mahoraga.areAttackEffectsSuppressed() !== true) {
  throw new Error(`Expected areAttackEffectsSuppressed to be true before domain adaptation, got ${mahoraga.areAttackEffectsSuppressed()}`);
}
console.log('✅ TEST 1 PASSED: Unadapted Mahoraga correctly cannot attack and effects are suppressed.');

console.log('=== TEST 2: Mahoraga inside Gojo domain AFTER adaptation ===');
mahoraga.gojoDomainAdapted = true;
mahoraga.gojoAdapted = { domain: true };
mahoraga.timeStopTimer = 0;
mahoraga.hitStunTimer = 0;

if (mahoraga.canPerformBasicAttack() !== true) {
  throw new Error(`Expected canPerformBasicAttack to be true after domain adaptation, got ${mahoraga.canPerformBasicAttack()}`);
}
if (mahoraga.areAttackEffectsSuppressed() !== false) {
  throw new Error(`Expected areAttackEffectsSuppressed to be false after domain adaptation, got ${mahoraga.areAttackEffectsSuppressed()}`);
}
console.log('✅ TEST 2 PASSED: Adapted Mahoraga can attack and attack effects are not suppressed.');

console.log('=== TEST 3: Dynamic Crescent Slash Arc renders during blade swing ===');
mahoraga.punchAnimTimer = 15;
mahoraga.punchAnimMaxTimer = 18;
mahoraga.swordCombo = 0;
const mockCtxSword = createMockCtx();

drawMahoragaSword(mockCtxSword, mahoraga);

// Verify that arc drawing took place (fillRect calls for pixel art crescent)
const fillRectCalls = mockCtxSword._calls.filter(c => c.method === 'fillRect');
console.log(`  drawMahoragaSword fillRect calls: ${fillRectCalls.length}`);
if (fillRectCalls.length === 0) {
  throw new Error('Expected drawMahoragaSword to render crescent slash arc pixels, but no fillRect calls occurred!');
}
console.log('✅ TEST 3 PASSED: Dynamic Crescent Slash Arc rendered successfully inside domain!');

console.log('=== TEST 4: Left punch air pressure blast renders ===');
mahoraga.leftPunchTimer = 10;
mahoraga.leftPunchMaxTimer = 18;
mahoraga.currentPunchProgress = 0.5;
const mockCtxPunch = createMockCtx();

drawMahoragaLeftPunch(mockCtxPunch, mahoraga);
const strokeCalls = mockCtxPunch._calls.filter(c => c.method === 'stroke');
console.log(`  drawMahoragaLeftPunch stroke calls: ${strokeCalls.length}`);
if (strokeCalls.length === 0) {
  throw new Error('Expected drawMahoragaLeftPunch to render stroke trails, but no stroke calls occurred!');
}
console.log('✅ TEST 4 PASSED: Left punch attack visuals rendered successfully inside domain!');

console.log('=== TEST 5: Projectiles from adapted Mahoraga are NOT culled by domain ===');
const mockProj = {
  x: 200,
  y: 300,
  vx: 5,
  vy: 0,
  r: 15,
  visual: 'mahoragaBasaltMonolith',
  owner: 0,
  ownerFighter: mahoraga,
  isMahoragaThrow: true
};
state.projectiles = [mockProj];
const mockCtxProj = createMockCtx();
state.ctx = mockCtxProj;
drawProjectiles();
const projDrawCalls = mockCtxProj._calls.filter(c => c.method === 'drawImage' || c.method === 'rotate');
console.log(`  drawProjectiles calls for Mahoraga thrown debris: ${projDrawCalls.length}`);
if (projDrawCalls.length === 0) {
  throw new Error('Expected Mahoraga projectile to be rendered inside domain, but it was culled!');
}
console.log('✅ TEST 5 PASSED: Mahoraga thrown projectiles render without being culled inside Gojo domain!');

console.log('=== TEST 6: Adaptation flash dash executes inside domain when adapted ===');
startAdaptationFlashDash(mahoraga, gojo);
if (!mahoraga.adaptationDashTimer || mahoraga.adaptationDashTimer <= 0) {
  throw new Error('Expected adaptationDashTimer > 0 when adapted, but flash dash was blocked!');
}
console.log(`  Flash dash triggered successfully: timer = ${mahoraga.adaptationDashTimer}, target = ${mahoraga.adaptationDashTarget.characterId}`);
console.log('✅ TEST 6 PASSED: Adaptation flash-dash works inside Gojo domain!');

console.log('\nALL MAHORAGA DOMAIN ATTACK EFFECTS TESTS PASSED!');
