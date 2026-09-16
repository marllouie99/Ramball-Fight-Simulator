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

const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
const { state } = await import('../js/core/state.js');
const { CONFIG } = await import('../js/core/config.js');
const { updateFighters } = await import('../js/systems/physics.js');
const assert = (await import('assert')).default;

console.log('Testing Gojo Limitless Infinity during Purple Breather...');

state.arena = { x: 0, y: 0, width: 800, height: 600 };
state.gameState = 'playing';

CONFIG.gojo = CONFIG.gojo || {};
CONFIG.gojo.domainCooldown = 2000;

const gojo = new GojoFighter(100, 100);
const sukuna = new SukunaFighter(400, 100);
gojo.domainCooldown = 2000;
gojo.meleeModeCooldown = 200;
state.fighters = [gojo, sukuna];

// Step 1: In default ranged mode, Gojo's Limitless Infinity is active
gojo.update(sukuna, 0, state.arena);
assert.strictEqual(gojo.infinityActive, true, 'Gojo Infinity should be active in standard ranged mode');

const initialHp = gojo.hp;
const blocked = gojo.takeDamage(20, sukuna, { isPhysical: true });
assert.strictEqual(gojo.hp, initialHp, 'Attack should be blocked by Infinity in standard ranged mode');
console.log('✅ Standard ranged mode: Limitless Infinity is active and blocks incoming attacks.');

// Step 2: Gojo fires Hollow Purple and enters post-fire breather stasis
gojo.purpleRecoveryTimer = 50;
gojo.purpleRecoveryMaxTimer = 50;
gojo.z = 35;
gojo.infinityActive = false;

gojo.update(sukuna, 0, state.arena);
assert.strictEqual(gojo.infinityActive, false, 'Gojo Infinity must be DISABLED during Purple breather');

// Step 3: During Purple breather, incoming damage must hit Gojo directly without Infinity blocking
const hpBeforeHit = gojo.hp;
gojo.takeDamage(25, sukuna, { isPhysical: true });
assert.strictEqual(gojo.hp, hpBeforeHit - 25, 'Damage must hit Gojo directly during Purple breather');
console.log('✅ Purple breather: Limitless Infinity is disabled and incoming attacks hit directly.');

// Step 4: Countdown the breather until Gojo lands on the ground
while (gojo.purpleRecoveryTimer > 0) {
  gojo.update(sukuna, 0, state.arena);
}

assert.strictEqual(gojo.purpleRecoveryTimer, 0, 'Purple recovery timer should reach 0');
assert.strictEqual(gojo.z, 0, 'Gojo should land on ground (z=0) when breather ends');

// Update one frame after landing to ensure state is active
gojo.update(sukuna, 0, state.arena);
assert.strictEqual(gojo.infinityActive, true, 'Gojo Infinity should re-enable once breather ends and Gojo lands');

// Step 5: After landing, attacks should be blocked again
const hpAfterLanding = gojo.hp;
gojo.takeDamage(20, sukuna, { isPhysical: true });
assert.strictEqual(gojo.hp, hpAfterLanding, 'Attack should be blocked by Infinity after landing from Purple breather');
console.log('✅ Post-breather landing: Limitless Infinity is cleanly restored and blocks attacks again.');

console.log('🎉 All Gojo Purple Breather Infinity tests passed successfully!');
