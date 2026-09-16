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
const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { isFighterEffectivelyAlive, updateFighters } = await import('../js/systems/physics.js');
const { CONFIG } = await import('../js/core/config.js');

state.arena = { x: 50, y: 50, width: 800, height: 600, shape: 'rectangle' };
state.gameState = 'playing';
state.mode = '1v1';
state.scores = [0, 0];
state.fighters = [];
state.illusions = [];

const mahoragaDef = CONFIG.fighters?.find(f => f.id === 'mahoraga') || { id: 'mahoraga', type: 'mahoraga', name: 'Mahoraga', r: 30, hp: 200, maxHp: 200 };
const gojoDef = CONFIG.fighters?.find(f => f.id === 'gojo') || { id: 'gojo', type: 'gojo', name: 'Gojo', r: 25, hp: 200, maxHp: 200 };

console.log('=== TEST 1: Mahoraga takes lethal damage inside Gojo Domain ===');
const mahoraga = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 200, maxHp: 200 });
const gojo = new GojoFighter({ ...gojoDef, startX: 250, startY: 300, hp: 200, maxHp: 200 });

state.fighters = [mahoraga, gojo];
gojo.domainActive = true;
gojo.domainTimer = 1000;
state.activeDomain = 'unlimited_void';

let punchCount = 0;
while (mahoraga.hp > 0 && punchCount < 50) {
  punchCount++;
  const hpBefore = mahoraga.hp;
  gojo._meleePunch(mahoraga);
  if (mahoraga.hp <= 15 || punchCount % 5 === 0) {
    console.log(`Punch #${punchCount}: HP ${hpBefore} -> ${mahoraga.hp}, dead=${mahoraga.dead}, isDead=${mahoraga.isDead}`);
  }
  if (mahoraga.hp <= 0) break;
}

console.log(`Punches until death: ${punchCount}`);
console.log(`Mahoraga HP: ${mahoraga.hp}, dead: ${mahoraga.dead}, isDead: ${mahoraga.isDead}`);
console.log(`mahoraga.isEffectivelyAlive(): ${mahoraga.isEffectivelyAlive()}`);
console.log(`isFighterEffectivelyAlive(mahoraga): ${isFighterEffectivelyAlive(mahoraga)}`);
console.log(`state.gameState: ${state.gameState}`);

if (mahoraga.hp === 0 && mahoraga.dead && mahoraga.isDead && state.gameState === 'roundEnd') {
  console.log('✅ TEST 1 PASSED: Mahoraga died properly inside Gojo Domain and round ended!');
} else {
  console.error('❌ TEST 1 FAILED!');
  process.exit(1);
}

console.log('\n=== TEST 2: Gojo Domain expires after Mahoraga died (No undead adaptation) ===');
gojo.domainActive = false;
gojo.domainTimer = 0;
state.activeDomain = null;
mahoraga.update(gojo, 0, state.arena);
console.log(`After domain drop: Mahoraga HP: ${mahoraga.hp}, dead: ${mahoraga.dead}, gojoDomainAdapted: ${mahoraga.gojoDomainAdapted}`);
if (mahoraga.hp === 0 && mahoraga.dead && !mahoraga.gojoDomainAdapted) {
  console.log('✅ TEST 2 PASSED: Dead Mahoraga did not adapt when domain ended!');
} else {
  console.error('❌ TEST 2 FAILED: Dead Mahoraga adapted or revived!');
  process.exit(1);
}

console.log('\n=== TEST 3: Outside Gojo Domain, Mahoraga adapts normally and RCT heals ===');
state.gameState = 'playing';
state.scores = [0, 0];
const mahoraga2 = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 200, maxHp: 200 });
const gojo2 = new GojoFighter({ ...gojoDef, startX: 250, startY: 300, hp: 200, maxHp: 200 });
state.fighters = [mahoraga2, gojo2];

// Deal non-domain damage exceeding threshold (200 * 0.80 = 160 HP)
console.log(`Initial Mahoraga2 HP: ${mahoraga2.hp}`);
mahoraga2.takeDamage(165, gojo2, { isMelee: true });
console.log(`After 165 damage: Mahoraga2 HP: ${mahoraga2.hp}, totalStages: ${mahoraga2.totalAdaptationStages}, adaptedMelee: ${mahoraga2.adapted.melee}`);
if (mahoraga2.adapted.melee && mahoraga2.totalAdaptationStages >= 1) {
  console.log('✅ TEST 3 PASSED: Normal adaptation outside domain works perfectly!');
} else {
  console.error('❌ TEST 3 FAILED!');
  process.exit(1);
}

console.log('\nALL TESTS PASSED SUCCESSFULLY!');
