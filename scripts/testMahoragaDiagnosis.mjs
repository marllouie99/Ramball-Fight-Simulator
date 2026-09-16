// Simulation test: Mahoraga vs Gojo combat test
function createMockCtx() {
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
const { projectileSystem } = await import('../js/systems/projectileSystem.js');
const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { CONFIG } = await import('../js/core/config.js');

state.arena = { x: 50, y: 50, width: 800, height: 600 };
state.gameState = 'playing';
state.projectiles = [];
state.fighters = [];
state.illusions = [];

const mahoragaDef = CONFIG.fighters?.find(f => f.id === 'mahoraga') || { id: 'mahoraga', type: 'mahoraga', name: 'Mahoraga', r: 30, speed: 6.5, hp: 500, damage: 15, cooldown: 60 };
const gojoDef = CONFIG.fighters?.find(f => f.id === 'gojo') || { id: 'gojo', type: 'gojo', name: 'Gojo', r: 25, speed: 6.0, hp: 500, damage: 12, cooldown: 60 };

const mahoraga = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 1000 });
const gojo = new GojoFighter({ ...gojoDef, startX: 400, startY: 300, hp: 1000 });

state.fighters = [mahoraga, gojo];
projectileSystem.projectiles = [];
state.projectiles = projectileSystem.projectiles;

console.log('=== TEST 1: Simulate Gojo firing Blue and projectile update ===');
// Gojo shoots Blue (or fires Blue projectile)
gojo.shoot(1);
console.log('Projectiles fired:', projectileSystem.projectiles.length);
const blueProj = projectileSystem.projectiles[0];
console.log('Projectile is blue?:', blueProj?.behaviorType, blueProj?.isGojoBlue);

// Update projectiles until Blue hits or expires
for (let f = 0; f < 100; f++) {
  state.frameCount = f;
  projectileSystem.update(state.fighters);
  mahoraga.update(gojo, 0, state.arena);
  gojo.update(mahoraga, 1, state.arena);
}

console.log('After 100 frames with Blue:');
console.log('  mahoraga.isCaughtInBlue:', mahoraga.isCaughtInBlue);
console.log('  mahoraga.isCaughtInBluePull:', mahoraga.isCaughtInBluePull);
console.log('  mahoraga.isPulledOrDragged():', mahoraga.isPulledOrDragged());
console.log('  mahoraga.canPerformBasicAttack():', mahoraga.canPerformBasicAttack());
console.log('  Active projectiles:', projectileSystem.projectiles.length);

// Now let all projectiles expire
for (let f = 100; f < 300; f++) {
  state.frameCount = f;
  projectileSystem.update(state.fighters);
  mahoraga.update(gojo, 0, state.arena);
  gojo.update(mahoraga, 1, state.arena);
}

console.log('After Blue has expired (frame 300):');
console.log('  Active projectiles:', projectileSystem.projectiles.length);
console.log('  mahoraga.isCaughtInBlue:', mahoraga.isCaughtInBlue);
console.log('  mahoraga.isCaughtInBluePull:', mahoraga.isCaughtInBluePull);
console.log('  mahoraga.isPulledOrDragged():', mahoraga.isPulledOrDragged());
console.log('  mahoraga.canPerformBasicAttack():', mahoraga.canPerformBasicAttack());
console.log('  mahoraga.swordCooldown:', mahoraga.swordCooldown);
console.log('  mahoraga.hitStunTimer:', mahoraga.hitStunTimer);
console.log('  mahoraga.timeStopTimer:', mahoraga.timeStopTimer);

console.log('\n=== TEST 2: Gojo Reversal Red against Mahoraga ===');
const m2 = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 1000 });
const g2 = new GojoFighter({ ...gojoDef, startX: 280, startY: 300, hp: 1000 });
state.fighters = [m2, g2];
projectileSystem.projectiles = [];
state.projectiles = projectileSystem.projectiles;

// Gojo activates and detonates Red
g2.redCooldown = 0;
g2._activateRed();
for (let f = 0; f < 150; f++) {
  state.frameCount = f;
  projectileSystem.update(state.fighters);
  m2.update(g2, 0, state.arena);
  g2.update(m2, 1, state.arena);
}
console.log('After Red detonate + recovery (frame 150):');
console.log('  m2.isPulledOrDragged():', m2.isPulledOrDragged());
console.log('  m2.canPerformBasicAttack():', m2.canPerformBasicAttack());
console.log('  m2.hitStunTimer:', m2.hitStunTimer);
console.log('  m2.timeStopTimer:', m2.timeStopTimer);
console.log('  m2.slowTimer:', m2.slowTimer);
console.log('  m2.isFrozenByInfinity:', m2.isFrozenByInfinity);

console.log('\n=== TEST 3: Gojo Hollow Purple against Mahoraga ===');
const m3 = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 1000 });
const g3 = new GojoFighter({ ...gojoDef, startX: 500, startY: 300, hp: 1000 });
state.fighters = [m3, g3];
projectileSystem.projectiles = [];
state.projectiles = projectileSystem.projectiles;

g3.purpleCooldown = 0;
g3.isChannelingPurple = true;
g3.purpleChargeTimer = g3.purpleChargeMax;
g3._firePurple(1);
console.log('Purple fired, active projectiles:', projectileSystem.projectiles.length);

for (let f = 0; f < 300; f++) {
  state.frameCount = f;
  projectileSystem.update(state.fighters);
  m3.update(g3, 0, state.arena);
  g3.update(m3, 1, state.arena);
}
console.log('After Purple pass (frame 300):');
console.log('  m3.isPulledOrDragged():', m3.isPulledOrDragged());
console.log('  m3.isCaughtInPurple:', m3.isCaughtInPurple);
console.log('  m3.purpleHitTimer:', m3.purpleHitTimer);
console.log('  m3.canPerformBasicAttack():', m3.canPerformBasicAttack());
console.log('  Active projectiles in test 3:', projectileSystem.projectiles.map(p => ({ behaviorType: p.behaviorType, life: p.life, x: p.x, y: p.y, dist: Math.hypot(m3.x - p.x, m3.y - p.y) })));

console.log('\n=== TEST 4: Gojo Unlimited Void against Mahoraga ===');
const m4 = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 1000 });
const g4 = new GojoFighter({ ...gojoDef, startX: 280, startY: 300, hp: 1000 });
state.fighters = [m4, g4];
projectileSystem.projectiles = [];
state.projectiles = projectileSystem.projectiles;

g4.domainCooldown = 0;
g4.domainActive = true;
g4.domainTimer = 100;

for (let f = 0; f < 100; f++) {
  state.frameCount = f;
  projectileSystem.update(state.fighters);
  m4.update(g4, 0, state.arena);
  g4.update(m4, 1, state.arena);
}
console.log('During Domain (frame 100):');
console.log('  g4.domainActive:', g4.domainActive);
console.log('  m4.isPulledOrDragged():', m4.isPulledOrDragged());
console.log('  m4.timeStopTimer:', m4.timeStopTimer);
console.log('  m4.gojoDomainAdapted:', m4.gojoDomainAdapted);

// Now domain expires
for (let f = 100; f < 250; f++) {
  state.frameCount = f;
  projectileSystem.update(state.fighters);
  m4.update(g4, 0, state.arena);
  g4.update(m4, 1, state.arena);
}
console.log('After Domain expires (frame 250):');
console.log('  g4.domainActive:', g4.domainActive);
console.log('  m4.gojoDomainAdapted:', m4.gojoDomainAdapted);
console.log('  m4.isPulledOrDragged():', m4.isPulledOrDragged());
console.log('  m4.timeStopTimer:', m4.timeStopTimer);
console.log('  m4.canPerformBasicAttack():', m4.canPerformBasicAttack());
console.log('  m4.areAttackEffectsSuppressed():', m4.areAttackEffectsSuppressed());

