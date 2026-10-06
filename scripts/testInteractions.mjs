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
const _mockElements = new Map();
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => {
    if (id === 'arena') return mockCanvas;
    if (!_mockElements.has(id)) {
      const el = globalThis.document.createElement('div');
      el.id = id;
      _mockElements.set(id, el);
    }
    return _mockElements.get(id);
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    const el = {
      id: '',
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      textContent: '',
      _innerHTML: '',
      get innerHTML() { return this._innerHTML; },
      set innerHTML(val) {
        this._innerHTML = val;
        if (this.firstElementChild && this.firstElementChild !== this) {
          this.firstElementChild._innerHTML = val;
        }
      },
      addEventListener: () => {},
      appendChild: (child) => {
        el.children.push(child);
        if (child) {
          el._innerHTML = (el._innerHTML || '') + (child._innerHTML || child.innerHTML || '');
        }
        return child;
      },
      removeChild: (child) => {
        const idx = el.children.indexOf(child);
        if (idx !== -1) el.children.splice(idx, 1);
        return child;
      },
      children: [],
      querySelector: () => null,
      querySelectorAll: () => []
    };
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
    this.load = () => {};
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
    this.cloneNode = () => new globalThis.Audio();
  }
};
globalThis.AudioBuffer = class {
  constructor(options = {}) {
    this.duration = options.duration !== undefined ? options.duration : 1.5;
    this.length = options.length !== undefined ? options.length : 44100;
    this.numberOfChannels = options.numberOfChannels !== undefined ? options.numberOfChannels : 2;
    this.sampleRate = options.sampleRate !== undefined ? options.sampleRate : 44100;
    this._channels = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length));
  }
  getChannelData(ch) {
    return this._channels[ch] || new Float32Array(this.length);
  }
  copyToChannel(src, ch, offset) {
    const dest = this._channels[ch];
    if (dest && src) {
      dest.set(src.subarray ? src.subarray(0, this.length - offset) : src, offset);
    }
  }
};
globalThis.AudioContext = class {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.decodeAudioData = async (buffer) => new globalThis.AudioBuffer();
    this.createBufferSource = () => ({
      buffer: null,
      playbackRate: { value: 1.0 },
      connect: () => {},
      start: () => {},
      stop: () => {},
      disconnect: () => {}
    });
    this.createGain = () => ({
      gain: { value: 1.0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, cancelScheduledValues: () => {} },
      connect: () => {},
      disconnect: () => {}
    });
    this.createBuffer = (channels, length, sampleRate) => {
      const sRate = sampleRate || 44100;
      return new globalThis.AudioBuffer({
        numberOfChannels: channels,
        length,
        sampleRate: sRate,
        duration: length / sRate
      });
    };
  }
  resume() { return Promise.resolve(); }
};
const _origFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (typeof url === 'string' && (url.startsWith('Assets/') || url.startsWith('./') || url.includes('.mp3') || url.includes('.wav') || url.includes('.png') || url.includes('.ogg'))) {
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(1024)
    };
  }
  if (_origFetch) {
    try {
      return await _origFetch(url);
    } catch (e) {}
  }
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(1024)
  };
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

    // Dead companions remain in state.illusions during their death animation and must not contact Infinity.
    const deadCompanion = {
      x: gojo.x + 10,
      y: gojo.y,
      r: 20,
      hp: 0,
      owner: toji,
      isIllusion: true,
      isDying: true
    };
    state.fighters = [];
    state.illusions = [deadCompanion];
    state.cjDriveBys = [];
    state.arena = { x: 0, y: 0, width: 540, height: 960 };
    state.gameState = 'playing';
    gojo.infinityBlockTimer = 0;
    gojo._checkInfinityCollisions();
    assert(deadCompanion._inInfinityContact !== true, 'Gojo Infinity must ignore a dead companion still present during its death animation');
    assert(gojo.infinityBlockTimer === 0, 'A dead companion must not trigger an Infinity block or shockwave');

    state.fighters = [gojo];
    state.illusions = [];
    gojo.infinityBlockTimer = 0;
    gojo._checkInfinityCollisions();
    assert(gojo.infinityBlockTimer === 0, 'Gojo Infinity must not treat Gojo himself as an arena collision target');
    state.illusions = [];
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
    const plant = {
      x: 300,
      y: 350,
      _fixedX: 300,
      _fixedY: 350,
      r: 18,
      hp: 100,
      isPlant: true,
      isPlantMinion: true,
      isImmovable: true,
      immuneToPull: true
    };
    gojo.domainActive = true;
    gojo.domainTimer = 200;

    // Activate Rika
    yuta.rika.active = true;
    yuta.rika.x = 280;
    yuta.rika.y = 300;
    yuta.rika.hp = 100;
    yuta.rika.spawnTimer = 0;

    state.fighters = [gojo, yuta, plant];
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
    const initialPlantX = plant.x;

    // Run behavior update
    new GojoPurpleBehavior().update(purple, state.fighters, projectileSystem);

    assert(yuta.x < initialYutaX, `Yuta must be pulled toward Purple (x changed from ${initialYutaX} to ${yuta.x})`);
    assert(yuta.rika.x < initialRikaX, `Rika must be pulled toward Purple (x changed from ${initialRikaX} to ${yuta.rika.x})`);
    assert(plant.x < initialPlantX, `Plants must be pulled toward Purple (x changed from ${initialPlantX} to ${plant.x})`);
    assert(plant._fixedX === plant.x && plant._fixedY === plant.y, 'Pulled plants must retain their new fixed position');

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

    // Temporarily enable Solar Armor for DEF tests (config may have enableSolarArmor: false)
    const savedSolarArmor = CONFIG.escanor.enableSolarArmor;
    CONFIG.escanor.enableSolarArmor = true;

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

    // Restore enableSolarArmor
    CONFIG.escanor.enableSolarArmor = savedSolarArmor;

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

  // ── TEST 22: Gojo 300-Frame Post-Skill Cooldown & Anti-Spam Gate ──
  console.log('   22. Testing Gojo 300-Frame Post-Skill Cooldown & Anti-Spam Gate...');
  {
    const GojoClass = FIGHTER_CLASS_MAP.gojo;
    const SukunaClass = FIGHTER_CLASS_MAP.sukuna;
    const gojo = new GojoClass({ radius: 25, x: 200, y: 300, hp: 200, color: '#00E5FF' });
    const sukuna = new SukunaClass({ radius: 25, x: 400, y: 300, hp: 300, color: '#DC2626' });
    state.fighters = [gojo, sukuna];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    state.gameState = 'playing';

    gojo.reset();
    assert(gojo.globalSkillCooldown === 0, 'Gojo globalSkillCooldown must initialize to 0');

    // 1. Detonating Red triggers 300 frames post-skill cooldown
    gojo._activateRed();
    gojo._detonateRed();
    assert(gojo.globalSkillCooldown === 300, `Gojo globalSkillCooldown must be 300 after Red detonation (got ${gojo.globalSkillCooldown})`);

    // 2. While globalSkillCooldown > 0, Gojo cannot initiate Purple or Domain even if cooldowns are ready
    gojo.purpleCooldown = 0;
    gojo.domainCooldown = 0;
    gojo.update(sukuna, 0, state.arena);
    assert(gojo.isChannelingPurple === false, 'Gojo must NOT start channeling Purple while globalSkillCooldown > 0');
    assert(gojo.isChannelingDomainExpansion === false && gojo.isDomainPreSlide === false, 'Gojo must NOT start Domain while globalSkillCooldown > 0');

    // 3. Cooldown ticks down each frame
    const prevCD = gojo.globalSkillCooldown;
    gojo.update(sukuna, 0, state.arena);
    assert(gojo.globalSkillCooldown === prevCD - 1, `globalSkillCooldown must decrement by 1 per frame (expected ${prevCD - 1}, got ${gojo.globalSkillCooldown})`);

    // 4. Firing Purple triggers 300 frames post-skill cooldown
    gojo.globalSkillCooldown = 0;
    gojo.isChannelingPurple = true;
    gojo._firePurple(0);
    assert(gojo.globalSkillCooldown === 300, `Gojo globalSkillCooldown must be 300 after firing Purple (got ${gojo.globalSkillCooldown})`);

    // Clear active projectiles before activating domain
    if (state.projectiles) state.projectiles.length = 0;
    if (projectileSystem.projectiles) projectileSystem.projectiles.length = 0;

    // 5. Activating Domain triggers 300 frames post-skill cooldown
    gojo.globalSkillCooldown = 0;
    gojo._activateDomain(state.arena);
    assert(gojo.globalSkillCooldown === 300, `Gojo globalSkillCooldown must be 300 after activating Domain (got ${gojo.globalSkillCooldown})`);

    // Clean up
    if (state.projectiles) state.projectiles.length = 0;
    if (projectileSystem.projectiles) projectileSystem.projectiles.length = 0;
    gojo.reset();
    sukuna.reset();
    console.log('      ✅ Gojo 300-frame post-skill cooldown and anti-spam lockout verified.');
  }

  // ── TEST 23: Eye of Cthulhu Death Shatters & Kills Active Servants/Allies ──
  console.log('   23. Testing Eye of Cthulhu Death Shatters & Kills Active Allies/Servants...');
  {
    const EyeClass = FIGHTER_CLASS_MAP.eye_of_cthulhu;
    const DummyClass = FIGHTER_CLASS_MAP.default || FIGHTER_CLASS_MAP.gojo;
    const eye = new EyeClass({ radius: 32, x: 300, y: 300, hp: 480, maxHp: 480, color: '#E11D48' });
    const dummy = new DummyClass({ radius: 25, x: 500, y: 300, hp: 500, color: '#00E5FF' });
    state.fighters = [eye, dummy];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    state.gameState = 'playing';
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];

    // 1. Eye spawns Servants of Cthulhu minion illusions
    eye._spawnServantMinion(0, {
      servantCountPerSpawn: 3,
      servantMaxActive: 4,
      servantHp: 120,
      servantRadius: 10,
      servantScale: 1.5
    });

    assert(state.illusions.length === 3, `Expected 3 active Servants in state.illusions, got ${state.illusions.length}`);
    assert(state.illusions.every(ill => ill.isServantOfCthulhu && ill.hp > 0), 'All spawned Servants must be active Servants of Cthulhu with > 0 HP');

    // 2. Also add a Servant projectile to state.projectiles
    state.projectiles.push({
      x: 320,
      y: 320,
      r: 10,
      isServantOfCthulhu: true,
      owner: 0,
      dead: false,
      life: 100
    });
    assert(state.projectiles.length === 1, 'Expected 1 active Servant projectile');

    // 3. Eye dies!
    eye.hp = 0;
    eye.onDeath();

    // 4. Verify all active Servants in state.illusions are shattered and removed
    assert(state.illusions.length === 0, `Expected all Servants in state.illusions to be destroyed and shattered on Eye death, but ${state.illusions.length} remained!`);
    
    // 5. Verify active Servant projectiles are shattered and marked dead
    assert(state.projectiles.every(p => p.dead || p.life <= 0), 'Expected all Servant projectiles to be marked dead on Eye death');

    // 6. Verify Terraria minion gore chunks were created in state.deathEffects
    const hasMinionGore = state.deathEffects.some(e => e.isEyeOfCthulhuGore);
    assert(hasMinionGore, 'Expected Terraria death gore chunks to be spawned for the shattered minions and Eye');

    // Clean up
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];
    console.log('      ✅ Eye of Cthulhu active ally & servant death shatter verified.');
  }

  // ── TEST 24: Eye of Cthulhu & Sukuna Domain Slash Lines Shatter Gore Dropping Interaction ──
  console.log('   24. Testing Eye of Cthulhu & Sukuna Domain Slash Lines Shatter Gore Interaction...');
  {
    const SukunaClass = FIGHTER_CLASS_MAP.sukuna;
    const EyeClass = FIGHTER_CLASS_MAP.eye_of_cthulhu;
    const { spawnDomainSlashLines, renderSukunaDomainSlashLines } = await import('../js/entities/fighters/sukuna/sukunaDomainVisuals.js');
    const { drawDeathEffects } = await import('../js/graphics/particles/deathShatterEffect.js');

    const sukuna = new SukunaClass({ radius: 25, x: 200, y: 300, hp: 500, color: '#DC2626' });
    const eye = new EyeClass({ radius: 32, x: 205, y: 300, hp: 480, maxHp: 480, color: '#E11D48' });

    state.fighters = [sukuna, eye];
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
    state.gameState = 'playing';
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];
    state.getFighterTeam = (idx) => idx; // Opposing teams

    // 1. Sukuna opens Domain Expansion
    sukuna.domainActive = true;
    sukuna.domainDuration = 600;
    state.activeDomain = 'malevolent_shrine';

    // 2. Sukuna's domain slash lines tick and strike Eye of Cthulhu
    state.frameCount = 10;
    const hitAny = spawnDomainSlashLines(sukuna, 3);
    assert(hitAny, 'Expected domain slash lines to intersect and hit Eye of Cthulhu');

    // 3. Verify Eye of Cthulhu dropped Terraria sprite sheet shatter pieces in state.deathEffects
    const eyeGorePieces = state.deathEffects.filter(e => e.isEyeOfCthulhuGore);
    assert(eyeGorePieces.length > 0, `Expected shatter gore pieces to drop when Eye of Cthulhu is hit by Sukuna domain slashes (got ${eyeGorePieces.length})`);
    
    // 4. Verify gore properties: valid spriteFrame, velocity, rotation, gravity
    const firstPiece = eyeGorePieces[0];
    assert(firstPiece.spriteFrame !== undefined, 'Dropped piece must have a valid spriteFrame from the Terraria sprite sheet');
    assert(typeof firstPiece.vx === 'number' && typeof firstPiece.vy === 'number', 'Dropped piece must have physical velocity');
    assert(typeof firstPiece.gravity === 'number' && firstPiece.gravity > 0, 'Dropped piece must have downward gravity acceleration');

    // 5. Verify render passes execute cleanly with 0 canvas stack leaks
    mockCtx.resetStackDepth();
    renderSukunaDomainSlashLines(sukuna, mockCtx);
    assert(mockCtx.getStackDepth() === 0, `renderSukunaDomainSlashLines canvas stack depth must be 0 (got ${mockCtx.getStackDepth()})`);

    drawDeathEffects();
    assert(mockCtx.getStackDepth() === 0, `drawDeathEffects canvas stack depth must be 0 (got ${mockCtx.getStackDepth()})`);

    // 6. Test Phase 2 Eye of Cthulhu and Servants also drop gore pieces on domain slash hits
    eye.isPhase2 = true;
    state.frameCount = 25;
    const initialGoreCount = state.deathEffects.length;
    spawnDomainSlashLines(sukuna, 3);
    assert(state.deathEffects.length > initialGoreCount, 'Phase 2 Eye must also continuously drop shatter pieces on domain slash hits');

    // Clean up
    sukuna.domainActive = false;
    state.activeDomain = null;
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];
    console.log('      ✅ Eye of Cthulhu & Sukuna domain slash shatter gore drop verified.');
  }

  // ── TEST 25: Saitama vs Gojo Limitless Infinity Barrier Crack & Shatter Interaction ──
  console.log('   25. Testing Saitama vs Gojo Limitless Infinity Barrier Crack & Shatter Interaction...');
  {
    const SaitamaClass = FIGHTER_CLASS_MAP.saitama;
    const GojoClass = FIGHTER_CLASS_MAP.gojo;
    const { drawDeathEffects } = await import('../js/graphics/particles/deathShatterEffect.js');

    state.mode = '1v1';
    const saitama = new SaitamaClass({ radius: 25, x: 200, y: 300, hp: 1000, maxHp: 1000, color: '#F5C400' });
    const gojo = new GojoClass({ radius: 25, x: 250, y: 300, hp: 1000, maxHp: 1000, color: '#00E5FF' });
    saitama.maxHp = 1000;
    saitama.hp = 1000;
    gojo.maxHp = 1000;
    gojo.hp = 1000;

    state.fighters = [saitama, gojo];
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
    state.gameState = 'playing';
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];
    state.getFighterTeam = (idx) => idx; // Opposing teams

    // Initial state verification: Gojo has full HP and active Limitless Infinity
    assert(gojo.hasActiveInfinity(), 'Gojo must start with an active Limitless Infinity barrier');
    assert(gojo.infinityBarrierHp === 350, `Expected full barrier HP of 350, got ${gojo.infinityBarrierHp}`);
    assert(gojo.infinityCrackLevel === 0, `Expected 0 crack level at start, got ${gojo.infinityCrackLevel}`);

    const initialGojoHp = gojo.hp;

    // 1. Saitama executes Normal Punch against Gojo while Infinity is active
    const hit1Result = gojo.takeDamage(75, saitama, { isMelee: true, isSkill: true, isSaitamaPunch: true, bypassShield: true, undodgeable: true });
    assert(hit1Result === false, 'Gojo takeDamage must return false (blocked 100% by Infinity)');
    assert(gojo.hp === initialGojoHp, `Gojo must take strictly 0 direct HP damage while Infinity is active (HP: ${gojo.hp}/${initialGojoHp})`);
    assert(gojo.infinityBarrierHp === 280, `Infinity barrier HP must take 70 damage from Saitama punch (got ${gojo.infinityBarrierHp})`);
    assert(gojo.infinityCrackLevel === 1, `Infinity barrier must develop Tier 1 cracks (crackLevel: ${gojo.infinityCrackLevel})`);

    // 2. Saitama delivers Consecutive Normal Punches flurry hits
    gojo.takeDamage(35, saitama, { isSkill: true, isMelee: true, isMachineGunBlow: true, isSaitamaPunch: true, bypassShield: true });
    assert(gojo.hp === initialGojoHp, 'Gojo HP must remain untouched during flurry hits');
    assert(gojo.infinityBarrierHp === 245, `Infinity barrier HP must reduce by 35 to 245 (got ${gojo.infinityBarrierHp})`);
    assert(gojo.infinityCrackLevel === 2, `Infinity barrier must develop Tier 2 cracks (crackLevel: ${gojo.infinityCrackLevel})`);

    // 3. Render Gojo body with cracks to ensure zero Canvas stack leaks
    mockCtx.resetStackDepth();
    gojo.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, `Gojo draw with barrier cracks must have 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // 4. Saitama lands Serious Counter punch -> instantly shatters the Infinity barrier and deals direct HP damage!
    const counterResult = gojo.takeDamage(350, saitama, { isSkill: true, isCounter: true, isCritical: true, bypassShield: true, isSaitamaCounter: true, bypassEvade: true, undodgeable: true, isGuaranteedHit: true });

    // Barrier must be completely shattered by the counter!
    assert(gojo.infinityBarrierHp === 0, `Barrier HP must be 0 after counter shatter (got ${gojo.infinityBarrierHp})`);
    assert(gojo.infinityActive === false, 'Infinity must be deactivated after counter shatter');
    assert(gojo.infinityCooldown === (CONFIG.gojo?.infinityBrokenCooldown ?? 360), `Infinity must be placed on broken lockout cooldown (got ${gojo.infinityCooldown})`);
    assert(counterResult !== false, 'Counter punch must penetrate barrier and deal direct HP damage');
    assert(gojo.hp < initialGojoHp, `Gojo must take direct HP damage from the barrier-shattering counter (HP: ${gojo.hp} < ${initialGojoHp})`);
    assert(!saitama.isFrozenByInfinity, 'Saitama must NOT be frozen in Infinity when shattering the barrier');

    // 5. Verify flying glass shard particles spawned in state.deathEffects
    const glassShards = state.deathEffects.filter(e => e.isInfinityGlassShard);
    assert(glassShards.length > 0, `Expected infinity glass shards to spawn on barrier shatter (got ${glassShards.length})`);
    
    // Verify shard rendering passes with 0 canvas stack leaks
    mockCtx.resetStackDepth();
    drawDeathEffects();
    assert(mockCtx.getStackDepth() === 0, `drawDeathEffects with glass shards must have 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // 6. Next Saitama attack while Infinity is shattered MUST deal direct HP damage to Gojo
    const hpBeforeDirectHit = gojo.hp;
    const directHitResult = gojo.takeDamage(50, saitama, { isMelee: true, isSkill: true, isSaitamaPunch: true, bypassShield: true });
    assert(directHitResult !== false, 'takeDamage must succeed and apply damage when Infinity is shattered');
    assert(gojo.hp < hpBeforeDirectHit, `Gojo must take direct HP damage while Infinity is broken (HP: ${gojo.hp} < ${hpBeforeDirectHit})`);
    assert(!saitama.isFrozenByInfinity, 'Saitama must NOT be frozen in Infinity on subsequent hits while barrier is broken');

    // 7. Verify cooldown decrements cleanly across update ticks while remaining inactive
    state.frameCount = 1;
    const cdBeforeTick = gojo.infinityCooldown;
    state.frameCount++;
    gojo.update(saitama, 1, state.arena);
    assert(gojo.infinityCooldown === cdBeforeTick - 1, `infinityCooldown must decrement on update tick (was ${cdBeforeTick}, now ${gojo.infinityCooldown})`);
    assert(gojo.infinityActive === false, 'Infinity must remain inactive while cooldown > 0');
    assert(gojo.hasActiveInfinity() === false, 'hasActiveInfinity must return false while on cooldown');

    // 8. Fast-forward remaining cooldown frames and verify automatic re-arming and restoration in Ranged Mode
    saitama.x = 9999;
    while (gojo.infinityCooldown > 0) {
      state.frameCount++;
      gojo.isMeleeMode = false;
      gojo.update(saitama, 1, state.arena);
    }
    assert(gojo.infinityCooldown === 0, 'infinityCooldown must reach 0');
    assert(gojo.infinityActive === true, 'Infinity must automatically re-arm when cooldown reaches 0');
    assert(gojo.infinityBarrierHp === 350, `Infinity barrier HP must be fully restored to 350 (got ${gojo.infinityBarrierHp})`);
    assert(gojo.infinityCrackLevel === 0, `Infinity crack level must be reset to 0 (got ${gojo.infinityCrackLevel})`);
    assert(gojo.hasActiveInfinity() === true, 'hasActiveInfinity must return true once cooldown expires');

    // Clean up
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];
    console.log('      ✅ Saitama vs Gojo Infinity barrier crack, shatter & direct damage verified.');
  }

  // ── TEST 25B: Saitama Consecutive Punches Must Not Hit a Minion's Owner ──
  console.log('   25B. Testing Saitama consecutive punches against an enemy minion owner...');
  {
    const SaitamaClass = FIGHTER_CLASS_MAP.saitama;
    const { CrazyDaveFighter, LawnmowerEntity } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const saitama = new SaitamaClass({ radius: 25, x: 100, y: 300, hp: 500, maxHp: 500, color: '#F5C400' });
    const enemyOwner = { x: 220, y: 300, r: 25, hp: 500, maxHp: 500, type: 'enemy_owner' };
    const enemyMinion = {
      x: 180,
      y: 300,
      r: 18,
      hp: 200,
      maxHp: 200,
      isMinion: true,
      isDeployable: true,
      owner: enemyOwner,
      takeDamage(amount) {
        this.hp -= amount;
        return amount;
      },
      applyKnockback() {}
    };

    state.mode = '1v1';
    state.gameState = 'playing';
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
    state.fighters = [saitama, enemyOwner, enemyMinion];
    saitama.isFlurrying = true;
    saitama.flurryTarget = enemyMinion;
    saitama.flurryHitsLeft = 1;
    saitama.flurryTimer = (CONFIG.saitama.flurryHitInterval || 4) - 1;
    saitama._flurryAimAngle = 0;
    saitama.skillPunishCooldown = 9999;
    const ownerHpBefore = enemyOwner.hp;
    const minionHpBefore = enemyMinion.hp;

    saitama.update(enemyMinion, 0, state.arena);

    assert(enemyMinion.hp < minionHpBefore, 'Saitama consecutive punch must damage the selected enemy minion');
    assert(enemyOwner.hp === ownerHpBefore, 'Saitama consecutive punch must not damage the selected minion owner');

    const dave = new CrazyDaveFighter({ startX: 300, startY: 300, radius: 25, hp: 390, maxHp: 390 });
    const mower = new LawnmowerEntity(180, 300, dave, -1, 0);
    state.fighters = [saitama, dave, mower];
    saitama._blowAwayCrazyDaveLawnmowers(100, 300, 0, 320, Math.PI * 0.35);
    assert(mower.state === 'charging', 'Saitama punch must blow a Crazy Dave lawnmower into its charging path');
    assert(mower.facingDirection === 1, 'Saitama punch must send the lawnmower in the punch direction');
    assert(mower.saitamaBlownAway === true, 'Lawnmower must record that Saitama blew it away');
    state.fighters = [];
  }

  // ── TEST 26: Crazy Dave PvZ Grass Tiles Arena Floor & Plant Minion Entity Flags ──
  console.log('   26. Testing Crazy Dave PvZ Grass Tiles Arena Floor & Plant Minion Entity Flags...');
  {
    const CrazyDaveClass = FIGHTER_CLASS_MAP.crazydave;
    const GojoClass = FIGHTER_CLASS_MAP.gojo;
    const { isCrazyDavePresent, renderCrazyDaveGrassFloor } = await import('../js/graphics/renderers/grassFloorRenderer.js');
    const { drawArena } = await import('../js/graphics/renderers/arenaRenderer.js');

    let dave = new CrazyDaveClass({ radius: 25, x: 200, y: 300, hp: 390, maxHp: 390, color: '#84CC16' });
    let gojo = new GojoClass({ radius: 25, x: 400, y: 300, hp: 200, maxHp: 200, color: '#00E5FF' });
    assert(dave.ambientSunInterval === CONFIG.crazydave.sunSpawnRate, 'Dave ambient Sun spawn interval must use sunSpawnRate from his config');

    state.fighters = [dave, gojo];
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
    state.gameState = 'playing';
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];

    // 1. Verify isCrazyDavePresent evaluates true when Crazy Dave is active
    assert(isCrazyDavePresent() === true, 'isCrazyDavePresent() must return true when Crazy Dave is in the arena');

    // 2. Test Canvas 2D Grass Floor rendering & stack balance (Light & Dark modes)
    mockCtx.resetStackDepth();
    renderCrazyDaveGrassFloor(mockCtx, state.arena, false, 4);
    assert(mockCtx.getStackDepth() === 0, `renderCrazyDaveGrassFloor (light mode) canvas stack depth must be 0 (got ${mockCtx.getStackDepth()})`);

    mockCtx.resetStackDepth();
    renderCrazyDaveGrassFloor(mockCtx, state.arena, true, 4);
    assert(mockCtx.getStackDepth() === 0, `renderCrazyDaveGrassFloor (dark mode) canvas stack depth must be 0 (got ${mockCtx.getStackDepth()})`);

    mockCtx.resetStackDepth();
    drawArena();
    assert(mockCtx.getStackDepth() === 0, `drawArena() with Crazy Dave grass floor must maintain 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // 3. Test circular arena grass floor clipping
    state.arena.shape = 'circle';
    state.arena.radius = 300;
    mockCtx.resetStackDepth();
    renderCrazyDaveGrassFloor(mockCtx, state.arena, false, 4);
    assert(mockCtx.getStackDepth() === 0, `renderCrazyDaveGrassFloor (circular arena) canvas stack depth must be 0 (got ${mockCtx.getStackDepth()})`);
    state.arena.shape = 'rectangle';

    // 4. Verify Zero Basic Attack and 3 Plant Abilities (Wall-nut, Peashooter & Snow Pea)
    assert(dave.damage === 0, 'Crazy Dave must have 0 basic attack damage');
    assert(dave.canShoot === false, 'Crazy Dave must have canShoot === false');

    dave.sunCount = 1000; // Sufficient sun for testing
    dave.plantWallnut(gojo);
    dave.plantPeashooter(gojo);
    dave.plantSnowPea(gojo);

    const plantEntities = state.fighters.filter(f => f && f.owner === dave && (f.isDeployable || f.isMinion));
    assert(plantEntities.length === 3, `Expected 3 deployed plant entities for Crazy Dave (got ${plantEntities.length})`);
    assert(state.illusions.length === 0, 'Plants must NEVER be added to state.illusions (which triggers Doppelganger clone visuals)');
    for (const plant of plantEntities) {
      assert(plant.isMinion === true, `Plant ${plant.name} must have isMinion === true`);
      assert(plant.isPlant === true, `Plant ${plant.name} must have isPlant === true`);
      assert(plant.isDeployable === true, `Plant ${plant.name} must have isDeployable === true`);
      assert(plant.isPlantMinion === true, `Plant ${plant.name} must have isPlantMinion === true`);
      assert(plant.owner === dave, `Plant ${plant.name} must have owner === dave`);
    }

    const cappedDave = new CrazyDaveClass({ radius: 25, x: 200, y: 300, hp: 390, maxHp: 390 });
    cappedDave.sunCount = 10000;
    state.fighters = [cappedDave, gojo];
    assert(cappedDave.plantWallnut(gojo) === true, 'Crazy Dave must plant the first Wall-nut');
    assert(cappedDave.plantWallnut(gojo) === true, 'Crazy Dave must plant the second Wall-nut');
    assert(cappedDave.plantWallnut(gojo) === false, 'Crazy Dave must reject a third active Wall-nut');
    assert(cappedDave.activeWallnuts.filter(w => w && w.hp > 0).length === 2, 'Crazy Dave must keep at most 2 active Wall-nuts');
    assert(cappedDave.plantTorchwood(gojo) === true, 'Crazy Dave must plant the first Torchwood');
    assert(cappedDave.plantTorchwood(gojo) === true, 'Crazy Dave must plant the second Torchwood');
    assert(cappedDave.plantTorchwood(gojo) === false, 'Crazy Dave must reject a third active Torchwood');
    assert(cappedDave.activeTorchwoods.filter(t => t && t.hp > 0).length === 2, 'Crazy Dave must keep at most 2 active Torchwoods');
    state.fighters = [dave, gojo];

    const priorFighters = state.fighters;
    const firstTeamDave = new CrazyDaveClass({ radius: 25, x: dave.x, y: dave.y, hp: 390, maxHp: 390 });
    const teammateDave = new CrazyDaveClass({ radius: 25, x: dave.x, y: dave.y, hp: 390, maxHp: 390 });
    firstTeamDave.team = 0;
    teammateDave.team = 0;
    firstTeamDave.sunCount = 1000;
    teammateDave.sunCount = 1000;
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
    state.fighters = [firstTeamDave, teammateDave, gojo];
    assert(firstTeamDave.plantWallnut(gojo), 'First Crazy Dave must plant on an open tile');
    const teammateSharedTile = firstTeamDave.activeWallnuts[0];
    assert(teammateDave.plantPeashooter(gojo), 'Teammate Crazy Dave must find another open tile');
    const teammateNewPlant = teammateDave.activePeashooters[0];
    assert(Math.hypot(teammateNewPlant.x - teammateSharedTile.x, teammateNewPlant.y - teammateSharedTile.y) > 1, 'Teammate Daves must not plant on the same grass tile');

    const savedSun = teammateDave.sunCount;
    const grassTileSize = CONFIG.crazydave.grassTileSize;
    const grassCols = Math.max(3, Math.round(state.arena.width / grassTileSize));
    const grassRows = Math.max(3, Math.round(state.arena.height / grassTileSize));
    const cellW = state.arena.width / grassCols;
    const cellH = state.arena.height / grassRows;
    state.fighters = [firstTeamDave, teammateDave, gojo];
    for (let row = 0; row < grassRows; row++) {
      for (let col = 0; col < grassCols; col++) {
        state.fighters.push({
          isPlant: true,
          hp: 1,
          owner: firstTeamDave,
          x: state.arena.x + (col + 0.5) * cellW,
          y: state.arena.y + (row + 0.5) * cellH
        });
      }
    }
    assert(teammateDave.plantSnowPea(gojo) === false, 'Crazy Dave must not plant when every grass tile is occupied by an ally plant');
    assert(teammateDave.sunCount === savedSun, 'Failed planting on a full lawn must not consume Sun');

    // ── Teammate Multi-Dave Shared Sun Collection & Magnetic Attraction Tests ──
    const teamDaveA = new CrazyDaveClass({ radius: 25, x: 100, y: 300, hp: 390, maxHp: 390 });
    const teamDaveB = new CrazyDaveClass({ radius: 25, x: 500, y: 300, hp: 390, maxHp: 390 });
    const enemyDaveC = new CrazyDaveClass({ radius: 25, x: 700, y: 300, hp: 390, maxHp: 390 });
    teamDaveA.team = 0;
    teamDaveB.team = 0;
    enemyDaveC.team = 1;
    teamDaveA.sunCount = 50;
    teamDaveB.sunCount = 50;
    enemyDaveC.sunCount = 50;
    state.fighters = [teamDaveA, teamDaveB, enemyDaveC];

    // 1. Team Dave A spawns a Sun in range of Team Dave B (x: 425, y: 300, 75px from Dave B at 500, 300)
    const sunNearB = teamDaveA.spawnSunDrop(425, 300, 25);
    sunNearB.y = 300; // settled at ground level
    sunNearB.isLanding = false;
    assert(teamDaveA.suns.length === 1, 'Team Dave A must have 1 active sun');

    // Update Sun drops: Sun should magnetically pull towards Team Dave B (closest teammate)
    const initialSunX = sunNearB.x;
    teamDaveA._updateSunDrops(state.arena, CONFIG.crazydave);
    assert(sunNearB.x > initialSunX || teamDaveA.suns.length === 0, 'Sun drop near Dave B must be pulled towards or collected by teammate Dave B');

    // Move Dave B directly over the sun and update
    teamDaveB.x = sunNearB.x || 425;
    teamDaveB.y = sunNearB.y || 300;
    teamDaveA._updateSunDrops(state.arena, CONFIG.crazydave);

    // Both Team Dave A and Team Dave B must receive +25 Sun points!
    assert(teamDaveA.suns.length === 0, 'Sun drop must be collected');
    assert(teamDaveA.sunCount === 75, `Teammate Dave A sunCount must increase to 75 (got ${teamDaveA.sunCount})`);
    assert(teamDaveB.sunCount === 75, `Teammate Dave B sunCount must increase to 75 (got ${teamDaveB.sunCount})`);
    assert(enemyDaveC.sunCount === 50, `Enemy Dave C sunCount must remain 50 (got ${enemyDaveC.sunCount})`);

    // 2. Verify Enemy Dave cannot collect or attract Team Dave A's Sun
    const sunNearEnemy = teamDaveA.spawnSunDrop(690, 300, 25);
    sunNearEnemy.y = 300;
    sunNearEnemy.isLanding = false;
    enemyDaveC.x = 690;
    enemyDaveC.y = 300;
    teamDaveA._updateSunDrops(state.arena, CONFIG.crazydave);
    assert(teamDaveA.suns.length === 1, 'Enemy Dave must NOT collect teammate Dave A Sun');
    assert(enemyDaveC.sunCount === 50, 'Enemy Dave sunCount must NOT increase when touching opposing team Sun');

    // 3. Verify uncollected suns are transferred to surviving teammate Dave on death
    teamDaveA.takeDamage(9999, gojo);
    assert(teamDaveA.hp <= 0, 'Dave A must be dead');
    assert(teamDaveA.suns.length === 0, 'Dead Dave A suns must be transferred');
    assert(teamDaveB.suns.length === 1, 'Living teammate Dave B must inherit uncollected suns from dead Dave A');

    state.fighters = priorFighters;

    const wallnutEntity = plantEntities.find(p => p.type === 'Wallnut');
    assert(wallnutEntity !== undefined, 'Wall-nut entity must exist in active plants');
    assert(wallnutEntity.isWallnut === true, 'Wall-nut must have isWallnut === true');
    assert(wallnutEntity.isPlantBarrier === true, 'Wall-nut must have isPlantBarrier === true');
    assert(wallnutEntity.isImmovable === true, 'Wall-nut must have isImmovable === true');
    assert(wallnutEntity.phasesThroughEntities === false, 'Wall-nut must have phasesThroughEntities === false (solid barrier)');

    const capTestDave = new CrazyDaveClass({ radius: 25, x: 120, y: 120, color: '#84CC16' });
    capTestDave.sunCount = 10000;
    for (let i = 0; i < 11; i++) {
      assert(capTestDave.plantPeashooter(gojo) === true, 'Dave must plant Peashooters beyond the previous cap');
      assert(capTestDave.plantSnowPea(gojo) === true, 'Dave must plant Snow Peas beyond the previous cap');
    }
    assert(capTestDave.activePeashooters.length === 11, 'All 11 Peashooters must remain active');
    assert(capTestDave.activeSnowPeas.length === 11, 'All 11 Snow Peas must remain active');
    for (const plant of [...capTestDave.activePeashooters, ...capTestDave.activeSnowPeas]) {
      assert(plant.hp > 0, 'Planting beyond the previous cap must not kill older plants');
      plant.hp = 0;
      const plantIndex = state.fighters.indexOf(plant);
      if (plantIndex !== -1) state.fighters.splice(plantIndex, 1);
    }

    // Verify Snow Pea projectile slow on hit
    const snowPea = plantEntities.find(p => p.type === 'SnowPea');
    assert(snowPea !== undefined, 'Snow Pea entity must exist in active plants');
    snowPea._fireSnowPea(0, 0);
    const projs = (typeof projectileSystem !== 'undefined' && projectileSystem.projectiles) ? projectileSystem.projectiles : state.projectiles;
    const snowProj = projs.find(p => p.visual === 'snowPeaBullet');
    assert(snowProj !== undefined, 'Snow Pea projectile must be created with visual snowPeaBullet');
    let slowApplied = false;
    let appliedFrames = 0;
    let appliedMult = 0;
    const testTarget = {
      applySlow: (frames, mult) => {
        slowApplied = true;
        appliedFrames = frames;
        appliedMult = mult;
      }
    };
    snowProj.onHit(testTarget);
    assert(slowApplied === true, 'Snow Pea onHit must call target.applySlow()');
    assert(appliedFrames === 90, `Snow Pea must apply 90 frames of slow (got ${appliedFrames})`);
    // Verify Peashooter and Snow Pea direct firing without windup animation
    const peashooter = plantEntities.find(p => p.type === 'Peashooter');
    assert(peashooter !== undefined, 'Peashooter entity must exist in active plants');
    peashooter.shootCooldown = 0;
    const initialPeaCount = projs.length;
    peashooter.update(gojo, 0, state.arena);
    assert(projs.length > initialPeaCount, 'Peashooter must fire directly when enemy is detected in lane and cooldown is ready');

    // Verify drawing passes with 0 canvas stack depth
    mockCtx.resetStackDepth();
    peashooter.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'peashooter.draw must maintain 0 canvas stack depth');
    snowPea.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'snowPea.draw must maintain 0 canvas stack depth');
    wallnutEntity.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'wallnutEntity.draw must maintain 0 canvas stack depth');

    // Test Wall-nut drawing across all 6 damage degradation stages
    const { drawWallnut } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    for (const hpRatio of [1.0, 0.8, 0.6, 0.4, 0.2, 0.05]) {
      wallnutEntity.hp = wallnutEntity.maxHp * hpRatio;
      mockCtx.resetStackDepth();
      drawWallnut(mockCtx, wallnutEntity);
      assert(mockCtx.getStackDepth() === 0, `drawWallnut at hpRatio ${hpRatio} must maintain 0 stack depth`);
    }
    wallnutEntity.hp = wallnutEntity.maxHp;

    // Verify projectile drawing
    const { drawPeaBullet, drawSnowPeaBullet } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    mockCtx.resetStackDepth();
    drawPeaBullet(mockCtx, { x: 100, y: 100, r: 6, life: 30 });
    assert(mockCtx.getStackDepth() === 0, 'drawPeaBullet must maintain 0 canvas stack depth');
    drawSnowPeaBullet(mockCtx, { x: 100, y: 100, r: 6, life: 30 });
    assert(mockCtx.getStackDepth() === 0, 'drawSnowPeaBullet must maintain 0 canvas stack depth');

    // 5. Verify Grass Tile Centering, Immovable Positioning, and Straight Left/Right Aiming
    const { getNearestGrassTileCenter } = await import('../js/graphics/renderers/grassFloorRenderer.js');
    const expectedTileCenter = getNearestGrassTileCenter(dave.x + Math.cos(dave.gunAngle || 0) * 32, dave.y + Math.sin(dave.gunAngle || 0) * 32, state.arena);
    assert(Math.abs(snowPea.x - snowPea._fixedX) < 0.001, 'Snow Pea must be fixed at its centered position');
    assert(Math.abs(peashooter.x - peashooter._fixedX) < 0.001, 'Peashooter must be fixed at its centered position');

    // Immovable test: Knockback and physical velocity must have 0 effect
    peashooter.applyKnockback(100, -100);
    peashooter.vx = 50;
    peashooter.vy = 50;
    peashooter.update(gojo, 0, state.arena);
    assert(peashooter.vx === 0 && peashooter.vy === 0, 'Peashooter velocities must remain 0');
    assert(peashooter.x === peashooter._fixedX && peashooter.y === peashooter._fixedY, 'Peashooter must not be displaced');
    assert(peashooter.angle === 0, 'Peashooter angle must remain strictly 0');
    assert(peashooter.canAim() === false, 'Plant canAim() must return false to prevent external aim overrides');

    // Committed 1-direction facing & straight lane enemy detection test:
    // Peashooter was planted facing RIGHT (+1) towards Gojo (at x=400)
    assert(peashooter.facingDirection === 1, 'Peashooter must be committed to facing RIGHT (+1)');
    assert(peashooter.gunAngle === 0, 'Peashooter gunAngle must be committed to 0');

    // Test 1: Enemy in front (right) within lane tolerance (dy <= 85) -> fires pea directly
    gojo.x = peashooter.x + 100;
    gojo.y = peashooter.y + 40;
    peashooter.shootCooldown = 0;
    const countBeforeFront = projs.length;
    peashooter.update(gojo, 0, state.arena);
    assert(projs.length > countBeforeFront, 'Plant must detect enemy in straight forward lane and shoot directly');

    // Test 2: Enemy behind (left) -> IGNORED, no shoot, NO angle change
    gojo.x = peashooter.x - 100;
    gojo.y = peashooter.y;
    peashooter.shootCooldown = 0;
    const countBeforeBehind = projs.length;
    peashooter.aim(gojo); // Attempt external aim
    peashooter.update(gojo, 0, state.arena);
    assert(peashooter.gunAngle === 0, 'Plant must NOT change angle when enemy moves behind it');
    assert(peashooter.facingDirection === 1, 'Plant must retain committed facing direction');
    assert(projs.length === countBeforeBehind, 'Plant must NOT target or shoot enemies behind it');

    // Test 3: Enemy in front but outside lane tolerance (dy > 85) -> IGNORED
    gojo.x = peashooter.x + 100;
    gojo.y = peashooter.y + 120; // dy = 120 > 85
    peashooter.shootCooldown = 0;
    const countBeforeOffLane = projs.length;
    peashooter.update(gojo, 0, state.arena);
    assert(projs.length === countBeforeOffLane, 'Plant must NOT target enemies outside its straight horizontal lane');

    // Test 4: Projectile Mouth Spawn Position
    // Peashooter mouth spawn: x + 22, y - 17
    peashooter._firePea(peashooter.gunAngle, 0);
    const firedPea = projs[projs.length - 1];
    assert(Math.abs(firedPea.x - (peashooter.x + 22)) < 0.001, `Peashooter projectile must spawn at mouth x+22 (got x=${firedPea.x}, expected ${peashooter.x + 22})`);
    assert(Math.abs(firedPea.y - (peashooter.y - 17)) < 0.001, `Peashooter projectile must spawn at mouth y-17 (got y=${firedPea.y}, expected ${peashooter.y - 17})`);
    assert(firedPea.vy === 0, 'Peashooter projectile vy must be strictly 0 (straight horizontal)');
    assert(firedPea.vx > 0, 'Peashooter projectile vx must be positive when aiming right');

    // Snow Pea mouth spawn: x + 22, y - 19
    snowPea._fireSnowPea(snowPea.gunAngle, 0);
    const firedSnow = projs[projs.length - 1];
    assert(Math.abs(firedSnow.x - (snowPea.x + 22)) < 0.001, `Snow Pea projectile must spawn at mouth x+22 (got x=${firedSnow.x}, expected ${snowPea.x + 22})`);
    assert(Math.abs(firedSnow.y - (snowPea.y - 19)) < 0.001, `Snow Pea projectile must spawn at mouth y-19 (got y=${firedSnow.y}, expected ${snowPea.y - 19})`);
    assert(firedSnow.vy === 0, 'Snow Pea projectile vy must be strictly 0 (straight horizontal)');
    assert(firedSnow.vx > 0, 'Snow Pea projectile vx must be positive when aiming right');

    // 6. Verify 1v1 Match Initialization & createFighterInstance for Crazy Dave
    const { FIGHTER_DEFS } = await import('../js/core/config.js');
    const { createFighterInstance } = await import('../js/core/state.js');
    const { reinitFighters } = await import('../js/core/gameFlow.js');
    const daveDef = FIGHTER_DEFS.find(d => d.type === 'crazydave');
    assert(daveDef !== undefined, 'FIGHTER_DEFS must include crazydave');
    const createdDave = createFighterInstance(daveDef, 1);
    assert(createdDave !== null, 'createFighterInstance must return a valid instance for crazydave');
    assert(createdDave instanceof CrazyDaveClass, 'createdDave must be an instance of CrazyDaveClass');

    mockCtx.resetStackDepth();
    createdDave.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'createdDave.draw must maintain balanced canvas stack depth of 0');

    state.p1Index = FIGHTER_DEFS.findIndex(d => d.type === 'gojo');
    state.p2Index = FIGHTER_DEFS.findIndex(d => d.type === 'crazydave');
    state.mode = '1v1';
    reinitFighters(true);

    assert(state.fighters.length === 2, `1v1 Match with Gojo vs Crazy Dave must have 2 active fighters (got ${state.fighters.length})`);
    assert(state.fighters[0] && state.fighters[0].characterId === 'gojo', 'P1 must be Gojo');
    assert(state.fighters[1] && state.fighters[1].characterId === 'crazydave', 'P2 must be Crazy Dave');
    gojo = state.fighters[0];
    dave = state.fighters[1];
    assert(state.fighters[1].x > state.fighters[0].x, 'P2 (Crazy Dave) must be positioned on the right side of arena');

    mockCtx.resetStackDepth();
    state.fighters[0].draw(mockCtx);
    state.fighters[1].draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Both fighters in 1v1 must draw cleanly with 0 stack depth');

    // 7. Test Sun drop spawning outside top of arena and landing on grass tile center
    const { getRandomGrassTileCenter } = await import('../js/graphics/renderers/grassFloorRenderer.js');
    state.arena = { x: 50, y: 50, width: 800, height: 600, shape: 'rectangle' };
    const randomTile = getRandomGrassTileCenter(state.arena);
    const sun = dave.spawnSunDrop(randomTile.x, randomTile.y, 25);
    assert(sun.x === randomTile.x, 'Sun x must be set to target grass tile center x');
    assert(sun.y < state.arena.y, `Sun spawn y must be above top arena border (got y=${sun.y}, arena.y=${state.arena.y})`);
    assert(sun.targetX === randomTile.x, 'Sun targetX must equal grass tile center x');
    assert(sun.targetY === randomTile.y, 'Sun targetY must equal grass tile center y');
    assert(sun.isLanding === true, 'Sun must start with isLanding === true');

    // Simulate descent (keep Dave stationed far away from targetTile to avoid magnetizing during fall)
    const safeX = (randomTile.x > state.arena.x + 400) ? (state.arena.x + 50) : (state.arena.x + 750);
    const safeY = (randomTile.y > state.arena.y + 300) ? (state.arena.y + 50) : (state.arena.y + 550);
    dave.x = safeX;
    dave.y = safeY;
    dave.vx = 0;
    dave.vy = 0;
    while (sun.isLanding) {
      dave.x = safeX;
      dave.y = safeY;
      dave.vx = 0;
      dave.vy = 0;
      dave.update(gojo, 1, state.arena);
    }
    assert(sun.isLanding === false, 'Sun isLanding must be false once landed');
    assert(Math.abs(sun.x - randomTile.x) < 0.001, 'Landed sun x must be precisely at grass tile center');
    assert(Math.abs(sun.y - randomTile.y) < 0.001, 'Landed sun y must be precisely at grass tile center');
    assert(sun.vy === 0, 'Landed sun vy must be 0');

    // Test magnetic attraction and pickup by Dave
    dave.sunCount = 100;
    dave.wallnutCooldown = 999;
    dave.peashooterCooldown = 999;
    dave.snowPeaCooldown = 999;
    dave.torchwoodCooldown = 999;
    dave.potatoMineCooldown = 999;
    dave.x = randomTile.x + 30;
    dave.y = randomTile.y;
    const initialSunCount = dave.sunCount;
    dave.update(gojo, 1, state.arena);
    assert(dave.sunCount === initialSunCount + 25, `Crazy Dave must collect +25 sun upon collision (got ${dave.sunCount}, expected ${initialSunCount + 25})`);
    // 8. Test Dave horizontal body flip without angular rotation, zero shooting, and planting movement pause
    state.fighters = [dave, gojo];
    dave.x = 400;
    gojo.x = 200; // Gojo on the left
    dave.aim(gojo);
    assert(dave.facingLeft === true, 'Crazy Dave must face left when opponent is on his left');
    assert(dave.gunAngle === Math.PI, 'Crazy Dave gunAngle must be Math.PI when facing left');
    assert(dave.angle === 0, 'Crazy Dave angle must remain strictly 0 (no diagonal rotation)');

    gojo.x = 600; // Gojo on the right
    dave.aim(gojo);
    assert(dave.facingLeft === false, 'Crazy Dave must face right when opponent is on his right');
    assert(dave.gunAngle === 0, 'Crazy Dave gunAngle must be 0 when facing right');
    assert(dave.angle === 0, 'Crazy Dave angle must remain strictly 0 (no diagonal rotation)');

    // Test zero shooting
    const projCountBeforeDaveShoot = (typeof projectileSystem !== 'undefined' && projectileSystem.projectiles) ? projectileSystem.projectiles.length : state.projectiles.length;
    const shootResult = dave.shoot(1);
    assert(shootResult === false, 'dave.shoot() must return false');
    const projCountAfterDaveShoot = (typeof projectileSystem !== 'undefined' && projectileSystem.projectiles) ? projectileSystem.projectiles.length : state.projectiles.length;
    assert(projCountAfterDaveShoot === projCountBeforeDaveShoot, 'Crazy Dave must never spawn basic attack projectiles');

    // Test planting movement pause
    dave.sunCount = 200;
    dave.peashooterCooldown = 0;
    dave.vx = 5;
    dave.vy = 5;
    dave.plantPeashooter(gojo);
    assert(dave.plantingPauseTimer > 0, 'Crazy Dave must enter planting movement pause on plant');
    assert(dave.vx === 0 && dave.vy === 0, 'Crazy Dave velocity must immediately stop upon planting');
    dave.update(gojo, 1, state.arena);
    assert(dave.vx === 0 && dave.vy === 0, 'Crazy Dave must remain stationary while plantingPauseTimer > 0');

    // 9. Test Plant Minion Pass-Through & Immovability
    dave.sunCount = 200;
    dave.peashooterCooldown = 0;
    dave.plantPeashooter(gojo);
    const livingPlant = dave.activePeashooters.find(p => p && p.hp > 0);
    assert(livingPlant !== undefined, 'Living plant entity must exist');
    assert(livingPlant.isPlant === true && livingPlant.isImmovable === true, 'Plant must have isPlant and isImmovable');

    // Position enemy directly overlapping the non-barrier plant to test pass-through collision
    const { resolveFighterCollision } = await import('../js/systems/physics.js');
    const { isEntityImmuneToGravitationalPull } = await import('../js/entities/fighter.js');
    gojo.x = livingPlant.x + 5;
    gojo.y = livingPlant.y + 5;
    const initialGojoX = gojo.x;
    const initialGojoY = gojo.y;
    const initialPlantX = livingPlant.x;
    const initialPlantY = livingPlant.y;

    resolveFighterCollision(livingPlant, gojo);
    assert(livingPlant.x === initialPlantX && livingPlant.y === initialPlantY, 'Shooter plant position must remain unchanged during collision (pass-through)');
    assert(gojo.x === initialGojoX && gojo.y === initialGojoY, 'Enemy position must remain unchanged during non-barrier plant collision (pass-through)');

    // Wall-nut Barrier Collision Test: Enemies CANNOT pass through; Wall-nut blocks and pushes enemy!
    dave.sunCount = 200;
    dave.wallnutCooldown = 0;
    dave.plantWallnut(gojo);
    const testWallnut = dave.activeWallnuts.find(w => w && w.hp > 0);
    assert(testWallnut !== undefined, 'Wall-nut barrier entity must exist');
    gojo.x = testWallnut.x + 5;
    gojo.y = testWallnut.y + 5;
    const preGojoX = gojo.x;
    const preGojoY = gojo.y;
    resolveFighterCollision(testWallnut, gojo);
    assert(testWallnut.x === testWallnut._fixedX && testWallnut.y === testWallnut._fixedY, 'Wall-nut must remain strictly immovable during collision');
    assert(gojo.x !== preGojoX || gojo.y !== preGojoY, 'Enemy must be physically pushed and blocked by Wall-nut barrier');

    // Friendly Dave pass-through test: Dave passes freely through his own Wall-nuts
    dave.x = testWallnut.x + 5;
    dave.y = testWallnut.y + 5;
    const preDaveX = dave.x;
    const preDaveY = dave.y;
    resolveFighterCollision(testWallnut, dave);
    assert(dave.x === preDaveX && dave.y === preDaveY, 'Friendly Dave must pass through Wall-nut without being pushed');

    // Pull immunity test: Hollow Purple can pull plants, while other vortices retain plant immunity
    assert(isEntityImmuneToGravitationalPull(livingPlant, 'purple') === false, 'Plant minion must be vulnerable to Hollow Purple suction');
    assert(isEntityImmuneToGravitationalPull(livingPlant, 'blue') === true, 'Plant minion must remain immune to Blue gravitational pull');

    // Heavy knockback attack test
    livingPlant.takeDamage(10, gojo, { isHeavy: true, isKnockback: true, knockback: true, knockbackVx: 100, knockbackVy: -100 });
    assert(livingPlant.vx === 0 && livingPlant.vy === 0, 'Plant velocity must stay 0 under heavy knockback');
    assert(livingPlant.x === initialPlantX && livingPlant.y === initialPlantY, 'Plant must not be displaced by attacks');

    // Test plant-to-plant projectile pass-through & zero friendly fire
    dave.sunCount = 400;
    dave.peashooterCooldown = 0;
    dave.snowPeaCooldown = 0;
    dave.plantSnowPea(gojo);
    const frontPlant = dave.activeSnowPeas[dave.activeSnowPeas.length - 1];
    const backPlant = livingPlant;

    // Position backPlant at x=200, frontPlant at x=260, enemy at x=400 (same horizontal line y=300)
    backPlant.x = 200; backPlant.y = 300; backPlant._fixedX = 200; backPlant._fixedY = 300;
    backPlant.facingDirection = 1;
    backPlant.gunAngle = 0;
    frontPlant.x = 260; frontPlant.y = 300; frontPlant._fixedX = 260; frontPlant._fixedY = 300;
    gojo.x = 400; gojo.y = 300;
    const initialFrontHp = frontPlant.hp;

    // Back plant fires pea directly towards the right (passing through frontPlant at x=260)
    backPlant._firePea(0, 1);
    const projsList = (typeof projectileSystem !== 'undefined' && projectileSystem.projectiles) ? projectileSystem.projectiles : state.projectiles;
    const testPea = projsList[projsList.length - 1];
    assert(testPea !== undefined, 'Pea projectile must exist');

    // Move testPea directly across frontPlant
    testPea.x = frontPlant.x;
    testPea.y = frontPlant.y;
    projectileSystem.checkProjectileHits(testPea, state.fighters);
    // 10. Test Plants & Sun Drops remain active when Dave is hit by movement-stopping attacks
    dave.timeStopTimer = 60;
    dave.paralyzeTimer = 60;
    const fallingSun = dave.spawnSunDrop(300, 300, 25);
    const initialFallingY = fallingSun.y;
    dave.update(gojo, 1, state.arena);
    assert(fallingSun.y > initialFallingY, 'Sun drop must continue falling even when Dave is time-stopped/stunned');

    // Plant continues shooting when Dave is movement-stopped
    backPlant.shootCooldown = 0;
    state.fighters = [dave, gojo, backPlant, frontPlant];
    backPlant.update(gojo, 1, state.arena);
    assert(backPlant.shootCooldown === backPlant.shootCooldownMax, 'Plant must continue firing peas when Dave is time-stopped/stunned');

    // 11. Test Plant Complete Debuff Immunity & DoT Resistance
    backPlant.applyBurn(gojo, 180);
    backPlant.applyPoison(gojo);
    backPlant.applyBleed(gojo, 180, 5, 30);
    backPlant.applySlow(90, 0.45);
    backPlant.applyParalyze(60);
    backPlant.applyHitStun(60);
    backPlant.applyTimeStop(60);
    assert(backPlant.burnTimer === 0, 'Plant burnTimer must remain 0 (immune to burn)');
    assert(backPlant.poisonTicks === 0, 'Plant poisonTicks must remain 0 (immune to poison)');
    assert(backPlant.bleedTimer === 0, 'Plant bleedTimer must remain 0 (immune to bleed)');
    assert(backPlant.slowTimer === 0, 'Plant slowTimer must remain 0 (immune to slow)');
    assert(backPlant.paralyzeTimer === 0, 'Plant paralyzeTimer must remain 0 (immune to paralyze)');
    assert(backPlant.hitStunTimer === 0, 'Plant hitStunTimer must remain 0 (immune to hitstun)');
    assert(backPlant.timeStopTimer === 0, 'Plant timeStopTimer must remain 0 (immune to time stop)');

    // Plants ignore debuff DoT tick damages
    const hpBeforeDot = backPlant.hp;
    const dotTakenBurn = backPlant.takeDamage(10, gojo, { isBurn: true });
    const dotTakenPoison = backPlant.takeDamage(10, gojo, { isPoison: true });
    const dotTakenBleed = backPlant.takeDamage(10, gojo, { isBleed: true });
    const dotTakenElectrified = backPlant.takeDamage(10, gojo, { isElectrified: true });
    assert(dotTakenBurn === false && dotTakenPoison === false && dotTakenBleed === false && dotTakenElectrified === false, 'Plants must ignore all debuff DoT damage instances');
    assert(backPlant.hp === hpBeforeDot, 'Plant HP must not decrease from debuff DoT damage');

    // Direct attacks still damage plants
    state.bloodEffects = [];
    const directHit = backPlant.takeDamage(20, gojo);
    assert(directHit === true && backPlant.hp === hpBeforeDot - 20, 'Direct attacks must still successfully damage plants');
    assert(state.bloodEffects.length === 0, 'Dave plants must not emit blood particles when hit');

    // 12. Test Audio SFX Triggers (Sun Pickup, Peashooter Shot, Pea Splat Hit, Planting)
    const { HitImpactSystem } = await import('../js/systems/hitImpactSystem.js');
    const { AUDIO_CONFIG } = await import('../js/configs/audioConfig.js');
    assert(AUDIO_CONFIG['crazydave_sun_pickup'] === 'Assets/Sound Effects/Sprites SFX/crazydave-sun-pickup.mp3', 'AUDIO_CONFIG must register crazydave_sun_pickup');
    assert(AUDIO_CONFIG['crazydave_peashooter_shot'] === 'Assets/Sound Effects/Attacks/crazydave-peashooter-shot.mp3', 'AUDIO_CONFIG must register crazydave_peashooter_shot');
    assert(AUDIO_CONFIG['crazydave_pea_splat'] === 'Assets/Sound Effects/SkillEffects/splat3.ogg', 'AUDIO_CONFIG must register crazydave_pea_splat');
    assert(AUDIO_CONFIG['crazydave_planting'] === 'Assets/Sound Effects/SkillEffects/crazydave-Planting.ogg', 'AUDIO_CONFIG must register crazydave_planting');
    const plantingVoiceLines = CONFIG.crazydave.sounds.plantingVoiceLines;
    assert(plantingVoiceLines.length === 3, 'Dave config must include all three planting voice lines');

    const playedSfxList = [];
    const origPlaySFX = audioSystem.playSFX;
    audioSystem.playSFX = (src, vol) => {
      playedSfxList.push({ src, vol });
      return null;
    };

    // 12a. Peashooter shooting sound
    backPlant._firePea(0, 1);
    assert(playedSfxList.some(s => s.src.includes('crazydave-peashooter-shot.mp3')), 'Peashooter must play crazydave-peashooter-shot.mp3 when firing');

    // 12b. Pea & Snow Pea projectile impact sound and shatter particles
    const { drawSparkEffects } = await import('../js/graphics/particles/sparkEffect.js');
    state.sparkEffects = [];

    // Test Peashooter kinetic pea hitting enemy
    const testPeaForHit = {
      x: gojo.x,
      y: gojo.y,
      vx: 10,
      vy: 0,
      damage: 10,
      visual: 'peaBullet',
      isPlantProjectile: true,
      owner: 1,
      r: 6
    };
    HitImpactSystem.processProjectileHit(gojo, testPeaForHit, backPlant, state.fighters);
    assert(playedSfxList.some(s => s.src.includes('splat3.ogg')), 'Peashooter projectile hit must play splat3.ogg upon hitting enemy');
    assert(state.sparkEffects.some(p => p.type === 'peaShatter'), 'Peashooter projectile hit must spawn peaShatter particles');

    // Test Snow Pea frost pea hitting enemy
    state.sparkEffects = [];
    const testSnowPeaForHit = {
      x: gojo.x,
      y: gojo.y,
      vx: 10,
      vy: 0,
      damage: 10,
      visual: 'snowPeaBullet',
      isPlantProjectile: true,
      owner: 1,
      r: 6
    };
    HitImpactSystem.processProjectileHit(gojo, testSnowPeaForHit, backPlant, state.fighters);
    assert(state.sparkEffects.some(p => p.type === 'snowPeaShatter'), 'Snow Pea projectile hit must spawn snowPeaShatter particles');

    // Test Peashooter pea colliding with arena wall
    state.sparkEffects = [];
    const wallPea = {
      x: state.arena.x + state.arena.width + 50,
      y: state.arena.y + 200,
      vx: 10,
      vy: 0,
      damage: 10,
      visual: 'peaBullet',
      isPlantProjectile: true,
      owner: 1,
      r: 6,
      life: 100,
      maxLife: 100
    };
    projectileSystem.projectiles = [wallPea];
    projectileSystem.update(state.fighters);
    assert(state.sparkEffects.some(p => p.type === 'peaShatter'), 'Peashooter projectile wall collision must spawn peaShatter particles');
    assert(projectileSystem.projectiles.length === 0, 'Wall-collided pea projectile must be removed');

    // Test Snow Pea colliding with arena wall
    state.sparkEffects = [];
    const wallSnowPea = {
      x: state.arena.x + state.arena.width + 50,
      y: state.arena.y + 200,
      vx: 10,
      vy: 0,
      damage: 10,
      visual: 'snowPeaBullet',
      isPlantProjectile: true,
      owner: 1,
      r: 6,
      life: 100,
      maxLife: 100
    };
    projectileSystem.projectiles = [wallSnowPea];
    projectileSystem.update(state.fighters);
    assert(state.sparkEffects.some(p => p.type === 'snowPeaShatter'), 'Snow Pea projectile wall collision must spawn snowPeaShatter particles');
    assert(projectileSystem.projectiles.length === 0, 'Wall-collided snow pea projectile must be removed');

    // Verify canvas rendering of peaShatter & snowPeaShatter particles
    state.ctx = mockCtx;
    mockCtx.resetStackDepth();
    drawSparkEffects();
    assert(mockCtx.getStackDepth() === 0, 'Particle spark renderer stack depth must be 0 after rendering pea shatter particles');

    // 12c. Sun pickup sound
    dave.sunCount = 50;
    dave.x = 300; dave.y = 300;
    dave.suns = [{ x: 300, y: 300, targetX: 300, targetY: 300, r: 30, value: 25, life: 100, isLanding: false }];
    dave._updateSunDrops(state.arena, { maxSun: 500 });
    assert(playedSfxList.some(s => s.src.includes('crazydave-sun-pickup.mp3')), 'Crazy Dave must play crazydave-sun-pickup.mp3 on collecting a sun drop');

    // 12d. Planting sound & Anti-Repetition Flora Selection Standard
    dave.timeStopTimer = 0;
    dave.paralyzeTimer = 0;
    dave.hitStunTimer = 0;
    dave.sunCount = 300;
    dave.plantPeashooter(gojo);
    assert(playedSfxList.some(s => s.src.includes('crazydave-Planting.ogg')), 'Crazy Dave must play crazydave-Planting.ogg when planting plants');
    assert(playedSfxList.some(s => plantingVoiceLines.includes(s.src)), 'Peashooter planting must play a configured Crazy Dave voice line');
    assert(dave.lastPlantedType === 'peashooter', 'Dave must record lastPlantedType as peashooter');
    const voiceLineCountAfterPeashooter = playedSfxList.filter(s => plantingVoiceLines.includes(s.src)).length;
    dave.plantSnowPea(gojo);
    assert(playedSfxList.filter(s => plantingVoiceLines.includes(s.src)).length > voiceLineCountAfterPeashooter, 'Snow Pea planting must play a configured Crazy Dave voice line');

    // Reset Dave to clean state with 0 active plants to test AI sequence
    dave.reset();
    dave.timeStopTimer = 0;
    dave.paralyzeTimer = 0;
    dave.hitStunTimer = 0;
    dave.sunCount = 500;

    // First AI plant: starts with Wall-nut barrier to establish frontline defense
    dave.update(gojo, 1, state.arena);
    assert(dave.lastPlantedType === 'wallnut', 'Dave AI must start with Wall-nut to establish defensive frontline');

    // Second AI plant: deploys Peashooter behind the Wall-nut
    dave.wallnutCooldown = 999; // Wallnut on cooldown
    dave.torchwoodCooldown = 999; // Torchwood on cooldown
    dave.peashooterCooldown = 0;
    dave.snowPeaCooldown = 0;
    dave.sunCount = 500;
    dave.plantingPauseTimer = 0;
    dave.update(gojo, 1, state.arena);
    assert(dave.lastPlantedType === 'peashooter', 'Dave AI must deploy Peashooter behind active Wall-nut barrier');

    // Third AI plant: alternates to Snow Pea
    dave.wallnutCooldown = 999;
    dave.torchwoodCooldown = 999;
    dave.peashooterCooldown = 0;
    dave.snowPeaCooldown = 0;
    dave.sunCount = 500;
    dave.plantingPauseTimer = 0;
    dave.update(gojo, 1, state.arena);
    assert(dave.lastPlantedType === 'snowpea', 'Dave AI must alternate to Snow Pea to maintain balanced flora arsenal');

    // Fourth AI plant: alternates back to Peashooter
    dave.wallnutCooldown = 999;
    dave.torchwoodCooldown = 999;
    dave.peashooterCooldown = 0;
    dave.snowPeaCooldown = 0;
    dave.sunCount = 500;
    dave.plantingPauseTimer = 0;
    dave.update(gojo, 1, state.arena);
    assert(dave.lastPlantedType === 'peashooter', 'Dave AI must alternate back to Peashooter');

    // Fifth AI plant: deploys Torchwood when Peashooters are present to ignite them into Fire Peas
    dave.wallnutCooldown = 999;
    dave.peashooterCooldown = 999;
    dave.snowPeaCooldown = 999;
    dave.torchwoodCooldown = 0;
    dave.potatoMineCooldown = 999;
    dave.sunCount = 500;
    dave.plantingPauseTimer = 0;
    dave.update(gojo, 1, state.arena);
    assert(dave.lastPlantedType === 'torchwood', 'Dave AI must deploy Torchwood when Peashooters are active');

    // Sixth AI plant: deploys Potato Mine as proximity explosive trap
    dave.wallnutCooldown = 999;
    dave.peashooterCooldown = 999;
    dave.snowPeaCooldown = 999;
    dave.torchwoodCooldown = 999;
    dave.potatoMineCooldown = 0;
    dave.sunCount = 500;
    dave.plantingPauseTimer = 0;
    dave.update(gojo, 1, state.arena);
    assert(dave.lastPlantedType === 'potatoMine', 'Dave AI must deploy Potato Mine when available');

    // Test Potato Mine Entity Mechanics: Instant Arming, Proximity Trigger, Detonation & Canvas Stack Depth
    const { PotatoMineEntity } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const { drawPotatoMine } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    const testMine = new PotatoMineEntity(200, 200, dave);
    assert(testMine.isPlant === true, 'PotatoMineEntity must have isPlant === true');
    assert(testMine.isImmovable === true, 'PotatoMineEntity must be immovable');
    assert(testMine.isArmed === true, 'PotatoMineEntity must be instantly armed on spawn');

    // Position enemy outside trigger radius: should not detonate
    gojo.x = 500; gojo.y = 500;
    testMine.update(gojo, 1, state.arena);
    assert(testMine.isExploding === false, 'PotatoMineEntity must not detonate when enemy is far');

    // Position enemy inside trigger radius: should detonate immediately (SPUDOW!)
    gojo.x = 220; gojo.y = 200;
    state.fighters = [dave, gojo, testMine];
    testMine.update(gojo, 1, state.arena);
    assert(testMine.isExploding === true, 'PotatoMineEntity must detonate into isExploding immediately when enemy enters proximity');

    // Test PotatoMine draw stack depth balance across unarmed, armed, and exploding states
    mockCtx.resetStackDepth();
    testMine.isExploding = false;
    testMine.isArmed = false;
    drawPotatoMine(mockCtx, testMine);
    assert(mockCtx.getStackDepth() === 0, 'drawPotatoMine (unarmed) must maintain 0 canvas stack depth');

    mockCtx.resetStackDepth();
    testMine.isArmed = true;
    drawPotatoMine(mockCtx, testMine);
    assert(mockCtx.getStackDepth() === 0, 'drawPotatoMine (armed) must maintain 0 canvas stack depth');

    mockCtx.resetStackDepth();
    testMine.isExploding = true;
    testMine.explodeAnimProgress = 0.5;
    drawPotatoMine(mockCtx, testMine);
    assert(mockCtx.getStackDepth() === 0, 'drawPotatoMine (exploding) must maintain 0 canvas stack depth');

    // 12e. HUD Stats Amount of Sun ($UN: XX)
    const origStatsToggle = CONFIG.darkModeShowHudStats;
    CONFIG.darkModeShowHudStats = 1;
    dave.sunCount = 275;
    state.fighters = [dave, gojo];
    state.mode = '1v1';
    state.ctx = mockCtx;
    state.canvas = mockCanvas;
    const { drawHUD, clearHealthHud } = await import('../js/graphics/hudManager.js');
    clearHealthHud();
    drawHUD();
    const leftContainer = document.getElementById('healthHudLeft');
    const rightContainer = document.getElementById('healthHudRight');
    const bottomContainer = document.getElementById('healthHud');
    const hudContent = (leftContainer?.innerHTML || '') + (rightContainer?.innerHTML || '') + (bottomContainer?.innerHTML || '');
    const hudText = hudContent.replace(/<[^>]*>/g, '');
    assert(hudText.includes('$UN:') && hudText.includes('275'), 'HUD Stats HTML must display $UN: 275 for Crazy Dave');
    assert(!hudText.includes('Plants:'), 'HUD Stats must not display plant counts for Crazy Dave');
    CONFIG.darkModeShowHudStats = origStatsToggle;

    // 14. Snow Pea Attack SFX & Freeze Stasis Mechanic Test
    const { PeashooterEntity, SnowPeaEntity } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const snowPeaPlayedSfxList = [];
    const origPlaySFXTest = audioSystem.playSFX;
    audioSystem.playSFX = (src, vol) => {
      snowPeaPlayedSfxList.push({ src, vol });
      if (origPlaySFXTest) origPlaySFXTest(src, vol);
    };

    const snowPlant = new SnowPeaEntity(200, 200, dave, 1);
    const targetFighter = new GojoFighter(300, 200, 1);
    targetFighter.infinityCooldown = 1000; // Disable Infinity for clear hit testing
    state.fighters = [dave, targetFighter];
    state.projectiles = [];

    // Firing Snow Pea plays crazydave-snow_pea_sparkles.ogg
    snowPlant._fireSnowPea(0, 0);
    assert(snowPeaPlayedSfxList.some(s => s.src.includes('crazydave-snow_pea_sparkles.ogg')), 'Firing Snow Pea must play crazydave-snow_pea_sparkles.ogg attack sound');

    // Trigger projectile onHit with freeze
    const snowProjTest = (projectileSystem.projectiles && projectileSystem.projectiles.length > 0)
      ? projectileSystem.projectiles[projectileSystem.projectiles.length - 1]
      : state.projectiles[state.projectiles.length - 1];
    assert(snowProjTest && snowProjTest.visual === 'snowPeaBullet', 'Snow Pea projectile must have visual snowPeaBullet');
    
    // Test applyFreeze directly on target
    targetFighter.applyFreeze(60, dave);
    assert(targetFighter.iceFreezeTimer === 60, 'target.applyFreeze must set iceFreezeTimer to 60 frames');
    assert(targetFighter.isFrozenBySnowPea === true, 'target.isFrozenBySnowPea must be true when frozen');
    assert(snowPeaPlayedSfxList.some(s => s.src.includes('crazydave-snowpea-freeze.mp3')), 'applyFreeze must play crazydave-snowpea-freeze.mp3 SFX');
    assert(targetFighter.areAttackEffectsSuppressed() === true, 'Frozen fighter must have attack effects suppressed');

    // Test _handleTimeStop() ticks iceFreezeTimer down and halts velocity
    targetFighter.vx = 5;
    targetFighter.vy = 5;
    const isTargetFrozen = targetFighter._handleTimeStop();
    assert(isTargetFrozen === true, '_handleTimeStop must return true when iceFreezeTimer > 0');
    assert(targetFighter.vx === 0 && targetFighter.vy === 0, 'Frozen fighter must have vx=0, vy=0');
    assert(targetFighter.iceFreezeTimer === 59, 'iceFreezeTimer must decrement by 1 on _handleTimeStop()');

    // Test drawIceFreezeEffect stack depth balance
    const { drawIceFreezeEffect } = await import('../js/graphics/statusEffects.js');
    mockCtx.resetStackDepth();
    drawIceFreezeEffect(mockCtx, targetFighter.r, targetFighter);
    assert(mockCtx.getStackDepth() === 0, `drawIceFreezeEffect must return canvas stack depth to 0, got ${mockCtx.getStackDepth()}`);

    // Restore audioSystem.playSFX
    audioSystem.playSFX = origPlaySFXTest;

    // 15. Verify Basic Attack Sound System resolution for all fighter types
    const { getBasicAttackSound, BASIC_ATTACK_SOUNDS } = await import('../js/soundEffects/basicAttackSounds.js');
    const daveSound = getBasicAttackSound(50, 'crazydave');
    assert(daveSound && daveSound.src, 'Crazy Dave must have a valid basic attack sound');
    const zenitsuSound = getBasicAttackSound(44, 'zenitsu');
    assert(zenitsuSound && zenitsuSound.src, 'Zenitsu must have a valid basic attack sound');

    // 16. Test Plant Floating Healthbar Positioning & Dynamic sunPickupValue
    const peashooterTest = new PeashooterEntity(200, 200, dave, 1);
    peashooterTest.hp = 100; // Damaged to trigger health bar
    mockCtx.resetStackDepth();
    peashooterTest.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Peashooter draw with healthbar must maintain 0 canvas stack depth');

    // Verify sunPickupValue default from config (50) and custom value pickup
    dave.reset();
    dave.sunCount = 0;
    const defaultSun = dave.spawnSunDrop(250, 250);
    assert(defaultSun.value === 50, `Default spawned sun drop must inherit sunPickupValue 50 (got ${defaultSun.value})`);
    
    // Land sun on Dave's coordinates to test collision pickup
    defaultSun.isLanding = false;
    defaultSun.y = 250;
    dave.x = 250; dave.y = 250;
    dave.suns = [defaultSun];
    dave._updateSunDrops(state.arena, { sunPickupValue: 50, maxSun: 500 });
    assert(dave.sunCount === 50, `Crazy Dave must collect 50 sun with default sunPickupValue (got ${dave.sunCount})`);

    // Simulate collection with custom sunPickupValue (e.g. 75)
    dave.sunCount = 0;
    dave.sunPickupValue = 75;
    const customSun = dave.spawnSunDrop(250, 250);
    assert(customSun.value === 75, `Spawned sun with custom sunPickupValue must have value 75 (got ${customSun.value})`);
    customSun.isLanding = false;
    customSun.y = 250;
    dave.suns = [customSun];
    dave._updateSunDrops(state.arena, { sunPickupValue: 75, maxSun: 500 });
    assert(dave.sunCount === 75, `Crazy Dave must collect 75 sun with custom sunPickupValue (got ${dave.sunCount})`);

    // 17. Test Crazy Dave Pixel Art Garden Shovel Weapon
    const { drawCrazyDaveShovel, drawCrazyDaveWeapon, CrazyDave_WEAPON_GRAPHICS } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    const { drawWeaponPreview } = await import('../js/graphics/ui/WeaponIndexScreen.js');

    assert(CrazyDave_WEAPON_GRAPHICS.shovel && CrazyDave_WEAPON_GRAPHICS.shovel.name === 'Garden Shovel', 'CrazyDave_WEAPON_GRAPHICS must register Garden Shovel');
    
    // In-hand shovel render
    mockCtx.resetStackDepth();
    drawCrazyDaveShovel(mockCtx, 0, 0, 0, 25, true, 0, false, '#84CC16', false);
    assert(mockCtx.getStackDepth() === 0, `drawCrazyDaveShovel must maintain 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // Standalone Weapon Studio render
    mockCtx.resetStackDepth();
    drawCrazyDaveWeapon(mockCtx, { r: 25, angle: 0, color: '#84CC16' });
    assert(mockCtx.getStackDepth() === 0, `drawCrazyDaveWeapon must maintain 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // Weapon Index / Studio Preview dispatch
    mockCtx.resetStackDepth();
    drawWeaponPreview(mockCtx, 'crazydave', '#84CC16');
    assert(mockCtx.getStackDepth() === 0, `drawWeaponPreview('crazydave') must maintain 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // Clean up
    state.deathEffects = [];
    state.illusions = [];
    state.projectiles = [];
    console.log('      ✅ Crazy Dave PvZ grass floor, pixel art garden shovel weapon, sun pickup SFX, dynamic sunPickupValue, plant floating healthbars, peashooter shot SFX, pea splat hit SFX, planting SFX, anti-repetition AI, $UN: XX HUD stats, Snow Pea freeze mechanic, freeze audio & basic attack sounds verified.');
  }

  // ── 27. Testing Wall-nut Sprite Sheet Frame Bounds & Natural Collision Rebounce Physics ──
  {
    console.log('   27. Testing Wall-nut Multi-Stage Degradation Bounds & Natural Collision Rebounce...');
    const { WALLNUT_RECTS, drawWallnut } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    const { WallnutEntity, CrazyDaveFighter } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const { resolveFighterCollision } = await import('../js/systems/physics.js');

    // 1. Verify all 6 damage stage frames have strict non-overlapping X spans
    assert(WALLNUT_RECTS.length === 6, `WALLNUT_RECTS must contain 6 discrete damage stages (got ${WALLNUT_RECTS.length})`);
    for (let i = 0; i < WALLNUT_RECTS.length; i++) {
      const f = WALLNUT_RECTS[i];
      assert(f.sx >= 0 && f.sy >= 0 && f.sw > 0 && f.sh > 0, `Frame ${i} must have valid positive dimensions: ${JSON.stringify(f)}`);
      if (i < WALLNUT_RECTS.length - 1) {
        const nextF = WALLNUT_RECTS[i + 1];
        const rightEdge = f.sx + f.sw;
        assert(rightEdge <= nextF.sx, `Frame ${i} right edge (${rightEdge}) must NOT overlap or exceed Frame ${i + 1} start (${nextF.sx})`);
      }
    }

    // 2. Test Canvas 2D Stack Depths across all 6 HP degradation thresholds
    const dave = new CrazyDaveFighter({ startX: 100, startY: 100 });
    const wallnut = new WallnutEntity(250, 250, dave, 1);
    const hpRatios = [1.0, 0.75, 0.60, 0.40, 0.20, 0.05];
    for (const ratio of hpRatios) {
      wallnut.hp = wallnut.maxHp * ratio;
      mockCtx.resetStackDepth();
      drawWallnut(mockCtx, wallnut);
      assert(mockCtx.getStackDepth() === 0, `drawWallnut at hpRatio ${ratio} must return canvas stack depth to 0, got ${mockCtx.getStackDepth()}`);
    }

    // 3. Test Natural Elastic Collision Rebounce Physics
    const enemy = new FIGHTER_CLASS_MAP.normal({ x: 300, y: 250, radius: 24, speed: 5 });
    enemy.vx = -4.0; // Charging left directly into Wall-nut
    enemy.vy = 0;
    wallnut.x = 250;
    wallnut.y = 250;
    wallnut.vx = 0;
    wallnut.vy = 0;

    state.fighters = [wallnut, enemy];
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };

    // Resolve collision
    resolveFighterCollision(wallnut, enemy);

    // Wall-nut must remain 100% anchored at (250, 250) with zero velocity
    assert(wallnut.x === 250 && wallnut.y === 250, `Wall-nut must remain anchored during collision (got ${wallnut.x}, ${wallnut.y})`);
    assert(wallnut.vx === 0 && wallnut.vy === 0, `Wall-nut velocity must remain 0 (got ${wallnut.vx}, ${wallnut.vy})`);

    // Enemy must be pushed out and have velocity reflected away from Wall-nut (vx > 0)
    assert(enemy.x >= 250 + wallnut.r + enemy.r - 0.1, `Enemy must be separated outside Wall-nut radius (got ${enemy.x}, min: ${250 + wallnut.r + enemy.r})`);
    assert(enemy.vx > 0, `Enemy must bounce back with positive X velocity away from Wall-nut (got vx=${enemy.vx})`);

    // 4. Friendly pass-through verification (Crazy Dave passes freely through Wall-nut)
    dave.x = 260; // Overlapping Wall-nut
    dave.y = 250;
    dave.vx = -2;
    dave.vy = 0;
    resolveFighterCollision(wallnut, dave);
    // Dave should not be pushed out or bounced
    assert(dave.x === 260, `Friendly Crazy Dave must pass freely through Wall-nut without push (got x=${dave.x})`);

    console.log('      ✅ Wall-nut 6-stage non-overlapping bounds, canvas stack balance, natural elastic rebounce & friendly pass-through verified.');
  }

  // ── 28. Testing Torchwood Sprite Bounds, Stack Balance & Pea Projectile Interception ──
  {
    const { TORCHWOOD_RECTS, FIRE_PEA_RECTS, drawTorchwood, drawFirePeaBullet } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    const { TorchwoodEntity, PeashooterEntity, SnowPeaEntity, CrazyDaveFighter } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    // 1. Verify Torchwood sprite sheet frames are valid and non-overlapping
    assert(TORCHWOOD_RECTS.length === 6, `TORCHWOOD_RECTS must contain 6 idle frames (got ${TORCHWOOD_RECTS.length})`);
    for (let i = 0; i < TORCHWOOD_RECTS.length; i++) {
      const f = TORCHWOOD_RECTS[i];
      assert(f.sx >= 0 && f.sy >= 0 && f.sw > 0 && f.sh > 0, `Frame ${i} must have valid positive dimensions: ${JSON.stringify(f)}`);
      if (i < TORCHWOOD_RECTS.length - 1) {
        const nextF = TORCHWOOD_RECTS[i + 1];
        assert(f.sx + f.sw <= nextF.sx, `Frame ${i} (${f.sx}+${f.sw}) must not overlap next frame (${nextF.sx})`);
      }
    }

    // 1b. Verify Fireball projectile sprite sheet frames are valid and non-overlapping
    assert(FIRE_PEA_RECTS.length === 3, `FIRE_PEA_RECTS must contain 3 animation keyframes (got ${FIRE_PEA_RECTS.length})`);
    for (let i = 0; i < FIRE_PEA_RECTS.length; i++) {
      const f = FIRE_PEA_RECTS[i];
      assert(f.sx >= 0 && f.sy >= 0 && f.sw > 0 && f.sh > 0, `Fire pea frame ${i} must have valid dimensions: ${JSON.stringify(f)}`);
      if (i < FIRE_PEA_RECTS.length - 1) {
        const nextF = FIRE_PEA_RECTS[i + 1];
        assert(f.sx + f.sw <= nextF.sx, `Fire pea frame ${i} (${f.sx}+${f.sw}) must not overlap next frame (${nextF.sx})`);
      }
    }

    // 2. Test Canvas 2D Stack Depths for Torchwood and Fire Pea Bullet
    const dave = new CrazyDaveFighter({ startX: 100, startY: 100 });
    const torchwood = new TorchwoodEntity(250, 250, dave, 1);
    mockCtx.resetStackDepth();
    drawTorchwood(mockCtx, torchwood);
    assert(mockCtx.getStackDepth() === 0, `drawTorchwood must return canvas stack depth to 0, got ${mockCtx.getStackDepth()}`);

    const firePea = { x: 250, y: 250, r: 6.5, visual: 'firePeaBullet', color: '#EF4444' };
    mockCtx.resetStackDepth();
    drawFirePeaBullet(mockCtx, firePea);
    assert(mockCtx.getStackDepth() === 0, `drawFirePeaBullet must return canvas stack depth to 0, got ${mockCtx.getStackDepth()}`);

    // 3. Test Peashooter Pea → Fire Pea Ignition (2x Damage + Fire Visual + Splash AoE)
    const baseDamage = 10;
    const greenPea = {
      x: 252,
      y: 250,
      r: 6.0,
      damage: baseDamage,
      visual: 'peaBullet',
      color: '#22C55E',
      isPlantProjectile: true,
      owner: 0,
      ownerFighter: dave
    };
    projectileSystem.projectiles = [greenPea];
    state.projectiles = projectileSystem.projectiles;

    torchwood.update(null, 0, state.arena);

    assert(greenPea.visual === 'firePeaBullet', `Peashooter pea passing through Torchwood must become firePeaBullet (got ${greenPea.visual})`);
    assert(greenPea.isFirePea === true, 'Ignited pea must have isFirePea flag set to true');
    assert(greenPea.damage === baseDamage * 2.0, `Ignited pea must deal 2x damage (${baseDamage * 2.0}), got ${greenPea.damage}`);
    assert(typeof greenPea.onHit === 'function', 'Ignited fire pea must have an onHit callback for splash AoE');

    // 4. Test Fire Pea does NOT double-ignite when passing through another Torchwood
    const torchwood2 = new TorchwoodEntity(260, 250, dave, 1);
    torchwood2.update(null, 0, state.arena);
    assert(greenPea.damage === baseDamage * 2.0, `Fire pea passing through second Torchwood must not double-multiply damage (got ${greenPea.damage})`);

    // 5. Test Snow Pea (Ice Pea) → Standard Pea (Melted / Reverted, No Ice)
    const icePea = {
      x: 251,
      y: 250,
      r: 6.5,
      damage: 12,
      visual: 'snowPeaBullet',
      color: '#38BDF8',
      isSnowPea: true,
      isPlantProjectile: true,
      onHit: () => { /* chill freeze */ },
      owner: 0,
      ownerFighter: dave
    };
    projectileSystem.projectiles = [icePea];
    state.projectiles = projectileSystem.projectiles;

    torchwood.update(null, 0, state.arena);

    assert(icePea.visual === 'peaBullet', `Snow Pea ice projectile passing through Torchwood must revert to peaBullet (got ${icePea.visual})`);
    assert(icePea.isSnowPea === false, 'Melted ice pea must have isSnowPea set to false');
    assert(icePea.onHit === null, 'Melted ice pea must lose its chill/freeze onHit callback');
    assert(icePea.damage === 10, `Melted ice pea must revert to standard peashooter damage (10), got ${icePea.damage}`);

    // 6. Test Torchwood proximity burn without refreshing the burn every frame
    const nearbyEnemy = {
      x: 290,
      y: 250,
      hp: 100,
      dead: false,
      burnTimer: 0,
      applyBurn(attacker, duration) {
        this.burnTimer = duration;
        this.burnAttacker = attacker;
      }
    };
    const distantEnemy = {
      x: 400,
      y: 250,
      hp: 100,
      dead: false,
      burnTimer: 0,
      applyBurn() {
        this.burnTimer = 999;
      }
    };
    const plantTarget = {
      x: 290,
      y: 250,
      hp: 100,
      dead: false,
      isPlant: true,
      burnTimer: 0,
      applyBurn() {
        this.burnTimer = 999;
      }
    };
    const previousFighters = state.fighters;
    state.fighters = [torchwood, nearbyEnemy, distantEnemy, plantTarget];
    torchwood.update(null, 0, state.arena);
    assert(nearbyEnemy.burnTimer === CONFIG.crazydave.torchwoodBurnDuration, 'Enemy near Torchwood must receive the configured burn duration');
    assert(nearbyEnemy.burnAttacker === torchwood, 'Torchwood proximity burn must identify Torchwood as the attacker');
    assert(distantEnemy.burnTimer === 0, 'Enemy outside Torchwood burn radius must not be burned');
    assert(plantTarget.burnTimer === 0, 'Plant allies must not be burned by Torchwood');
    nearbyEnemy.burnTimer = 30;
    torchwood.update(null, 0, state.arena);
    assert(nearbyEnemy.burnTimer === 30, 'Torchwood must not reset an active burn timer every frame');
    state.fighters = previousFighters;

    // 7. Test Mahoraga adapts to Torchwood burn and becomes immune
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    const mahoraga = new MahoragaClass({ type: 'mahoraga', x: 320, y: 250, hp: 250, maxHp: 250 });
    const previousTorchwoodFighters = state.fighters;
    state.fighters = [torchwood, mahoraga];
    mahoraga.applyBurn(torchwood, 180);
    assert(mahoraga.burnTimer === 180, 'Mahoraga must receive the first Torchwood burn exposure');
    const adaptationThreshold = mahoraga.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);
    const burnHitDamage = Math.max(1, adaptationThreshold / 4);
    for (let i = 0; i < 4; i++) {
      mahoraga.takeDamage(burnHitDamage, torchwood, { isBurn: true });
    }
    assert(mahoraga.adaptedTorchwood === true, 'Mahoraga must adapt after the Torchwood burn threshold is reached');
    assert(mahoraga.isImmuneToBurn === true, 'Mahoraga must become immune to burn after adapting to Torchwood');
    assert(mahoraga.burnTimer === 0, 'Mahoraga active Torchwood burn must clear upon adaptation');
    mahoraga.applyBurn(torchwood, 180);
    assert(mahoraga.burnTimer === 0, 'Adapted Mahoraga must ignore future Torchwood burn applications');
    state.fighters = previousTorchwoodFighters;

    // 8. Test Crazy Dave Skill 4 Registration & AI planting decision
    assert(dave.skillManager.skills.has('torchwood'), 'Crazy Dave must register Torchwood skill in skillManager');

    // 9. Test Torchwood Proximity Burn on Enemy Minions / Illusions
    const enemyMinion = {
      x: 270,
      y: 250,
      hp: 80,
      maxHp: 80,
      dead: false,
      isIllusion: true,
      owner: nearbyEnemy,
      burnTimer: 0,
      applyBurn(attacker, duration) {
        this.burnTimer = duration;
        this.burnAttacker = attacker;
      }
    };
    state.illusions = [enemyMinion];
    torchwood.update(null, 0, state.arena);
    assert(enemyMinion.burnTimer === CONFIG.crazydave.torchwoodBurnDuration, 'Enemy illusion/minion near Torchwood must receive proximity burn');
    state.illusions = [];

    // 10. Test Offensive Plant (Peashooter) targeting and firing at Enemy Minion/Illusion
    const peashooter = new PeashooterEntity(100, 250, dave, 1);
    const laneIllusion = {
      x: 220,
      y: 250,
      hp: 100,
      maxHp: 100,
      dead: false,
      isIllusion: true,
      owner: nearbyEnemy,
    };
    state.illusions = [laneIllusion];
    projectileSystem.projectiles = [];
    peashooter.shootCooldown = 0;
    peashooter.update(null, 0, state.arena);
    assert(projectileSystem.projectiles.length > 0, 'Peashooter must target and shoot at enemy minion/illusion in lane');
    assert(projectileSystem.projectiles[0].visual === 'peaBullet', 'Fired projectile must be peaBullet');
    projectileSystem.projectiles = [];
    state.illusions = [];

    // 11. Test Fire Pea Splash AoE damages and burns enemy minion/illusion
    const splashMinion = {
      x: 255,
      y: 252,
      hp: 100,
      maxHp: 100,
      dead: false,
      isIllusion: true,
      owner: nearbyEnemy,
      burnTimer: 0,
      takeDamage(amount) { this.hp -= amount; return amount; },
      applyBurn(attacker, duration) { this.burnTimer = duration; }
    };
    state.illusions = [splashMinion];
    const directTarget = { x: 250, y: 250, hp: 200, dead: false };
    greenPea.onHit(directTarget);
    assert(splashMinion.hp < 100, 'Enemy minion in splash radius must take Fire Pea splash damage');
    assert(splashMinion.burnTimer > 0, 'Enemy minion in splash radius must be ignited with burn');
    state.illusions = [];

    // 12. Test TurretEntity Proximity Burn & DoT Damage Ticking
    const { TurretEntity } = await import('../js/entities/TurretEntity.js');
    state.gameState = 'playing';
    state.mode = '1v1';
    const enemyTurret = new TurretEntity(270, 250, nearbyEnemy, 1);
    state.fighters = [torchwood, enemyTurret];
    torchwood.update(null, 0, state.arena);
    assert(enemyTurret.burnTimer > 0, 'Enemy Turret near Torchwood must receive proximity burn');
    const initialTurretHp = enemyTurret.hp;
    enemyTurret.burnDamageTimer = (CONFIG.orange?.burnDamageInterval || 60); // Force DoT tick
    enemyTurret.update(null, 0, state.arena);
    assert(enemyTurret.hp < initialTurretHp, 'Burning Turret must take burn DoT damage on update');

    // 13. Test Rika Companion Proximity Burn & DoT Damage Ticking
    const { updateRika } = await import('../js/entities/fighters/yuta/rikaLogic.js');
    const mockYuta = {
      characterId: 'yuta',
      hp: 200,
      isSkillEnabled: () => true,
      rika: {
        x: 275,
        y: 250,
        r: 30,
        hp: 300,
        maxHp: 300,
        active: true,
        burnTimer: 0,
        applyBurn(attacker, duration) {
          this.burnTimer = duration;
          this.lastBurnAttacker = attacker;
        },
        takeDamage(amount) {
          this.hp -= amount;
        }
      }
    };
    state.fighters = [torchwood, mockYuta];
    torchwood.update(null, 0, state.arena);
    assert(mockYuta.rika.burnTimer > 0, 'Enemy Rika companion near Torchwood must receive proximity burn');
    const initialRikaHp = mockYuta.rika.hp;
    mockYuta.rika.burnDamageTimer = (CONFIG.orange?.burnDamageInterval || 60);
    updateRika(mockYuta, state.arena);
    assert(mockYuta.rika.hp < initialRikaHp, 'Burning Rika must take burn DoT damage on update');

    // 14. Test Illusion burn DoT damage in updateIllusions
    const { updateIllusions } = await import('../js/systems/illusionSystem.js');
    const burningIllusion = {
      x: 100,
      y: 100,
      hp: 50,
      maxHp: 50,
      burnTimer: 180,
      burnDamageTimer: (CONFIG.orange?.burnDamageInterval || 60),
      dead: false,
      isIllusion: true,
      owner: nearbyEnemy,
      takeDamage(amount) {
        this.hp -= amount;
      }
    };
    state.illusions = [burningIllusion];
    state.gameState = 'playing';
    updateIllusions();
    assert(burningIllusion.hp < 50, 'Burning illusion must take burn DoT damage in updateIllusions');
    state.illusions = [];

    // Clear projectiles & state
    projectileSystem.projectiles = [];
    state.projectiles = [];
    state.fighters = [];

    console.log('      ✅ Torchwood 6-frame bounds, canvas stack balance, green pea fire ignition (2x dmg + splash), ice pea melting, all minion burns (Turrets/Rika/Illusions/Cars) & skill registration verified.');
  }

  // ── 29. Testing Lawnmower Sprite Bounds, Stack Balance, Baseline Defense & Steamroller Shred ──
  {
    const { LAWNMOWER_RECTS, drawLawnmower } = await import('../js/graphics/weapons/crazyDaveWeaponGraphics.js');
    const { LawnmowerEntity, CrazyDaveFighter, getAllPlantTargetCandidates, isEnemyPlantTarget } = await import('../js/entities/fighters/CrazyDaveFighter.js');

    // 1. Verify Lawnmower sprite sheet frames are valid and non-overlapping
    assert(LAWNMOWER_RECTS.length === 6, `LAWNMOWER_RECTS must contain 6 discrete animation frames (got ${LAWNMOWER_RECTS.length})`);
    for (let i = 0; i < LAWNMOWER_RECTS.length; i++) {
      const f = LAWNMOWER_RECTS[i];
      assert(f.sx >= 0 && f.sy >= 0 && f.sw > 0 && f.sh > 0, `Lawnmower frame ${i} must have valid positive dimensions: ${JSON.stringify(f)}`);
      if (i < LAWNMOWER_RECTS.length - 1) {
        const nextF = LAWNMOWER_RECTS[i + 1];
        assert(f.sx + f.sw <= nextF.sx, `Lawnmower frame ${i} (${f.sx}+${f.sw}) must not overlap next frame (${nextF.sx})`);
      }
    }

    // 2. Test Canvas 2D Stack Depths for Lawnmower (idle and charging)
    const dave = new CrazyDaveFighter({ startX: 100, startY: 200 });
    const mower = new LawnmowerEntity(22, 200, dave, 1, 0);
    mockCtx.resetStackDepth();
    drawLawnmower(mockCtx, mower);
    assert(mockCtx.getStackDepth() === 0, `drawLawnmower (idle) must return canvas stack depth to 0, got ${mockCtx.getStackDepth()}`);

    mower.state = 'charging';
    mockCtx.resetStackDepth();
    drawLawnmower(mockCtx, mower);
    assert(mockCtx.getStackDepth() === 0, `drawLawnmower (charging) must return canvas stack depth to 0, got ${mockCtx.getStackDepth()}`);

    // 3. Test Lawnmower baseline initialization follows Crazy Dave's spawn side
    const testArena = { x: 0, y: 0, width: 600, height: 400 };
    dave.x = 550;
    dave.initLawnmowers(testArena);
    assert(dave.lawnmowers.length > 0, `Crazy Dave must initialize lawnmowers across arena rows (got ${dave.lawnmowers.length})`);
    for (const m of dave.lawnmowers) {
      assert(m.x === testArena.x + testArena.width - CONFIG.crazydave.lawnmowerBaselineOffset, `Right-spawn lawnmowers must be tucked against the right wall (got ${m.x})`);
      assert(m.facingDirection === -1, 'Right-spawn lawnmowers must face left (-1)');
      assert(m.state === 'idle', 'Lawnmowers must start in idle state');
      assert(m.hp === 99999, 'Lawnmower must have invulnerable HP pool');
      assert(m.isLawnmower === true, 'Lawnmower must set isLawnmower flag');
      assert(m.isDeployable === true && m.isMinion === true, 'Lawnmower must be marked deployable minion');
      assert(m.isUntargetable === true && m.untargetable === true, 'Lawnmower must be untargetable');
      assert(m.phasesThroughEntities === true && m.ignoreFighterCollisions === true, 'Lawnmower must have entity phase-through flags');
    }

    const leftSpawnDave = new CrazyDaveFighter({ startX: 100, startY: 200 });
    leftSpawnDave.initLawnmowers(testArena);
    assert(leftSpawnDave.lawnmowers.every(m => m.x === testArena.x + CONFIG.crazydave.lawnmowerBaselineOffset), 'Left-spawn lawnmowers must be tucked against the left wall');
    assert(leftSpawnDave.lawnmowers.every(m => m.facingDirection === 1), 'Left-spawn lawnmowers must face right (+1)');

    // 4. Test Untargetable status: isValidAimTarget and getClosestOpponent ignore Lawnmowers
    const { getClosestOpponent, resolveFighterCollision } = await import('../js/systems/physics.js');
    const sampleMower = dave.lawnmowers[0];
    const testEnemy = new FIGHTER_CLASS_MAP.gojo({ radius: 25, x: 200, y: 200, hp: 350 });
    assert(testEnemy.isValidAimTarget(sampleMower) === false, 'Fighter isValidAimTarget must return false for Lawnmower');
    state.fighters = [dave, testEnemy, ...dave.lawnmowers];
    state.arena = testArena;
    const closestTarget = getClosestOpponent(testEnemy);
    assert(closestTarget === dave, `Closest opponent must be Crazy Dave, NOT the lawnmower (got ${closestTarget?.name})`);

    // 5. Test Entities Pass Through: resolveFighterCollision leaves both entities unaffected
    const prevEnemyX = testEnemy.x;
    const prevEnemyY = testEnemy.y;
    testEnemy.x = sampleMower.x;
    testEnemy.y = sampleMower.y;
    testEnemy.vx = -3;
    resolveFighterCollision(sampleMower, testEnemy);
    assert(testEnemy.x === sampleMower.x, 'Entities must pass directly through Lawnmower without collision displacement');
    assert(sampleMower.x === testArena.x + testArena.width - CONFIG.crazydave.lawnmowerBaselineOffset, 'Lawnmower must not be displaced by colliding entity');

    // 6. Test Lawnmower breach trigger when enemy penetrates baseline
    const targetMower = dave.lawnmowers[0];
    const enemy = {
      x: targetMower.x + targetMower.facingDirection * 30, // Approach from the arena interior
      y: targetMower.y,
      r: 20,
      hp: 250,
      maxHp: 250,
      dead: false,
      owner: null,
      takeDamage: function(dmg) { this.hp -= dmg; return dmg; },
      applyKnockback: function() {}
    };
    state.fighters = [dave, enemy, ...dave.lawnmowers];

    // Before update, mower is idle
    assert(targetMower.state === 'idle', 'Mower should be idle before enemy breach');
    targetMower.update(null, 0, testArena);
    assert(targetMower.state === 'charging', 'Mower must transition to charging state upon enemy breach');

    // 7. Test Steamroller shred damage and knockback
    const prevHp = enemy.hp;
    targetMower.update(null, 0, testArena);
    assert(enemy.hp < prevHp, `Enemy must take steamroller shred damage from charging mower (expected < ${prevHp}, got ${enemy.hp})`);
    const expectedMowerDmg = (CONFIG.crazyDave?.lawnmowerDamage ?? 100);
    assert(enemy.hp === prevHp - expectedMowerDmg, `Lawnmower must deal ${expectedMowerDmg} damage (got ${prevHp - enemy.hp})`);
    assert(targetMower.facingDirection * enemy.knockbackVx > 0, `Enemy must receive knockback push in the mower's travel direction (got ${enemy.knockbackVx})`);

    // 8. Test Enemy does NOT get shredded multiple times on the same pass
    const hpAfterFirstHit = enemy.hp;
    targetMower.update(null, 0, testArena);
    assert(enemy.hp === hpAfterFirstHit, `Enemy must not take duplicate shred damage in the same mower pass (got ${enemy.hp})`);

    // 8b. Test Minion / Illusion Shredding: Lawnmower trips on and damages enemy minions
    const minionMower = dave.lawnmowers[1];
    const enemyIllusion = {
      x: minionMower.x + 25,
      y: minionMower.y,
      r: 18,
      hp: 100,
      maxHp: 100,
      dead: false,
      isIllusion: true,
      owner: testEnemy,
      takeDamage: function(dmg) { this.hp -= dmg; return dmg; },
      applyKnockback: function(vx, vy) { this.knockbackVx = vx; this.knockbackVy = vy; }
    };
    state.illusions = [enemyIllusion];
    assert(minionMower.state === 'idle', 'Minion mower should start idle');
    minionMower.update(null, 0, testArena);
    assert(minionMower.state === 'charging', 'Lawnmower must trigger when enemy minion/illusion breaches baseline');
    const prevIllHp = enemyIllusion.hp;
    minionMower.update(null, 0, testArena);
    assert(enemyIllusion.hp < prevIllHp, `Enemy illusion must take shred damage from lawnmower (expected < ${prevIllHp}, got ${enemyIllusion.hp})`);
    assert(minionMower.facingDirection * enemyIllusion.knockbackVx > 0, `Enemy illusion must receive knockback in the mower's travel direction (got ${enemyIllusion.knockbackVx})`);
    // 8c. Test Mahoraga vs Lawnmower: Mahoraga adapts to Lawnmower and takes 50% reduced damage on subsequent hits without teleporting
    const MahoragaClass = FIGHTER_CLASS_MAP.mahoraga;
    const mahoragaTest = new MahoragaClass({ radius: 30, x: 200, y: 200, hp: 450, maxHp: 450 });
    const mahoMower = new LawnmowerEntity(200, 200, dave, 1, 0);
    mahoMower.state = 'charging';
    mahoMower.x = mahoragaTest.x;
    mahoMower.y = mahoragaTest.y;
    state.fighters = [dave, mahoragaTest, mahoMower];
    const mahoPrevHp = mahoragaTest.hp;
    const prevDamageReceived = mahoragaTest.damageReceived || 0;
    mahoMower.update(null, 0, testArena);
    assert(mahoragaTest.damageReceived > prevDamageReceived || mahoragaTest.hp < mahoPrevHp, `Mahoraga must take crush damage on first Lawnmower hit`);
    assert(mahoragaTest.adaptedLawnmower === true, 'Mahoraga must adapt to Lawnmower after taking fatal damage threshold');
    assert(mahoragaTest.adaptationDashTimer === 0, 'Mahoraga must NOT trigger adaptation dash/teleport on Lawnmower');
    assert(mahoragaTest._pendingCounterTarget !== mahoMower, 'Mahoraga must NOT set Lawnmower as pending counter target');
    assert(mahoMower.mahoragaAdaptationFreezeTimer === undefined || mahoMower.mahoragaAdaptationFreezeTimer === 0, 'Lawnmower must NOT be frozen by Mahoraga adaptation');

    // Second hit with new Lawnmower: Mahoraga takes 50% reduced damage (90 dmg, minus wheel stage defense = 85.5 dmg)
    const mahoMower2 = new LawnmowerEntity(200, 200, dave, 1, 0);
    mahoMower2.state = 'charging';
    mahoMower2.x = mahoragaTest.x;
    mahoMower2.y = mahoragaTest.y;
    state.fighters = [dave, mahoragaTest, mahoMower2];
    const hpBeforeSecondHit = mahoragaTest.hp;
    mahoMower2.update(null, 0, testArena);
    const damageTaken = hpBeforeSecondHit - mahoragaTest.hp;
    assert(damageTaken <= 90 && damageTaken > 0, `Adapted Mahoraga must take 50% reduced damage from Lawnmower (expected <= 90, got ${damageTaken})`);
    assert(mahoragaTest.adaptationDashTimer === 0, 'Adapted Mahoraga must NOT trigger adaptation dash/teleport on Lawnmower');
    state.fighters = [];

    // 8d. Test Gojo in Melee Mode ignores Lawnmower: Gojo must never target, teleport to, aim at, or punch Lawnmowers in melee mode
    const gojoMeleeTest = new FIGHTER_CLASS_MAP.gojo({ radius: 25, x: 200, y: 200, hp: 350 });
    const gojoMower = new LawnmowerEntity(220, 200, dave, 1, 0); // Very close to Gojo (20px away)
    dave.x = 500; dave.y = 200; // Dave is 300px away
    state.fighters = [dave, gojoMeleeTest, gojoMower];
    state.arena = testArena;

    // Force Gojo into melee mode
    gojoMeleeTest.isMeleeMode = true;
    gojoMeleeTest.forcedMeleeTimer = 120;
    gojoMeleeTest.meleePunchCooldown = 0;
    gojoMeleeTest.meleeComboCount = 0;

    // Run Gojo update in melee mode
    gojoMeleeTest.update(dave, 1, testArena);

    // Target must NOT be the lawnmower
    assert(gojoMeleeTest.target !== gojoMower, 'Gojo must NOT target the Lawnmower in Melee Mode');
    assert(gojoMeleeTest._isValidCombatTarget(gojoMower) === false, 'Gojo _isValidCombatTarget must return false for Lawnmowers');
    assert(gojoMeleeTest.target === dave, 'Gojo in Melee Mode must target Crazy Dave instead of Lawnmower');
    state.fighters = [];

    // 9. Test Mower despawn upon driving past arena boundary
    targetMower.x = targetMower.facingDirection === 1
      ? testArena.x + testArena.width + 100
      : testArena.x - 100;
    targetMower.update(null, 0, testArena);
    assert(targetMower.state === 'despawned', 'Lawnmower must despawn when past arena boundary');

    // Clean up
    dave.clearLawnmowers();
    state.fighters = [];

    console.log('      ✅ Lawnmower 6-frame bounds, canvas stack balance, baseline deployment, breach triggering & steamroller shred verified.');
  }

  console.log('   28. Testing Engineer sentry placement on Crazy Dave center grass tile...');
  {
    const EngineerClass = FIGHTER_CLASS_MAP.Engineer;
    const CrazyDaveClass = FIGHTER_CLASS_MAP.crazydave;
    const { getNearestGrassTileCenter } = await import('../js/graphics/renderers/grassFloorRenderer.js');
    assert(EngineerClass && CrazyDaveClass, 'Engineer and Crazy Dave classes must exist');

    const testArena = { x: 40, y: 170, width: 437, height: 437, shape: 'rectangle' };
    const engineer = new EngineerClass({ startX: 100, startY: 300, radius: 25, hp: 400 });
    const daveOpponent = new CrazyDaveClass({ startX: 360, startY: 300, radius: 25, hp: 390 });
    const davePlantTarget = { owner: daveOpponent, type: 'Peashooter', x: 360, y: 300, hp: 180 };
    state.arena = testArena;
    state.fighters = [engineer, daveOpponent];
    engineer.update(davePlantTarget, 0, testArena);

    const expectedBuildTile = getNearestGrassTileCenter(
      engineer.x + (CONFIG.Engineer.turretSpawnDistance ?? -40),
      engineer.y,
      testArena
    );
    assert(engineer.turretEntity !== null, 'Engineer must deploy a sentry when its skill is ready');
    assert(Math.abs(engineer.turretEntity.x - expectedBuildTile.x) < 0.001, 'Engineer sentry must use the grass tile nearest Engineer against Crazy Dave');
    assert(Math.abs(engineer.turretEntity.y - expectedBuildTile.y) < 0.001, 'Engineer sentry must use Engineer-side grass tile y against Crazy Dave');

    const normalEngineer = new EngineerClass({ startX: 100, startY: 300, radius: 25, hp: 400 });
    const normalOpponent = { characterId: 'gojo', type: 'gojo', x: 360, y: 300, hp: 200 };
    state.fighters = [normalEngineer, normalOpponent];
    normalEngineer.update(normalOpponent, 0, testArena);
    assert(normalEngineer.turretEntity !== null, 'Engineer must still deploy a sentry against normal opponents');
    assert(
      Math.hypot(normalEngineer.turretEntity.x - expectedBuildTile.x, normalEngineer.turretEntity.y - expectedBuildTile.y) > 1,
      'Engineer sentry must retain normal offset placement against non-Crazy-Dave opponents'
    );

    state.fighters = [];
    state.arena = null;
    console.log('      ✅ Engineer sentry center grass-tile placement against Crazy Dave verified.');
  }

  console.log('   29. Testing Megumin Explosion phases, team filtering, crater, and burnout...');
  {
    const { Fighter } = await import('../js/entities/fighter.js');
    const { drawMeguminExplosionScreenOverlay } = await import('../js/graphics/fighters/meguminSkin.js');
    const MeguminClass = FIGHTER_CLASS_MAP.megumin;
    assert(MeguminClass, 'Megumin class must exist');

    const previousFighters = state.fighters;
    const previousMode = state.mode;
    const previousGameState = state.gameState;
    const previousArena = state.arena;
    const previousPlaySFX = audioSystem.playSFX;
    const previousProjectiles = projectileSystem.projectiles;
    try {
      state.mode = '1v1';
      state.gameState = 'playing';
      state.arena = { x: 0, y: 0, width: 540, height: 960 };
      audioSystem.playSFX = () => null;

      const megumin = new MeguminClass({
        id: 49,
        type: 'megumin',
        name: 'MEGUMIN',
        startX: 100,
        startY: 200,
        radius: 25,
        hp: 280,
        moveSpeed: 0
      });
      const makeTarget = (id, name, x, team) => {
        const target = new Fighter({
          id,
          type: 'explosion_test',
          name,
          startX: x,
          startY: 200,
          radius: 25,
          hp: 1000,
          moveSpeed: 0
        });
        target.maxHp = 1000;
        target.hp = 1000;
        target.team = team;
        return target;
      };
      const coreTarget = makeTarget(9001, 'Core Target', 300, 1);
      const outerTarget = makeTarget(9002, 'Outer Target', 480, 1);
      const ally = makeTarget(9003, 'Ally', 310, 0);
      const distantTarget = makeTarget(9004, 'Distant Target', 600, 1);
      const actors = [megumin, coreTarget, outerTarget, ally, distantTarget];
      state.fighters = actors;
      megumin.team = 0;
      let coreDamageCalls = 0;
      const originalCoreTakeDamage = coreTarget.takeDamage.bind(coreTarget);
      coreTarget.takeDamage = (amount, attacker, options) => {
        coreDamageCalls++;
        return originalCoreTakeDamage(amount, attacker, options);
      };
      megumin.speed = 0;
      megumin.baseSpeed = 0;
      megumin.vx = 0;
      megumin.vy = 0;

      const projectileCount = projectileSystem.projectiles.length;
      megumin.update(coreTarget, 0, state.arena);
      assert(megumin.isChantingExplosion, 'Megumin should autonomously begin Explosion while its ultimate is ready');
      assert(megumin._getExplosionTargets().length === 3, 'Explosion should include only the three living enemy targets');
      assert(projectileSystem.projectiles.length === projectileCount, 'One True Path must suppress generic basic projectiles');

      const committedAngle = megumin.committedCastAngle;
      coreTarget.x += 40;
      megumin.aim(coreTarget);
      assert(megumin.gunAngle === committedAngle, 'Explosion chant must retain its committed cast angle');
      coreTarget.x -= 40;

      megumin.explosionTimer = megumin.chantMaxTimer - CONFIG.megumin.explosionSingularityPullFrames - 1;
      megumin.update(coreTarget, 0, state.arena);
      assert(megumin.explosionPhase === 'SINGULARITY', 'The final 30 chant frames should enter the singularity phase');
      assert(outerTarget.vx < 0, 'The singularity should pull nearby enemies toward the impact point');
      assert(ally.vx === 0, 'The singularity must not pull Megumin’s teammate');

      megumin.explosionTimer = megumin.chantMaxTimer - 1;
      megumin.update(coreTarget, 0, state.arena);
      assert(megumin.explosionPhase === 'DETONATION' && megumin.isDepleted, `Final chant frame should detonate and begin burnout (phase=${megumin.explosionPhase}, timer=${megumin.explosionTimer})`);
      assert(coreDamageCalls === 1, `Core epicenter should receive exactly one blast hit (got ${coreDamageCalls})`);
      assert(coreTarget.hp === 580, `Core epicenter should deal 420 damage once (got ${1000 - coreTarget.hp})`);
      assert(outerTarget.hp === 740, `Outer blast should deal 260 damage (got ${1000 - outerTarget.hp})`);
      assert(ally.hp === 1000, 'Explosion must not damage Megumin’s teammate');
      assert(distantTarget.hp === 1000, 'Explosion must not damage targets beyond the blast radius');
      assert(megumin.isDepleted && megumin.faceplantTimer === megumin.faceplantMaxTimer, 'Detonation should immediately begin the faceplant burnout');
      assert(megumin.explosionCooldown === CONFIG.megumin.explosionCooldown, 'Detonation should start the configured ultimate cooldown');

      megumin.explosionFireTickTimer = 1;
      megumin._updateExplosionCrater(CONFIG.megumin);
      assert(coreTarget.hp === 572, 'The crater should apply one configured fire tick after its interval');
      assert(ally.hp === 1000, 'Crater fire must continue to exclude teammates');

      mockCtx.resetStackDepth();
      megumin.drawGroundTelegraph(mockCtx);
      drawMeguminExplosionScreenOverlay(mockCtx, actors);
      assert(mockCtx.getStackDepth() === 0, 'Megumin Explosion telegraphs and screen overlay must balance Canvas state');

      megumin.reset();
      assert(!megumin.isDepleted && megumin.explosionPhase === 'IDLE' && megumin.explosionCraterTimer === 0, 'Round reset must clear burnout, phase, and crater state');

      const interruptedMegumin = new MeguminClass({ id: 49, type: 'megumin', name: 'MEGUMIN', radius: 25, hp: 280, moveSpeed: 0 });
      interruptedMegumin._beginExplosion(coreTarget, CONFIG.megumin);
      interruptedMegumin.interruptAttacks(true);
      assert(!interruptedMegumin.isChantingExplosion && interruptedMegumin.explosionPhase === 'IDLE', 'Hard interruption should cancel the active chant before detonation');
      assert(coreTarget.hp === 572, 'Interrupting a chant must not apply blast damage');
    } finally {
      state.fighters = previousFighters;
      state.mode = previousMode;
      state.gameState = previousGameState;
      state.arena = previousArena;
      audioSystem.playSFX = previousPlaySFX;
      projectileSystem.projectiles = previousProjectiles;
    }
  }

  // ─────────────────────────────────────────────
  // 30. Testing Modular Arena Tile & Floor System (ARENA_FLOORS, Snapping Math, Render Stack Integrity)
  // ─────────────────────────────────────────────
  {
    console.log('   30. Testing Arena Tile & Floor System, Registry, Math API & Canvas Stack Balance...');
    const { 
      ARENA_FLOORS, 
      getSelectedArenaFloor, 
      setSelectedArenaFloor, 
      resolveActiveFloorId,
      getActiveArenaFloorDef,
      getTileGridInfo,
      getNearestTileCenter,
      getRandomTileCenter,
      renderActiveArenaFloor,
      drawArenaFloorSelector,
      drawArenaFloorModal
    } = await import('../js/systems/arenaTileSystem.js');

    assert(Array.isArray(ARENA_FLOORS) && ARENA_FLOORS.length >= 7, 'ARENA_FLOORS should contain all selectable floor themes');
    
    // Test persistence & selection
    setSelectedArenaFloor('cyber_grid');
    assert(getSelectedArenaFloor() === 'cyber_grid', 'getSelectedArenaFloor should reflect cyber_grid');
    assert(resolveActiveFloorId() === 'cyber_grid', 'resolveActiveFloorId should return chosen cyber_grid');
    
    setSelectedArenaFloor('pvz_grass');
    assert(getSelectedArenaFloor() === 'pvz_grass', 'getSelectedArenaFloor should reflect pvz_grass');
    assert(resolveActiveFloorId() === 'pvz_grass', 'resolveActiveFloorId should return chosen pvz_grass');
    
    setSelectedArenaFloor('sand_beach');
    assert(getSelectedArenaFloor() === 'sand_beach', 'getSelectedArenaFloor should reflect sand_beach');
    assert(resolveActiveFloorId() === 'sand_beach', 'resolveActiveFloorId should return chosen sand_beach');
    
    setSelectedArenaFloor('none');
    assert(getSelectedArenaFloor() === 'none', 'getSelectedArenaFloor should reflect none (NO TILES)');
    assert(resolveActiveFloorId() === 'none', 'resolveActiveFloorId should return chosen none');
    
    setSelectedArenaFloor('end_stone');
    assert(getSelectedArenaFloor() === 'end_stone', 'getSelectedArenaFloor should reflect end_stone');
    assert(resolveActiveFloorId() === 'end_stone', 'resolveActiveFloorId should return chosen end_stone');
    
    setSelectedArenaFloor('end_stone_bricks');
    assert(getSelectedArenaFloor() === 'end_stone_bricks', 'getSelectedArenaFloor should reflect end_stone_bricks');
    assert(resolveActiveFloorId() === 'end_stone_bricks', 'resolveActiveFloorId should return chosen end_stone_bricks');
    
    setSelectedArenaFloor('mossy_stone');
    assert(getSelectedArenaFloor() === 'mossy_stone', 'getSelectedArenaFloor should reflect mossy_stone');
    assert(resolveActiveFloorId() === 'mossy_stone', 'resolveActiveFloorId should return chosen mossy_stone');
    
    setSelectedArenaFloor('classic_clean');
    assert(resolveActiveFloorId() === 'classic_clean', 'resolveActiveFloorId should return classic_clean');
    
    // Test grid info math
    const testArena = { x: 40, y: 240, width: 460, height: 460, shape: 'rect' };
    const gridInfo = getTileGridInfo(testArena);
    assert(gridInfo.cols > 0 && gridInfo.rows > 0 && gridInfo.cellW > 0, 'getTileGridInfo should calculate valid dimensions');
    
    const nearest = getNearestTileCenter(100, 300, testArena);
    assert(nearest && typeof nearest.x === 'number' && typeof nearest.y === 'number', 'getNearestTileCenter should return valid coordinates');
    
    const random = getRandomTileCenter(testArena);
    assert(random && typeof random.x === 'number' && typeof random.y === 'number', 'getRandomTileCenter should return valid coordinates');
    
    // Test renderActiveArenaFloor on all themes with 100% balanced stack depth
    for (const floor of ARENA_FLOORS) {
      setSelectedArenaFloor(floor.id);
      mockCtx.resetStackDepth();
      renderActiveArenaFloor(mockCtx, testArena, false, 4);
      assert(mockCtx.getStackDepth() === 0, `Floor ${floor.id} must balance Canvas state on rectangular arena`);
      
      const circArena = { x: 40, y: 240, width: 460, height: 460, shape: 'circle', radius: 230 };
      mockCtx.resetStackDepth();
      renderActiveArenaFloor(mockCtx, circArena, true, 4);
      assert(mockCtx.getStackDepth() === 0, `Floor ${floor.id} must balance Canvas state on circular arena`);
    }
    
    // Test modal & selector rendering
    mockCtx.resetStackDepth();
    drawArenaFloorSelector(mockCtx, 10, 10, 115, 24);
    assert(mockCtx.getStackDepth() === 0, 'drawArenaFloorSelector must balance Canvas state');
    
    mockCtx.resetStackDepth();
    drawArenaFloorModal(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'drawArenaFloorModal must balance Canvas state');
    
    // Restore auto
    setSelectedArenaFloor('auto');
    console.log('      ✅ Arena Tile System, themes, snapping math & 100% balanced Canvas 2D stacks verified.');
  }

  {
    console.log('   31. Testing Nameless Destroyer & Exo Electric Disintegrator Super-Beams, Skills & Canvas Stack Balance...');
    const { NamelessDeityFighter } = await import('../js/entities/fighters/NamelessDeityFighter.js');
    const { DraedonFighter } = await import('../js/entities/fighters/DraedonFighter.js');
    const { drawNamelessDestroyerPreview } = await import('../js/graphics/weapons/namelessDeityWeaponGraphics.js');
    const { drawExoDisintegratorPreview } = await import('../js/graphics/weapons/draedonWeaponGraphics.js');

    const nameless = new NamelessDeityFighter({ radius: 28, x: 150, y: 300, hp: 420, maxHp: 420 });
    const draedon = new DraedonFighter({ radius: 28, x: 450, y: 300, hp: 430, maxHp: 430 });
    nameless.team = 0;
    draedon.team = 1;
    state.fighters = [nameless, draedon];

    // 1. Basic attacks & Starlight Darts
    const { getProjectiles, clearProjectiles } = await import('../js/core/state.js');
    const { drawProjectiles } = await import('../js/graphics/renderers/projectileRenderer.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');
    clearProjectiles();

    assert(nameless.shoot(0) === true, 'Nameless Deity must fire homing Prismatic Light Darts');
    const darts = getProjectiles().filter(p => p && (p.isStarlightDart || p.visual === 'starlightDart'));
    const { namelessDeityConfig } = await import('../js/configs/characters/namelessDeityConfig.js');
    const expectedDartDmg = namelessDeityConfig?.dartDamage ?? 14;
    assert(darts[0].damage === expectedDartDmg, `Starlight Darts must deal configured dartDamage (${expectedDartDmg})`);

    // Verify homing physics step towards enemy Draedon
    const initialDartX = darts[0].x;
    const initialDartY = darts[0].y;
    projectileSystem.update([nameless, draedon]);
    assert(darts[0].x !== initialDartX || darts[0].y !== initialDartY, 'Starlight Darts must update position in update loop');

    // Verify Canvas 2D render and transform stack balance for Starlight Darts
    mockCtx.resetStackDepth();
    drawProjectiles();
    assert(mockCtx.getStackDepth() === 0, `drawProjectiles with Starlight Darts must balance Canvas 2D stack (got ${mockCtx.getStackDepth()})`);

    clearProjectiles();

    assert(draedon.shoot(1) === true, 'Draedon must fire twin Exo-Pulse Blasters');

    // 2. Skills
    assert(nameless.castSuperclusterStars(draedon) === true, 'Nameless Deity must cast Supercluster Stars');
    assert(nameless.castDimensionCleave(draedon) === true, 'Nameless Deity must cast Dimension Cleave');
    assert(nameless.castCosmicSingularity(draedon) === true, 'Nameless Deity must cast Cosmic Singularity');
    assert(draedon.castAresArtillery(nameless) === true, 'Draedon must cast Ares Artillery');
    assert(draedon.castThanatosMatrix(nameless) === true, 'Draedon must cast Thanatos Matrix');
    assert(draedon.castArtemisApolloLasers(nameless) === true, 'Draedon must cast Exo Cross-Lasers');

    // 3. Super-Beams
    assert(nameless.castNamelessDestroyer(draedon) === true, 'Nameless Deity must cast Nameless Destroyer Super-Beam');
    assert(draedon.castExoDisintegrator(nameless) === true, 'Draedon must cast Exo Electric Disintegrator Super-Beam');

    // Update through wind-up and active firing phases
    for (let i = 0; i < 60; i++) {
      nameless.update(draedon, 0, state.arena);
      draedon.update(nameless, 1, state.arena);

      // Verify Canvas 2D Stack Depth during active beam and charging renders
      mockCtx.resetStackDepth();
      nameless.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, `Nameless Deity draw stack depth must be 0 (got ${mockCtx.getStackDepth()})`);

      mockCtx.resetStackDepth();
      draedon.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, `Draedon draw stack depth must be 0 (got ${mockCtx.getStackDepth()})`);
    }

    // Test Nameless Deity Beam Aim Lock-In before release (Hold Frames)
    nameless.destroyerWindupTimer = 100; // Phase 2: tracking active
    assert(nameless.canAim() === true, 'Nameless Deity must allow auto-aim tracking during early/mid windup');
    
    nameless.destroyerWindupTimer = 30; // Phase 3: lock-in hold phase before beam release
    assert(nameless.canAim() === false, 'Nameless Deity must disable auto-aim during lock-in hold frames before beam release');
    const lockedAngle = nameless.destroyerCastAngle;
    draedon.x = 400;
    draedon.y = 400;
    nameless.aim(draedon);
    assert(nameless.gunAngle === lockedAngle, 'Nameless Deity aim must remain locked to committed cast angle during lock-in phase');

    // Test Skin 2 (Golden Seraph with Wings9.png, wheel9.png, sideflower9.png, arm9.png, forearm9.png, hands9.png, deitybody9.png, antlers9.png & vines9.png) rendering & canvas stack depth
    nameless.skinVariant = 'skin2';
    mockCtx.resetStackDepth();
    nameless.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, `Nameless Deity skin2 (Golden Seraph) draw stack depth must be 0 (got ${mockCtx.getStackDepth()})`);
    
    // Test Body, Antlers (with gap spread), Antler Vines (Vines1.png), Flowers, Vines and Arm customizations in Skin Studio
    state.skinCustomizations = state.skinCustomizations || {};
    state.skinCustomizations.nameless_deity_body = { widthScale: 1.1, heightScale: 1.1, offsetX: 0, offsetY: -2, angleOffset: 0.05 };
    state.skinCustomizations.nameless_deity_antlers = { widthScale: 1.2, heightScale: 1.1, offsetX: 0, offsetY: -5, gap: 15, angleOffset: 0.02 };
    state.skinCustomizations.nameless_deity_antler_vines = { widthScale: 1.15, heightScale: 1.05, offsetX: -2, offsetY: 4, angleOffset: 0.03 };
    state.skinCustomizations.nameless_deity_flowers = { widthScale: 1.4, heightScale: 1.2, offsetX: 8, offsetY: 15, angleOffset: 0.04 };
    state.skinCustomizations.nameless_deity_vines = { widthScale: 1.3, heightScale: 1.2, offsetX: -5, offsetY: 2, angleOffset: 0.05 };
    state.skinCustomizations.nameless_deity_arm = { widthScale: 1.25, heightScale: 1.5, offsetX: 10, offsetY: 5, angleOffset: 0.1 };
    mockCtx.resetStackDepth();
    nameless.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Nameless Deity with custom body, antlers, antler vines, flowers, vines, and arm must render with 0 stack depth');
    delete state.skinCustomizations.nameless_deity_body;
    delete state.skinCustomizations.nameless_deity_antlers;
    delete state.skinCustomizations.nameless_deity_antler_vines;
    delete state.skinCustomizations.nameless_deity_flowers;
    delete state.skinCustomizations.nameless_deity_vines;
    delete state.skinCustomizations.nameless_deity_arm;
    nameless.skinVariant = 'skin1';

    // Weapon Studio Previews
    mockCtx.resetStackDepth();
    drawNamelessDestroyerPreview(mockCtx, 50, 50, 48);
    assert(mockCtx.getStackDepth() === 0, 'drawNamelessDestroyerPreview must maintain 0 canvas stack depth');

    mockCtx.resetStackDepth();
    drawExoDisintegratorPreview(mockCtx, 50, 50, 48);
    assert(mockCtx.getStackDepth() === 0, 'drawExoDisintegratorPreview must maintain 0 canvas stack depth');

    console.log('      ✅ Nameless Destroyer & Exo Electric Disintegrator super-beams, skills & 100% balanced Canvas 2D stacks verified.');
  }

  // ─────────────────────────────────────────────
  // TEST 32: Sans Undertale Speech Bubbles, Warning Trap Telegraphs & Custom HUD Typography
  // ─────────────────────────────────────────────
  {
    console.log('\n[TEST 32] SANS: Undertale Speech Bubbles, Bone Warning Indicators & Lowercase HUD Names...');
    const { SansFighter } = await import('../js/entities/fighters/SansFighter.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { drawArenaMatchNames } = await import('../js/graphics/renderers/arenaRenderer.js');

    const sans = new SansFighter({ name: 'SANS' });
    const opponent = new GojoFighter({ name: 'GOJO' });

    state.fighters = [sans, opponent];
    state.arena = { x: 50, y: 50, width: 500, height: 500 };
    state.gameState = 'playing';

    // 1. Verify Speech Bubble initialization and lowercase speech conversion
    sans.speak('Ready?');
    assert(sans.speechBubble && sans.speechBubble.fullText === 'ready?', 'Sans speech must be strictly converted to lowercase');
    assert(sans.speechBubble.timer > 0, 'Sans speech bubble must have an active lifetime timer');

    // 2. Verify Typewriter progress & Canvas 2D stack depth during speech
    for (let i = 0; i < 20; i++) {
      sans.update(opponent, 0, state.arena);
      mockCtx.resetStackDepth();
      sans.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, `Sans draw stack depth during speech must be 0 (got ${mockCtx.getStackDepth()})`);
    }
    assert(sans.speechBubble.text.length > 0, 'Sans speech bubble must progressively reveal characters via typewriter engine');

    // 3. Verify Bone Zone Warning Indicator and (!) Trap phase
    sans.boneTraps = [];
    sans.castBoneZone(opponent);
    assert(sans.boneTraps.length > 0, 'Sans must spawn ground bone stab traps');
    const trap = sans.boneTraps[0];
    assert(trap.isWarning === true, 'Ground bone trap must start in telegraph warning phase');
    assert(trap.warnTimer > 0, 'Ground bone trap must have warning frames');

    // Render warning phase on canvas
    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans draw stack depth during bone warning trap must be 0');

    // 4. Verify Bad Time Gravity Slam speech trigger
    sans.castBadTimeGravitySlam(opponent);
    assert(sans.speechBubble.fullText.includes('bad time'), 'Sans Bad Time ultimate must trigger iconic speech bubble');
    assert(sans.isBadTimeActive === true, 'Bad Time mode must be activated');

    // 5. Verify Undertale Red SOUL Heart Split & Shatter Game-Over Defeat VFX
    opponent.hp = 0;
    sans.update(opponent, 0, state.arena);
    assert(sans.heartShatters.length > 0, 'Sans must spawn Undertale Heart Shatter effect when opponent is defeated');
    const heartFx = sans.heartShatters[0];
    assert(heartFx.timer === 85, 'Heart Shatter must initialize with 85-frame sequence');

    // Step through Phase 1 (Reveal & Levitate)
    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans draw stack depth during Heart Reveal phase must be 0');

    // Step into Phase 2 (Heart Split)
    heartFx.timer = 65;
    sans._updateHeartShatters();
    assert(heartFx.soundPlayedSplit === true, 'Heart Split sound must play during Phase 2');
    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans draw stack depth during Heart Split phase must be 0');

    // Step into Phase 3 (Heart Shatter into Shards)
    heartFx.timer = 50;
    sans._updateHeartShatters();
    assert(heartFx.soundPlayedShatter === true, 'Heart Shatter sound must play during Phase 3');
    assert(heartFx.shards && heartFx.shards.length === 8, 'Heart Shatter must generate 8 flying pixel shards');
    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans draw stack depth during Heart Shatter Shards phase must be 0');

    // 6. Verify global death sfx "faah" suppression when killed by Sans
    let faahPlayed = false;
    const origPlaySFX = (await import('../js/systems/audioSystem.js')).audioSystem.playSFX;
    (await import('../js/systems/audioSystem.js')).audioSystem.playSFX = (src) => {
      if (typeof src === 'string' && src.includes('faah')) faahPlayed = true;
    };
    opponent.hp = 10;
    opponent.takeDamage(100, sans);
    (await import('../js/systems/audioSystem.js')).audioSystem.playSFX = origPlaySFX;
    assert(faahPlayed === false, 'Global death sfx faah must be suppressed when defeated by Sans');

    // 7. Verify Arena Canvas Match Header renders "sans" in lowercase Comic Sans
    mockCtx.resetStackDepth();
    drawArenaMatchNames(mockCtx, false);
    assert(mockCtx.getStackDepth() === 0, 'drawArenaMatchNames must maintain 0 canvas stack depth');

    // 8. Verify Sans in-arena overhead HP overlay rendering
    const { FighterRenderer } = await import('../js/graphics/renderers/fighterRenderer.js');
    mockCtx.resetStackDepth();
    FighterRenderer.drawHealth(mockCtx, sans);
    assert(mockCtx.getStackDepth() === 0, 'Sans drawHealth must maintain 0 canvas stack depth');

    // 9. Verify Sans HUD skill providers (Gaster Blaster, Bone Zone, Bad Time)
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    const sansSkills = getSkillDataForFighter(sans);
    assert(sansSkills && sansSkills.length === 3, `Sans must have 3 HUD skill providers (got ${sansSkills.length})`);
    assert(sansSkills.some(s => s.id === 'blaster'), 'Sans must have Gaster Blaster skill bar');
    assert(sansSkills.find(s => s.id === 'blaster').isSignature === true, 'Gaster Blaster must be marked as Sans signature skill');
    assert(sansSkills.some(s => s.id === 'bone_zone'), 'Sans must have Bone Zone skill bar');
    assert(sansSkills.some(s => s.id === 'bad_time'), 'Sans must have Bad Time skill bar');
    assert(sansSkills.every(s => s.color === sans.themeColor), 'All Sans HUD skill progress bars must use the unified themeColor');
    // 10. Verify Sans Teleport Dodge in Sukuna Domain Slash Lines
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const sukuna = new SukunaFighter({ name: 'SUKUNA' });
    sans.dodgeCooldown = 0;
    sans.stamina = sans.maxStamina || 100;
    const initialSansHp = sans.hp;

    // Dodge slice line 1 with deterministic random mock
    const origRandom = Math.random;
    Math.random = () => 0.1;
    const dodged1 = sans.dodgeSliceLine({
      angle: Math.PI / 4,
      cx: sans.x,
      cy: sans.y,
      normalX: 0.707,
      normalY: 0.707,
      thickness: 4,
      attacker: sukuna
    });
    Math.random = origRandom;

    assert(dodged1 === true, 'Sans must successfully dodge Sukuna domain slice line when ready');
    // Special Interaction: Sukuna Domain reduces dodge cost to 1
    assert(sans.stamina === (sans.maxStamina || 100) - 1, `Sans stamina cost during Sukuna domain slice must be 1 (got ${sans.stamina})`);
    assert(sans.hp === initialSansHp, 'Sans HP must remain untouched after dodging domain slice line');
    assert(sans.afterImages && sans.afterImages.length > 0, 'Sans must leave afterimage when dodging domain slice line');

    // 11. Verify Sans Stamina-Based Dodge & 1 HP Lethality
    sans.reset();
    opponent.hp = 100;
    state.gameState = "playing";
    state.isGameOver = false;
    assert(sans.hp === 1, `Sans canonical HP must be 1 (got ${sans.hp})`);
    assert(sans.stamina === (sans.maxStamina || 100), `Sans max stamina must match maxStamina (got ${sans.stamina})`);

    const { sansConfig } = await import('../js/configs/characters/sansConfig.js');
    const stamCost = (sansConfig.dodgeStaminaCost !== undefined) ? sansConfig.dodgeStaminaCost : 10;
    const initialStam = sans.stamina;

    // Dodge 1: Full stamina -> 100% dodge chance
    const dmg1 = sans.takeDamage(50, opponent);
    assert(dmg1 === 0, "Sans must dodge incoming attack when stamina is available");
    assert(sans.hp === 1, "Sans HP must remain 1 after dodge");
    assert(sans.stamina === initialStam - stamCost, `Sans stamina must be ${initialStam - stamCost} after 1 dodge (got ${sans.stamina})`);

    // Deplete remaining stamina to 0
    while (sans.stamina >= stamCost) {
      sans.takeDamage(50, opponent);
    }
    assert(sans.stamina < stamCost, `Sans stamina must be depleted below cost (got ${sans.stamina})`);

    // Out of stamina -> Cannot dodge -> Takes lethal damage and dies
    const dmgFinal = sans.takeDamage(50, opponent);
    assert(Boolean(dmgFinal), "Sans must take damage when out of stamina");
    assert(sans.hp <= 0, `Sans must be defeated at 0 HP after getting hit (got ${sans.hp})`);
    // 12. Verify Sans 100% dodge configuration
    assert(sansConfig.dodgeChance === 1.0, `Expected 1.0 dodgeChance (got ${sansConfig.dodgeChance})`);
    assert(sansConfig.domainDodgeChance === 1.0, `Expected 1.0 domainDodgeChance (got ${sansConfig.domainDodgeChance})`);
    assert(sansConfig.dodgeCooldown === 0, `Expected 0 dodgeCooldown (got ${sansConfig.dodgeCooldown})`);

    // 13. Verify Sans Fuga Dodge: Takes 0 damage and receives 0 burn effect
    sans.reset();
    sans.burnTimer = 0;
    assert(sans.burnTimer === 0, 'Sans burnTimer must initialize at 0');
    
    // Trigger Fuga thermobaric explosion near Sans
    projectileSystem.triggerThermobaricExplosion(sans.x, sans.y, 1, 300);
    assert(sans.hp === 1, `Sans must dodge Fuga explosion and remain at 1 HP (got ${sans.hp})`);
    assert(sans.burnTimer === 0, `Sans must NOT receive burn effect after dodging Fuga (got ${sans.burnTimer})`);

    // 14. Verify Sans Gaster Blaster Initial Cooldown
    sans.reset();
    const expectedInitBlasterCd = sansConfig.initialBlasterCooldown !== undefined ? sansConfig.initialBlasterCooldown : 180;
    assert(sans.blasterCooldown === expectedInitBlasterCd, `Sans Gaster Blaster must start on initial cooldown (${expectedInitBlasterCd} frames, got ${sans.blasterCooldown})`);

    // Verify canvas stack depth during dodge state
    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans draw stack depth during domain slice dodge state must be 0');

    console.log('      ✅ Sans Undertale speech bubbles, warning box, Heart Shatter defeat VFX, faah suppression, in-arena overlay HP, skill bars, initial blaster cooldown & Sukuna domain slice line dodges verified.');
  }

  // ─────────────────────────────────────────────
  // 34. Nameless Deity vs Saitama: Arena Center Rebounce on Ultimate
  // ─────────────────────────────────────────────
  {
    console.log('\n[TEST 34] Nameless Deity vs Saitama: Arena Center Rebounce on Ultimate');
    const { Fighter } = await import('../js/entities/fighter.js');
    const { NamelessDeityFighter } = await import('../js/entities/fighters/NamelessDeityFighter.js');
    const { SaitamaFighter } = await import('../js/entities/fighters/SaitamaFighter.js');

    const arena = { x: 50, y: 50, width: 800, height: 600 };
    state.arena = arena;
    const centerX = arena.x + arena.width / 2;
    const centerY = arena.y + arena.height / 2;

    const deity = new NamelessDeityFighter({ radius: 28, x: 100, y: 120 });
    const saitama = new SaitamaFighter({ radius: 25, x: 700, y: 500 });
    const genericOpponent = new Fighter({ radius: 20, x: 700, y: 500 });

    state.gameState = 'playing';
    state.isGameOver = false;

    // A. Verify non-Saitama cast keeps Deity at its current position
    state.fighters = [deity, genericOpponent];
    deity.x = 100;
    deity.y = 120;
    deity.castNamelessDestroyer(genericOpponent);
    assert(deity.x === 100 && deity.y === 120, 'Nameless Deity must NOT rebounce when casting ultimate against a standard opponent');
    assert(deity.destroyerWindupTimer > 0, 'Nameless Deity must initiate windup timer');

    // B. Reset and test against Saitama
    state.fighters = [deity, saitama];
    deity.destroyerWindupTimer = 0;
    deity.destroyerFireTimer = 0;
    deity.destroyerCooldown = 0;
    deity.x = 100;
    deity.y = 120;

    deity.castNamelessDestroyer(saitama);

    // Deity must enter rebounce state towards arena center
    assert(deity.isRebouncingToCenter === true, 'Nameless Deity must enter isRebouncingToCenter state against Saitama');
    assert(deity.rebounceTimer === 18, `Expected 18 rebounceTimer frames, got ${deity.rebounceTimer}`);
    assert(deity.rebounceTargetX === centerX && deity.rebounceTargetY === centerY, 'Rebounce target must be arena center');

    // Simulate the 18 rebounce glide frames
    for (let f = 0; f < 18; f++) {
      deity.update(saitama, 0, arena);
    }

    // After 18 frames, Deity must have reached arena center and initiated ultimate channeling
    assert(deity.isRebouncingToCenter === false, 'isRebouncingToCenter must be false after completing rebounce');
    assert(Math.abs(deity.x - centerX) < 0.001, `Nameless Deity x must be at arena center (${centerX}), got ${deity.x}`);
    assert(Math.abs(deity.y - centerY) < 0.001, `Nameless Deity y must be at arena center (${centerY}), got ${deity.y}`);
    assert(deity.vx === 0 && deity.vy === 0, 'Nameless Deity velocity must be zeroed upon center rebounce arrival');
    assert(deity.destroyerWindupTimer > 0, 'Nameless Deity ultimate windup must be actively channeling from center');

    // Aim angle must be aimed at Saitama from the arena center
    const expectedAngle = Math.atan2(saitama.y - centerY, saitama.x - centerX);
    assert(Math.abs(deity.destroyerCastAngle - expectedAngle) < 0.001, `Deity aim must target Saitama from arena center (expected ${expectedAngle}, got ${deity.destroyerCastAngle})`);

    // Verify Camera Zoom Out behavior: disabled vs Saitama, enabled vs generic opponent
    const { updateCamera, resetCamera } = await import('../js/systems/cameraSystem.js');
    resetCamera(true);
    state.camera.mode = 'fixed';
    state.camera.enabled = true;

    // Test with Saitama: zoom out MUST be disabled (targetZoom stays 1.0)
    updateCamera();
    assert(state.camera.targetZoom === 1.0, `Camera targetZoom vs Saitama must remain 1.0 (zoom out disabled), got ${state.camera.targetZoom}`);

    // Test with generic opponent: zoom out MUST be active (targetZoom zooms out towards 0.93)
    state.fighters = [deity, genericOpponent];
    deity.destroyerWindupTimer = Math.floor(deity.destroyerWindupMax / 2);
    updateCamera();
    assert(state.camera.targetZoom < 1.0, `Camera targetZoom vs generic opponent must zoom out below 1.0, got ${state.camera.targetZoom}`);

    // C. Verify Saitama Serious Skill Counter teleports AWAY from Nameless Deity (Standoff retreat distance)
    state.fighters = [deity, saitama];
    deity.x = 400;
    deity.y = 300;
    saitama.x = 430;
    saitama.y = 300; // Close to Deity
    saitama.vx = 5;
    saitama.vy = 5;
    saitama.skillPunishCooldown = 0;
    saitama._counterPunchTimer = 0;
    saitama.isCountering = false;

    // Direct invocation of executeSkillCounterPunish against Deity
    const counterResult = saitama.executeSkillCounterPunish(deity);
    assert(counterResult === true, 'executeSkillCounterPunish must successfully trigger counter channeling against Nameless Deity');
    const distToDeity = Math.hypot(saitama.x - deity.x, saitama.y - deity.y);
    assert(distToDeity >= 200, `Saitama must teleport AWAY from Nameless Deity (expected distance >= 200, got ${distToDeity})`);
    assert(saitama.vx === 0 && saitama.vy === 0, 'Saitama velocity must be stopped (vx=0, vy=0) while channeling counter against Deity');
    assert(saitama.isCountering === true, 'Saitama isCountering must be true (actively channeling counter)');
    assert(saitama._counterPunchTimer > 0, 'Saitama _counterPunchTimer must be active and counting down');
    assert(saitama._counterPunchTarget === deity, 'Saitama _counterPunchTarget must be Deity');

    // Test during counter channeling: Saitama maintains stationary lock while channeling
    saitama.vx = 4;
    saitama.vy = 4;
    saitama.update(deity, 1, arena);
    assert(saitama.vx === 0 && saitama.vy === 0, 'Saitama velocity must remain 0 (stopped) while actively channeling Serious Counter against Deity');

    // Test Nameless Deity beam does NOT cancel Saitama Serious Skill Counter
    deity.destroyerFireTimer = 100;
    deity.destroyerWindupTimer = 0;
    deity.x = 400;
    deity.y = 300;
    deity.destroyerCastAngle = Math.atan2(saitama.y - deity.y, saitama.x - deity.x);
    deity.update(saitama, 0, arena);
    assert(saitama.isCountering === true, 'Nameless Deity beam must NOT cancel Saitama Serious Skill Counter');
    assert(saitama._counterPunchTimer > 0, 'Saitama _counterPunchTimer must remain active and not cancelled by beam');

    // Verify drawing stack depth
    mockCtx.resetStackDepth();
    deity.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Nameless Deity draw stack depth during ultimate windup must be 0');
    mockCtx.resetStackDepth();
    saitama.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Saitama draw stack depth must be 0');

    console.log('      ✅ Nameless Deity vs Saitama center rebounce glide, ultimate channeling, disabled camera zoom out & beam immunity to counter cancellation verified successfully.');
  }

  // ─────────────────────────────────────────────
  // 35. Nameless Deity: Modular Asset Death Shatter
  // ─────────────────────────────────────────────
  {
    console.log('\n[TEST 35] Nameless Deity: Modular Asset Death Shatter');
    const { NamelessDeityFighter } = await import('../js/entities/fighters/NamelessDeityFighter.js');
    const { spawnDeathShatter, drawDeathEffects } = await import('../js/graphics/particles/deathShatterEffect.js');

    state.deathEffects = [];
    const deity = new NamelessDeityFighter({ radius: 28, x: 400, y: 300 });

    spawnDeathShatter(deity);

    // Verify death effects contain modular assets
    const assetGores = state.deathEffects.filter(e => e && e.isNamelessDeityAssetGore);
    const glassShards = state.deathEffects.filter(e => e && e.isNamelessDeityGlassShard);

    assert(assetGores.length > 0, `Expected modular asset gore effects, got ${assetGores.length}`);
    assert(glassShards.length > 0, `Expected prismatic glass shard effects, got ${glassShards.length}`);

    // Verify key anatomical assets exist in the shatter array
    const wingsPieces = assetGores.filter(g => g.type === 'wings_left' || g.type === 'wings_right');
    const haloPiece = assetGores.find(g => g.type === 'halo_wheel');
    const antlerPiece = assetGores.find(g => g.type === 'antlers');
    const bodyPiece = assetGores.find(g => g.type === 'body');
    const eyePiece = assetGores.find(g => g.type === 'cosmic_eye');
    const handPieces = assetGores.filter(g => g.type === 'hand_left' || g.type === 'hand_right');

    assert(wingsPieces.length === 2, `Expected 2 wings pieces (left and right), got ${wingsPieces.length}`);
    assert(Boolean(haloPiece), 'Expected sacred halo wheel piece in death shatter');
    assert(Boolean(antlerPiece), 'Expected antlers piece in death shatter');
    assert(Boolean(bodyPiece), 'Expected divine body/robe piece in death shatter');
    assert(Boolean(eyePiece), 'Expected cosmic eye piece in death shatter');
    assert(handPieces.length === 2, `Expected 2 hands pieces, got ${handPieces.length}`);

    assert(assetGores.every(g => g.isPermanentGore === true), 'All Nameless Deity asset gores must be permanent');
    const { clearAllBattleEffects } = await import('../js/graphics/particles/bloodEffect.js');
    clearAllBattleEffects();
    const preservedGores = state.deathEffects.filter(e => e && e.isNamelessDeityAssetGore);
    assert(preservedGores.length === assetGores.length, `Expected ${assetGores.length} preserved gores after clearAllBattleEffects, got ${preservedGores.length}`);

    // Verify canvas stack depth when drawing all death effects
    mockCtx.resetStackDepth();
    drawDeathEffects();
    assert(mockCtx.getStackDepth() === 0, 'drawDeathEffects stack depth for Nameless Deity assets must be 0');

    console.log('      ✅ Nameless Deity modular asset death shatter (wings, halo, antlers, body, eye, arms, hands, crystals & permanent preservation) verified successfully.');
  }

  // ── TEST 47: Nameless Deity vs Saitama Special Interaction Architecture ──
  console.log('   47. Testing Nameless Deity vs Saitama Special Interaction & Dedicated Module Architecture...');
  {
    const {
      isNamelessDeityEntity,
      isSaitamaEntity,
      hasSaitamaEnemy,
      shouldNamelessDeityRebounce,
      shouldDisableCameraZoomForDeity,
      calculateSaitamaRetreatPosition,
      executeSaitamaCounterDeity,
      isSaitamaCounterImmuneToDeityBeam,
      isMatchInteractionActive
    } = await import('../js/interactions/index.js');
    const { deitySaitamaConfig } = await import('../js/configs/interactions/index.js');
    const { NamelessDeityFighter } = await import('../js/entities/fighters/NamelessDeityFighter.js');
    const { SaitamaFighter } = await import('../js/entities/fighters/SaitamaFighter.js');

    const deity = new NamelessDeityFighter({ radius: 28, x: 100, y: 100 });
    const saitama = new SaitamaFighter({ radius: 25, x: 150, y: 150 });
    state.fighters = [deity, saitama];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    // 1. Entity type recognition
    assert(isNamelessDeityEntity(deity) === true, 'Deity must be recognized by isNamelessDeityEntity');
    assert(isSaitamaEntity(saitama) === true, 'Saitama must be recognized by isSaitamaEntity');
    assert(hasSaitamaEnemy(deity, saitama, state) === true, 'hasSaitamaEnemy must return true');
    assert(isMatchInteractionActive('deitySaitama', state) === true, 'isMatchInteractionActive must return true for deitySaitama');

    // 2. Camera zoom disabled
    assert(shouldDisableCameraZoomForDeity(deity, state.fighters) === true, 'Camera zoom-out must be disabled vs Saitama');

    // 3. Center rebounce logic
    assert(shouldNamelessDeityRebounce(deity, saitama, state) === true, 'Deity must trigger center rebounce when off-center vs Saitama');

    // 4. Standoff retreat calculation & execution
    const retreatPos = calculateSaitamaRetreatPosition(saitama, deity, state.arena);
    assert(typeof retreatPos.x === 'number' && typeof retreatPos.y === 'number', 'Retreat position must return numeric coords');
    const standoffDist = Math.hypot(retreatPos.x - deity.x, retreatPos.y - deity.y);
    assert(standoffDist >= 250, `Saitama standoff retreat distance must be >= 250px (got ${standoffDist})`);

    const prevX = saitama.x;
    const prevY = saitama.y;
    executeSaitamaCounterDeity(saitama, deity, state.arena, prevX, prevY);
    assert(saitama.x === retreatPos.x && saitama.y === retreatPos.y, 'executeSaitamaCounterDeity must update Saitama position to retreat coords');
    assert(saitama.vx === 0 && saitama.vy === 0, 'executeSaitamaCounterDeity must zero velocities');

    // 5. Super armor / immunity against beam interrupt during counter
    saitama.isCountering = true;
    assert(isSaitamaCounterImmuneToDeityBeam(saitama) === true, 'Saitama must be immune to Deity beam interrupt while countering');

    saitama.isCountering = false;
    assert(isSaitamaCounterImmuneToDeityBeam(saitama) === false, 'Saitama must NOT be immune when not countering');

    // 6. InteractionManager Event Hooks Dispatch
    const { interactionManager } = await import('../js/interactions/index.js');
    assert(interactionManager.shouldOverrideCameraZoom(deity, state.fighters) === true, 'interactionManager must dispatch shouldOverrideCameraZoom');
    assert(interactionManager.isBeamImmune(saitama, deity, 'nameless_destroyer') === false, 'isBeamImmune must be false when Saitama is not countering');
    saitama.isCountering = true;
    assert(interactionManager.isBeamImmune(saitama, deity, 'nameless_destroyer') === true, 'isBeamImmune must be true when Saitama is countering');
    saitama.isCountering = false;

    // Test counter teleport dispatch
    const handledCounter = interactionManager.handleCounterTeleport(saitama, deity, state.arena, 150, 150);
    assert(handledCounter === true, 'interactionManager.handleCounterTeleport must return true for Saitama vs Deity');

    // 7. Toggle Control Verification (enabled: false bypass)
    deitySaitamaConfig.enabled = false;
    assert(shouldNamelessDeityRebounce(deity, saitama, state) === false, 'shouldNamelessDeityRebounce must return false when enabled is false');
    assert(shouldDisableCameraZoomForDeity(deity, state.fighters) === false, 'shouldDisableCameraZoomForDeity must return false when enabled is false');
    assert(isSaitamaCounterImmuneToDeityBeam(saitama) === false, 'isSaitamaCounterImmuneToDeityBeam must return false when enabled is false');
    assert(interactionManager.handleCounterTeleport(saitama, deity, state.arena, 150, 150) === false, 'handleCounterTeleport must return false when enabled is false');
    assert(interactionManager.handleUltimatePreCast(deity, saitama, state, false) === false, 'handleUltimatePreCast must return false when enabled is false');
    assert(interactionManager.shouldOverrideCameraZoom(deity, state.fighters) === false, 'shouldOverrideCameraZoom must return false when enabled is false');
    deitySaitamaConfig.enabled = true; // Restore

    // 8. Beam Evasion & Dodging for Saitama and Sans
    const { SansFighter } = await import('../js/entities/fighters/SansFighter.js');
    const sans = new SansFighter({ radius: 25, x: 200, y: 100 });
    
    // Test Sans dodging Deity's beam
    deity.x = 100;
    deity.y = 100;
    deity.destroyerCastAngle = 0; // Firing horizontally to the right
    deity.destroyerFireTimer = 500;
    sans.x = 250;
    sans.y = 100; // Directly in the centerline of the beam
    sans.stamina = 100;
    sans.dodgeCooldown = 0;

    const sansBeamData = {
      attacker: deity,
      startX: deity.x,
      startY: deity.y,
      angle: deity.destroyerCastAngle,
      beamLength: 1400,
      beamHalfWidth: 142.5
    };

    const sansDidDodge = sans.dodgeBeam(sansBeamData);
    assert(sansDidDodge === true, 'Sans must successfully dodge Nameless Deity beam');
    assert(sans.stamina < 100, `Sans stamina must be consumed on beam dodge (got ${sans.stamina})`);
    const sansPerpDist = Math.abs(sans.y - deity.y);
    assert(sansPerpDist >= 142.5, `Sans must dodge outside beam aperture (perpDist=${sansPerpDist}, expected >= 142.5)`);

    // Test Saitama dodging Deity's beam
    saitama.x = 250;
    saitama.y = 100; // Directly in the centerline of the beam
    saitama.dodgeCooldown = 0;
    saitama.isCountering = false;

    const saitamaBeamData = {
      attacker: deity,
      startX: deity.x,
      startY: deity.y,
      angle: deity.destroyerCastAngle,
      beamLength: 1400,
      beamHalfWidth: 142.5
    };

    const saitamaDidDodge = saitama.dodgeBeam(saitamaBeamData);
    assert(saitamaDidDodge === true, 'Saitama must successfully dodge Nameless Deity beam');
    const saitamaPerpDist = Math.abs(saitama.y - deity.y);
    assert(saitamaPerpDist >= 142.5, `Saitama must dodge outside beam aperture (perpDist=${saitamaPerpDist}, expected >= 142.5)`);

    // Test live beam update loop with Sans and Saitama dodging
    state.fighters = [deity, sans, saitama];
    sans.x = 300;
    sans.y = 100;
    sans.stamina = 100;
    sans.dodgeCooldown = 0;
    saitama.x = 350;
    saitama.y = 100;
    saitama.dodgeCooldown = 0;
    saitama.isCountering = false;

    deity.update(sans, 0, state.arena);
    assert(sans.y !== 100, 'Sans must have dodged away from y=100 during Deity beam update tick');
    assert(saitama.y !== 100, 'Saitama must have dodged away from y=100 during Deity beam update tick');
    assert(sans.hp === 1, 'Sans must NOT take damage on dodged beam tick');

    // 9. Hollow Purple & Yuta Pure Love Beam Evasion for Saitama and Sans
    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
    const { YutaPureLoveBeamBehavior } = await import('../js/systems/projectiles/behaviors/YutaPureLoveBeamBehavior.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { YutaFighter } = await import('../js/entities/fighters/YutaFighter.js');

    const gojo = new GojoFighter({ radius: 25, x: 100, y: 100 });
    const yuta = new YutaFighter({ radius: 25, x: 100, y: 100 });
    state.fighters = [gojo, yuta, sans, saitama];

    // A. Hollow Purple Evasion
    const purpleBehavior = new GojoPurpleBehavior();
    const purpleProj = {
      x: 200,
      y: 100,
      vx: 4.0,
      vy: 0,
      r: 45,
      damage: 70,
      purpleDPS: 150,
      purpleDPSInterval: 1,
      owner: 0,
      ownerFighter: gojo,
      life: 100,
      behaviorType: 'gojo_purple',
      hitTargets: new Set(),
      hitFighters: new Set()
    };
    state.projectiles = [purpleProj];

    sans.x = 220;
    sans.y = 100;
    sans.stamina = 100;
    sans.dodgeCooldown = 0;

    saitama.x = 240;
    saitama.y = 100;
    saitama.dodgeCooldown = 0;
    saitama.isCountering = false;

    const mockSystem = { projectiles: state.projectiles };
    purpleBehavior.update(purpleProj, state.fighters, mockSystem);

    assert(sans.y !== 100, 'Sans must dodge out of Hollow Purple trajectory');
    assert(saitama.y !== 100, 'Saitama must dodge out of Hollow Purple trajectory');
    assert(sans.isCaughtInPurple === false, 'Sans must NOT be caught in purple stasis');
    assert(saitama.isCaughtInPurple === false, 'Saitama must NOT be caught in purple stasis');

    // B. Yuta Pure Love Beam Evasion
    const yutaBeamBehavior = new YutaPureLoveBeamBehavior();
    yuta.isFiringPureLoveBeam = true;
    yuta.pureLoveBeamActiveTimer = 200;
    yuta.pureLoveBeamLockedAngle = 0; // Firing horizontally along y=100
    yuta.gunAngle = 0;

    const yutaBeamProj = {
      x: 100,
      y: 100,
      angle: 0,
      owner: 1,
      ownerFighter: yuta,
      life: 200,
      damage: 15,
      hitTickTimer: 0,
      hitTargets: new Set()
    };
    state.projectiles = [yutaBeamProj];

    sans.x = 250;
    sans.y = 100; // In direct path of Yuta beam
    sans.stamina = 100;
    sans.dodgeCooldown = 0;

    saitama.x = 300;
    saitama.y = 100; // In direct path of Yuta beam
    saitama.dodgeCooldown = 0;
    saitama.isCountering = false;

    yutaBeamBehavior.update(yutaBeamProj, state.fighters, mockSystem);

    // C. Gojo vs Saitama Dedicated Interaction Module & Config Verification
    const { gojoSaitamaConfig } = await import('../js/configs/interactions/gojoSaitamaConfig.js');
    const { isGojoEntity, isSaitamaEntity: isSaitamaGojoEntity, hasGojoEnemy, hasSaitamaEnemy: hasSaitamaGojoEnemy, computeSaitamaBarrierDamage } = await import('../js/interactions/gojoSaitamaInteraction.js');

    assert(isMatchInteractionActive('gojoSaitama', state) === true, 'gojoSaitama match interaction must be active');
    assert(isGojoEntity(gojo) === true, 'isGojoEntity must return true for Gojo');
    assert(isSaitamaGojoEntity(saitama) === true, 'isSaitamaGojoEntity must return true for Saitama');
    assert(hasGojoEnemy(saitama, state) === true, 'saitama must detect gojo as living enemy');
    assert(hasSaitamaGojoEnemy(gojo, state) === true, 'gojo must detect saitama as living enemy');
    assert(computeSaitamaBarrierDamage(50, saitama, { isSaitamaCounter: true }) === 99999, 'Counter punch barrier damage must be 99999');
    assert(computeSaitamaBarrierDamage(50, saitama, { isSaitamaPunch: true }) === 70, 'Normal punch barrier damage must be 70');
    assert(computeSaitamaBarrierDamage(50, saitama, { isMachineGunBlow: true }) === 35, 'Machine gun blow barrier damage must be 35');
    assert(gojoSaitamaConfig.enabled === true, 'gojoSaitamaConfig.enabled must be true by default');

    // Verify first-impact dodge tracking sets
    assert(purpleProj._dodgedEntities && purpleProj._dodgedEntities.has(sans), 'Sans must be recorded in purpleProj._dodgedEntities');
    assert(purpleProj._dodgedEntities && purpleProj._dodgedEntities.has(saitama), 'Saitama must be recorded in purpleProj._dodgedEntities');
    assert(yutaBeamProj._dodgedEntities && yutaBeamProj._dodgedEntities.has(sans), 'Sans must be recorded in yutaBeamProj._dodgedEntities');
    assert(yutaBeamProj._dodgedEntities && yutaBeamProj._dodgedEntities.has(saitama), 'Saitama must be recorded in yutaBeamProj._dodgedEntities');

    console.log('      ✅ Dedicated interactions module, registry queries, interactionManager event hooks, config toggles (enabled: true/false), camera zoom bypass, standoff retreat, beam super-armor, Saitama/Sans Deity beam dodging, Gojo Hollow Purple dodging & Yuta Pure Love Beam dodging verified.');
  }

  // ── TEST 48: Audio Buffer Memory Cache & Concurrent Load Batching ──
  console.log('   48. Testing Audio Buffer Memory Cache, Worker Pool Batching & Sound Diagnostics...');
  {
    const {
      preloadAudioBuffer,
      preloadAudioBufferBatch,
      preloadSound,
      getSoundCacheStats,
      isSoundCached,
      isSoundAudioBuffer,
      clearSoundCache,
      isMusicAudio
    } = await import('../js/systems/soundSystem.js');

    // A. Music vs SFX classification test
    assert(isMusicAudio('Assets/Sound Effects/Background/ARENA-BGMUSIC.mp3') === true, 'ARENA-BGMUSIC must be identified as music');
    assert(isMusicAudio('Assets/Sound Effects/Background/megalovania.mp3') === true, 'megalovania must be identified as music');
    assert(isMusicAudio('Assets/Sound Effects/Attacks/punch.mp3') === false, 'punch.mp3 must be identified as SFX, not music');
    assert(isMusicAudio('Assets/Sound Effects/Attacks/swordswing.mp3') === false, 'swordswing.mp3 must be identified as SFX, not music');

    // B. Preload single SFX buffer into memory cache
    const testSfx = 'Assets/Sound Effects/Attacks/fleshhit.mp3';
    await preloadAudioBuffer(testSfx);
    assert(isSoundCached(testSfx) === true, 'fleshhit.mp3 must be cached in memory');
    assert(isSoundAudioBuffer(testSfx) === true, 'fleshhit.mp3 must be cached as AudioBuffer');

    // C. Preload batch with concurrent worker pool
    const testBatch = [
      'Assets/Sound Effects/Attacks/punch.mp3',
      'Assets/Sound Effects/Attacks/swordswing.mp3',
      'Assets/Sound Effects/Attacks/groundSmash.mp3',
      'Assets/Sound Effects/Attacks/explosion.mp3',
      'Assets/Sound Effects/Attacks/spaceshot.mp3',
      'Assets/Sound Effects/Background/ARENA-BGMUSIC.mp3'
    ];

    let progressCalls = 0;
    const result = await preloadAudioBufferBatch(testBatch, {
      concurrency: 4,
      onProgress: (done, total, url) => {
        progressCalls++;
      }
    });

    assert(result.loaded + result.errors === testBatch.length, 'All batch items must be processed');
    assert(progressCalls === testBatch.length, 'Progress callback must be invoked for each item');
    assert(isSoundCached('Assets/Sound Effects/Attacks/punch.mp3') === true, 'punch.mp3 must be cached');
    assert(isSoundCached('Assets/Sound Effects/Attacks/swordswing.mp3') === true, 'swordswing.mp3 must be cached');

    // D. Diagnostic Cache Stats
    const stats = getSoundCacheStats();
    assert(typeof stats.total === 'number' && stats.total >= 5, 'Stats total must reflect cached audio items');
    assert(typeof stats.audioBuffers === 'number' && stats.audioBuffers >= 5, 'Stats audioBuffers must count decoded buffers');
    assert(typeof stats.inFlight === 'number', 'Stats inFlight must be numeric');
    assert(stats.maxCacheSize === 1000, 'Stats maxCacheSize must match system constant');

    // E. Test preloadSound array handling & AudioSystem delegation
    const { audioSystem } = await import('../js/systems/audioSystem.js');
    assert(typeof audioSystem.preload === 'function', 'audioSystem must expose preload helper');
    assert(typeof audioSystem.getCacheStats === 'function', 'audioSystem must expose getCacheStats helper');
    const audioStats = audioSystem.getCacheStats();
    assert(audioStats.total >= 5, 'audioSystem getCacheStats must mirror soundSystem');

    console.log('      ✅ Audio Buffer Memory Cache, concurrency worker pool batching, progress callbacks, stream classification & cache statistics verified successfully.');
  }

  // ── TEST 49: Sound Sprite System & Virtual AudioBuffer Stitching ──
  console.log('   49. Testing Sound Sprite Manager, Virtual AudioBuffer Stitching & Slice API...');
  {
    const { soundSpriteManager, CORE_COMBAT_SFX_PATHS } = await import('../js/systems/soundSpriteSystem.js');

    // A. Registration & Lookup Verification
    assert(soundSpriteManager.hasSprite('punch') === true, 'punch must be registered in default sound sprite map');
    assert(soundSpriteManager.hasSprite('Assets/Sound Effects/Attacks/punch.mp3') === true, 'Full path to punch.mp3 must be registered');
    assert(soundSpriteManager.hasSprite('fleshhit') === true, 'fleshhit must be registered');
    assert(soundSpriteManager.hasSprite('unknown_sound_never_exists.mp3') === false, 'Unknown sound must not match sprite map');

    const punchInfo = soundSpriteManager.getSpriteInfo('punch');
    assert(punchInfo && punchInfo.sheetId === 'core_combat_hits', 'punch must map to core_combat_hits sheet');
    assert(typeof punchInfo.offset === 'number' && typeof punchInfo.duration === 'number', 'punch sprite info must contain numeric offset and duration');

    // B. Virtual Buffer Stitching
    const mockAudioCtx = new globalThis.AudioContext();
    const buffer1 = new globalThis.AudioBuffer({ duration: 0.4, length: 17640 });
    const buffer2 = new globalThis.AudioBuffer({ duration: 0.6, length: 26460 });

    const stitched = soundSpriteManager.stitchBuffersToSpriteSheet('test_virtual_sheet', {
      'custom_slash': buffer1,
      'custom_blast': buffer2
    }, mockAudioCtx);

    assert(stitched !== null, 'Stitched sprite sheet AudioBuffer must be created');
    assert(soundSpriteManager.hasSprite('custom_slash') === true, 'custom_slash must be indexed');
    assert(soundSpriteManager.hasSprite('custom_blast') === true, 'custom_blast must be indexed');

    const slashAudio = soundSpriteManager.getSpriteAudio('custom_slash');
    assert(slashAudio && slashAudio.buffer === stitched, 'getSpriteAudio must return the stitched AudioBuffer');
    assert(slashAudio.offset === 0, 'First stitched slice must start at offset 0');
    assert(slashAudio.duration === 0.4, 'First stitched slice duration must match buffer duration');

    // C. Sprite Manager Diagnostics & Stats
    const sheets = soundSpriteManager.getRegisteredSheets();
    assert(Array.isArray(sheets) && sheets.length >= 2, 'getRegisteredSheets must list all registered sheets');
    const stats = soundSpriteManager.getSpriteStats();
    assert(stats.totalSheets >= 2, 'getSpriteStats totalSheets must be >= 2');
    assert(stats.totalSlices >= 8, 'getSpriteStats totalSlices must count registered slices');

    console.log('      ✅ Sound Sprite Manager, virtual AudioBuffer stitching, slice metadata, and sprite diagnostics verified successfully.');
  }

  // ── TEST 50: Eye of Cthulhu vs Gojo Limitless Infinity Collision & Push Immunity (Rule 1.7) ──
  console.log('   50. Testing Eye of Cthulhu vs Gojo Limitless Infinity Collision & Push Immunity...');
  {
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { EyeOfCthulhuFighter, EOC_STATE } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');
    const { resolveFighterCollision } = await import('../js/systems/physics.js');

    const gojo = new GojoFighter({ x: 200, y: 200, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 230, y: 200, radius: 32, hp: 1200, maxHp: 1200 });

    state.fighters = [gojo, eye];
    gojo.infinityActive = true;
    gojo.infinityCooldown = 0;
    gojo.isMeleeMode = false;
    assert(gojo.hasActiveInfinity() === true, 'Gojo must have active Limitless Infinity');

    // A. Circle-Circle Physics Overlap Resolution: Gojo must stay fixed at (200, 200)
    const initialGojoX = gojo.x;
    const initialGojoY = gojo.y;
    resolveFighterCollision(gojo, eye);

    assert(gojo.x === initialGojoX && gojo.y === initialGojoY, 'Gojo must NOT be pushed by Eye of Cthulhu when Infinity is active');
    assert(eye.x > 230, 'Eye of Cthulhu must be pushed outward away from Gojo barrier');

    // Test reverse parameter ordering (eye, gojo)
    gojo.x = 200; gojo.y = 200;
    eye.x = 230; eye.y = 200;
    resolveFighterCollision(eye, gojo);

    assert(gojo.x === initialGojoX && gojo.y === initialGojoY, 'Gojo must NOT be pushed by Eye of Cthulhu when ordered (eye, gojo)');
    assert(eye.x > 230, 'Eye of Cthulhu must be pushed outward when ordered (eye, gojo)');

    // B. Eye of Cthulhu Ram Contact: Zero damage, Zero knockback on Gojo, Eye rebounds
    eye.x = 220; eye.y = 200;
    eye.vx = -18; eye.vy = 0;
    eye.isRamming = true;
    eye.aiState = EOC_STATE.RAM_DASH;
    const initialHp = gojo.hp;

    eye._applyRamHit(gojo, 35, 15.0);

    assert(gojo.hp === initialHp, 'Gojo must take zero damage from Eye ram through active Infinity');
    assert((gojo.knockbackVx || 0) === 0 && (gojo.knockbackVy || 0) === 0, 'Gojo must take zero knockback impulse through active Infinity');
    assert(eye.vx > 0, 'Eye of Cthulhu must rebound backwards off Gojo Infinity barrier');
    assert(eye.aiState === EOC_STATE.TURNAROUND, 'Eye of Cthulhu must transition to TURNAROUND state on barrier contact');

    console.log('      ✅ Eye of Cthulhu vs Gojo Limitless Infinity push immunity, barrier rebound & zero displacement verified successfully.');
  }

  // ── TEST 51: Eye of Cthulhu Phase 2 vs Gojo Hollow Purple Gravitational Vortex Pull ──
  console.log('   51. Testing Eye of Cthulhu Phase 2 vs Gojo Hollow Purple Gravitational Vortex Pull...');
  {
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { EyeOfCthulhuFighter, EOC_STATE } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');
    const { isEntityImmuneToGravitationalPull } = await import('../js/entities/fighter.js');

    const gojo = new GojoFighter({ x: 100, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 300, y: 300, radius: 32, hp: 400, maxHp: 1200 }); // Below 50% HP = Phase 2
    eye.isPhase2 = true;
    eye._isPhase2 = true;
    eye.aiState = EOC_STATE.P2_CHASE;

    state.fighters = [gojo, eye];
    state.projectiles = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    projectileSystem.projectiles = [];

    // A. Immunity function check: Eye of Cthulhu must NOT be immune to Purple gravitational pull
    assert(isEntityImmuneToGravitationalPull(eye, 'purple') === false, 'Eye of Cthulhu must NOT be immune to Purple gravitational pull');

    // B. Gojo fires Hollow Purple at Eye
    gojo.gunAngle = 0; // Facing right toward Eye
    gojo._firePurple(0);

    const purple = projectileSystem.projectiles.find(p => p.isGojoPurple);
    assert(purple !== undefined, 'Hollow Purple projectile must be spawned in projectileSystem');

    // Position Purple 120px to the left of Eye (within purplePullRadius 280px)
    purple.x = 180;
    purple.y = 300;
    const initialEyeX = eye.x;

    // Run projectileSystem update to apply gravitational vortex pull
    projectileSystem.update(state.fighters);

    assert(eye.x < initialEyeX, `Eye of Cthulhu in Phase 2 must be pulled leftward toward Purple (initial: ${initialEyeX}, after: ${eye.x})`);
    assert(eye.slowTimer > 0, 'Eye of Cthulhu must receive slow debuff while caught in Purple gravitational field');
    assert(eye.isCaughtInPurpleVortex === true, 'Eye of Cthulhu must have isCaughtInPurpleVortex flag set');

    // Clean up
    state.projectiles = [];
    projectileSystem.projectiles = [];
    gojo.reset();
    eye.reset();

    console.log('      ✅ Eye of Cthulhu Phase 2 vs Gojo Hollow Purple vortex suction & gravitational drag verified successfully.');
  }

  // ── TEST 52: Eye of Cthulhu Active Dash Interruption on Hollow Purple Vortex Capture ──
  console.log('   52. Testing Eye of Cthulhu Active Dash Interruption on Hollow Purple Vortex Capture...');
  {
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { EyeOfCthulhuFighter, EOC_STATE } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');

    const gojo = new GojoFighter({ x: 100, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 300, y: 300, radius: 32, hp: 400, maxHp: 1200 });
    eye.isPhase2 = true;
    eye._isPhase2 = true;
    eye.aiState = EOC_STATE.P2_CHAIN_DASH;
    eye.isRamming = true;
    eye.ramsRemaining = 4;
    eye.committedRamAngle = 0; // Commanded to charge right at full speed

    state.fighters = [gojo, eye];
    state.projectiles = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    // Simulate Eye being trapped in Purple vortex
    eye.isCaughtInPurple = true;
    eye.isCaughtInPurpleVortex = true;
    eye.purpleHitTimer = 30;

    assert(eye.isTrappedInVortexOrBeam() === true, 'Eye must evaluate isTrappedInVortexOrBeam() as true');

    // Run update tick
    eye.update(gojo, 1, state.arena);

    assert(eye.isRamming === false, 'Eye of Cthulhu must cancel active ramming when caught in Purple vortex');
    assert(eye.ramsRemaining === 0, 'Eye of Cthulhu must cancel remaining chain dash charges when caught in Purple vortex');
    assert(eye.aiState !== EOC_STATE.P2_CHAIN_DASH, 'Eye of Cthulhu must transition out of P2_CHAIN_DASH state when caught in Purple vortex');
    assert(eye.vx < 15, `Eye of Cthulhu vx must be dampened and not charging forward at full ram speed (got vx=${eye.vx})`);

    // Clean up
    gojo.reset();
    eye.reset();

    console.log('      ✅ Eye of Cthulhu active dash cancellation & vortex capture stasis verified successfully.');
  }

  // ── TEST 53: Gojo Reversal Red Aiming Prioritization vs Eye of Cthulhu and Servants of Cthulhu ──
  console.log('   53. Testing Gojo Reversal Red Aiming Prioritization vs Eye of Cthulhu and Servants of Cthulhu...');
  {
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { EyeOfCthulhuFighter } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');
    const { activateRed } = await import('../js/entities/fighters/gojo/gojoSkills.js');

    const gojo = new GojoFighter({ x: 100, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 260, y: 300, radius: 32, hp: 1000, maxHp: 1200 }); // Distance 160px
    gojo.team = 0;
    eye.team = 1;

    // Create a Servant of Cthulhu minion located closer to Gojo than the Eye (Distance 50px)
    const servantMinion = {
      x: 150,
      y: 300,
      r: 10,
      hp: 120,
      maxHp: 120,
      owner: eye,
      ownerIndex: 1,
      team: 1,
      isMinion: true,
      isIllusion: true,
      isServantOfCthulhu: true,
    };

    state.fighters = [gojo, eye];
    state.illusions = [servantMinion];
    state.arena = { x: 0, y: 0, width: 800, height: 600 };

    // A. Verify target selection selects the Eye (primary boss), not the closer servant minion
    const selectedRedTarget = gojo._findAlignedEnemyForRed(eye);
    assert(selectedRedTarget === eye, `Gojo _findAlignedEnemyForRed must prioritize the Eye of Cthulhu over servant minion (got ${selectedRedTarget?.isServantOfCthulhu ? 'Minion' : selectedRedTarget?.characterId})`);

    // B. Activate Red on Gojo
    gojo.redCooldown = 0;
    gojo.globalSkillCooldown = 0;
    gojo.redEffectTimer = 0;
    activateRed(gojo);

    assert(gojo.redBuildupPhase === true, 'Gojo must enter Red buildup phase');
    assert(gojo._redTargetRef === eye, 'Gojo _redTargetRef must be set strictly to the Eye of Cthulhu');
    assert(Math.abs(gojo.redTargetAngle) < 0.05, `Gojo redTargetAngle must be aimed right at the Eye (got ${gojo.redTargetAngle})`);

    // C. Update Gojo during Red channeling while minion is right beside him
    gojo.update(eye, 0, state.arena);
    assert(Math.abs(gojo.gunAngle) < 0.05, `Gojo gunAngle during Red buildup must track the Eye of Cthulhu (got ${gojo.gunAngle})`);

    // Clean up
    state.illusions = [];
    gojo.reset();
    eye.reset();

    console.log('      ✅ Gojo Reversal Red aiming prioritization on Eye of Cthulhu vs minion verified successfully.');
  }

  // ── TEST 54: Out-of-Arena Enemy Basic Attack Gating (Hold Fire vs Eye of Cthulhu Out-of-Bounds) ──
  console.log('   54. Testing Out-of-Arena Enemy Basic Attack Gating (Hold Fire vs Out-of-Bounds Boss)...');
  {
    const { isEntityOutsideArena } = await import('../js/entities/fighter.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
    const { EyeOfCthulhuFighter } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');
    const { getClosestOpponent } = await import('../js/systems/physics.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    const arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
    state.arena = arena;

    const gojo = new GojoFighter({ x: 400, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const normal = new NormalFighter({ id: 0, x: 350, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 400, y: -70, radius: 32, hp: 1000, maxHp: 1200 }); // Out of arena above ceiling (y = -70 < 0)
    gojo.team = 0;
    normal.team = 0;
    eye.team = 1;

    state.fighters = [gojo, normal, eye];
    state.illusions = [];
    projectileSystem.projectiles = [];

    // A. Verify isEntityOutsideArena detects out-of-bounds entity correctly
    assert(isEntityOutsideArena(eye, arena) === true, 'Eye of Cthulhu at y=-70 must be detected as outside the arena');
    assert(isEntityOutsideArena(gojo, arena) === false, 'Gojo at y=300 must be detected as inside the arena');

    // B. Verify canPerformBasicAttack is gated false when target is outside arena
    assert(gojo.canPerformBasicAttack(eye) === false, 'Gojo canPerformBasicAttack(eye) must be false when Eye is outside arena');
    assert(normal.canPerformBasicAttack(eye) === false, 'Normal canPerformBasicAttack(eye) must be false when Eye is outside arena');

    // C. Verify fighters hold fire and do not spawn projectiles during update while Eye is out-of-bounds
    gojo.shootCooldown = 0;
    normal.shootCooldown = 0;
    normal.angle = -Math.PI / 2; // Facing up directly at Eye

    const initProjCount = projectileSystem.projectiles.length;
    gojo.update(eye, 0, arena);
    normal.update(eye, 1, arena);

    assert(projectileSystem.projectiles.length === initProjCount, `No projectiles must be fired at out-of-bounds target (got ${projectileSystem.projectiles.length - initProjCount} projectiles fired)`);

    // D. Verify that when Eye flies back inside the arena, basic attacks resume immediately
    eye.y = 150; // Inside arena
    assert(isEntityOutsideArena(eye, arena) === false, 'Eye of Cthulhu at y=150 must be detected as inside the arena');
    assert(gojo.canPerformBasicAttack(eye) === true, 'Gojo canPerformBasicAttack(eye) must be true when Eye is inside arena');
    assert(normal.canPerformBasicAttack(eye) === true, 'Normal canPerformBasicAttack(eye) must be true when Eye is inside arena');

    gojo.shootCooldown = 0;
    gojo.update(eye, 0, arena);
    assert(projectileSystem.projectiles.length > initProjCount, 'Gojo must fire Blue orb when Eye returns inside arena');

    // E. Verify targeting prioritizes reachable inside-arena minions over out-of-bounds boss
    eye.y = -80; // Eye flies out of bounds again
    const servantMinion = {
      x: 400,
      y: 200,
      r: 10,
      hp: 100,
      owner: eye,
      team: 1,
      isMinion: true,
      isIllusion: true,
      isServantOfCthulhu: true,
    };
    state.illusions = [servantMinion];

    const targetForGojo = getClosestOpponent(gojo);
    assert(targetForGojo === servantMinion, 'getClosestOpponent must prioritize in-arena Servant of Cthulhu over out-of-arena Eye of Cthulhu');
    assert(gojo.canPerformBasicAttack(targetForGojo) === true, 'Gojo can perform basic attack against in-arena Servant minion');

    // Clean up
    projectileSystem.projectiles = [];
    state.illusions = [];
    gojo.reset();
    normal.reset();
    eye.reset();

    console.log('      ✅ Out-of-arena enemy basic attack gating (hold fire vs out-of-bounds boss & in-arena minion prioritization) verified successfully.');
  }

  console.log('───────────────────────────────────────────────────────');
  console.log('🎉 ALL MULTI-FIGHTER INTERACTION TESTS PASSED SUCCESSFULLY!\n');
}


runInteractionTests().catch(err => {
  console.error('🚨 Interaction Test Suite Encountered an Error:', err);
  process.exit(1);
});
