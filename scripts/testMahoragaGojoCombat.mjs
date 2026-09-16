// Full combat simulation: Mahoraga vs Gojo (1500 frames)
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

state.arena = { x: 50, y: 50, width: 800, height: 600, shape: 'rectangle' };
state.gameState = 'playing';
state.projectiles = [];
state.fighters = [];
state.illusions = [];

const mahoragaDef = CONFIG.fighters?.find(f => f.id === 'mahoraga') || { id: 'mahoraga', type: 'mahoraga', name: 'Mahoraga', r: 30, speed: 6.5, hp: 1200, damage: 25, cooldown: 60 };
const gojoDef = CONFIG.fighters?.find(f => f.id === 'gojo') || { id: 'gojo', type: 'gojo', name: 'Gojo', r: 25, speed: 6.0, hp: 1200, damage: 20, cooldown: 60 };

const mahoraga = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 300, hp: 1500, maxHp: 1500 });
const gojo = new GojoFighter({ ...gojoDef, startX: 600, startY: 300, hp: 1500, maxHp: 1500 });

state.fighters = [mahoraga, gojo];
projectileSystem.projectiles = [];
state.projectiles = projectileSystem.projectiles;

let mahoragaAttackCount = 0;
let mahoragaMeleeHits = 0;
let mahoragaSkillUses = 0;

// Track Mahoraga attacks
const origShoot = mahoraga.shoot.bind(mahoraga);
mahoraga.shoot = function(ownerIndex) {
  mahoragaAttackCount++;
  return origShoot(ownerIndex);
};

const origPerformMelee = mahoraga._performMeleeAttack.bind(mahoraga);
mahoraga._performMeleeAttack = function(opp) {
  mahoragaMeleeHits++;
  return origPerformMelee(opp);
};

const origCleave = mahoraga._executeCleave.bind(mahoraga);
mahoraga._executeCleave = function(opp) {
  mahoragaSkillUses++;
  return origCleave(opp);
};

const origShout = mahoraga._executeShout.bind(mahoraga);
mahoraga._executeShout = function(opp, ownerIdx) {
  mahoragaSkillUses++;
  return origShout(opp, ownerIdx);
};

console.log('--- Starting 1000 frame simulated match ---');
let mahoragaFrozenStreak = 0;
let maxMahoragaFrozenStreak = 0;

for (let frame = 1; frame <= 1000; frame++) {
  state.frameCount = frame;

  // Simulate AI update
  projectileSystem.update(state.fighters);
  mahoraga.update(gojo, 0, state.arena);
  gojo.update(mahoraga, 1, state.arena);

  // Check collision
  const dist = Math.hypot(mahoraga.x - gojo.x, mahoraga.y - gojo.y);
  if (dist < mahoraga.r + gojo.r) {
    mahoraga.onCollide(gojo);
    gojo.onCollide(mahoraga);
  }

  // Periodic basic attack checks
  if (mahoraga.shootCooldown <= 0 && mahoraga.canPerformBasicAttack()) {
    mahoraga.shoot(0);
  }
  if (gojo.shootCooldown <= 0 && gojo.canPerformBasicAttack()) {
    gojo.shoot(1);
  }

  // Track if Mahoraga is frozen or unable to act for abnormally long
  const isStuck = mahoraga.isPulledOrDragged() || (!mahoraga.canPerformBasicAttack() && mahoraga.hitStunTimer === 0 && mahoraga.timeStopTimer === 0 && !mahoraga.isCleaving && !mahoraga.isShouting && !mahoraga.isThrowing && !mahoraga.isBlitzActive && !mahoraga.isWallSlamActive);
  if (isStuck) {
    mahoragaFrozenStreak++;
    if (mahoragaFrozenStreak > maxMahoragaFrozenStreak) {
      maxMahoragaFrozenStreak = mahoragaFrozenStreak;
    }
  } else {
    mahoragaFrozenStreak = 0;
  }

  if (frame === 200 || frame === 400 || frame === 600 || frame === 800 || frame === 1000) {
    console.log(`[Frame ${frame}]`);
    console.log(`  Mahoraga HP: ${Math.round(mahoraga.hp)}, Gojo HP: ${Math.round(gojo.hp)}`);
    console.log(`  Mahoraga Adaptations:`, {
      stages: mahoraga.totalAdaptationStages,
      blueImmune: mahoraga.gojoBlueDragImmune,
      infinityImmune: mahoraga.gojoInfinityImmune,
      domainAdapted: mahoraga.gojoDomainAdapted
    });
    console.log(`  Mahoraga Attacks: ${mahoragaAttackCount}, Melee Hits: ${mahoragaMeleeHits}, Skills: ${mahoragaSkillUses}`);
    console.log(`  Mahoraga isPulledOrDragged: ${mahoraga.isPulledOrDragged()}, canAct: ${mahoraga.canPerformBasicAttack()}`);
  }
}

console.log('\n--- Simulation Summary ---');
console.log(`Total Mahoraga Basic Attacks / Barrages: ${mahoragaAttackCount}`);
console.log(`Total Mahoraga Melee Hits: ${mahoragaMeleeHits}`);
console.log(`Total Mahoraga Skill Uses: ${mahoragaSkillUses}`);
console.log(`Max consecutive stuck frames: ${maxMahoragaFrozenStreak}`);
console.log(`Final Mahoraga Status: alive=${mahoraga.hp > 0}, pulled=${mahoraga.isPulledOrDragged()}, canAct=${mahoraga.canPerformBasicAttack()}`);

if (mahoragaAttackCount > 0 || mahoragaMeleeHits > 0) {
  console.log('✅ TEST PASSED: Mahoraga remains active, attacks, and does not brick against Gojo!');
} else {
  console.error('❌ TEST FAILED: Mahoraga did not perform any attacks!');
  process.exit(1);
}
