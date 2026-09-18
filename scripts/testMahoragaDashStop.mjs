// ─────────────────────────────────────────────
// Test Mahoraga Dash Stop & Natural Movement Resumption
// ─────────────────────────────────────────────
import { strict as assert } from 'assert';

function createMockCtx() {
  const noop = () => {};
  return {
    save: noop, restore: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, fillRect: noop,
    strokeRect: noop, clearRect: noop, fill: noop, stroke: noop,
    scale: noop, rotate: noop, translate: noop, drawImage: noop,
    fillText: noop, strokeText: noop, measureText: () => ({ width: 10 }),
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
  getElementById: () => ({ getContext: () => createMockCtx(), width: 1200, height: 800, style: {} }),
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

const { CONFIG } = await import('../js/core/config.js');
const { state } = await import('../js/core/state.js');
const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
const { startAdaptationFlashDash } = await import('../js/entities/fighters/mahoraga/mahoragaSkills.js');

console.log('🧪 Starting Mahoraga Dash Stop & Movement Resumption Test...');

// Mock Arena
const mockArena = { x: 50, y: 50, width: 1100, height: 700, shape: 'rectangle' };
state.arena = mockArena;

const mahoragaDef = CONFIG.fighters?.find(f => f.id === 'mahoraga') || { id: 'mahoraga', type: 'mahoraga', name: 'Mahoraga', r: 30, speed: 6.5, hp: 1200, damage: 25, cooldown: 60 };
const normalDef = { id: 'normal', type: 'normal', name: 'Enemy', r: 25, speed: 6.0, hp: 1200, damage: 20, cooldown: 60 };

const mahoraga = new MahoragaFighter({ ...mahoragaDef, startX: 200, startY: 200 });
const enemy = new NormalFighter({ ...normalDef, startX: 600, startY: 200 });
state.fighters = [mahoraga, enemy];
state.projectiles = [];

console.log('1. Testing Adaptation Flash-Dash Forward to Enemy...');
startAdaptationFlashDash(mahoraga, enemy);
assert.equal(mahoraga.adaptationDashTimer > 0, true, 'Mahoraga should have active adaptationDashTimer');

// Run frames until dash completes
let dashFrames = 0;
while (mahoraga.adaptationDashTimer > 0 && dashFrames < 25) {
  mahoraga.update(enemy, 0, mockArena);
  dashFrames++;
}

console.log(`   Dash completed in ${dashFrames} frames.`);
assert.equal(mahoraga.adaptationDashTimer, 0, 'Adaptation dash should be complete');
assert.equal(mahoraga.postDashPauseTimer, CONFIG.mahoraga?.postDashPauseFrames ?? 60, 'postDashPauseTimer should be set to 60');
assert.equal(mahoraga.vx, 0, 'Velocity X should be 0 upon arrival');
assert.equal(mahoraga.vy, 0, 'Velocity Y should be 0 upon arrival');

const stoppedX = mahoraga.x;
const stoppedY = mahoraga.y;

console.log(`2. Testing 1-second (60 frames) stationary hold at (${stoppedX.toFixed(1)}, ${stoppedY.toFixed(1)})...`);
for (let f = 1; f <= 59; f++) {
  mahoraga.update(enemy, 0, mockArena);
  assert.equal(mahoraga.postDashPauseTimer > 0, true, `postDashPauseTimer should be > 0 at frame ${f}`);
  assert.equal(mahoraga.vx, 0, `Velocity X must remain 0 at frame ${f}`);
  assert.equal(mahoraga.vy, 0, `Velocity Y must remain 0 at frame ${f}`);
  assert.equal(Math.abs(mahoraga.x - stoppedX) < 0.01, true, `Mahoraga X must remain stopped at frame ${f}`);
  assert.equal(Math.abs(mahoraga.y - stoppedY) < 0.01, true, `Mahoraga Y must remain stopped at frame ${f}`);
}

console.log('3. Testing transition back to natural movement after 60 frames...');
// 60th frame of pause (timer reaches 0 and resumes movement)
mahoraga.update(enemy, 0, mockArena);
assert.equal(mahoraga.postDashPauseTimer, 0, 'postDashPauseTimer should now be 0');

// Next frame natural movement should be active
mahoraga.update(enemy, 0, mockArena);
const speed = Math.hypot(mahoraga.vx, mahoraga.vy);
console.log(`   Natural movement resumed with speed = ${speed.toFixed(2)}px/frame`);
assert.equal(speed > 0.5, true, 'Mahoraga should now be moving naturally across arena');

console.log('4. Testing Wall Rebound Dash forward to enemy...');
// Reset positions
mahoraga.x = mockArena.x + mahoraga.r - 2; // Past left wall boundary to trigger bounce
mahoraga.y = 300;
mahoraga.vx = -10; // moving into left wall
mahoraga.vy = 0;
mahoraga.postDashPauseTimer = 0;
mahoraga._lastWallReboundTime = 0;

enemy.x = 600;
enemy.y = 300;

// Trigger wall bounce and rebound dash
mahoraga.resolveWallBounce(mockArena, enemy);
assert.equal(mahoraga.isWallReboundDashing, true, 'isWallReboundDashing should be true after wall rebound');
const surgeSpeed = Math.hypot(mahoraga.vx, mahoraga.vy);
console.log(`   Wall Rebound Dash surging at speed = ${surgeSpeed.toFixed(2)}px/frame`);
assert.equal(surgeSpeed >= 16.0, true, 'Surge speed should be >= 16.0');

// Simulate movement toward enemy until melee contact
let reboundFrames = 0;
while (mahoraga.isWallReboundDashing && reboundFrames < 60) {
  mahoraga.update(enemy, 0, mockArena);
  reboundFrames++;
}

console.log(`   Rebound dash reached enemy in ${reboundFrames} frames.`);
assert.equal(mahoraga.isWallReboundDashing, false, 'isWallReboundDashing should be cleared upon arrival at enemy');
assert.equal(mahoraga.postDashPauseTimer > 0, true, 'postDashPauseTimer should be activated upon arrival at enemy');
assert.equal(mahoraga.vx, 0, 'Velocity X should be 0 upon reaching enemy');
assert.equal(mahoraga.vy, 0, 'Velocity Y should be 0 upon reaching enemy');

console.log('✅ ALL MAHORAGA DASH STOP TESTS PASSED SUCCESSFULLY!');
process.exit(0);
