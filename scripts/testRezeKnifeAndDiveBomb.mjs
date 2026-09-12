globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.Audio = class { 
  constructor() {} 
  play() { return Promise.resolve(); } 
  pause() {} 
  cloneNode() { return this; }
  addEventListener() {}
  removeEventListener() {}
};
const mockCanvas = {
  width: 540,
  height: 960,
  style: {},
  getContext: () => ({
    save: () => {}, restore: () => {}, beginPath: () => {}, closePath: () => {},
    moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {},
    arc: () => {}, rect: () => {}, fillRect: () => {}, clearRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    measureText: () => ({ width: 50 }),
  })
};

globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => (id === 'arena' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => (tag === 'canvas' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {} } }),
  body: { style: {} }
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { state } = await import('../js/core/state.js');
const { CONFIG } = await import('../js/core/config.js');
const { RezeFighter } = await import('../js/entities/fighters/RezeFighter.js');
const { Fighter } = await import('../js/entities/fighter.js');

// Setup minimal mock state
state.fighters = [];
state.illusions = [];
state.mode = '1v1';
CONFIG.arena = { x: 0, y: 0, width: 800, height: 600 };

console.log('🧪 Testing Reze Basic Attack: Hidden Knife Combo & Aerial Dive Bomb...');

// 1. Initialize Reze and Dummy Opponent
const reze = new RezeFighter({ hp: 340, x: 200, y: 300 });
const dummy = new Fighter({ hp: 300, x: 235, y: 300 });
dummy.r = 25;
dummy.maxHp = 300;
dummy.hp = 300;
state.fighters = [reze, dummy];

console.log('--- Test 1: Human Form Light Attack String (Hidden Knife Combo) ---');
reze.shootCooldown = 0;
reze.diveBombCooldown = 999; // Force melee knife
reze.isHybridModeActive = false;

// Strike 1
const hpBefore1 = dummy.hp;
reze.aim(dummy);
reze._updateRezeCombatAI(dummy);
console.log(`Strike 1: ComboCount=${reze.punchComboCount}, AnimTimer=${reze.punchAnimTimer}, Slashes=${reze.activeKnifeSlashes.length}`);
if (dummy.hp < hpBefore1 && reze.punchComboCount === 1) {
  console.log(`✅ Strike 1 dealt ${hpBefore1 - dummy.hp} damage (Expected ~10) and applied ${dummy.timeStopTimer} frames micro-stun.`);
} else {
  throw new Error(`Strike 1 failed: hpBefore=${hpBefore1}, hpAfter=${dummy.hp}`);
}

// Reset cooldown & anim timer and Strike 2
reze.punchAnimTimer = 0;
reze.shootCooldown = 0;
reze.x = 200; reze.y = 300;
dummy.x = 235; dummy.y = 300;
reze.aim(dummy);
const hpBefore2 = dummy.hp;
reze._updateRezeCombatAI(dummy);
console.log(`Strike 2: ComboCount=${reze.punchComboCount}, AnimTimer=${reze.punchAnimTimer}, Slashes=${reze.activeKnifeSlashes.length}`);
if (dummy.hp < hpBefore2 && reze.punchComboCount === 2) {
  console.log(`✅ Strike 2 dealt ${hpBefore2 - dummy.hp} damage (Expected ~10).`);
} else {
  throw new Error(`Strike 2 failed: hpBefore=${hpBefore2}, hpAfter=${dummy.hp}`);
}

// Reset cooldown & anim timer and Strike 3 (Finisher)
reze.punchAnimTimer = 0;
reze.shootCooldown = 0;
reze.x = 200; reze.y = 300;
dummy.x = 235; dummy.y = 300;
reze.aim(dummy);
const hpBefore3 = dummy.hp;
reze._updateRezeCombatAI(dummy);
console.log(`Strike 3 (Finisher): ComboCount=${reze.punchComboCount}, AnimTimer=${reze.punchAnimTimer}, shootCooldown=${reze.shootCooldown}, Slashes=${reze.activeKnifeSlashes.length}`);
if (dummy.hp < hpBefore3 && reze.punchComboCount === 0) {
  console.log(`✅ Strike 3 dealt ${hpBefore3 - dummy.hp} damage (Expected ~16).`);
} else {
  throw new Error(`Strike 3 failed: hpBefore=${hpBefore3}, hpAfter=${dummy.hp}`);
}

console.log('\n--- Test 2: Aerial Attack (Dive Bomb & Shoulder Vault) ---');
reze.reset();
dummy.hp = 300;
dummy.timeStopTimer = 0;
dummy.hitStunTimer = 0;
reze.x = 100;
reze.y = 300;
dummy.x = 220; // 120px away (within dive range 70-240)
dummy.y = 300;
reze.diveBombCooldown = 0;
reze.isHybridModeActive = false;

console.log(`Initial Positions: Reze=(${reze.x}, ${reze.y}), Dummy=(${dummy.x}, ${dummy.y})`);
reze._updateRezeCombatAI(dummy);

if (reze.isDiveBombing) {
  console.log(`✅ Dive Bomb initiated! Airborne z=${reze.z}, diveTimer=${reze.diveBombTimer}`);
} else {
  throw new Error('Dive Bomb failed to initiate at 120px range.');
}

// Step frames until dive connects
let connected = false;
for (let frame = 0; frame < 15; frame++) {
  reze.update();
  if (reze.isVaulting) {
    connected = true;
    console.log(`✅ Dive Bomb connected at frame ${frame + 1}! Vault active: z=${reze.z}, dummyStun=${dummy.timeStopTimer}`);
    break;
  }
}

if (!connected) {
  throw new Error('Dive Bomb failed to connect or trigger vault.');
}

if (dummy.hp < 300 && dummy.timeStopTimer >= 20) {
  console.log(`✅ Opponent took ${300 - dummy.hp} dive damage (Expected 22) and is stunned for ${dummy.timeStopTimer} frames.`);
} else {
  throw new Error(`Dummy status check failed: hp=${dummy.hp}, timeStopTimer=${dummy.timeStopTimer}`);
}

// Step vault recovery
for (let frame = 0; frame < 20; frame++) {
  reze.update();
}
console.log(`Vault complete: isVaulting=${reze.isVaulting}, z=${reze.z}`);
if (!reze.isVaulting && reze.z === 0) {
  console.log('✅ Acrobatic shoulder vault landed cleanly on ground!');
}

console.log('\n--- Test 3: Bomb Devil Hybrid Form Basic Attack ---');
reze.reset();
dummy.hp = 300;
reze.x = 200;
reze.y = 300;
dummy.x = 240;
dummy.y = 300;
reze.isHybridModeActive = true;
reze.shootCooldown = 0;
reze.aim(dummy);

const hpBeforeHybrid = dummy.hp;
reze._updateRezeCombatAI(dummy);
console.log(`Hybrid Punch: comboCount=${reze.punchComboCount}, activeMartialArcs=${reze.activeMartialArcs.length}`);
if (dummy.hp < hpBeforeHybrid && reze.activeMartialArcs.length > 0) {
  console.log(`✅ Hybrid punch dealt ${hpBeforeHybrid - dummy.hp} damage and spawned 120° pixel martial arc.`);
} else {
  throw new Error('Hybrid punch failed.');
}

console.log('\n🎉 ALL REZE BASIC ATTACK & DIVE BOMB TESTS PASSED PERFECTLY!');
