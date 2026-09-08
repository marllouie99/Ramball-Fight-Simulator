import assert from 'node:assert/strict';

// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => { _stackDepth++; },
    restore: () => {
      _stackDepth--;
      assert(_stackDepth >= 0, 'Canvas 2D stack underflow!');
    },
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
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
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
  body: { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false } }
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
    this.volume = 1;
    this.currentTime = 0;
  }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
};

// Dynamic imports after globals are established
const { state } = await import('../js/core/state.js');
const { RubbickFighter } = await import('../js/entities/fighters/RubbickFighter.js');
const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
const { projectileSystem } = await import('../js/systems/projectileSystem.js');
const { drawRubbickStaff, getRubbickStaffTip } = await import('../js/graphics/weapons/rubbickWeaponGraphics.js');
const { drawRubbickSkin } = await import('../js/graphics/fighters/rubbickSkin.js');
const { drawRubbickCastSigil, drawRubbickGroundSigil } = await import('../js/graphics/particles/renderers/characterSpecialRenderers.js');
const { drawPunchWindSpeedLine } = await import('../js/graphics/particles/renderers/blastShockwaveRenderers.js');

console.log('🧪 Running Rubbick Basic Attack Animation & Visual Effects Test Suite...');

// ── TEST 1: Basic Attack Trigger & VFX Spawning ──
console.log('  1. Testing Rubbick Basic Attack trigger & VFX particle spawning...');
{
  state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
  state.sparkEffects = [];
  projectileSystem.clear();

  const rubbick = new RubbickFighter({ startX: 200, startY: 300, type: 'rubbick', color: '#00FF64' });
  const dummy = new NormalFighter({ startX: 400, startY: 300, type: 'normal', color: '#888888' });
  state.fighters = [rubbick, dummy];

  rubbick.reset();
  rubbick.attackCooldown = 0;
  rubbick.telekinesisCooldown = 999;
  rubbick.spellStealCooldown = 999;

  assert.equal(rubbick.attackSwingTimer, 0, 'Initial attackSwingTimer should be 0');

  const startX = rubbick.x;
  const startY = rubbick.y;

  // Trigger basic attack update
  rubbick.update(dummy, 1, state.arena);

  assert.equal(rubbick.attackSwingTimer, 16, 'attackSwingTimer must be initialized to 16 on basic attack');
  assert.equal(rubbick.attackSwingMaxTimer, 16, 'attackSwingMaxTimer must be initialized to 16');
  assert(rubbick.attackCooldown > 0, 'attackCooldown must be reset');
  assert(rubbick._attackSoundTimer !== undefined && rubbick._attackSoundTimer !== null, '_attackSoundTimer must be set');

  // Verify projectile
  const proj = projectileSystem.projectiles.find(p => p.isArcaneBolt);
  assert(proj, 'Arcane bolt projectile must be fired');

  // Verify VFX particles
  const sigil = state.sparkEffects.find(p => p.type === 'rubbickCastSigil');
  assert(sigil, 'rubbickCastSigil particle must be spawned at staff tip');
  assert.equal(sigil.color, '#00FF64', 'Cast sigil color should be emerald');

  const flash = state.sparkEffects.find(p => p.type === 'arcaneFlash');
  assert(flash, 'arcaneFlash particle must be spawned at staff tip');

  const sparks = state.sparkEffects.filter(p => p.type === 'arcane');
  assert(sparks.length >= 6, 'Muzzle sparks must be spawned');

  const speedLines = state.sparkEffects.filter(p => p.type === 'punchWindSpeedLine');
  assert(speedLines.length > 0, 'Supersonic speed lines must be spawned on basic attack');

  const groundSigil = state.sparkEffects.find(p => p.type === 'rubbickGroundSigil');
  assert(groundSigil, 'rubbickGroundSigil must be spawned at Rubbick position on arena floor');
  assert.equal(groundSigil.x, startX, 'Ground sigil X must match Rubbick position when cast');
  assert.equal(groundSigil.y, startY, 'Ground sigil Y must match Rubbick position when cast');

  console.log('     ✓ Basic attack timer, sound timer, projectile, ground sigil, and tip VFX verified!');
}

// ── TEST 2: Dynamic Staff Tip World Position & Staff Trail Engine ──
console.log('  2. Testing Staff Tip World Coordinates & Arcane Trail Engine...');
{
  const rubbick = new RubbickFighter({ startX: 200, startY: 300, type: 'rubbick', color: '#00FF64' });
  rubbick.gunAngle = 0; // facing right

  rubbick.attackSwingTimer = 0;
  const tipIdle = getRubbickStaffTip(rubbick);

  rubbick.attackSwingTimer = 11; // Peak thrust frame (progress = ~0.68)
  rubbick.attackSwingMaxTimer = 16;
  const tipAttacking = getRubbickStaffTip(rubbick);

  // During attack, staff thrusts forward along gunAngle (X increases when gunAngle = 0)
  assert(tipAttacking.x > tipIdle.x, 'Staff tip must thrust forward along aim vector during attack');

  // Verify staff trail accumulates during attack swing
  rubbick._updateStaffTrail(false);
  assert(rubbick.staffTrail.length > 0, 'Staff trail must track points during basic attack swing');
  assert(rubbick.staffSmokeParticles.length > 0, 'Staff smoke particles must spawn during basic attack swing');

  console.log('     ✓ Staff tip coordinates thrust forward and staff trail engine tracks points!');
}

// ── TEST 3: Canvas 2D Matrix Stack Balance & Rendering ──
console.log('  3. Testing Canvas 2D render functions for balanced transform stacks...');
{
  const ctx = createMockCtx();
  const rubbick = new RubbickFighter({ startX: 200, startY: 300, type: 'rubbick', color: '#00FF64' });

  // Test staff drawing in idle and attack frames
  rubbick.attackSwingTimer = 0;
  drawRubbickStaff(ctx, rubbick);
  assert.equal(ctx.getStackDepth(), 0, 'drawRubbickStaff idle stack unbalanced');

  rubbick.attackSwingTimer = 12;
  rubbick.attackSwingMaxTimer = 16;
  drawRubbickStaff(ctx, rubbick);
  assert.equal(ctx.getStackDepth(), 0, 'drawRubbickStaff attack stack unbalanced');

  // Test skin drawing in idle and attack frames
  rubbick.attackSwingTimer = 0;
  drawRubbickSkin(ctx, rubbick);
  assert.equal(ctx.getStackDepth(), 0, 'drawRubbickSkin idle stack unbalanced');

  rubbick.attackSwingTimer = 10;
  rubbick.attackSwingMaxTimer = 16;
  drawRubbickSkin(ctx, rubbick);
  assert.equal(ctx.getStackDepth(), 0, 'drawRubbickSkin attack stack unbalanced');

  // Test cast sigil drawing
  const mockSigil = {
    x: 250,
    y: 300,
    size: 15,
    targetSize: 38,
    life: 0.8,
    angle: 0,
    rotation: 0.5,
    color: '#00FF64'
  };
  drawRubbickCastSigil(ctx, mockSigil);
  assert.equal(ctx.getStackDepth(), 0, 'drawRubbickCastSigil stack unbalanced');

  // Test ground sigil drawing
  const mockGroundSigil = {
    x: 200,
    y: 300,
    size: 20,
    targetSize: 55,
    life: 0.9,
    rotation: 0.2,
    color: '#00FF64'
  };
  drawRubbickGroundSigil(ctx, mockGroundSigil);
  assert.equal(ctx.getStackDepth(), 0, 'drawRubbickGroundSigil stack unbalanced');

  // Test speed line drawing
  const mockSpeedLine = {
    x: 220,
    y: 300,
    angle: 0,
    size: 2.2,
    length: 150,
    life: 0.7,
    color: '#00FF64',
    isCore: true
  };
  drawPunchWindSpeedLine(ctx, mockSpeedLine);
  assert.equal(ctx.getStackDepth(), 0, 'drawPunchWindSpeedLine stack unbalanced');

  // Test staff trail rendering
  rubbick.attackSwingTimer = 10;
  rubbick._updateStaffTrail(false);
  rubbick._drawStaffTrail(ctx);
  assert.equal(ctx.getStackDepth(), 0, '_drawStaffTrail stack unbalanced');

  console.log('     ✓ All renderers completed cleanly with 100% balanced Canvas 2D stacks!');
}

console.log('✅ ALL RUBBICK BASIC ATTACK TESTS PASSED PERFECTLY!');
