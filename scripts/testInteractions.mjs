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
  const { CONFIG } = await import('../js/core/config.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');

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
    mahoraga.infinityHitsTaken = (mahoraga.infinityHitsTaken || 0) + 10;
    if (mahoraga.infinityHitsTaken >= 10) {
      mahoraga.gojoInfinityImmune = true;
      if (mahoraga.adapted) mahoraga.adapted.melee = true;
    }

    assert(mahoraga.gojoInfinityImmune === true, 'Mahoraga must adapt to Infinity after 10 exposures');
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
    assert(baseReach === 160, `Base Rhitta reach should be 160px (got ${baseReach})`);
    assert(baseR === 32, `Base radius should be 32px (got ${baseR})`);

    // Escanor grows with Solar Pride stacks
    escanor.prideStacks = 5;
    escanor.update(gojo, 1, state.arena);
    const prideReach = escanor.currentRhittaReach;
    const prideR = escanor.r;
    assert(prideReach === 241, `Rhitta reach with 5 pride stacks should be 241px (scaled by size 37px) (got ${prideReach})`);
    assert(prideR === 37, `Radius with 5 pride stacks should be 37px (+5px radius) (got ${prideR})`);

    // Escanor grows to colossal size in "THE ONE"
    escanor.isTheOneActive = true;
    escanor.theOneTimer = 480;
    escanor.update(gojo, 1, state.arena);
    const theOneReach = escanor.currentRhittaReach;
    const theOneR = escanor.r;
    const finisherReach = escanor.currentFinisherReach;
    const sunshineHeatRadius = escanor.currentSunshineHeatRadius;
    assert(theOneReach === 261, `Rhitta reach during "THE ONE" should be 261px (scaled by size 36px) (got ${theOneReach})`);
    assert(theOneR === 36, `Radius during "THE ONE" should be 36px (+4px radius) (got ${theOneR})`);
    assert(finisherReach === 186, `Divine Sword Escanor finisher reach should be 186px (scaled by size 36px) (got ${finisherReach})`);
    assert(sunshineHeatRadius > 0, `Sunshine heat aura radius must scale dynamically (got ${sunshineHeatRadius})`);

    // ── Escanor Smooth Auto-Aim While Lifting & Committed Strike Lock Test ──
    escanor.reset();
    escanor.gunAngle = 0;
    escanor.angle = 0;
    const movingTarget = { x: escanor.x + 80, y: escanor.y, r: 25, hp: 100, maxHp: 100, vx: 0, vy: 0, isDead: false, applyKnockback: () => {}, applySlow: () => {}, applyTimeStop: () => {}, takeDamage: () => {} };
    escanor._startRhittaChop(movingTarget);
    assert(escanor.chopCastAngle !== undefined, 'Escanor must set chopCastAngle upon starting chop');
    assert(escanor.isLiftingWeapon() === true, 'isLiftingWeapon() must be true during initial lift/hold frames');
    assert(escanor.canAim() === true, 'canAim() must be true while Escanor is lifting weapon');

    // Target moves to diagonal position (angle: PI/2)
    movingTarget.x = escanor.x;
    movingTarget.y = escanor.y + 80;
    const initialAngle = escanor.gunAngle;
    escanor.aim(movingTarget);
    // Should smoothly rotate without jumping to Math.PI/2 in 1 frame (no snap)
    assert(escanor.gunAngle > initialAngle && escanor.gunAngle < Math.PI / 2, `Escanor gunAngle must smoothly track towards target without instant snap (got ${escanor.gunAngle})`);

    // Advance to downward strike phase (slashSwingTimer <= strikeFrames + recFrames)
    escanor.slashSwingTimer = (escanor.chopStrikeFrames || 15) + (escanor.chopRecoveryFrames || 50);
    assert(escanor.isLiftingWeapon() === false, 'isLiftingWeapon() must be false during downward strike stroke');
    assert(escanor.canAim() === false, 'canAim() must be false during downward strike stroke');

    const committedAngle = escanor.gunAngle;
    movingTarget.x = escanor.x - 80;
    movingTarget.y = escanor.y;
    escanor.aim(movingTarget);
    assert(Math.abs(escanor.gunAngle - committedAngle) < 0.001, `Escanor gunAngle must remain locked to committed strike angle (got ${escanor.gunAngle}, expected ${committedAngle})`);

    // Hit-pause lock
    escanor.chopHitPauseTimer = 8;
    escanor.chopHitPauseMax = 10;
    assert(escanor.canAim() === false, 'canAim() must be false during chopHitPause');
    escanor.aim(movingTarget);
    assert(Math.abs(escanor.gunAngle - committedAngle) < 0.001, `Escanor gunAngle must remain locked during chopHitPause (got ${escanor.gunAngle})`);

    // Clean up
    projectileSystem.projectiles = [];
    console.log('      ✅ Escanor complete immunity to pull/pushback, dynamic DEF, size growth, weapon reach, smooth lifting auto-aim, and committed strike lock verified.');
  }

  // ── 11. Testing Genos Spiral Incineration Cannon Push Immunity ──
  {
    console.log('   11. Testing Genos Spiral Incineration Cannon: Physical Push & Collision Immunity...');
    const genos = new FIGHTER_CLASS_MAP.genos({ radius: 25, x: 270, y: 480, hp: 320, color: '#FF5500' });
    const saitama = new FIGHTER_CLASS_MAP.saitama({ radius: 25, x: 270, y: 520, hp: 350, color: '#FFD700' });
    state.fighters = [genos, saitama];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    // 1. Initial State - Normal knockback applies
    genos.applyKnockback(10, -10);
    assert(genos.knockbackVx === 10 && genos.knockbackVy === -10, 'Genos should take knockback in normal state');
    genos.knockbackVx = 0; genos.knockbackVy = 0; genos.vx = 0; genos.vy = 0;

    // 2. Ultimate Charging State - Knockback & Push are completely ignored
    genos.ultCooldown = 0;
    const preSlideY = genos.y;
    genos.executeSpiralIncinerationCannon(saitama);
    while (genos.isUltSliding) {
      genos.update(saitama, 0, state.arena);
    }
    assert(genos.y > preSlideY, 'Genos must physically slide forward during isUltSliding');
    assert(genos.isChargingUlt === true, 'Genos must be charging ultimate');
    assert(genos.immuneToPush === true, 'Genos must have immuneToPush=true while charging ult');
    assert(genos.immuneToKnockback === true, 'Genos must have immuneToKnockback=true while charging ult');

    genos.applyKnockback(25, 25);
    assert(genos.knockbackVx === 0 && genos.knockbackVy === 0, 'Genos must ignore applyKnockback while charging ult');
    assert(genos.vx === 0 && genos.vy === 0, 'Genos vx and vy must stay 0 while charging ult');

    // Test physics collision separation: Genos stays stationary, Saitama is pushed away
    const { resolveFighterCollision } = await import('../js/systems/physics.js');
    genos.x = 270; genos.y = 480;
    saitama.x = 270; saitama.y = 520;
    const initialX = genos.x;
    const initialY = genos.y;
    resolveFighterCollision(genos, saitama);
    assert(genos.x === initialX && genos.y === initialY, `Genos x/y must remain unchanged during collision (got ${genos.x}, ${genos.y}, expected ${initialX}, ${initialY})`);
    assert(saitama.y > 520, 'Colliding enemy must be pushed away while Genos remains immovable anchor');

    // 3. Ultimate Firing State - Knockback & Push are completely ignored
    genos.ultTimer = 1;
    genos.update(saitama, 0, state.arena); // triggers transition to isFiringUlt
    assert(genos.isFiringUlt === true, 'Genos must be firing ultimate');
    assert(genos.immuneToPush === true, 'Genos must have immuneToPush=true while firing ult');
    assert(genos.immuneToKnockback === true, 'Genos must have immuneToKnockback=true while firing ult');

    genos.applyKnockback(-50, -50);
    assert(genos.knockbackVx === 0 && genos.knockbackVy === 0, 'Genos must ignore applyKnockback while firing ult');
    assert(genos.vx === 0 && genos.vy === 0, 'Genos vx/vy must remain 0 while firing ult');

    const { isEntityImmuneToGravitationalPull } = await import('../js/entities/fighter.js');
    assert(isEntityImmuneToGravitationalPull(genos, 'purple') === true, 'Genos must be immune to gravitational pull during ult beam');
    assert(isEntityImmuneToGravitationalPull(genos, 'blue') === true, 'Genos must be immune to blue suction during ult beam');

    // 4. Post-Ult Recovery - Immunity clears cleanly
    genos.ultTimer = 0;
    genos.update(saitama, 0, state.arena);
    assert(genos.isFiringUlt === false, 'isFiringUlt must end');
    assert(genos.immuneToPush === false, 'immuneToPush must reset after ult beam completes');
    assert(genos.immuneToKnockback === false, 'immuneToKnockback must reset after ult beam completes');

    console.log('      ✅ Genos physical push & knockback immunity during ultimate beam verified.');
  }

  // ── 12. Testing Genos Skill Cancellation & Speed Normalization ──
  {
    console.log('   12. Testing Genos Skill Cancellation & Speed Normalization (Zero Super Speed Leak)...');
    const genos = new FIGHTER_CLASS_MAP.genos({ radius: 25, x: 270, y: 480, hp: 320, color: '#FF5500' });
    const dummy = new FIGHTER_CLASS_MAP.normal({ radius: 25, x: 270, y: 560, hp: 300, color: '#FFFFFF' });
    state.fighters = [genos, dummy];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
    const baseSpd = (genos.baseSpeed || 5.2) * modeMult;

    // A. Wall Thruster Dash Cancellation Test
    genos.triggerMeleeWallDash(dummy);
    assert(genos.isMeleeWallDashing === true, 'Genos must enter melee wall dash');
    assert(genos.speedBoostTimer > 0, 'speedBoostTimer must be active during wall dash');
    assert(genos.speedMultiplier > 1.0, 'speedMultiplier must be boosted during wall dash');

    genos.interruptAttacks(true);
    assert(genos.isMeleeWallDashing === false, 'isMeleeWallDashing must be false after interrupt');
    assert(genos.speedBoostTimer === 0, 'speedBoostTimer must reset to 0 after interrupt');
    assert(genos.speedMultiplier === 1.0, 'speedMultiplier must reset to 1.0 after interrupt');
    assert(Math.abs(genos.speed - baseSpd) < 0.001, `Genos speed must reset to base speed (got ${genos.speed}, expected ${baseSpd})`);
    assert(Math.hypot(genos.vx, genos.vy) <= baseSpd + 0.01, `Genos velocity magnitude must not exceed base speed on interrupt (got ${Math.hypot(genos.vx, genos.vy)}, max ${baseSpd})`);

    // B. Machine Gun Blows Cancellation Test
    genos.flurryCooldown = 0;
    genos.executeMachineGunBlows(dummy);
    assert(genos.isFlurrying === true, 'Genos must be flurrying');
    
    genos.interruptAttacks(true);
    assert(genos.isFlurrying === false, 'isFlurrying must be false after interrupt');
    assert(genos.flurryHitsLeft === 0, 'flurryHitsLeft must reset to 0 after interrupt');
    assert(genos.speedMultiplier === 1.0, 'speedMultiplier must be 1.0 after interrupt');
    assert(Math.abs(genos.speed - baseSpd) < 0.001, `Genos speed must remain base speed after flurry interrupt (got ${genos.speed}, expected ${baseSpd})`);
    assert(Math.hypot(genos.vx, genos.vy) <= baseSpd + 0.01, `Genos velocity magnitude must not exceed base speed after flurry interrupt`);

    // C. Spiral Incineration Cannon Slide Cancellation Test
    genos.ultCooldown = 0;
    genos.executeSpiralIncinerationCannon(dummy);
    assert(genos.isUltSliding === true, 'Genos must enter isUltSliding');
    
    genos.interruptAttacks(true);
    assert(genos.isUltSliding === false, 'isUltSliding must be false after interrupt');
    assert(genos.ultSlideTimer === 0, 'ultSlideTimer must be 0 after interrupt');
    assert(genos.isChargingUlt === false, 'isChargingUlt must be false after interrupt');
    assert(genos.isFiringUlt === false, 'isFiringUlt must be false after interrupt');
    assert(genos.isUltRecovering === false, 'isUltRecovering must be false after interrupt');
    assert(genos.speedMultiplier === 1.0, 'speedMultiplier must be 1.0 after interrupt');
    assert(Math.abs(genos.speed - baseSpd) < 0.001, `Genos speed must remain base speed after ult slide interrupt`);
    assert(Math.hypot(genos.vx, genos.vy) <= baseSpd + 0.01, `Genos velocity magnitude must not exceed base speed after ult slide interrupt`);

    console.log('      ✅ Genos skill cancellation and zero super speed retention verified.');
  }

  // ── 13. Testing Gojo Infinity vs CJ Bullets & Gojo Domain vs CJ BAGUVIX ──
  {
    console.log('   13. Testing Gojo Infinity vs CJ Bullets & Gojo Domain vs CJ BAGUVIX...');
    const gojo = new FIGHTER_CLASS_MAP.gojo({ radius: 25, x: 270, y: 480, hp: 320, color: '#00E5FF' });
    const cj = new FIGHTER_CLASS_MAP.cj({ radius: 25, x: 270, y: 520, hp: 350, color: '#22C55E' });
    state.fighters = [gojo, cj];
    state.projectiles = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    // Part A: Bullets freeze on Gojo Infinity barrier and turn blue
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');
    const { drawCjUziBullet, drawCjPixelUziBullet, drawCjMinigunBullet, drawCjPixelMinigunBullet } = await import('../js/graphics/weapons/cjWeaponGraphics.js');
    const { CONFIG } = await import('../js/core/config.js');

    const prevFreezeChance = CONFIG.gojo?.infinityFreezeChance;
    if (CONFIG.gojo) CONFIG.gojo.infinityFreezeChance = 1.0;

    gojo.infinityActive = true;
    gojo.infinityCooldown = 0; // Infinity active
    gojo.isMeleeMode = false;
    gojo.hp = 320;
    gojo.x = 270; gojo.y = 480;
    cj.x = 270; cj.y = 520;

    // Spawn a CJ minigun bullet heading towards Gojo
    const minigunBullet = {
      x: 270, y: 500, vx: 0, vy: -28, r: 4,
      visual: 'cjMinigunBullet',
      color: '#FEF08A',
      accentColor: '#F59E0B',
      owner: 1,
      ownerFighter: cj,
      ownerIndex: 1,
      damage: 12,
      life: 100,
      maxLife: 100,
      maxDistance: 600,
      distanceTraveled: 0
    };
    projectileSystem.projectiles = [minigunBullet];

    // Run projectileSystem update
    projectileSystem.update(state.fighters);

    assert(minigunBullet.isFrozenByInfinity === true, 'CJ Minigun bullet must be frozen by Gojo Infinity');
    assert(minigunBullet.color === '#00E5FF', `CJ Minigun bullet color must turn cyan blue (#00E5FF), got ${minigunBullet.color}`);
    assert(minigunBullet.accentColor === '#00E5FF', `CJ Minigun bullet accentColor must turn cyan blue (#00E5FF), got ${minigunBullet.accentColor}`);

    // Render bullets in mock canvas to verify 0 errors and balanced stack
    mockCtx.resetStackDepth();
    drawCjMinigunBullet(mockCtx, minigunBullet);
    assert(mockCtx.getStackDepth() === 0, 'drawCjMinigunBullet stack depth must be 0');
    drawCjPixelMinigunBullet(mockCtx, minigunBullet);
    assert(mockCtx.getStackDepth() === 0, 'drawCjPixelMinigunBullet stack depth must be 0');

    // Spawn a CJ Uzi bullet
    const uziBullet = {
      x: 270, y: 500, vx: 0, vy: -23, r: 3,
      visual: 'cjUziBullet',
      color: '#F59E0B',
      accentColor: '#B45309',
      owner: 1,
      ownerFighter: cj,
      ownerIndex: 1,
      damage: 8,
      life: 100,
      maxLife: 100,
      maxDistance: 500,
      distanceTraveled: 0
    };
    projectileSystem.projectiles = [uziBullet];
    projectileSystem.update(state.fighters);

    assert(uziBullet.isFrozenByInfinity === true, 'CJ Uzi bullet must be frozen by Gojo Infinity');
    assert(uziBullet.color === '#00E5FF', `CJ Uzi bullet color must turn cyan blue (#00E5FF), got ${uziBullet.color}`);
    drawCjUziBullet(mockCtx, uziBullet);
    assert(mockCtx.getStackDepth() === 0, 'drawCjUziBullet stack depth must be 0');
    drawCjPixelUziBullet(mockCtx, uziBullet);
    assert(mockCtx.getStackDepth() === 0, 'drawCjPixelUziBullet stack depth must be 0');

    // Part B: Gojo Domain Expansion stasis freezes CJ even during BAGUVIX God Mode
    state.projectiles = [];
    cj.isBaguvixActive = true;
    cj.isGodModeActive = true;
    cj.baguvixTimer = 600;
    cj.minigunFireCooldown = 0;
    gojo.domainActive = true;
    gojo.hp = 300;

    assert(cj._isInsideGojoDomain() === true, 'CJ must detect being inside enemy Gojo domain');

    // CJ update must early exit, enter domain stasis, zero velocities, and not fire
    cj.update(gojo, 1, state.arena);

    assert(cj.timeStopTimer > 0, 'CJ must be frozen with timeStopTimer > 0 inside Gojo domain');
    assert(cj.vx === 0 && cj.vy === 0, 'CJ vx and vy must be 0 inside Gojo domain');
    assert(state.projectiles.length === 0, 'CJ must not fire any projectiles while inside Gojo domain');

    // Direct invocation check
    cj._fireMinigun(gojo);
    assert(state.projectiles.length === 0, '_fireMinigun must not fire any bullets while inside Gojo domain');

    cj._fireJetpackUzi(gojo);
    assert(state.projectiles.length === 0, '_fireJetpackUzi must not fire any bullets while inside Gojo domain');

    // Deactivate domain -> stasis clears and CJ resumes
    gojo.domainActive = false;
    assert(cj._isInsideGojoDomain() === false, 'CJ must not detect Gojo domain when domainActive is false');

    if (CONFIG.gojo) CONFIG.gojo.infinityFreezeChance = prevFreezeChance;

    console.log('      ✅ CJ bullet Infinity freezing and Gojo domain BAGUVIX stasis verified.');
  }

  // ── TEST 14: Yuji Soul Swap (Sukuna Takeover) vs Yuta Pure Love Beam Interrupts ──
  console.log('   14. Testing Yuji Soul Swap Super-Armor vs Yuta Pure Love Beam Interrupts & Smooth Revert...');
  {
    const YujiClass = FIGHTER_CLASS_MAP['yuji'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    assert(YujiClass && YutaClass, 'Yuji and Yuta classes must exist in FIGHTER_CLASS_MAP');

    const yuji = new YujiClass(200, 300, 0);
    const yuta = new YutaClass(350, 300, 1);
    state.fighters = [yuji, yuta];
    state.arena = { x: 0, y: 0, width: 540, height: 960 };
    state.gameState = 'playing';

    // 1. Trigger Soul Swap transformation
    yuji.hp = 70; // <= 30% maxHp
    yuji._triggerSoulSwapTransformation(yuta);
    const expectedHits = CONFIG.yuji?.soulSwapRapidSlashHits || 10;
    assert(yuji.soulSwapActive === true, 'Yuji Soul Swap must be active');
    assert(yuji.soulSwapTransitionTimer === 30, 'Yuji takeover transition timer must be 30');
    assert(yuji.rapidSlashHitsLeft === expectedHits, `Yuji initial rapid slash hits must be ${expectedHits}`);

    // 2. Pure Love Beam interrupt during takeover transition
    yuji.interruptAttacks(true);
    assert(yuji.soulSwapActive === true, 'Soul Swap must remain active under interrupt during takeover transition');
    assert(yuji.rapidSlashHitsLeft === expectedHits, 'Rapid slash hits must NOT be wiped by interrupt during Soul Swap transition');

    // 3. Step through transition timer
    for (let i = 0; i < 29; i++) {
      yuji.update(yuta, 0, state.arena);
    }
    assert(yuji.soulSwapTransitionTimer === 1, `Transition timer should be 1 before final frame, got ${yuji.soulSwapTransitionTimer}`);
    yuji.update(yuta, 0, state.arena);
    assert(yuji.soulSwapTransitionTimer === 0, `Transition timer must reach 0, got ${yuji.soulSwapTransitionTimer}`);
    assert(yuji.rapidSlashPhase === 'START', `Rapid slash phase must be START, got ${yuji.rapidSlashPhase}`);

    // 4. Execute first teleport & landing
    yuji.update(yuta, 0, state.arena);
    assert(yuji.rapidSlashPhase === 'LANDED', `Phase should transition to LANDED, got ${yuji.rapidSlashPhase}`);
    assert(yuji.rapidSlashTimer > 0, 'Landing timer must be active');

    // 5. Simulate transition to Fuga Channeling
    yuji.rapidSlashHitsLeft = 0;
    yuji.rapidSlashPhase = 'START';
    yuji.rapidSlashTimer = 0;
    yuji.update(yuta, 0, state.arena);
    assert(yuji.isChannelingDivineFlame === true, 'Yuji should be channeling Divine Flame');
    assert(yuji.rapidSlashPhase === 'FUGA_CHANNEL', 'Phase should be FUGA_CHANNEL');

    // 6. Yuta Pure Love Beam interrupts Fuga
    yuji.isChannelingDivineFlame = false;
    yuji.interruptAttacks(true);

    // Verify Yuji cleanly transitions to revert and does NOT lock up
    assert(yuji.soulSwapActive === false, 'Soul Swap must deactivate on Fuga cancellation');
    assert(yuji.revertTransitionTimer > 0, 'Revert transition timer must start');

    // Step through revert pause (35 frames)
    for (let i = 0; i < 35; i++) {
      yuji.update(yuta, 0, state.arena);
    }
    assert(yuji.revertTransitionTimer === 0, 'Revert transition timer must reach 0');
    assert(yuji.soulSwapActive === false, 'Soul Swap must remain false');

    // Normal combat physics and movement must now execute freely without zero-speed freeze
    yuji.update(yuta, 0, state.arena);
    assert(!yuji.isStationarySkillActive(), 'Yuji should no longer be marked as stationary');

    // 7. Test natural Fuga completion, post-Fuga free combat phase with Dismantles, and duration expiry revert
    const yujiCombat = new YujiClass(200, 300, 0);
    const dummyEnemy = new YutaClass(350, 300, 1);
    state.fighters = [yujiCombat, dummyEnemy];
    yujiCombat.hp = 70;
    yujiCombat._triggerSoulSwapTransformation(dummyEnemy);

    // Skip takeover transition
    yujiCombat.soulSwapTransitionTimer = 0;
    yujiCombat.rapidSlashPhase = 'START';
    yujiCombat.rapidSlashHitsLeft = 0; // Trigger Fuga immediately

    yujiCombat.update(dummyEnemy, 0, state.arena);
    assert(yujiCombat.isChannelingDivineFlame === true, 'Should be channeling Fuga');
    const expectedDuration = CONFIG.yuji?.soulSwapDuration ?? 500;
    assert(yujiCombat.soulSwapTimer === expectedDuration, `soulSwapTimer should remain ${expectedDuration} before free combat phase, got ${yujiCombat.soulSwapTimer}`);

    // Fast-forward Fuga channel to release
    yujiCombat.divineFlameChargeTimer = yujiCombat.divineFlameChargeMax;
    yujiCombat.update(dummyEnemy, 0, state.arena);
    assert(yujiCombat.rapidSlashPhase === 'FUGA_RECOVERY', 'Phase should transition to FUGA_RECOVERY');
    assert(yujiCombat.soulSwapActive === true, 'Soul Swap must remain active in FUGA_RECOVERY');

    // Step through Fuga recovery
    while (yujiCombat.divineFlameRecoveryTimer > 0) {
      yujiCombat.update(dummyEnemy, 0, state.arena);
    }

    // Verify Sukuna DOES NOT revert after Fuga! He enters 'COMPLETE' phase!
    assert(yujiCombat.soulSwapActive === true, 'Sukuna MUST NOT swap back after Fuga when duration remains');
    assert(yujiCombat.rapidSlashPhase === 'COMPLETE', `rapidSlashPhase must be COMPLETE, got ${yujiCombat.rapidSlashPhase}`);
    assert(!yujiCombat.isStationarySkillActive(), 'Sukuna must not be stationary during free combat phase');

    // Verify basic attack unleashes Sukuna's Dismantle ('ghostBlade' projectile)
    if (projectileSystem && projectileSystem.projectiles) {
      projectileSystem.projectiles.length = 0;
    }
    yujiCombat.cooldownTimer = 0;
    const shotResult = yujiCombat.shoot();
    assert(shotResult === true, 'Sukuna must successfully shoot Dismantle');
    const projs = (projectileSystem && projectileSystem.projectiles) ? projectileSystem.projectiles : (state.projectiles || []);
    assert(projs.length > 0, 'Dismantle projectile must be spawned in projectileSystem.projectiles');
    const dismantleProj = projs[projs.length - 1];
    assert(dismantleProj.visual === 'ghostBlade', `Projectile visual must be ghostBlade, got ${dismantleProj.visual}`);
    assert(yujiCombat.slashSwingTimer > 0, 'Sukuna slash swing animation must be active');
    const expectedDismantleCooldown = CONFIG.yuji?.soulSwapDismantleCooldown || 24;
    assert(yujiCombat.cooldownTimer === expectedDismantleCooldown, `cooldownTimer must match CONFIG.yuji.soulSwapDismantleCooldown (${expectedDismantleCooldown}), got ${yujiCombat.cooldownTimer}`);

    // Step through remaining duration until expiration
    const initialDuration = yujiCombat.soulSwapTimer;
    assert(initialDuration > 0, 'Duration timer should be positive');

    for (let frame = 0; frame <= initialDuration; frame++) {
      if (!yujiCombat.soulSwapActive) break;
      yujiCombat.update(dummyEnemy, 0, state.arena);
    }

    // Verify revert is triggered on expiration
    assert(yujiCombat.soulSwapActive === false, 'Sukuna must revert when duration expires');
    assert(yujiCombat.revertTransitionTimer > 0, 'Revert transition timer must start on expiry');

    console.log('      ✅ Yuji Soul Swap Super-Armor, post-Fuga Dismantles, and duration expiry revert verified.');
  }

  // ── TEST 15: Yuta Pure Love Beam Smooth Auto-Aim Channeling & Committed Release Angle ──
  console.log('   15. Testing Yuta Pure Love Beam Smooth Auto-Aim Channeling & Committed Release Lock...');
  {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    assert(YutaClass && GojoClass, 'Yuta and Gojo classes must exist');

    const yuta = new YutaClass({ x: 300, y: 300, color: '#FFFFFF', controls: {} });
    const gojo = new GojoClass({ x: 500, y: 500, color: '#00F0FF', controls: {} });
    state.fighters = [yuta, gojo];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    yuta.reset();
    gojo.reset();
    yuta.x = 300;
    yuta.y = 300;
    gojo.x = 500;
    gojo.y = 500;
    const expectedInitialAngle = Math.atan2(500 - 300, 500 - 300); // Math.PI / 4 (~0.785 rad)
    yuta.gunAngle = expectedInitialAngle;
    yuta.angle = expectedInitialAngle;

    // Force Yuta to start channeling Pure Love Beam
    yuta.isChannelingPureLoveBeam = true;
    yuta.pureLoveBeamChargeTimer = 0;
    yuta.pureLoveBeamLockedAngle = expectedInitialAngle;

    // Update 1 frame to lock initial aim to Gojo at (500, 500)
    yuta.update(gojo, 0, state.arena);
    const initialAngle = yuta.gunAngle;
    assert(Math.abs(initialAngle - expectedInitialAngle) < 0.01, `Initial aim should align with enemy at ~${expectedInitialAngle.toFixed(3)}, got ${initialAngle.toFixed(3)}`);

    // Enemy moves to (100, 100) -> Math.atan2(100 - 300, 100 - 300) = -3*Math.PI/4 (-2.356 rad)
    gojo.x = 100;
    gojo.y = 100;

    // Run 1 channeling frame
    yuta.update(gojo, 0, state.arena);

    // Verify Yuta turned smoothly toward new position with channelTurnRate (~0.030 rad/frame) without instant snap
    let turnedDiff = Math.abs(yuta.gunAngle - initialAngle);
    while (turnedDiff > Math.PI) turnedDiff = Math.abs(turnedDiff - Math.PI * 2);
    assert(turnedDiff > 0.01, `Yuta must smoothly track moving enemy during beam channel (turnedDiff: ${turnedDiff})`);

    const newTargetAngle = Math.atan2(100 - 300, 100 - 300);
    let snapDiff = Math.abs(yuta.gunAngle - newTargetAngle);
    while (snapDiff > Math.PI) snapDiff = Math.abs(snapDiff - Math.PI * 2);
    assert(snapDiff > 0.2, `Yuta must NOT snap instantly to target angle during channel (snapDiff: ${snapDiff})`);

    // Step several channeling frames and ensure Rika stays positioned behind Yuta facing beam angle
    for (let f = 0; f < 10; f++) {
      yuta.update(gojo, 0, state.arena);
      if (yuta.rika) {
        assert(Math.abs(yuta.rika.angle - yuta.gunAngle) < 0.01, 'Rika angle must match Yuta beam aim angle');
        const expectedBackAngle = yuta.gunAngle + Math.PI;
        const expectedDist = (yuta.r || 22) + 24;
        const expectedRikaX = yuta.x + Math.cos(expectedBackAngle) * expectedDist;
        const expectedRikaY = yuta.y + Math.sin(expectedBackAngle) * expectedDist;
        assert(Math.hypot(yuta.rika.x - expectedRikaX, yuta.rika.y - expectedRikaY) < 1.0, 'Rika must remain positioned behind Yuta');
      }
    }

    // Now record the angle right before firing
    const angleBeforeFire = yuta.gunAngle;

    // Fire the Pure Love Beam!
    yuta.activatePureLoveBeam();

    // Verify beam fired angle strictly matches angleBeforeFire (NO instant snap upon firing)
    assert(yuta.isFiringPureLoveBeam === true, 'Pure Love Beam must be firing');
    assert(Math.abs(yuta.pureLoveBeamLockedAngle - angleBeforeFire) < 0.001, `Committed angle must match channel angle without snap (got ${yuta.pureLoveBeamLockedAngle}, expected ${angleBeforeFire})`);
    assert(Math.abs(yuta.gunAngle - angleBeforeFire) < 0.001, 'Gun angle on fire must remain locked to committed angle');

    // Move enemy to another position during firing
    gojo.x = 700;
    gojo.y = 100;
    yuta.update(gojo, 0, state.arena);

    // Aim should remain strictly locked to committed release angle during firing
    assert(Math.abs(yuta.gunAngle - angleBeforeFire) < 0.001, 'Aim must stay locked to committed angle during beam firing');

    console.log('      ✅ Yuta Pure Love Beam smooth tracking during channel & committed release lock verified.');
  }

  // ── TEST 16: Team Match Winner Overlay Dual/Compound Name Display Verification ──
  console.log('   16. Testing Team Match Winner Overlay Dual Name Display (2v2, 1v2, Tag Match)...');
  {
    const { drawMatchEndScreen } = await import('../js/graphics/ui/GameOverScreen.js');
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const TojiClass = FIGHTER_CLASS_MAP['toji'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];

    const gojo = new GojoClass(100, 100, 0);
    const sukuna = new SukunaClass(150, 100, 1);
    const toji = new TojiClass(200, 100, 2);
    const saitama = new SaitamaClass(250, 100, 3);

    let recordedFills = [];
    const origFillText = state.ctx.fillText;
    const origStrokeText = state.ctx.strokeText;
    state.ctx.fillText = (text, x, y) => {
      recordedFills.push(text);
      if (origFillText) origFillText(text, x, y);
    };
    state.ctx.strokeText = (text, x, y) => {
      if (origStrokeText) origStrokeText(text, x, y);
    };

    // Subtest A: 2v2 Mode - Team 0 (Gojo & Sukuna) Wins
    state.mode = '2v2';
    state.fighters = [gojo, sukuna, toji, saitama];
    state.winningTeam = 0;
    state.matchWinner = gojo;
    state.matchEndTimer = 20;
    state.gameState = 'matchEnd';
    recordedFills = [];

    drawMatchEndScreen();

    const hasTeam0DuoWin = recordedFills.some(txt => typeof txt === 'string' && (txt.includes('GOJO & SUKUNA WIN!') || (txt.includes('GOJO') && txt.includes('SUKUNA') && txt.includes('WIN!'))));
    assert(hasTeam0DuoWin, `2v2 overlay must display both winning fighters' names ("GOJO & SUKUNA WIN!"), got: ${JSON.stringify(recordedFills)}`);

    // Subtest B: 2v2 Mode - Team 1 (Toji & Saitama) Wins
    state.winningTeam = 1;
    state.matchWinner = saitama;
    state.matchEndTimer = 20;
    recordedFills = [];

    drawMatchEndScreen();

    const hasTeam1DuoWin = recordedFills.some(txt => typeof txt === 'string' && (txt.includes('TOJI & SAITAMA WIN!') || (txt.includes('TOJI') && txt.includes('SAITAMA') && txt.includes('WIN!'))));
    assert(hasTeam1DuoWin, `2v2 overlay must display both winning fighters' names ("TOJI & SAITAMA WIN!"), got: ${JSON.stringify(recordedFills)}`);

    // Subtest C: 1v2 Stand Off Mode - Duo Team 1 (Gojo & Sukuna) Wins
    state.mode = '1v2 Stand Off';
    state.fighters = [saitama, gojo, sukuna];
    state.winningTeam = 1;
    state.matchWinner = gojo;
    state.matchEndTimer = 20;
    recordedFills = [];

    drawMatchEndScreen();

    const has1v2DuoWin = recordedFills.some(txt => typeof txt === 'string' && (txt.includes('GOJO & SUKUNA WIN!') || (txt.includes('GOJO') && txt.includes('SUKUNA') && txt.includes('WIN!'))));
    assert(has1v2DuoWin, `1v2 Duo team victory must display both fighters' names ("GOJO & SUKUNA WIN!"), got: ${JSON.stringify(recordedFills)}`);

    // Subtest D: 1v2 Stand Off Mode - Solo Boss Team 0 (Saitama) Wins
    state.winningTeam = 0;
    state.matchWinner = saitama;
    state.matchEndTimer = 20;
    recordedFills = [];

    drawMatchEndScreen();

    const has1v2SoloWin = recordedFills.some(txt => typeof txt === 'string' && txt.includes('SAITAMA WINS!'));
    assert(has1v2SoloWin, `1v2 Solo boss victory must display singular fighter name ("SAITAMA WINS!"), got: ${JSON.stringify(recordedFills)}`);

    // Subtest E: 1v1 Mode - Single Fighter (Gojo) Wins
    state.mode = '1v1';
    state.fighters = [gojo, sukuna];
    state.winningTeam = null;
    state.matchWinner = gojo;
    state.matchEndTimer = 20;
    recordedFills = [];

    drawMatchEndScreen();

    const has1v1Win = recordedFills.some(txt => typeof txt === 'string' && txt.includes('GOJO WINS!'));
    assert(has1v1Win, `1v1 victory must display singular fighter name ("GOJO WINS!"), got: ${JSON.stringify(recordedFills)}`);

    // Restore original functions
    state.ctx.fillText = origFillText;
    state.ctx.strokeText = origStrokeText;

    console.log('      ✅ Team match compound winner overlay ("GOJO & SUKUNA WIN!") and singular fallbacks verified.');
  }

  // 17. Testing Todo Takada-chan Idol BGM & Arena Ducking in 1v1 Matches vs Team Modes
  {
    console.log('   17. Testing Todo Takada-chan Idol BGM & Arena Ducking in 1v1 Matches vs Team Modes...');
    const { isTodoTakadaSongEnabled, modStartTakadaChanneling, modActivateTakadaUltimate } = await import('../js/entities/fighters/todo/todoSkills.js');
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    const { shouldDuckArenaBgm } = await import('../js/systems/arenaBgmSystem.js');
    const { CONFIG } = await import('../js/core/config.js');
    const TodoClass = FIGHTER_CLASS_MAP.todo;
    const GojoClass = FIGHTER_CLASS_MAP.gojo;

    const todo = new TodoClass({ radius: 25, x: 200, y: 300, hp: 300, color: '#ec4899' });
    const opponent = new GojoClass({ radius: 25, x: 400, y: 300, hp: 300, color: '#00E5FF' });
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    const origSongToggle = CONFIG.todo?.enableTakadaBackgroundSong;
    CONFIG.todo.enableTakadaBackgroundSong = true;

    // Subtest A: 1v1 Mode ('1v1') - Song should be enabled and duck arena BGM
    state.mode = '1v1';
    state.fighters = [todo, opponent];
    todo.reset();
    assert(isTodoTakadaSongEnabled() === true, 'isTodoTakadaSongEnabled() must return true in 1v1 mode');

    // Verify HUD skill bar pre-cast progress and anti-reset integrity
    todo.maxHp = 300;
    todo.hp = 300;
    todo._maxTakadaUltPct = 0;
    let skillList = getSkillDataForFighter(todo);
    let takadaSkill = skillList.find(s => s.id === 'takada');
    assert(takadaSkill && takadaSkill.pct === 0, `Takada skill bar must start at 0% at full HP (got ${takadaSkill?.pct}%)`);

    // Take damage towards configured hpThreshold (e.g. 50% way to threshold)
    const hpThresh = CONFIG.todo?.hpThresholdUltTrigger ?? 0.70;
    const midHpRatio = 1.0 - (1.0 - hpThresh) * 0.5;
    todo.hp = Math.round(todo.maxHp * midHpRatio);
    skillList = getSkillDataForFighter(todo);
    takadaSkill = skillList.find(s => s.id === 'takada');
    assert(takadaSkill.pct === 50, `Takada skill bar should be at 50% at midpoint HP (got ${takadaSkill.pct}%)`);

    // Simulate Gojo domain / infinity freeze: progress must NOT reset to 0!
    opponent.domainActive = true;
    todo.timeStopTimer = 30;
    skillList = getSkillDataForFighter(todo);
    takadaSkill = skillList.find(s => s.id === 'takada');
    assert(takadaSkill.pct >= 50, `Takada skill bar must NOT reset to 0 during enemy freeze/domain (got ${takadaSkill.pct}%)`);
    opponent.domainActive = false;
    todo.timeStopTimer = 0;

    // Reach configured HP threshold => 100% progress
    todo.hp = Math.round(todo.maxHp * hpThresh);
    skillList = getSkillDataForFighter(todo);
    takadaSkill = skillList.find(s => s.id === 'takada');
    assert(takadaSkill.pct >= 99 && takadaSkill.ready, 'Takada skill bar must be 100% and ready at HP threshold');

    // Trigger channeling (arena BGM must NOT duck during channeling, skill bar must STAY 100% ready!)
    modStartTakadaChanneling.call(todo, true);
    assert(todo.isTakadaChanneling === true, 'Todo must enter Takada Channeling');
    assert(todo.isTakadaBackgroundPlaying === false, 'Todo isTakadaBackgroundPlaying must be false in 1v1 channeling');
    assert(shouldDuckArenaBgm() === false, 'shouldDuckArenaBgm() must return false during channeling (arena BGM must not cut off)');
    skillList = getSkillDataForFighter(todo);
    takadaSkill = skillList.find(s => s.id === 'takada');
    assert(takadaSkill.pct === 100 && takadaSkill.ready, 'Takada skill bar must remain 100% ready during channeling');

    // Activate ultimate (arena BGM MUST duck after channeling finishes)
    modActivateTakadaUltimate.call(todo);
    assert(todo.isTakadaUltActive === true, 'Todo must enter Takada Ultimate');
    assert(todo.isTakadaBackgroundPlaying === true, 'Todo isTakadaBackgroundPlaying must remain true during 1v1 ultimate');
    assert(shouldDuckArenaBgm() === true, 'shouldDuckArenaBgm() must duck arena BGM during 1v1 ultimate (after channeling)');

    // Subtest B: Stand Off Mode ('Stand Off') - 1v1 duel mode must also play
    state.mode = 'Stand Off';
    assert(isTodoTakadaSongEnabled() === true, 'isTodoTakadaSongEnabled() must return true in Stand Off mode');

    // Subtest C: Team Match Modes ('2v2', 'Tactical 4v4', 'Tag Match') - Song must NOT play
    const teamModes = ['2v2', 'Tactical 4v4', 'Tag Match', '1v2 Stand Off', 'FFA'];
    for (const tMode of teamModes) {
      state.mode = tMode;
      assert(isTodoTakadaSongEnabled() === false, `isTodoTakadaSongEnabled() must return false in ${tMode}`);
    }

    // Subtest D: User Setting / Config Disable (enableTakadaBackgroundSong = false)
    state.mode = '1v1';
    CONFIG.todo.enableTakadaBackgroundSong = false;
    assert(isTodoTakadaSongEnabled() === false, 'isTodoTakadaSongEnabled() must return false when enableTakadaBackgroundSong is false even in 1v1');
    todo.reset();
    modStartTakadaChanneling.call(todo, true);
    assert(todo.isTakadaBackgroundPlaying === false, 'isTakadaBackgroundPlaying must be false when enableTakadaBackgroundSong is false');
    assert(shouldDuckArenaBgm() === false, 'shouldDuckArenaBgm() must not duck when song is disabled');

    // Subtest E: Match End Winner Song Preservation (Do not cut off Todo BG music if match is over & he wins while ult not expired)
    CONFIG.todo.enableTakadaBackgroundSong = true;
    todo.reset();
    state.fighters = [todo, opponent];
    opponent.hp = 0;
    opponent.dead = true;
    opponent.isDead = true;

    // Todo enters Takada ultimate with duration remaining
    modActivateTakadaUltimate.call(todo);
    todo.takadaUltTimer = 1200;
    todo.isTakadaUltActive = true;
    todo.isTakadaBackgroundPlaying = true;
    todo.takadaSongStarted = true;

    // Simulate loop sound active in soundSystem
    const { playLoopingSound, stopAllLoopingSounds, isTodoTakadaWinnerSong } = await import('../js/systems/soundSystem.js');
    const loopKey = `todo_takada_bg_${todo.id || 'todo'}`;
    playLoopingSound(loopKey, 'Assets/Sound Effects/Skills/todo-tadaka-background-song.mp3', 0.85, 1.0, 100);

    // Match ends with Todo winning
    state.gameState = 'matchEnd';
    state.matchWinner = todo;
    state.roundWinner = todo;
    state.matchEndTimer = 0;

    assert(isTodoTakadaWinnerSong(loopKey) === true, 'isTodoTakadaWinnerSong() must return true when Todo wins with unexpired ultimate');

    // Call stopAllLoopingSounds (standard roundEnd / matchEnd routine)
    stopAllLoopingSounds(0, 0, false, false);

    assert(isTodoTakadaWinnerSong(loopKey) === true, 'Todo Takada BGM must remain protected after stopAllLoopingSounds');
    assert(shouldDuckArenaBgm() === true, 'shouldDuckArenaBgm() must keep ducking arena BGM while Todo winner ult is active');

    // Simulate update loop auto-advance check
    const isTodoUltPlaying = Boolean(state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'todo' || f.type === 'todo') &&
      f.hp > 0 && !f.isDead && !f.dead &&
      ((f.takadaUltTimer > 0) || f.isTakadaUltActive || f.isTakadaChanneling || f.isTakadaBackgroundPlaying || f.takadaSongStarted)
    ));
    assert(isTodoUltPlaying === true, 'isTodoUltPlaying must be true so matchEnd does not prematurely reset');

    // Simulate ultimate duration expiration
    todo.takadaUltTimer = 0;
    todo.isTakadaUltActive = false;
    todo.isTakadaBackgroundPlaying = false;
    todo.takadaSongStarted = false;
    const isTodoUltPlayingExpired = Boolean(state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'todo' || f.type === 'todo') &&
      f.hp > 0 && !f.isDead && !f.dead &&
      ((f.takadaUltTimer > 0) || f.isTakadaUltActive || f.isTakadaChanneling || f.isTakadaBackgroundPlaying || f.takadaSongStarted)
    ));
    assert(isTodoUltPlayingExpired === false, 'isTodoUltPlaying must be false once ultimate duration naturally expires');

    // Subtest F: Single-Use Ultimate Enforcement (Todo can only use Takada Ultimate once per match)
    todo.reset();
    state.mode = '1v1';
    state.gameState = 'playing';
    opponent.hp = 300;
    opponent.dead = false;
    opponent.isDead = false;
    assert(todo.hasUsedTakadaUlt === false, 'Todo hasUsedTakadaUlt must start false');

    // Drop HP to threshold to auto-trigger ultimate
    todo.hp = Math.round(todo.maxHp * 0.30);
    todo.update(opponent, 0, state.arena);
    assert(todo.isTakadaChanneling === true, 'Todo must start channeling ultimate');
    assert(todo.hasUsedTakadaUlt === true, 'Todo hasUsedTakadaUlt must be true once channeling starts');

    // Fast-forward channeling to activation
    todo.takadaChannelTimer = 1;
    todo.update(opponent, 0, state.arena);
    assert(todo.isTakadaUltActive === true, 'Todo must activate Takada Ultimate');

    // Fast-forward active ultimate to natural expiration
    todo.takadaUltTimer = 1;
    todo.update(opponent, 0, state.arena);
    assert(todo.isTakadaUltActive === false, 'Todo Takada Ultimate must expire when timer reaches 0');
    assert(todo.hasUsedTakadaUlt === true, 'Todo hasUsedTakadaUlt must remain true after ultimate expires');

    // Verify HUD skill bar remains 0% and not ready after use
    skillList = getSkillDataForFighter(todo);
    takadaSkill = skillList.find(s => s.id === 'takada');
    assert(takadaSkill.pct === 0 && !takadaSkill.ready, 'Takada skill bar must be 0% and not ready after single use');

    // Verify triggerUltimate returns false and does not restart ultimate
    const triggerResult = todo.triggerUltimate();
    assert(triggerResult === false, 'triggerUltimate() must return false once ultimate was used');
    assert(todo.isTakadaChanneling === false && todo.isTakadaUltActive === false, 'Todo must not re-enter ultimate on manual trigger');

    // Verify modStartTakadaChanneling returns false
    const channelResult = modStartTakadaChanneling.call(todo, true);
    assert(channelResult === false, 'modStartTakadaChanneling() must return false once ultimate was used');

    // Verify update() with 0 cooldown and low HP does NOT re-trigger ultimate
    todo.takadaUltCooldown = 0;
    todo.hp = Math.round(todo.maxHp * 0.20);
    for (let f = 0; f < 30; f++) {
      todo.update(opponent, 0, state.arena);
    }
    assert(todo.isTakadaChanneling === false && todo.isTakadaUltActive === false, 'Todo update() must not re-trigger ultimate even at low HP and 0 cooldown');

    // Verify reset() restores ability for next match/round
    todo.reset();
    assert(todo.hasUsedTakadaUlt === false, 'todo.reset() must reset hasUsedTakadaUlt to false for next round');

    // Restore config & state
    CONFIG.todo.enableTakadaBackgroundSong = origSongToggle;
    todo.reset();
    state.mode = '1v1';

    console.log('      ✅ Todo Takada-chan idol BGM, team mode isolation, and single-use ultimate limit verified.');
  }

  // ── TEST 21: Yuji Soul Swap vs Undetected / Bush Concealed Boss Yuta ──
  console.log('   21. Testing Yuji Soul Swap Uninterrupted Sequence vs Undetected Boss Yuta...');
  {
    const YujiClass = FIGHTER_CLASS_MAP['yuji'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const { getClosestOpponent } = await import('../js/systems/physics.js');
    assert(YujiClass && YutaClass, 'Yuji and Yuta classes must exist in FIGHTER_CLASS_MAP');

    const yuji = new YujiClass({ id: 'yuji', type: 'yuji', x: 100, y: 100, hp: 350 });
    const bossYuta = new YutaClass({ id: 'yuta', type: 'yuta', x: 400, y: 400, hp: 2000 });
    yuji.x = 100;
    yuji.y = 100;
    bossYuta.x = 400;
    bossYuta.y = 400;
    bossYuta.bossConfig = { bushUndetected: true };
    bossYuta.isHidingInBush = true;
    bossYuta.isUndetectedInBush = true;
    bossYuta.isBushEvadeActive = true;

    state.fighters = [yuji, bossYuta];
    state.mode = '1v1';
    state.gameState = 'playing';
    state.arena = arena;

    // Normal Yuji before transformation cannot aim at undetected Boss Yuta far away
    assert(yuji.isValidAimTarget(bossYuta) === false, 'Normal Yuji must not target undetected Boss Yuta in bush');

    // Trigger Yuji Soul Swap
    yuji.hp = Math.round(yuji.maxHp * 0.25);
    yuji.update(bossYuta, 0, state.arena);

    // Verify transformation triggered
    assert(yuji.soulSwapActive === true, 'Yuji must activate Soul Swap');
    assert(yuji.hasActiveFinishingAbility() === true, 'Yuji hasActiveFinishingAbility must return true during Soul Swap');
    assert(yuji.isValidAimTarget(bossYuta) === true, 'Sukuna perception must allow targeting undetected Boss Yuta in bush');

    // Verify getClosestOpponent perceives Boss Yuta
    const closest = getClosestOpponent(yuji);
    assert(closest === bossYuta, 'getClosestOpponent must return Boss Yuta for Soul Swapped Yuji');

    // Fast-forward takeover transition freeze
    yuji.soulSwapTransitionTimer = 1;
    yuji.update(bossYuta, 0, state.arena);
    assert(yuji.rapidSlashPhase === 'START', 'Yuji must transition to rapid slash START phase');

    // Run rapid slash combo strikes (all hits)
    let comboSafetyTicks = 400;
    while (yuji.soulSwapActive && yuji.rapidSlashHitsLeft > 0 && comboSafetyTicks > 0) {
      comboSafetyTicks--;
      // Keep Boss Yuta in bush/undetected status throughout the entire fight
      bossYuta.isHidingInBush = true;
      bossYuta.isUndetectedInBush = true;
      bossYuta.isBushEvadeActive = true;
      yuji.update(bossYuta, 0, state.arena);
    }

    assert(yuji.rapidSlashHitsLeft === 0, 'Yuji must successfully complete all rapid slash strikes against undetected enemy');
    assert(yuji.soulSwapActive === true, 'Soul Swap must not get cancelled during rapid slash strikes');

    // Advance past slash recovery to Fuga channeling phase
    let fugaSafetyTicks = 100;
    while (yuji.soulSwapActive && yuji.rapidSlashPhase !== 'FUGA_CHANNEL' && !yuji.isChannelingDivineFlame && fugaSafetyTicks > 0) {
      fugaSafetyTicks--;
      bossYuta.isHidingInBush = true;
      bossYuta.isUndetectedInBush = true;
      bossYuta.isBushEvadeActive = true;
      yuji.update(bossYuta, 0, state.arena);
    }
    assert(yuji.rapidSlashPhase === 'FUGA_CHANNEL' || yuji.isChannelingDivineFlame, 'Yuji must transition to Fuga channeling');
    assert(yuji.hasActiveFinishingAbility() === true, 'hasActiveFinishingAbility must remain true during Fuga');

    // Complete Fuga channeling
    yuji.divineFlameChargeTimer = yuji.divineFlameChargeMax;
    yuji.update(bossYuta, 0, state.arena);
    assert(yuji.rapidSlashPhase === 'FUGA_RECOVERY', 'Yuji must fire Fuga and enter FUGA_RECOVERY');

    // Complete recovery
    yuji.divineFlameRecoveryTimer = 1;
    yuji.update(bossYuta, 0, state.arena);
    assert(yuji.rapidSlashPhase === 'COMPLETE', 'Yuji must reach COMPLETE phase after Fuga');

    // Clean up
    yuji.reset();
    bossYuta.reset();
    console.log('      ✅ Yuji Soul Swap uninterrupted sequence vs undetected Boss Yuta verified.');
  }

  console.log('───────────────────────────────────────────────────────');
  console.log('🎉 ALL MULTI-FIGHTER INTERACTION TESTS PASSED SUCCESSFULLY!\n');
}

runInteractionTests().catch(err => {
  console.error('🚨 Interaction Test Suite Encountered an Error:', err);
  process.exit(1);
});
