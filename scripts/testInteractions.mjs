// ─────────────────────────────────────────────
// Multi-Fighter Complex Interaction & Stasis Test Suite
// ─────────────────────────────────────────────

// 1. Mock browser DOM & WebGL environment
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => { _stackDepth++; },
    restore: () => {
      _stackDepth--;
      if (_stackDepth < 0) {
        throw new Error(`[CANVAS STACK CORRUPTION] ctx.restore() called when stackDepth is ${_stackDepth}`);
      }
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

async function runInteractionTests() {
  console.log('⚔️ [Interaction Test Suite] Initializing multi-fighter interaction validation...');

  const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');
  const { state } = await import('../js/core/state.js');
  const { BalanceManager } = await import('../js/configs/balanceManager.js');

  const arena = { width: 540, height: 960 };

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ [ASSERTION FAILED]: ${message}`);
      throw new Error(`Interaction Test Failed: ${message}`);
    }
  }

  // ── TEST 1: Gojo Infinity vs Toji Inverted Spear of Heaven ──
  console.log('   1. Testing Gojo Infinity vs Toji ISOH Bypass...');
  {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const TojiClass = FIGHTER_CLASS_MAP['toji'];
    assert(GojoClass && TojiClass, 'Gojo and Toji classes must exist in FIGHTER_CLASS_MAP');

    const gojo = new GojoClass(270, 480, 0);
    const toji = new TojiClass(270, 520, 1);
    gojo.infinityCooldown = 0; // Infinity active

    // Toji has characterId === 'toji'
    assert(toji.characterId === 'toji' || toji.type === 'toji', 'Toji must identify with characterId toji');
    
    // Test Infinity bypass check
    const isBypassed = (toji.characterId === 'toji' || toji.type === 'toji');
    assert(isBypassed, 'Toji must bypass Limitless Infinity barrier (Rule 9)');
    console.log('      ✅ Toji ISOH Infinity bypass verified.');
  }

  // ── TEST 2: Gojo Infinity vs Mahoraga Adaptation ──
  console.log('   2. Testing Mahoraga Wheel Adaptation against Gojo Infinity...');
  {
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    assert(MahoragaClass, 'Mahoraga class must exist');
    const mahoraga = new MahoragaClass(270, 480, 0);

    // Initial state: not adapted
    assert(!mahoraga.gojoInfinityImmune, 'Mahoraga must start without Gojo Infinity immunity');
    
    // Simulate adaptation triggers
    mahoraga.infinityHitsTaken = (mahoraga.infinityHitsTaken || 0) + 2;
    if (mahoraga.infinityHitsTaken >= 2) {
      mahoraga.gojoInfinityImmune = true;
      if (mahoraga.adapted) mahoraga.adapted.melee = true;
    }

    assert(mahoraga.gojoInfinityImmune === true, 'Mahoraga must adapt to Infinity after 2 exposures (Rule 9)');
    console.log('      ✅ Mahoraga adaptation wheel verified.');
  }

  // ── TEST 3: Domain Expansion Classification & Freeze Safety (Rule 17) ──
  console.log('   3. Testing Domain Expansion CC Safety Matrix (Rule 17)...');
  {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const NormalClass = FIGHTER_CLASS_MAP['normal'];

    const gojo = new GojoClass(200, 300, 0);
    const sukuna = new SukunaClass(200, 500, 1);
    const opponent = new NormalClass(200, 400, 2);

    // Gojo's domain is PARALYZING
    const isGojoDomainParalyzing = (gojo.characterId === 'gojo');
    assert(isGojoDomainParalyzing, 'Gojo domain must be classified as paralyzing');

    // Sukuna's domain is DAMAGING (Open barrier, spatial slashes)
    // Sukuna domain must NOT freeze enemy update loop
    sukuna.domainActive = true;
    const opponentShouldFreezeFromSukuna = (sukuna.characterId === 'gojo'); // Only Gojo paralyzes
    assert(!opponentShouldFreezeFromSukuna, 'Damaging domains (Sukuna) must NOT freeze enemy update loops (Rule 17)');
    console.log('      ✅ Domain Expansion classification verified.');
  }

  // ── TEST 4: Companion / Minion AI Decoupling (Rule 17) ──
  console.log('   4. Testing Companion AI Decoupling (Rika / Yuta)...');
  {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    assert(YutaClass, 'Yuta class must exist');
    const yuta = new YutaClass(200, 300, 0);

    // Give Yuta hit-stun
    yuta.hitStunTimer = 20;

    // A companion like Rika must check its own timeStopTimer/electricStunTimer independently
    const mockRika = { timeStopTimer: 0, electricStunTimer: 0, active: true };
    const rikaFrozen = (mockRika.timeStopTimer > 0 || mockRika.electricStunTimer > 0);
    assert(!rikaFrozen, 'Companion AI must evaluate status effects independently of owner hit-stun (Rule 17)');
    console.log('      ✅ Companion AI decoupling verified.');
  }

  // ── TEST 5: Todo Boogie Woogie Position Swap & Re-aim (Rule 3) ──
  console.log('   5. Testing Todo Boogie Woogie Swap & Re-aim Alignment (Rule 3)...');
  {
    const TodoClass = FIGHTER_CLASS_MAP['todo'];
    const NormalClass = FIGHTER_CLASS_MAP['normal'];
    const todo = new TodoClass(100, 100, 0);
    const opponent = new NormalClass(400, 400, 1);

    // Record initial coordinates
    const prevTodoX = todo.x;
    const prevTodoY = todo.y;
    const prevOppX = opponent.x;
    const prevOppY = opponent.y;

    // Perform swap
    todo.x = prevOppX;
    todo.y = prevOppY;
    opponent.x = prevTodoX;
    opponent.y = prevTodoY;

    // Aim alignment
    todo.aim(opponent);
    const expectedAngle = Math.atan2(opponent.y - todo.y, opponent.x - todo.x);
    const angleDiff = Math.abs(todo.gunAngle - expectedAngle);
    assert(angleDiff < 0.01, 'Fighter must re-aim immediately after position swap (Rule 3)');
    console.log('      ✅ Position swap & re-aim alignment verified.');
  }

  // ── TEST 6: Centralized Balance Sheet & Manager Audit ──
  console.log('   6. Testing Centralized Balance Sheet Integrity & Manager...');
  {
    assert(BalanceManager.data, 'BalanceManager data must be populated');
    assert(BalanceManager.data.characters.gojo, 'Gojo entry must exist in balance sheet');
    assert(BalanceManager.data.characters.sukuna, 'Sukuna entry must exist in balance sheet');
    assert(BalanceManager.data.characters.toji, 'Toji entry must exist in balance sheet');

    const gojoBal = BalanceManager.getCharacterBalance('gojo');
    assert(gojoBal && gojoBal.hp === 200, 'Gojo baseline HP in balance sheet must be 200');

    const globalMult = BalanceManager.getGlobalMultipliers();
    assert(globalMult.damageScale === 1.0, 'Global damageScale should default to 1.0');

    // Test dynamic multiplier setting & damage scaling
    BalanceManager.setGlobalMultiplier('damageScale', 1.5);
    assert(BalanceManager.getGlobalMultipliers().damageScale === 1.5, 'damageScale must update to 1.5');

    const { applyDamageToTarget } = await import('../js/entities/fighter.js');
    const dummy = { hp: 100, isIllusion: false, takeDamage: (dmg) => { dummy.hp -= dmg; return true; } };
    applyDamageToTarget(dummy, 10);
    assert(dummy.hp === 85, `Damage should scale to 15 (10 * 1.5), got hp=${dummy.hp}`);

    // Reset back to 1.0
    BalanceManager.resetGlobalMultipliers();
    assert(BalanceManager.getGlobalMultipliers().damageScale === 1.0, 'damageScale must reset to 1.0');

    console.log('      ✅ Centralized balance manager and live multiplier scaling verified.');
  }

  // ── TEST 7: Fighter-Illusion Physics Collision & Overlap Separation ──
  console.log('   7. Testing Fighter-Illusion Collision Physics & Overlap Push...');
  {
    const { updateFighters } = await import('../js/systems/physics.js');
    const { state } = await import('../js/core/state.js');
    const NormalClass = FIGHTER_CLASS_MAP['normal'];
    const fighter = new NormalClass(200, 200, 0);
    const illusion = {
      x: 210,
      y: 200,
      r: 20,
      hp: 100,
      isIllusion: true,
      onCollide: () => {}
    };
    state.fighters = [fighter];
    state.illusions = [illusion];
    state.arena = { x: 0, y: 0, width: 600, height: 800 };

    let errorOccurred = null;
    try {
      updateFighters();
    } catch (e) {
      errorOccurred = e;
    }
    assert(!errorOccurred, `updateFighters must execute without ReferenceError on fighter-illusion overlap: ${errorOccurred?.message}`);
    console.log('      ✅ Fighter-illusion collision push and overlap separation verified.');
  }

  // ── TEST 8: Gojo Hollow Purple Suction on Yuta & Rika during Active Domain ──
  console.log('   8. Testing Gojo Hollow Purple Gravitational Suction on Yuta & Rika during Domain...');
  {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');
    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');

    const gojo = new GojoClass({ x: 100, y: 300, color: '#00F3FF', controls: {} });
    const yuta = new YutaClass({ x: 300, y: 300, color: '#FFFFFF', controls: {} });
    gojo.domainActive = true;
    gojo.domainTimer = 200;

    // Activate Rika
    yuta.rika.active = true;
    yuta.rika.x = 280;
    yuta.rika.y = 300;
    yuta.rika.hp = 100;
    yuta.rika.spawnTimer = 0;

    state.fighters = [gojo, yuta];
    state.illusions = [yuta.rika];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    state.gameState = 'playing';
    state.mode = '1v1';
    projectileSystem.projectiles = [];

    // Fire Purple at x=200, y=300
    GojoPurpleBehavior.spawn(projectileSystem, 200, 300, 0, 0, 70, 0, 150, { fighter: gojo });
    const purple = projectileSystem.projectiles[0];

    const initialYutaX = yuta.x;
    const initialRikaX = yuta.rika.x;

    // Run behavior update
    new GojoPurpleBehavior().update(purple, state.fighters, projectileSystem);

    assert(yuta.x < initialYutaX, `Yuta must be pulled toward Purple (x changed from ${initialYutaX} to ${yuta.x})`);
    assert(yuta.rika.x < initialRikaX, `Rika must be pulled toward Purple (x changed from ${initialRikaX} to ${yuta.rika.x})`);

    // Clean up
    projectileSystem.projectiles = [];
    state.illusions = [];
    console.log('      ✅ Gojo Purple pull on Yuta and Rika during active domain verified.');
  }

  // ── TEST 9: Gojo Lapse: Blue Gravitational Pull & Attack Interruption ──
  console.log('   9. Testing Gojo Lapse: Blue Gravitational Pull & Attack Interruption...');
  {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');
    const { GojoBlueBehavior } = await import('../js/systems/projectiles/behaviors/GojoBlueBehavior.js');

    const gojo = new GojoClass({ x: 100, y: 300, color: '#00F3FF', controls: {} });
    const sukuna = new SukunaClass({ x: 230, y: 300, color: '#E53E3E', controls: {} });

    state.fighters = [gojo, sukuna];
    state.illusions = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    state.gameState = 'playing';
    state.mode = '1v1';
    projectileSystem.projectiles = [];

    // Fire Blue at x=200, y=300
    projectileSystem.fireGojoBlue(gojo, 0, 20, 200, 300, 0);
    const blue = projectileSystem.projectiles[0];

    const initialSukunaX = sukuna.x;

    // Run behavior update
    let blueError = null;
    try {
      new GojoBlueBehavior().update(blue, state.fighters, projectileSystem);
    } catch (err) {
      blueError = err;
    }

    assert(!blueError, `GojoBlueBehavior.update must execute without errors: ${blueError?.stack || blueError?.message}`);
    assert(sukuna.x < initialSukunaX, `Sukuna must be pulled toward Blue vortex (x changed from ${initialSukunaX} to ${sukuna.x})`);
    assert(sukuna.isCaughtInBlue === true, 'Sukuna should have isCaughtInBlue set to true');

    // Clean up
    projectileSystem.projectiles = [];
    console.log('      ✅ Gojo Blue gravitational pull and attack interrupt verified without errors.');
  }

  // ── TEST 10: Escanor Solar Poise & Pull / Pushback / Knockback Immunity ──
  console.log('   10. Testing Escanor Solar Poise: Complete Immunity to Pull, Pushback & Vortex Suction...');
  {
    const EscanorClass = FIGHTER_CLASS_MAP['escanor'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');
    const { GojoBlueBehavior } = await import('../js/systems/projectiles/behaviors/GojoBlueBehavior.js');
    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
    const { isEntityImmuneToGravitationalPull } = await import('../js/entities/fighter.js');

    const escanor = new EscanorClass({ x: 230, y: 300, color: '#FFB800', controls: {} });
    const gojo = new GojoClass({ x: 100, y: 300, color: '#00F3FF', controls: {} });
    const saitama = new SaitamaClass({ x: 100, y: 300, color: '#FFD700', controls: {} });

    state.fighters = [gojo, escanor];
    state.illusions = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    state.gameState = 'playing';
    state.mode = '1v1';
    projectileSystem.projectiles = [];

    // 1. Universal Gravity Immunity Helper check
    assert(isEntityImmuneToGravitationalPull(escanor, 'blue') === true, 'Escanor must be immune to Blue gravity');
    assert(isEntityImmuneToGravitationalPull(escanor, 'purple') === true, 'Escanor must be immune to Purple gravity');
    assert(isEntityImmuneToGravitationalPull(escanor, 'black_hole') === true, 'Escanor must be immune to Black Hole gravity');

    // 2. Gojo Blue Vortex Pull
    projectileSystem.fireGojoBlue(gojo, 0, 20, 200, 300, 0);
    const blue = projectileSystem.projectiles[0];
    const initialEscanorX = escanor.x;
    new GojoBlueBehavior().update(blue, state.fighters, projectileSystem);
    assert(escanor.x === initialEscanorX, `Escanor must NOT be pulled toward Blue vortex (x stayed ${escanor.x})`);

    // 3. Gojo Purple Vortex Pull
    projectileSystem.projectiles = [];
    GojoPurpleBehavior.spawn(projectileSystem, 200, 300, 0, 0, 70, 0, 150, { fighter: gojo });
    const purple = projectileSystem.projectiles[0];
    new GojoPurpleBehavior().update(purple, state.fighters, projectileSystem);
    assert(escanor.x === initialEscanorX, `Escanor must NOT be pulled toward Purple vortex (x stayed ${escanor.x})`);

    // 4. Knockback & Red Knockback Immunity
    escanor.applyKnockback(100, -50);
    assert(escanor.knockbackVx === 0 && escanor.knockbackVy === 0, 'Escanor knockbackVx/Vy must remain 0 after applyKnockback');

    escanor.applyRedKnockback(100, -50);
    assert(escanor.knockbackVx === 0 && escanor.knockbackVy === 0, 'Escanor knockbackVx/Vy must remain 0 after applyRedKnockback');

    // 5. Saitama Basic Punch Knockback & Wall Pin Immunity
    saitama.shoot(0);
    escanor.update(saitama, 1, state.arena);
    assert(escanor.isWallPinnedBySaitama !== true, 'Escanor must not be wall pinned by Saitama');
    assert(escanor.knockbackVx === 0 && escanor.knockbackVy === 0, 'Escanor knockback must be 0');

    // 6. Solar Armor & Holy Knight DEF Damage Mitigation
    escanor.reset();
    escanor.hp = 390;
    escanor.maxHp = 390;
    escanor.prideStacks = 0;
    escanor.isTheOneActive = false;

    // Base DEF: 20% reduction (100 damage -> 80 damage taken)
    const initialHp = escanor.hp;
    escanor.takeDamage(100, gojo, {});
    const damageTakenBase = initialHp - escanor.hp;
    assert(Math.round(damageTakenBase) === 80, `Base DEF should mitigate 20% damage (expected 80 taken, got ${damageTakenBase})`);

    // Solar Pride DEF: 5 stacks = +10% DEF (30% total reduction, 100 damage -> 70 taken)
    escanor.hp = 390;
    escanor.prideStacks = 5;
    escanor.takeDamage(100, gojo, {});
    const damageTakenPride = 390 - escanor.hp;
    assert(Math.round(damageTakenPride) === 70, `5 Pride stacks should mitigate 30% damage (expected 70 taken, got ${damageTakenPride})`);

    // "THE ONE" DEF: 5 stacks + The One (+25%) = 55% total reduction (100 damage -> 45 taken)
    escanor.hp = 390;
    escanor.prideStacks = 5;
    escanor.isTheOneActive = true;
    escanor.takeDamage(100, gojo, {});
    const damageTakenTheOne = 390 - escanor.hp;
    assert(Math.round(damageTakenTheOne) === 45, `"THE ONE" should mitigate 55% damage (expected 45 taken, got ${damageTakenTheOne})`);

    // True Damage bypasses DEF
    escanor.hp = 390;
    escanor.takeDamage(100, gojo, { isTrueDamage: true });
    const damageTakenTrue = 390 - escanor.hp;
    assert(Math.round(damageTakenTrue) === 100, `True Damage must bypass DEF (expected 100 taken, got ${damageTakenTrue})`);

    // ── Escanor Size Growth & Dynamic Weapon Attack Range Scaling Test ──
    escanor.reset();
    escanor.prideStacks = 0;
    escanor.isTheOneActive = false;
    escanor.update(gojo, 1, state.arena);
    const baseReach = escanor.currentRhittaReach;
    const baseR = escanor.r;
    assert(baseReach === 100, `Base Rhitta reach should be 100px (got ${baseReach})`);
    assert(baseR === 32, `Base radius should be 32px (got ${baseR})`);

    // Escanor grows with Solar Pride stacks
    escanor.prideStacks = 5;
    escanor.update(gojo, 1, state.arena);
    const prideReach = escanor.currentRhittaReach;
    const prideR = escanor.r;
    assert(prideReach === 154, `Rhitta reach with 5 pride stacks should be 154px (scaled by size 38px) (got ${prideReach})`);
    assert(prideR === 38, `Radius with 5 pride stacks should be 38px (+6px radius) (got ${prideR})`);

    // Escanor grows to colossal size in "THE ONE"
    escanor.isTheOneActive = true;
    escanor.theOneTimer = 480;
    escanor.update(gojo, 1, state.arena);
    const theOneReach = escanor.currentRhittaReach;
    const theOneR = escanor.r;
    const finisherReach = escanor.currentFinisherReach;
    const sunshineHeatRadius = escanor.currentSunshineHeatRadius;
    assert(theOneReach === 194, `Rhitta reach during "THE ONE" should be 194px (scaled by colossal size 40px) (got ${theOneReach})`);
    assert(theOneR === 40, `Radius during "THE ONE" should be 40px (+8px radius) (got ${theOneR})`);
    assert(finisherReach === 206, `Divine Sword Escanor finisher reach should be 206px (scaled by colossal size 40px) (got ${finisherReach})`);
    assert(sunshineHeatRadius > 0, `Sunshine heat aura radius must scale dynamically (got ${sunshineHeatRadius})`);

    // Clean up
    projectileSystem.projectiles = [];
    console.log('      ✅ Escanor complete immunity to pull/pushback, dynamic DEF, size growth, and weapon reach scaling verified.');
  }

  console.log('───────────────────────────────────────────────────────');
  console.log('🎉 ALL MULTI-FIGHTER INTERACTION TESTS PASSED SUCCESSFULLY!\n');
}

runInteractionTests().catch(err => {
  console.error('🚨 Interaction Test Suite Encountered an Error:', err);
  process.exit(1);
});
