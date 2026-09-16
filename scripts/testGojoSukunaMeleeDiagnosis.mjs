function createMockCtx() {
  const calls = [];
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, fillRect: noop,
    strokeRect: noop, clearRect: noop, fill: noop, stroke: noop,
    scale: noop, rotate: noop, translate: noop, drawImage: noop,
    fillText: noop, measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop })
  };
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

const { state } = await import('../js/core/state.js');
const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');

state.gameState = 'playing';
state.getFighterTeam = (idx) => idx;
state.arena = { x: 50, y: 50, width: 800, height: 600, shape: 'rectangle' };
state.canvas = { width: 900, height: 700 };
state.projectiles = [];
state.fighters = [];

const gojo = new GojoFighter({ x: 300, y: 300, color: '#00E5FF' });
const sukuna = new SukunaFighter({ x: 350, y: 300, color: '#FF2400' });
state.fighters = [gojo, sukuna];

// Put skills on cooldown so we test pure Melee Mode
gojo.domainCooldown = 1000;
gojo.purpleCooldown = 1000;
gojo.redCooldown = 1000;
gojo.introReboundActive = false;
gojo.introReboundTimer = 0;

sukuna.domainCooldown = 1000;
sukuna.divineFlameCooldown = 1000;

// Force both into Melee Mode
gojo.isMeleeMode = true;
gojo.forcedMeleeTimer = 200;
sukuna.isMeleeMode = true;
sukuna.forcedMeleeTimer = 200;

console.log('=== TEST 1: Simultaneous Melee Mode Punch Exchange (60 frames) ===');

let gojoHitsLanded = 0;
let sukunaHitsLanded = 0;

const origGojoTakeDamage = gojo.takeDamage.bind(gojo);
gojo.takeDamage = (amount, attacker, opts) => {
  const hpBefore = gojo.hp;
  const res = origGojoTakeDamage(amount, attacker, opts);
  if (gojo.hp < hpBefore) {
    sukunaHitsLanded++;
    console.log(`[Frame ${state.frameCount}] Sukuna LANDED punch on Gojo! Damage: ${amount}, Gojo HP: ${gojo.hp}`);
  }
  return res;
};

const origSukunaTakeDamage = sukuna.takeDamage.bind(sukuna);
sukuna.takeDamage = (amount, attacker, opts) => {
  const hpBefore = sukuna.hp;
  const res = origSukunaTakeDamage(amount, attacker, opts);
  if (sukuna.hp < hpBefore) {
    gojoHitsLanded++;
    console.log(`[Frame ${state.frameCount}] Gojo LANDED punch on Sukuna! Damage: ${amount}, Sukuna HP: ${sukuna.hp}`);
  }
  return res;
};

for (let frame = 0; frame < 60; frame++) {
  state.frameCount = frame;
  gojo.update(sukuna, 0, state.arena);
  sukuna.update(gojo, 1, state.arena);
}

console.log('\n--- Summary Test 1 ---');
console.log(`Gojo hits landed on Sukuna: ${gojoHitsLanded}`);
console.log(`Sukuna hits landed on Gojo: ${sukunaHitsLanded}`);
console.log(`Gojo final HP: ${gojo.hp}, Sukuna final HP: ${sukuna.hp}`);
if (gojoHitsLanded > 0 && sukunaHitsLanded > 0) {
  console.log('✅ SUCCESS: Both Gojo and Sukuna exchanged punches simultaneously in Melee Mode!');
} else {
  console.error('❌ FAILURE: One or both fighters failed to land punches during Melee Mode!');
  process.exit(1);
}

console.log('\n=== TEST 2: Ranged Mode to Melee Transition ===');
const gojo2 = new GojoFighter({ x: 200, y: 300, color: '#00E5FF' });
const sukuna2 = new SukunaFighter({ x: 500, y: 300, color: '#FF2400' });
state.fighters = [gojo2, sukuna2];
gojo2.domainCooldown = 1000;
gojo2.purpleCooldown = 1000;
gojo2.redCooldown = 1000;
sukuna2.domainCooldown = 1000;
sukuna2.divineFlameCooldown = 1000;

console.log(`Initial Ranged: Gojo infinityActive=${gojo2.infinityActive}, isMeleeMode=${gojo2.isMeleeMode}`);

// Move Sukuna into close range (70px away)
sukuna2.x = 270;
sukuna2.y = 300;

for (let frame = 0; frame < 30; frame++) {
  state.frameCount = 100 + frame;
  gojo2.update(sukuna2, 0, state.arena);
  sukuna2.update(gojo2, 1, state.arena);
}

console.log(`After Close Range: Gojo isMeleeMode=${gojo2.isMeleeMode}, Sukuna isMeleeMode=${sukuna2.isMeleeMode}, Gojo infinityActive=${gojo2.infinityActive}`);
if (gojo2.isMeleeMode && sukuna2.isMeleeMode && !gojo2.infinityActive) {
  console.log('✅ SUCCESS: Both fighters entered Melee Mode and Gojo infinity correctly disabled!');
} else {
  console.error('❌ FAILURE: Fighters did not enter Melee Mode or Infinity remained active!');
  process.exit(1);
}

