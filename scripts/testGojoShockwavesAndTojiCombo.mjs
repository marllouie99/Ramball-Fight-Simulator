// Test Suite: Gojo Infinity Shockwave Throttling & Toji 2nd Sequence Ambush Combo
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

async function run() {
  const { CONFIG } = await import('../js/core/config.js');
  const { state } = await import('../js/core/state.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
  const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');

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

  console.log('🧪 [TEST 1] Testing Gojo Infinity Proximity Shockwaves...');
  const gojo = new GojoFighter({ startX: 400, startY: 300, color: '#E0FFFF', type: 'gojo' });
  const dummyEnemy = new SukunaFighter({ startX: 450, startY: 300, color: '#FF2244', type: 'sukuna' });
  gojo.team = 0;
  dummyEnemy.team = 1;
  state.fighters = [gojo, dummyEnemy];

  gojo.infinityActive = true;
  gojo.infinityCooldown = 0;
  gojo.isMeleeMode = false;

  let shockwaveSpawns = 0;
  const originalSparkEffects = state.sparkEffects;
  // Track shockwave particle creations
  state.sparkEffects = new Proxy([], {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (typeof prop === 'string' && !isNaN(Number(prop)) && value && value.clashType === 'gojo_infinity') {
        shockwaveSpawns++;
      }
      return Reflect.set(target, prop, value, receiver);
    }
  });

  // Run 120 frames of simulation where dummyEnemy is touching Gojo's barrier
  for (let f = 0; f < 120; f++) {
    state.frameCount = f;
    // Keep enemy touching Gojo barrier at 450, 300
    dummyEnemy.x = 450;
    dummyEnemy.y = 300;
    dummyEnemy.vx = 0;
    dummyEnemy.vy = 0;
    gojo._checkInfinityCollisions();
  }

  console.log(`📊 Shockwaves spawned over 120 continuous proximity frames: ${shockwaveSpawns}`);
  if (shockwaveSpawns > 2) {
    throw new Error(`[FAIL] Gojo spawned ${shockwaveSpawns} shockwaves during continuous contact (expected <= 2, ideally 1 on initial entry)!`);
  }
  console.log('✅ [PASS] Gojo barrier shockwaves are cleanly throttled on continuous contact!');

  console.log('\n🧪 [TEST 2] Testing Toji 2nd Sequence Hit Combo & Full 3-Stage Ambush...');
  state.sparkEffects = originalSparkEffects;
  const toji = new TojiFighter({ startX: 200, startY: 300, color: '#281438', type: 'toji' });
  const enemy = new SukunaFighter({ startX: 280, startY: 300, color: '#FF2244', type: 'sukuna' });
  toji.team = 0;
  enemy.team = 1;
  state.fighters = [toji, enemy];

  const initialEnemyHp = enemy.hp;

  // Start ambush sequence directly
  toji.startAmbushSequence(enemy, false);

  if (!toji.isAmbushing || toji.ambushPhase !== 'FRONT_LAUNCH') {
    throw new Error(`[FAIL] Toji failed to start ambush in FRONT_LAUNCH phase.`);
  }

  let reachedKatanaCharge = false;
  let reachedKatanaSlash = false;
  let reachedPhantomFlurry = false;
  let katanaSlashHpDrop = false;
  let enemyWasFrozenDuringKatana = false;
  let enemyKnockbackDuringKatana = false;
  let hpBeforeSlash = enemy.hp;

  for (let frame = 0; frame < 300; frame++) {
    state.frameCount = frame;
    const currentPhase = toji.ambushPhase;

    if (currentPhase === 'KATANA_CHARGE') {
      reachedKatanaCharge = true;
      hpBeforeSlash = enemy.hp;
    }

    if (currentPhase === 'KATANA_SLASH') {
      reachedKatanaSlash = true;
      if (enemy.hp < hpBeforeSlash) {
        katanaSlashHpDrop = true;
      }
      if (enemy.isTargetOfAmbush && enemy.timeStopTimer > 0) {
        enemyWasFrozenDuringKatana = true;
      }
      if (enemy.knockbackVx !== undefined && Math.abs(enemy.knockbackVx) > 1.0) {
        enemyKnockbackDuringKatana = true;
      }
    }

    if (currentPhase === 'PHANTOM_FLURRY') {
      reachedPhantomFlurry = true;
    }

    toji.update();

    if (!toji.isAmbushing && reachedPhantomFlurry) {
      console.log(`Ambush completed naturally at frame ${frame}`);
      break;
    }
  }

  console.log(`📊 Ambush Flow Checks:`);
  console.log(`- Reached KATANA_CHARGE: ${reachedKatanaCharge}`);
  console.log(`- Reached KATANA_SLASH: ${reachedKatanaSlash}`);
  console.log(`- Katana Slash dealt damage: ${katanaSlashHpDrop} (enemy HP: ${enemy.hp} / ${initialEnemyHp})`);
  console.log(`- Enemy in stasis during Katana Slash: ${enemyWasFrozenDuringKatana}`);
  console.log(`- Enemy knockback active during Katana Slash: ${enemyKnockbackDuringKatana}`);
  console.log(`- Reached PHANTOM_FLURRY: ${reachedPhantomFlurry}`);

  if (!reachedKatanaCharge) throw new Error('[FAIL] Ambush never reached KATANA_CHARGE phase!');
  if (!reachedKatanaSlash) throw new Error('[FAIL] Ambush never reached KATANA_SLASH phase!');
  if (!katanaSlashHpDrop) throw new Error('[FAIL] Katana Slash (Sequence 2) did not deal damage!');
  if (!enemyWasFrozenDuringKatana) throw new Error('[FAIL] Enemy was NOT in ambush stasis during Katana Slash (Sequence 2)!');
  if (!enemyKnockbackDuringKatana) throw new Error('[FAIL] Enemy knockback was not triggered during Katana Slash!');
  if (!reachedPhantomFlurry) throw new Error('[FAIL] Ambush never reached PHANTOM_FLURRY (Sequence 3)!');

  console.log('✅ [PASS] Toji 3-Stage Ambush Combo and 2nd Sequence Hit connect with 100% precision!');
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
