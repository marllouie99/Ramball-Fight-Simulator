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

console.log('Testing Gojo Infinity Disabled in Melee Mode...');

state.arena = { x: 0, y: 0, width: 800, height: 600 };
state.gameState = 'playing';

CONFIG.gojo = CONFIG.gojo || {};
CONFIG.gojo.domainCooldown = 2000;

const gojo = new GojoFighter(100, 100);
const sukuna = new SukunaFighter(400, 100);
gojo.domainCooldown = 2000;
gojo.meleeModeCooldown = 200; // on initial cooldown so he stays ranged at distance
state.fighters = [gojo, sukuna];
state.getFighterTeam = (idx) => idx;

// 1. In Neutral Ranged Mode (Initial state at distance > 85px)
gojo.update(sukuna, 0, state.arena);
assert.strictEqual(gojo.isMeleeMode, false, 'Gojo should initially start in ranged mode');
assert.strictEqual(gojo.infinityActive, true, 'Gojo infinity should be active in ranged mode');
console.log('✔ Gojo starts in Ranged Mode with active Infinity');

// 2. Transition Gojo into Melee Mode
gojo.isMeleeMode = true;
gojo.forcedMeleeTimer = 120;
gojo.update(sukuna, 0, state.arena);

assert.strictEqual(gojo.isMeleeMode, true, 'Gojo is in Melee Mode');
assert.strictEqual(gojo.infinityActive, false, 'Gojo infinityActive MUST be false in Melee Mode');
assert.strictEqual(gojo.infinityFadeOpacity, 0, 'Gojo infinityFadeOpacity MUST be 0 in Melee Mode');
assert.strictEqual(gojo.infinityBlockTimer, 0, 'Gojo infinityBlockTimer MUST be 0 in Melee Mode');
console.log('✔ Gojo Infinity properties correctly reset to 0/false in Melee Mode');

// 3. triggerInfinityBlock returns false in Melee Mode
const blockResult = gojo.triggerInfinityBlock(100, 100, sukuna);
assert.strictEqual(blockResult, false, 'triggerInfinityBlock MUST return false in Melee Mode');
assert.strictEqual(gojo.infinityActive, false, 'infinityActive remains false');
console.log('✔ triggerInfinityBlock returns false when Gojo is in Melee Mode');

// 4. Physical collision in Melee Mode does NOT apply infinity slow
sukuna.x = 105;
sukuna.y = 100;
sukuna.slowTimer = 0;
sukuna.slowMultiplier = 1.0;
updateFighters();
assert.strictEqual(sukuna.slowTimer || 0, 0, 'Opponent MUST NOT receive Infinity slow when Gojo is in Melee Mode');
console.log('✔ Physics collisions do not apply Infinity slow during Melee Mode');

// 5. Incoming damage in Melee Mode is NOT intercepted by Infinity
const prevHp = gojo.hp;
gojo.takeDamage(15, sukuna, { isMelee: true });
assert.strictEqual(gojo.hp, prevHp - 15, 'Gojo takes full damage without Infinity block in Melee Mode');
console.log('✔ Gojo takes normal damage without Infinity block in Melee Mode');

// 6. Return to Ranged Mode
gojo.isMeleeMode = false;
gojo.forcedMeleeTimer = 0;
gojo.infinityCooldown = 0;
gojo.meleeModeCooldown = 200;
sukuna.x = 400;
sukuna.y = 100;
gojo.update(sukuna, 0, state.arena);
assert.strictEqual(gojo.isMeleeMode, false, 'Gojo is back in Ranged Mode');
assert.strictEqual(gojo.infinityActive, true, 'Gojo infinity restores in Ranged Mode');
console.log('✔ Gojo Infinity cleanly restores after exiting Melee Mode');

console.log('🎉 ALL GOJO MELEE INFINITY DISABLED TESTS PASSED!');
