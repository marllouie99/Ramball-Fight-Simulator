// Test Suite: Gojo Limitless Infinity Barrier Angles & Attacker Hit Visuals Suppression
import assert from 'assert';

function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;
  return {
    save: () => { _stackDepth++; },
    restore: () => {
      _stackDepth--;
      if (_stackDepth < 0) throw new Error(`[CANVAS STACK CORRUPTION] restore called with depth ${_stackDepth}`);
    },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, arcTo: noop,
    ellipse: noop, rect: noop, roundRect: noop, setLineDash: noop, getLineDash: () => [],
    fillRect: noop, strokeRect: noop, clearRect: noop, fill: noop, stroke: noop,
    clip: noop, scale: noop, rotate: noop, translate: noop, transform: noop,
    setTransform: noop, resetTransform: noop, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillText: noop, strokeText: noop, measureText: () => ({ width: 50 }),
    drawImage: noop, createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, globalAlpha: 1.0, globalCompositeOperation: 'source-over',
    fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1.0,
    lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
    canvas: { width: 800, height: 600 }
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
  addEventListener: () => {}, removeEventListener: () => {},
  getElementById: (id) => (id === 'arena' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} }),
  querySelector: () => null, querySelectorAll: () => [],
  createElement: (tag) => (tag === 'canvas' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {} } }),
  body: { style: {} }
};
globalThis.Image = class { constructor() { this.width = 100; this.height = 100; this.complete = true; } };
globalThis.Audio = class { constructor() { this.play = () => Promise.resolve(); this.pause = () => {}; this.addEventListener = () => {}; this.removeEventListener = () => {}; this.cloneNode = () => new globalThis.Audio(); } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// Track spawned visual effects
globalThis.spawnedEffects = [];
globalThis.spawnMeleeClashShockwave = (x, y, r, type) => {
  globalThis.spawnedEffects.push({ type: 'shockwave', x, y, r, effectType: type });
};
globalThis.spawnSparks = (x, y, count, color, color2) => {
  globalThis.spawnedEffects.push({ type: 'sparks', x, y, count, color, color2 });
};
globalThis.spawnImpactFlash = (x, y, radius, color) => {
  globalThis.spawnedEffects.push({ type: 'impactFlash', x, y, radius, color });
};
globalThis.spawnAnimePunchImpactFrame = (x, y, size, angle, theme) => {
  globalThis.spawnedEffects.push({ type: 'animePunch', x, y, size, angle, theme });
};
globalThis.spawnTojiCleaveHitEffect = (x, y, angle) => {
  globalThis.spawnedEffects.push({ type: 'tojiCleave', x, y, angle });
};
globalThis.spawnBloodEffect = (target, amount, angle) => {
  globalThis.spawnedEffects.push({ type: 'blood', x: target.x, y: target.y, amount, angle });
};
globalThis.spawnBlackFlash = (x, y) => {
  globalThis.spawnedEffects.push({ type: 'blackFlash', x, y });
};
globalThis.triggerGlobalScreenShake = () => {};

async function run() {
  const { CONFIG } = await import('../js/core/config.js');
  const { state } = await import('../js/core/state.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
  const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
  const { updateMeleeCombat: sukunaUpdateMeleeCombat } = await import('../js/entities/fighters/sukuna/sukunaCombat.js');
  const { SaitamaFighter } = await import('../js/entities/fighters/SaitamaFighter.js');
  const { TodoFighter } = await import('../js/entities/fighters/TodoFighter.js');
  const { modUpdateMeleeCombat: todoUpdateMeleeCombat } = await import('../js/entities/fighters/todo/todoCombat.js');
  const { performSplitSoulKatanaSlash } = await import('../js/entities/fighters/toji/tojiWeapons.js');
  const { applyDamageToTarget } = await import('../js/entities/fighter.js');

  const { ParticleSystem } = await import('../js/systems/particles/ParticleSystem.js');
  const origSpawn = ParticleSystem.spawn;
  ParticleSystem.spawn = function(x, y, count, type, overrideProps) {
    globalThis.spawnedEffects.push({ type: 'particle', x, y, count, particleType: type, overrideProps });
    return origSpawn.apply(this, arguments);
  };

  CONFIG.arena = { x: 0, y: 0, width: 800, height: 600 };
  state.ctx = mockCtx;
  state.canvas = mockCanvas;
  state.fighters = [];
  state.projectiles = [];
  state.particles = [];
  state.sparkEffects = [];
  state.illusions = [];
  state.frameCount = 0;
  state.getFighterTeam = (idx) => idx;

  console.log('🧪 [TEST 1] Testing 8 Radial Attack Angles on Gojo Limitless Infinity Barrier...');
  const gojo = new GojoFighter({ startX: 400, startY: 300, color: '#E0FFFF', type: 'gojo' });
  gojo.infinityActive = true;
  gojo.infinityCooldown = 0;
  gojo.gunAngle = 0; // Facing right (East)
  const barrierRadius = CONFIG.gojo?.infinityRadius ?? (gojo.r + 30);

  const angles = [
    0,
    Math.PI / 4,
    Math.PI / 2,
    (3 * Math.PI) / 4,
    Math.PI,
    -(3 * Math.PI) / 4,
    -Math.PI / 2,
    -Math.PI / 4
  ];

  for (const attackAngle of angles) {
    const dist = 70;
    const attX = gojo.x + Math.cos(attackAngle) * dist;
    const attY = gojo.y + Math.sin(attackAngle) * dist;

    const dummyAttacker = { x: attX, y: attY, r: 25, vx: 0, vy: 0, gunAngle: attackAngle + Math.PI };
    const blocked = gojo.takeDamage(20, dummyAttacker, { isMelee: true });

    assert.strictEqual(blocked, false, 'Infinity must block melee damage 100%');
    
    // Check contact angle
    let diff = gojo.infinityBlockAngle - attackAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    assert(Math.abs(diff) < 0.05, `Contact angle should match attack direction ${attackAngle}, got ${gojo.infinityBlockAngle}`);

    // Check contact coordinates lie strictly on the barrier perimeter
    const contactDist = Math.hypot(gojo.infinityBlockX - gojo.x, gojo.infinityBlockY - gojo.y);
    assert(Math.abs(contactDist - barrierRadius) < 0.1, `Contact coordinates must lie strictly on barrier perimeter (${barrierRadius}), got ${contactDist}`);
  }
  console.log('✅ [PASS] All 8 radial attack angles correctly project onto barrier perimeter!');

  console.log('🧪 [TEST 2] Testing Overlapping Attacker (dist < 0.1) & Fallback Direction...');
  {
    // Case 2A: Attacker overlaps Gojo, moving with velocity towards Gojo
    const overlappingAttacker = { x: gojo.x, y: gojo.y, r: 25, vx: 10, vy: 0, gunAngle: 0 };
    gojo.gunAngle = 0; // Gojo faces right
    gojo.takeDamage(20, overlappingAttacker, { isMelee: true });
    
    // Attacker moved along +X (+10, 0), so bounce direction must push back to -X (Math.PI), opposite to attacker velocity
    let diff = gojo.infinityBlockAngle - Math.PI;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    assert(Math.abs(diff) < 0.05, `Overlapping moving attacker should rebound opposite to velocity, got ${gojo.infinityBlockAngle}`);

    // Case 2B: Attacker overlaps Gojo, stationary (vx = 0, vy = 0)
    const stationaryAttacker = { x: gojo.x, y: gojo.y, r: 25, vx: 0, vy: 0, gunAngle: 0 };
    gojo.gunAngle = 0.5; // Arbitrary facing direction
    gojo.takeDamage(20, stationaryAttacker, { isMelee: true });
    
    // Must fall back to Gojo's forward gunAngle (0.5), NEVER Gojo's back (0.5 + Math.PI)
    let diffStat = gojo.infinityBlockAngle - gojo.gunAngle;
    while (diffStat > Math.PI) diffStat -= Math.PI * 2;
    while (diffStat < -Math.PI) diffStat -= Math.PI * 2;
    assert(Math.abs(diffStat) < 0.05, `Stationary overlapping attacker must fall back to Gojo's forward gunAngle, got ${gojo.infinityBlockAngle}`);
  }
  console.log('✅ [PASS] Overlap fallback directions strictly face front and bounce attackers away from Gojo, never behind!');

  console.log('🧪 [TEST 3] Testing Toji Split Soul Katana on Gojo with Infinity Active...');
  {
    globalThis.spawnedEffects = [];
    const toji = new TojiFighter({ startX: 350, startY: 300, color: '#1A1A1A', type: 'toji' });
    toji.gunAngle = 0;
    toji.x = gojo.x - 45;
    toji.y = gojo.y;

    const hpBefore = gojo.hp;
    performSplitSoulKatanaSlash(toji, gojo, 0);

    assert.strictEqual(gojo.hp, hpBefore, 'Gojo HP must not decrease when Split Soul Katana is blocked by Infinity');
    assert.strictEqual(gojo.soulWoundTimer || 0, 0, 'Gojo must NOT receive soul wound debuff when blocked by Infinity');
    
    // Check spawned effects: NO tojiCleave on Gojo, NO blood on Gojo, NO animePunch on Gojo!
    const tojiCleaveOnGojo = globalThis.spawnedEffects.some(e => e.type === 'tojiCleave');
    const bloodOnGojo = globalThis.spawnedEffects.some(e => e.type === 'blood');
    const animePunchOnGojo = globalThis.spawnedEffects.some(e => e.particleType === 'animeImpactFrame' || e.type === 'animePunch');
    assert.strictEqual(tojiCleaveOnGojo, false, 'No Toji cleave crescent visual should spawn on Gojo when blocked by Infinity');
    assert.strictEqual(bloodOnGojo, false, 'No blood effect should spawn on Gojo when blocked by Infinity');
    assert.strictEqual(animePunchOnGojo, false, 'No anime punch impact frame should spawn on Gojo when blocked by Infinity');

    // But barrier deflection sparks should spawn on barrier perimeter
    const barrierSparks = globalThis.spawnedEffects.filter(e => e.particleType === 'cyan' || (e.type === 'sparks' && e.color === 'cyan'));
    assert(barrierSparks.length > 0, 'Cyan barrier deflection sparks must spawn on Infinity block');
  }
  console.log('✅ [PASS] Toji Split Soul Katana produces ZERO body hit visuals on Gojo during Infinity!');

  console.log('🧪 [TEST 4] Testing Sukuna Melee Combat on Gojo with Infinity Active...');
  {
    globalThis.spawnedEffects = [];
    const sukuna = new SukunaFighter({ startX: 350, startY: 300, color: '#8B0000', type: 'sukuna' });
    sukuna.gunAngle = 0;
    sukuna.x = gojo.x - 40;
    sukuna.y = gojo.y;
    state.fighters = [sukuna, gojo];

    const hpBefore = gojo.hp;
    sukunaUpdateMeleeCombat(sukuna, gojo, CONFIG.arena, 0);

    assert.strictEqual(gojo.hp, hpBefore, 'Gojo HP must not decrease when Sukuna punch is blocked by Infinity');
    const punchImpact = globalThis.spawnedEffects.some(e => e.particleType === 'animeImpactFrame' || e.type === 'animePunch');
    assert.strictEqual(punchImpact, false, 'No anime punch impact frame on Gojo when blocked by Infinity');
  }
  console.log('✅ [PASS] Sukuna basic melee punch is properly blocked by Infinity with no target impact frame!');

  console.log('🧪 [TEST 5] Testing Saitama Melee Punch on Gojo with Infinity Active...');
  {
    globalThis.spawnedEffects = [];
    const saitama = new SaitamaFighter({ startX: 350, startY: 300, color: '#FFFF00', type: 'saitama' });
    saitama.gunAngle = 0;
    saitama.x = gojo.x - 40;
    saitama.y = gojo.y;
    saitama.boredomStacks = 3;
    state.fighters = [saitama, gojo];

    const hpBefore = gojo.hp;
    saitama.executeNormalPunch(gojo);

    assert.strictEqual(gojo.hp, hpBefore, 'Gojo HP must not decrease when Saitama punch is blocked by Infinity');
    assert.strictEqual(gojo.isWallPinnedBySaitama, undefined, 'Gojo must NOT be wall pinned when punch is blocked by Infinity');
    assert.strictEqual(saitama.boredomStacks, 3, 'Saitama boredom stacks must not reset when punch is blocked by Infinity');
    const punchImpact = globalThis.spawnedEffects.some(e => e.particleType === 'animeImpactFrame' || e.type === 'animePunch');
    assert.strictEqual(punchImpact, false, 'No anime punch impact frame on Gojo when blocked by Infinity');
  }
  console.log('✅ [PASS] Saitama basic punch is properly blocked with no wall-pin, no boredom loss, and no target impact frame!');

  console.log('🧪 [TEST 6] Testing Todo Punch & Black Flash Suppression on Gojo with Infinity...');
  {
    globalThis.spawnedEffects = [];
    const todo = new TodoFighter({ startX: 350, startY: 300, color: '#800080', type: 'todo' });
    todo.gunAngle = 0;
    todo.x = gojo.x - 40;
    todo.y = gojo.y;
    state.fighters = [todo, gojo];

    // Normal punch
    todoUpdateMeleeCombat.call(todo, gojo, false);
    let punchImpact = globalThis.spawnedEffects.some(e => e.particleType === 'animeImpactFrame' || e.type === 'animePunch');
    assert.strictEqual(punchImpact, false, 'No anime punch impact frame on Gojo when blocked by Infinity');

    // Black Flash punch (with swapped buff)
    globalThis.spawnedEffects = [];
    todo.punchAnimTimer = 0;
    todo.justSwappedTimer = 30; // Triggers Black Flash punch
    todoUpdateMeleeCombat.call(todo, gojo, false);
    let blackFlashSpawned = globalThis.spawnedEffects.some(e => e.type === 'blackFlash');
    assert.strictEqual(blackFlashSpawned, false, 'No Black Flash should spawn on Gojo when blocked by Infinity');
  }
  console.log('✅ [PASS] Todo punch and Black Flash correctly suppressed when blocked by Infinity!');

  console.log('\n🎉 ALL GOJO INFINITY BARRIER ANGLE & HIT EFFECT TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
