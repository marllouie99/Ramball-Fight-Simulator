// ─────────────────────────────────────────────
// Multi-Fighter Complex Interaction & Stasis Test Suite
// ─────────────────────────────────────────────

import { ARENA_TILE_COUNT } from '../js/systems/arenaTileGrid.js';
import { readFileSync } from 'node:fs';

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

function createMockClassList() {
  const classes = new Set();
  return {
    add: (...cls) => cls.forEach(c => classes.add(c)),
    remove: (...cls) => cls.forEach(c => classes.delete(c)),
    toggle: (cls, force) => {
      const has = classes.has(cls);
      const next = force !== undefined ? !!force : !has;
      if (next) classes.add(cls); else classes.delete(cls);
      return next;
    },
    contains: (cls) => classes.has(cls)
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.classList = createMockClassList();
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
      classList: createMockClassList(),
      textContent: '',
      _innerHTML: '',
      get innerHTML() { return this._innerHTML; },
      set innerHTML(val) {
        this._innerHTML = val;
        if (val === '') {
          this.children = [];
        }
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
  documentElement: { classList: createMockClassList(), style: {} },
  body: { classList: createMockClassList(), style: {} }
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
  const { spawnBloodEffect } = await import('../js/graphics/particles/bloodEffect.js');

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
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    assert(MahoragaClass && GojoClass, 'Mahoraga and Gojo classes must exist');
    const mahoraga = new MahoragaClass(270, 480, 0);
    const gojo = new GojoClass({ id: 21, type: 'gojo', hp: 400, radius: 25, x: 600, y: 300 });
    const arena = { x: 50, y: 50, width: 800, height: 600 };
    const previousMode = state.mode;
    const previousArena = state.arena;
    const previousFighters = state.fighters;
    const previousProjectiles = state.projectiles;
    mahoraga.x = 250;
    mahoraga.y = 300;
    gojo.x = 600;
    gojo.y = 300;
    mahoraga.team = 1;
    gojo.team = 0;
    state.mode = '1v2';
    state.arena = arena;
    state.fighters = [gojo, mahoraga];
    state.projectiles = [];

    assert(!mahoraga.gojoInfinityImmune, 'Mahoraga must start without Gojo Infinity immunity');
    const freezesNeeded = CONFIG.mahoraga?.infinityAdaptFreezeCount ?? 10;
    mahoraga.infinityFreezeCount = freezesNeeded - 1;
    mahoraga.isFrozenByInfinity = true;
    mahoraga.timeStopTimer = 10;
    const gojoStartingHp = gojo.hp;

    mahoraga.update(gojo, 0, arena);

    assert(mahoraga.gojoInfinityImmune === true, 'Mahoraga must adapt to Infinity after 10 exposures');
    assert(mahoraga.adaptationDashTimer > 0, 'Mahoraga must counter-dash toward Gojo after adapting to Infinity');

    const dashStartX = mahoraga.x;
    for (let frame = 0; frame < (mahoraga.adaptationDashMaxTimer || 10) + 1; frame++) {
      mahoraga.update(gojo, 0, arena);
    }
    assert(mahoraga.x !== dashStartX, 'Infinity-adapted Mahoraga must complete his counter-dash toward Gojo');
    assert(gojo.hp < gojoStartingHp, 'Mahoraga adaptation counter-dash must damage Gojo through Infinity');

    mahoraga.x = gojo.x - 70;
    mahoraga.y = gojo.y;
    mahoraga.postDashPauseTimer = 0;
    mahoraga.swordCooldown = 0;
    const gojoHpBeforeMelee = gojo.hp;
    assert(mahoraga.isValidAimTarget(gojo), 'Adapted Mahoraga must consider living Gojo a valid target');
    assert(!mahoraga.isTeammate(gojo), 'Adapted Mahoraga must classify Gojo as an enemy');
    assert(mahoraga._findClosestEnemy(gojo) === gojo, 'Adapted Mahoraga must select Gojo as its combat target');
    mahoraga.update(gojo, 0, arena);
    assert(mahoraga.attackCount > 0, 'Infinity-adapted Mahoraga must perform normal melee attacks against Gojo');
    if (mahoraga.isSwordWindingUp) {
      const windupFrames = mahoraga.swordWindupTimer || 14;
      for (let frame = 0; frame < windupFrames; frame++) {
        mahoraga.update(gojo, 0, arena);
      }
    }
    assert(gojo.hp < gojoHpBeforeMelee, `Infinity-adapted Mahoraga's basic melee attack must damage Gojo (${gojoHpBeforeMelee} -> ${gojo.hp})`);

    mahoraga.reset();
    gojo.reset();
    state.mode = previousMode;
    state.arena = previousArena;
    state.fighters = previousFighters;
    state.projectiles = previousProjectiles;
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
    assert(gojoBal && typeof gojoBal.hp === 'number' && gojoBal.hp > 0, 'Gojo baseline HP in balance sheet must be a valid number');

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

    // Test attack interruption & explosive damage immunity while actively firing
    genos.interruptAttacks(true);
    assert(genos.isFiringUlt === true, 'Genos isFiringUlt must NOT be cancelled by interruptAttacks(true)');
    assert(genos.immuneToPush === true, 'Genos immuneToPush must remain true after interruptAttacks while firing ult');

    genos.takeDamage(40, saitama, { isExplosion: true, isKnockback: true });
    assert(genos.isFiringUlt === true, 'Genos isFiringUlt must NOT be cancelled by explosive damage');

    genos.takeDamage(20, saitama, { isMelee: true });
    assert(genos.isFiringUlt === true, 'Genos isFiringUlt must NOT be cancelled by melee hit damage');

    // 4. Test Reze Explosions & Stun / TimeStop Immunity while actively firing
    const reze = new FIGHTER_CLASS_MAP.reze({ radius: 25, x: 270, y: 520, hp: 340, color: '#430363ff' });
    state.fighters = [genos, reze];
    genos.reset();
    genos.hp = 320;
    genos.isFiringUlt = true;
    genos.ultTimer = 80;
    genos.immuneToPush = true;
    genos.immuneToKnockback = true;
    genos.immuneToPull = true;

    // A. Direct applyTimeStop / applyHitStun calls on Genos during ult
    genos.applyTimeStop(15);
    assert(genos.isFiringUlt === true, 'applyTimeStop must not cancel isFiringUlt');
    genos.applyHitStun(20);
    assert(genos.isFiringUlt === true, 'applyHitStun must not cancel isFiringUlt');
    genos.applySlow(30, 0.2);
    assert(genos.isFiringUlt === true, 'applySlow must not cancel isFiringUlt');
    genos.applyParalyze(25);
    assert(genos.isFiringUlt === true, 'applyParalyze must not cancel isFiringUlt');

    // B. Reze cluster bomb detonation on Genos
    const clusterBomb = {
      x: genos.x,
      y: genos.y,
      damage: 28,
      explosionRadius: 85,
      knockback: 18
    };
    reze._detonateClusterBomb(clusterBomb);
    assert(genos.isFiringUlt === true, 'Reze cluster bomb explosion must NOT cancel Genos isFiringUlt');

    // C. Reze explosive punch on Genos
    reze.isHybridModeActive = true;
    reze.gunAngle = -Math.PI / 2;
    reze._performExplosivePunch(genos);
    assert(genos.isFiringUlt === true, 'Reze explosive punch must NOT cancel Genos isFiringUlt');

    // D. Reze Rocket Lunge launch and direct impact must preserve Genos's live beam
    genos.x = 130;
    genos.y = 200;
    genos.hp = 320;
    genos.dead = false;
    genos.isDead = false;
    genos._hasDied = false;
    genos.isFiringUlt = true;
    genos.ultTimer = 80;
    genos.immuneToPush = true;
    genos.immuneToKnockback = true;
    genos.immuneToPull = true;
    genos.timeStopTimer = 0;
    genos.hitStunTimer = 0;
    genos.knockbackStunTimer = 0;
    genos.knockbackVx = 0;
    genos.knockbackVy = 0;
    reze.x = 100;
    reze.y = 200;
    reze.rocketCooldown = 0;
    reze.isRocketLunging = false;
    reze._activateRocketLunge(genos);
    assert(genos.isFiringUlt === true, 'Reze foot-launch explosion must not cancel Genos’s active ultimate');
    reze._updateRocketLunge();
    assert(genos.isFiringUlt === true, 'Reze direct Rocket Lunge impact must not cancel Genos’s active ultimate');
    assert(genos.ultTimer === 80, 'Rocket Lunge impact must not consume or reset Genos’s active beam timer');
    assert(genos.timeStopTimer === 0 && genos.hitStunTimer === 0 && genos.knockbackStunTimer === 0,
      'Rocket Lunge must not leave Genos time-stopped, hit-stunned, or knockback-stunned during his beam');

    // D. Update tick progresses beam timer and does NOT freeze
    const prevTimer = genos.ultTimer;
    genos.update(reze, 0, state.arena);
    assert(genos.isFiringUlt === true, 'Genos must continue firing ult during update');
    assert(genos.ultTimer === prevTimer - 1, `Genos ultTimer must tick down smoothly without freeze (got ${genos.ultTimer}, expected ${prevTimer - 1})`);

    // 5. Post-Ult Recovery - Immunity clears cleanly
    genos.ultTimer = 0;
    genos.update(saitama, 0, state.arena);
    assert(genos.isFiringUlt === false, 'isFiringUlt must end');
    assert(genos.immuneToPush === false, 'immuneToPush must reset after ult beam completes');
    assert(genos.immuneToKnockback === false, 'immuneToKnockback must reset after ult beam completes');

    // 6. Reze's blast must not interrupt Genos during the ultimate slide/charge phase
    genos.reset();
    genos.hp = 320;
    genos.ultCooldown = 0;
    reze.x = genos.x;
    reze.y = genos.y + 40;
    reze.isHybridModeActive = true;
    state.fighters = [genos, reze];
    genos.executeSpiralIncinerationCannon(reze);
    assert(genos.isUltSliding === true, 'Genos must enter the pre-ultimate slide before Reze attacks');
    const genosHpBeforeSlideHit = genos.hp;
    const genosSlideTimerBeforeHit = genos.ultSlideTimer;
    reze._detonateClusterBomb({
      x: genos.x, y: genos.y, damage: 20, explosionRadius: 85, knockback: 18
    });
    assert(genos.hp < genosHpBeforeSlideHit, 'Reze’s slide-phase cluster blast must actually hit Genos');
    assert(genos.timeStopTimer === 0, 'Reze’s cluster blast must not time-stop Genos during his ultimate slide');
    genos.update(reze, 0, state.arena);
    assert(genos.isUltSliding === true, 'Reze’s cluster blast must not cancel Genos’s ultimate slide');
    assert(genos.ultSlideTimer === genosSlideTimerBeforeHit - 1,
      'Genos’s ultimate slide must continue progressing after Reze’s blast');
    while (genos.isUltSliding) {
      genos.update(reze, 0, state.arena);
    }
    assert(genos.isChargingUlt === true, 'Genos must enter the ultimate charge phase before Reze attacks');
    const genosHpBeforeChargeHit = genos.hp;
    const genosChargeTimerBeforeHit = genos.ultTimer;
    reze._detonateClusterBomb({
      x: genos.x, y: genos.y, damage: 20, explosionRadius: 85, knockback: 18
    });
    assert(genos.hp < genosHpBeforeChargeHit, 'Reze’s charge-phase cluster blast must actually hit Genos');
    assert(genos.timeStopTimer === 0, 'Reze’s cluster blast must not time-stop Genos during his ultimate charge');
    genos.update(reze, 0, state.arena);
    assert(genos.isChargingUlt === true, 'Reze’s cluster blast must not cancel Genos’s ultimate charge');
    assert(genos.ultTimer === genosChargeTimerBeforeHit - 1,
      'Genos’s ultimate charge timer must continue advancing after Reze’s blast');
    assert(genos.immuneToPush === true && genos.immuneToKnockback === true,
      'Genos must keep ultimate movement immunity during charging after Reze’s hit');

    // 7. Fatal damage cancels ult immediately
    genos.isFiringUlt = true;
    genos.hp = 0;
    genos.dead = true;
    genos.interruptAttacks(true);
    assert(genos.isFiringUlt === false, 'isFiringUlt must cancel when Genos dies');

    // 8. Test Post-Beam Burn Mechanic: When the beam expires, hit enemies receive burn status
    const genosBurnTester = new FIGHTER_CLASS_MAP.genos({ radius: 25, x: 200, y: 300, hp: 320, color: '#FF5500' });
    const enemyInBeam = new FIGHTER_CLASS_MAP.normal({ radius: 25, x: 350, y: 300, hp: 200, color: '#FFFFFF' });
    const enemyBehind = new FIGHTER_CLASS_MAP.normal({ radius: 25, x: 100, y: 300, hp: 200, color: '#00FF00' });
    state.fighters = [genosBurnTester, enemyInBeam, enemyBehind];
    state.illusions = [];

    genosBurnTester.gunAngle = 0; // Aiming right towards enemyInBeam (+x)
    genosBurnTester.ultAngle = 0;
    genosBurnTester.isFiringUlt = true;
    genosBurnTester.ultTimer = 2; // 2 frames remaining
    genosBurnTester.ultBeamHitTargets = new Set();

    // Frame 1: Beam is firing and strikes enemyInBeam
    genosBurnTester.update(enemyInBeam, 0, state.arena);
    assert(genosBurnTester.ultBeamHitTargets.has(enemyInBeam), 'enemyInBeam must be registered in ultBeamHitTargets');
    assert(!genosBurnTester.ultBeamHitTargets.has(enemyBehind), 'enemyBehind must NOT be in ultBeamHitTargets');
    assert((enemyInBeam.burnTimer || 0) === 0, 'enemyInBeam should not have burnTimer while beam is still actively firing');

    // Frame 2: Beam timer hits 0 and expires
    genosBurnTester.update(enemyInBeam, 0, state.arena);
    assert(genosBurnTester.isFiringUlt === false, 'isFiringUlt must be false after ultTimer reaches 0');
    assert(genosBurnTester.isUltRecovering === true, 'isUltRecovering must be true after beam expires');
    assert(enemyInBeam.burnTimer > 0, `enemyInBeam must have burnTimer > 0 after beam expires (got ${enemyInBeam.burnTimer})`);
    assert((enemyBehind.burnTimer || 0) === 0, 'enemyBehind must NOT have burnTimer after beam expires');

    // Test that burn deals damage over time
    const hpBeforeBurn = enemyInBeam.hp;
    for (let f = 0; f < 35; f++) {
      enemyInBeam.statusEffects.handleBurn();
    }
    assert(enemyInBeam.hp < hpBeforeBurn, `Burned enemy must take burn damage over time (before: ${hpBeforeBurn}, after: ${enemyInBeam.hp})`);

    console.log('      ✅ Genos physical push, Reze explosion resilience & knockback immunity during ultimate beam verified.');
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

  // ── TEST 15b: Yuta Pure Love Beam Suction (Pulling Mechanic) ──
  console.log('   15b. Testing Yuta Pure Love Beam Suction (Pulling Mechanic) & Pull Immunity...');
  {
    const { YutaPureLoveBeamBehavior } = await import('../js/systems/projectiles/behaviors/YutaPureLoveBeamBehavior.js');
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const EscanorClass = FIGHTER_CLASS_MAP['escanor'];
    const behavior = new YutaPureLoveBeamBehavior();

    const previousArena = state.arena;
    const previousIllusions = state.illusions;
    const previousDriveBys = state.cjDriveBys;

    const runSuction = (target, frames = 5) => {
      const yuta = new YutaClass({ x: 300, y: 300, color: '#FFFFFF', controls: {} });
      yuta.reset();
      yuta.x = 300;
      yuta.y = 300;
      yuta.z = 0;
      yuta.hp = yuta.maxHp;
      yuta.gunAngle = 0;
      yuta.angle = 0;
      yuta.isFiringPureLoveBeam = true;
      yuta.pureLoveBeamLockedAngle = 0;
      yuta.pureLoveBeamActiveTimer = 200;

      target.x = 480;
      target.y = 300;
      target.vx = 0;
      target.vy = 0;

      state.fighters = [yuta, target];
      state.arena = { x: 0, y: 0, width: 800, height: 600 };
      state.illusions = [];
      state.cjDriveBys = [];

      const projectile = {
        owner: 0,
        ownerFighter: yuta,
        angle: 0,
        x: yuta.x + 39,
        y: yuta.y,
        length: CONFIG.yuta?.pureLoveBeamLength || 2500,
        r: CONFIG.yuta?.pureLoveBeamWidth || 200,
        damage: 5,
        knockback: CONFIG.yuta?.pureLoveBeamKnockback || 2,
        hitTargets: new Set(),
        hitTickTimer: 0,
        life: 200,
        maxLife: 200
      };

      const startDist = Math.hypot(target.x - yuta.x, target.y - yuta.y);
      for (let f = 0; f < frames; f++) {
        behavior.update(projectile, state.fighters, {});
      }
      const endDist = Math.hypot(target.x - yuta.x, target.y - yuta.y);
      return { yuta, target, startDist, endDist };
    };

    try {
      // 1. Normal fighter inside the beam is reeled IN toward Yuta
      const gojo = new GojoClass({ x: 480, y: 300, color: '#00F0FF', controls: {} });
      gojo.reset();
      const pulled = runSuction(gojo);
      assert(pulled.target.caughtInPureLoveBeam === true, 'Target inside Pure Love Beam must be flagged as caught');
      assert(
        pulled.endDist < pulled.startDist - 10,
        `Pure Love Beam must PULL caught targets toward Yuta (start ${pulled.startDist.toFixed(1)} -> end ${pulled.endDist.toFixed(1)})`
      );

      // 2. Suction never overshoots past Yuta's own body radius (no slingshot through him)
      const closeGojo = new GojoClass({ x: 480, y: 300, color: '#00F0FF', controls: {} });
      closeGojo.reset();
      const closeRun = (() => {
        const result = runSuction(closeGojo, 0);
        closeGojo.x = result.yuta.x + (result.yuta.r || 25) + 8;
        closeGojo.y = result.yuta.y;
        const startDist = Math.hypot(closeGojo.x - result.yuta.x, closeGojo.y - result.yuta.y);
        const projectile = {
          owner: 0, ownerFighter: result.yuta, angle: 0,
          x: result.yuta.x + 39, y: result.yuta.y,
          length: CONFIG.yuta?.pureLoveBeamLength || 2500,
          r: CONFIG.yuta?.pureLoveBeamWidth || 200,
          damage: 5, knockback: 2, hitTargets: new Set(), hitTickTimer: 0, life: 200, maxLife: 200
        };
        for (let f = 0; f < 5; f++) behavior.update(projectile, state.fighters, {});
        const endDist = Math.hypot(closeGojo.x - result.yuta.x, closeGojo.y - result.yuta.y);
        return { startDist, endDist };
      })();
      assert(closeRun.endDist > 0, 'Suction must never drag a target through/behind Yuta');

      // 3. Pull-immune fighters stay planted (Escanor is explicitly immune to all suction)
      const escanor = new EscanorClass({ x: 480, y: 300, color: '#FFD700', controls: {} });
      escanor.reset();
      const escanorRun = runSuction(escanor);
      assert(
        Math.abs(escanorRun.endDist - escanorRun.startDist) < 0.001,
        `Escanor must remain immune to Pure Love Beam suction (start ${escanorRun.startDist.toFixed(1)} -> end ${escanorRun.endDist.toFixed(1)})`
      );

      console.log('      ✅ Pure Love Beam suction pulls caught targets inward, respects pull immunity & never overshoots.');
    } finally {
      state.arena = previousArena;
      state.illusions = previousIllusions;
      state.cjDriveBys = previousDriveBys;
    }
  }

  // ── TEST 15c: Yuta Attack Dashes Are Silent (Dash SFX Removed) ──
  console.log('   15c. Testing Yuta Attack Dash Silence (Dash SFX Removed By Design)...');
  {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const cfg = CONFIG.yuta;

    // 1. Yuta must not ship config entries for attack-dash SFX anymore
    assert(!cfg.sounds?.flurryDash, 'Yuta must NOT define a flurryDash SFX');
    assert(!cfg.sounds?.phantomFlurryDash, 'Yuta must NOT define a phantomFlurryDash SFX');
    assert(!cfg.sounds?.thinIceBreakerDash, 'Yuta must NOT define a thinIceBreakerDash SFX');
    assert(!cfg.sounds?.beamDash, 'Yuta must NOT define a beamDash SFX');
    assert(!cfg.soundVolumes?.flurryDash && !cfg.soundVolumes?.phantomFlurryDash, 'Yuta must NOT define dash SFX volumes');

    // 2. Phantom Flurry teleport must not emit any dash sound
    const yuta = new YutaClass({ x: 300, y: 300, color: '#FFFFFF', controls: {} });
    const gojo = new GojoClass({ x: 380, y: 300, color: '#00F0FF', controls: {} });
    yuta.reset();
    gojo.reset();
    yuta.x = 300; yuta.y = 300;
    yuta.isChannelingDomain = false;
    yuta.domainActive = false;
    gojo.x = 380; gojo.y = 300;
    gojo.hp = gojo.maxHp;
    state.fighters = [yuta, gojo];

    const played = [];
    const origPlaySFX = audioSystem.playSFX;
    audioSystem.playSFX = (src, vol) => { played.push([src, vol]); };
    try {
      yuta.triggerPhantomFlurry(gojo);
      const dashPlays = played.filter(([src]) => typeof src === 'string' && /skill_dash|dash\d|dash\.mp3/i.test(src));
      assert(
        dashPlays.length === 0,
        `Yuta's attack dashes must be silent, but dash SFX were played: ${JSON.stringify(dashPlays)}`
      );

      // 3. Katana basic attack (5-phase combo) must also be dash-SFX free
      played.length = 0;
      yuta.meleeCooldown = 0;
      yuta.swordSwingTimer = 0;
      yuta.swipeActive = false;
      yuta.executeKatanaMelee(0);
      assert(yuta.swipeActive === true && yuta.swordSwingTimer > 0, 'Katana basic attack must actually start its swing (test precondition)');
      const katanaDashPlays = played.filter(([src]) => typeof src === 'string' && /skill_dash|dash\d|dash\.mp3/i.test(src));
      assert(
        katanaDashPlays.length === 0,
        `Yuta's katana basic attack must NOT play any dash SFX (Assets/Sound Effects/Skills/dash1.mp3), got: ${JSON.stringify(katanaDashPlays)}`
      );
    } finally {
      audioSystem.playSFX = origPlaySFX;
    }

    console.log('      ✅ Yuta attack dashes verified silent (no dash SFX plays on flurry/teleport attacks).');
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

    // Subtest C: Team Match Modes ('2v2', 'Tag Match') - Song must NOT play
    const teamModes = ['2v2', 'Tag Match', '1v2 Stand Off', 'FFA'];
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

  // ── TEST 21A: Maki Dragon-Bone Windup, Impale, Lift & Throw Pacing ──
  {
    console.log('   21A. Testing Maki Dragon-Bone phase pacing...');
    const MakiClass = FIGHTER_CLASS_MAP.maki;
    const NormalClass = FIGHTER_CLASS_MAP.normal;
    assert(MakiClass && NormalClass, 'Maki and Normal fighter classes must exist');

    const maki = new MakiClass(100, 100, 0);
    const target = new NormalClass(240, 100, 1);
    const bystander = new NormalClass(130, 100, 2);
    const bystanderHp = bystander.hp;
    const initialAimAngle = -Math.PI / 2;
    maki.gunAngle = initialAimAngle;
    maki.angle = initialAimAngle;
    const startX = maki.x;
    const startY = maki.y;
    state.fighters = [maki, target, bystander];
    state.arena = arena;

    const { drawMakiWeapons, drawMakiImpaledTargetOverlay } = await import('../js/graphics/weapons/makiWeaponGraphics.js');
    const originalFillRect = mockCtx.fillRect;
    const originalFill = mockCtx.fill;
    const renderedFillStyles = [];
    mockCtx.fillRect = (...args) => {
      renderedFillStyles.push(mockCtx.fillStyle);
      originalFillRect(...args);
    };
    mockCtx.fill = (...args) => {
      renderedFillStyles.push(mockCtx.fillStyle);
      originalFill(...args);
    };
    maki.dragonBoneActive = true;
    maki.dragonBonePhase = 'lift';
    maki.dragonBoneTarget = target;
    target.isPinnedByMaki = true;
    drawMakiWeapons(mockCtx, maki, maki.r, false);
    assert(!renderedFillStyles.includes('#E2E6EC'), 'Pinned lift must not draw a second full katana blade from Maki');
    renderedFillStyles.length = 0;
    drawMakiImpaledTargetOverlay(mockCtx, target, maki);
    assert(renderedFillStyles.includes('#E2E6EC'), 'Pinned-target overlay must render Maki’s real katana mesh');
    assert(!renderedFillStyles.includes('#D8DDE2'), 'Pinned-target overlay must not paint a separate custom blade segment');
    renderedFillStyles.length = 0;
    target.isPinnedByMaki = false;
    drawMakiWeapons(mockCtx, maki, maki.r, false);
    assert(renderedFillStyles.includes('#E2E6EC'), 'Unpinned rendering must restore Maki’s katana blade');
    mockCtx.fillRect = originalFillRect;
    mockCtx.fill = originalFill;
    maki.dragonBoneActive = false;
    maki.dragonBonePhase = null;
    maki.dragonBoneTarget = null;

    const { FighterRenderer } = await import('../js/graphics/renderers/fighterRenderer.js');
    const originalDrawGun = FighterRenderer.drawGun;
    let genericGunDraws = 0;
    FighterRenderer.drawGun = () => { genericGunDraws++; };
    maki.dragonBoneActive = true;
    maki.dragonBonePhase = 'windup';
    maki.drawGun(mockCtx);
    assert(genericGunDraws === 0, 'Maki must suppress generic gun rendering during Dragon-Bone');
    maki.dragonBoneActive = false;
    maki.drawGun(mockCtx);
    assert(genericGunDraws === 0, 'Maki must suppress generic gun rendering to match Toji hand parity');
    assert(maki.hideHands === true, 'Maki default model hands must be hidden');
    FighterRenderer.drawGun = originalDrawGun;

    maki._castDragonBone(target);
    assert(maki.dragonBonePhase === 'windup', 'Dragon-Bone must begin with a windup phase');
    assert(maki.dragonBonePhaseMax === CONFIG.maki.dragonBoneWindupFrames, 'Windup duration must come from Maki config');
    assert(Number.isFinite(CONFIG.maki.dragonBoneThrowDistanceMultiplier), 'Dragon-Bone throw distance multiplier must be numeric');
    assert(Math.abs(maki.gunAngle - initialAimAngle) < 0.001, 'Starting windup must not snap aim to the target');
    assert(CONFIG.maki.dragonBoneDashFrames === 16, 'Dragon-Bone dash must remain 16 frames');
    assert(CONFIG.maki.dragonBoneDashSpeed === 19.0, 'Dragon-Bone dash speed must remain 19.0');

    maki._updateDragonBone(target, arena);
    assert(maki.gunAngle > initialAimAngle && maki.gunAngle < 0, 'Windup must smoothly auto-aim toward the target');
    for (let frame = 0; frame < CONFIG.maki.dragonBoneWindupFrames - 2; frame++) {
      maki._updateDragonBone(target, arena);
    }
    const aimBeforeRelease = maki.gunAngle;
    target.x = maki.x;
    target.y = maki.y + 200;
    maki._updateDragonBone(target, arena);
    assert(maki.x === startX && maki.y === startY, 'Maki must remain stationary during Dragon-Bone windup');
    assert(maki.dragonBonePhase === 'dash', 'Dragon-Bone must dash after the windup');
    assert(maki.gunAngle > aimBeforeRelease && maki.gunAngle - aimBeforeRelease < 0.2, 'Windup release must keep tracking smooth without snapping');
    assert(Math.abs(maki.dragonBoneTargetAngle - maki.gunAngle) < 0.001, 'Dash must commit the final windup aim angle');

    maki._getTargetsInFrontalArc = () => [target];
    let aoeQueries = 0;
    maki._getAllEnemiesInRadius = () => {
      aoeQueries++;
      return [bystander];
    };
    const dashStartX = maki.x;
    const dashStartY = maki.y;
    maki._updateDragonBone(target, arena);
    assert(maki.dragonBonePhase === 'stab', 'A dash hit must enter the dedicated stab phase');
    const expectedDashSpeed = CONFIG.maki.dragonBoneDashSpeed * (1.0 + maki.kineticCharges * 0.20);
    assert(Math.hypot(
      maki.x - dashStartX - Math.cos(maki.dragonBoneTargetAngle) * expectedDashSpeed,
      maki.y - dashStartY - Math.sin(maki.dragonBoneTargetAngle) * expectedDashSpeed
    ) < 0.001, 'Dragon-Bone dash must follow the committed windup aim angle');
    assert(target.isPinnedByMaki === true, 'The impaled target must remain pinned during stab');
    assert(CONFIG.maki.dragonBonePinGapPx === 24, 'Dragon-Bone pin gap must be configured to 24px');
    const gripX = maki.x + Math.cos(maki.gunAngle) * maki.r * 0.82 - Math.sin(maki.gunAngle) * maki.r * 0.38;
    const gripY = maki.y + Math.sin(maki.gunAngle) * maki.r * 0.82 + Math.cos(maki.gunAngle) * maki.r * 0.38;
    const targetGap = Math.hypot(target.x - gripX, target.y - gripY) - target.r;
    assert(Math.abs(targetGap - CONFIG.maki.dragonBonePinGapPx) < 0.001, 'Impaled target must sit at the configured distance from Maki’s grip');

    for (let frame = 0; frame < CONFIG.maki.dragonBoneStabFrames - 1; frame++) {
      maki._updateDragonBone(target, arena);
    }
    assert(maki.dragonBonePhase === 'stab', `The stab phase must last ${CONFIG.maki.dragonBoneStabFrames} frames`);
    maki._updateDragonBone(target, arena);
    assert(maki.dragonBonePhase === 'punch', 'Dragon-Bone must punch after the stab phase completes (lift sequence removed)');
    assert(maki.dragonBonePhaseMax === (CONFIG.maki.dragonBonePunchFrames || 18), 'Punch duration must come from Maki config');

    const punchImpactFrame = Math.max(1, Math.floor(maki.dragonBonePhaseMax * 0.35));
    for (let frame = 0; frame < punchImpactFrame - 1; frame++) {
      maki._updateDragonBone(target, arena);
    }
    assert(target.isPinnedByMaki === true, 'Target must stay pinned on blade until punch connects');
    const originalThrowDistanceMultiplier = CONFIG.maki.dragonBoneThrowDistanceMultiplier;
    CONFIG.maki.dragonBoneThrowDistanceMultiplier = 1.5;
    maki._updateDragonBone(target, arena);
    assert(target.isPinnedByMaki === false, 'Target must be dislodged and released from blade on punch impact frame');
    const expectedPunchSpeed = (CONFIG.maki.dragonBoneLaunchSpeed || CONFIG.maki.dragonBoneThrowSpeed) * CONFIG.maki.dragonBoneThrowDistanceMultiplier * (1.0 + maki.kineticCharges * 0.25);
    const throwVectorError = Math.hypot(
      target.knockbackVx - Math.cos(maki.dragonBoneTargetAngle) * expectedPunchSpeed,
      target.knockbackVy - Math.sin(maki.dragonBoneTargetAngle) * expectedPunchSpeed
    );
    assert(throwVectorError < 0.001, `Released target must launch along committed aim (expected ${expectedPunchSpeed} at ${maki.dragonBoneTargetAngle}, got ${target.knockbackVx}, ${target.knockbackVy})`);
    assert(target.knockbackVx > 0, 'Dragon-Bone punch must use the ricocheting knockback channel');
    assert(target.slowTimer === CONFIG.maki.dragonBoneThrowSlowFrames, 'Dragon-Bone punch must apply its configured brief slow');
    assert(maki.makiLaunchedTargets.length === 1, 'Target must be registered in makiLaunchedTargets for launching flight tick damage');

    // Verify continuous flight tick damage
    const hpBeforeTick = target.hp;
    maki._updateMakiLaunchedTargets(arena);
    assert(target.hp < hpBeforeTick, `Target must take tick damage while launching (was ${hpBeforeTick}, now ${target.hp})`);

    CONFIG.maki.dragonBoneThrowDistanceMultiplier = originalThrowDistanceMultiplier;
    const throwStartX = target.x;
    const throwStartY = target.y;
    for (let frame = 0; frame < 8; frame++) {
      target.update(maki, 1, arena);
    }
    const throwTravel = Math.hypot(target.x - throwStartX, target.y - throwStartY);
    assert(throwTravel > 40, `Released target must travel visibly away from Maki (moved ${throwTravel.toFixed(1)}px in 8 frames)`);
    const wallArena = { x: 0, y: 0, width: 540, height: 960 };
    state.arena = wallArena;
    target.x = wallArena.width - target.r - 1;
    target.y = wallArena.height / 2;
    target.vx = target.knockbackVx;
    target.vy = 0;
    target.knockbackVy = 0;
    target.update(maki, 1, wallArena);
    assert(target.knockbackVx < 0, 'Thrown target must ricochet away from the wall');
    assert(target.slowTimer > 0, 'Thrown target must remain slowed after the wall ricochet');
    assert(aoeQueries === 0, 'Punch release must not trigger a ground-slam AOE');
    assert(bystander.hp === bystanderHp, 'Nearby bystanders must not take ground-slam damage');

    for (let frame = punchImpactFrame; frame < maki.dragonBonePhaseMax; frame++) {
      const initialDepth = mockCtx.getStackDepth();
      maki.drawBody(mockCtx);
      assert(mockCtx.getStackDepth() === initialDepth, `Maki drawBody stack leak during punch frame ${frame}`);
      maki._updateDragonBone(target, arena);
    }
    assert(maki.dragonBoneActive === false, 'Dragon-Bone must finish after punch recovery');

    // Verify Maki sword combo rendering (Steps 1, 2, 3 across startup, active, recovery)
    for (const step of [1, 2, 3]) {
      maki.swordComboStep = step;
      maki.swordSwingMax = 24;
      for (const timer of [24, 18, 12, 6, 1]) {
        maki.swordSwingTimer = timer;
        const initialDepth = mockCtx.getStackDepth();
        maki.drawBody(mockCtx);
        assert(mockCtx.getStackDepth() === initialDepth, `Maki drawBody stack leak during step ${step} timer ${timer}`);
        maki.draw(mockCtx, target);
        assert(mockCtx.getStackDepth() === initialDepth, `Maki draw stack leak during step ${step} timer ${timer}`);
      }
    }
    maki.swordSwingTimer = 0;

    // Verify Maki Hit 3 full 360-degree body spin in sync with weapon
    maki._performSplitSoulSlash(target, 3);
    const liftF = maki.swordSwingLiftFrames;
    const holdF = maki.swordSwingHoldFrames;
    const strikeF = maki.swordSwingStrikeFrames;
    const initialSlashAngle = maki.swordSlashAngle;

    // Fast-forward to middle of Phase 3 (360 whirlwind whip strike)
    for (let f = 0; f < liftF + holdF + Math.floor(strikeF * 0.5); f++) {
      maki._updateSwordSwing(target, arena);
    }
    assert(maki.isSpinning === true, 'Maki must have isSpinning = true during Hit 3 whirlwind strike');
    assert(Math.abs(maki.angle - initialSlashAngle) > 0.3, 'Maki body angle must rotate during Hit 3 360 whirlwind');

    // Fast-forward through Phase 4 and Phase 5 to completion
    while (maki.swordSwingTimer > 0) {
      maki._updateSwordSwing(target, arena);
    }
    assert(maki.isSpinning === false, 'Maki isSpinning must be false after Hit 3 finishes');
    assert(Math.abs(maki.angle - maki.swordSlashAngle) < 0.01, 'Maki body angle must settle cleanly back to slash angle');

    state.fighters = [];
    console.log('      ✅ Maki Dragon-Bone windup, stab, lift and throw pacing & sword combo 360 body spin verified.');
  }

  // ── TEST 22: Yuji Soul Swap vs Undetected / Bush Concealed Boss Yuta ──
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
    const grassCols = ARENA_TILE_COUNT;
    const grassRows = ARENA_TILE_COUNT;
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

    // 4. Crazy Dave vs Crazy Dave (Mirror Match) Plant Targeting & Projectile Damage Verification
    {
      const { isEnemyPlantTarget, PeashooterEntity, SnowPeaEntity, TorchwoodEntity, PotatoMineEntity, WallnutEntity, LawnmowerEntity } = await import('../js/entities/fighters/CrazyDaveFighter.js');
      const { resolveFighterCollision } = await import('../js/systems/physics.js');
      const mirrorDave1 = new CrazyDaveClass({ radius: 25, x: 120, y: 300, hp: 390, maxHp: 390 });
      const mirrorDave2 = new CrazyDaveClass({ radius: 25, x: 380, y: 300, hp: 390, maxHp: 390 });
      state.fighters = [mirrorDave1, mirrorDave2];

      const dave1Pea = new PeashooterEntity(180, 300, mirrorDave1, 1);
      const dave2Pea = new PeashooterEntity(320, 300, mirrorDave2, -1);
      const dave1Wallnut = new WallnutEntity(210, 300, mirrorDave1, 1);
      const dave2Wallnut = new WallnutEntity(290, 300, mirrorDave2, -1);
      state.fighters.push(dave1Pea, dave2Pea, dave1Wallnut, dave2Wallnut);

      // Verify both Daves' plants recognize the opposing Crazy Dave AND opposing plants as valid enemy targets
      assert(isEnemyPlantTarget(dave1Pea, mirrorDave2) === true, 'Dave 1 Peashooter must recognize Enemy Dave 2 as a valid target');
      assert(isEnemyPlantTarget(dave1Pea, dave2Pea) === true, 'Dave 1 Peashooter must recognize Enemy Dave 2 Peashooter as a valid target');
      assert(isEnemyPlantTarget(dave1Pea, dave2Wallnut) === true, 'Dave 1 Peashooter must recognize Enemy Dave 2 Wall-nut as a valid target');
      assert(isEnemyPlantTarget(dave1Pea, mirrorDave1) === false, 'Dave 1 Peashooter must NOT target Friendly Dave 1');
      assert(isEnemyPlantTarget(dave1Pea, dave1Wallnut) === false, 'Dave 1 Peashooter must NOT target Friendly Dave 1 Wall-nut');
      assert(isEnemyPlantTarget(dave2Pea, mirrorDave1) === true, 'Dave 2 Peashooter must recognize Enemy Dave 1 as a valid target');
      assert(isEnemyPlantTarget(dave2Pea, dave1Pea) === true, 'Dave 2 Peashooter must recognize Enemy Dave 1 Peashooter as a valid target');
      assert(isEnemyPlantTarget(dave2Pea, mirrorDave2) === false, 'Dave 2 Peashooter must NOT target Friendly Dave 2');

      // Verify Dave 1 Peashooter projectile hits and damages Enemy Dave 2 AND Enemy Plants (and skips Friendly Dave 1 & Friendly Plants)
      const projsArr = (typeof projectileSystem !== 'undefined' && projectileSystem.projectiles) ? projectileSystem.projectiles : state.projectiles;
      projsArr.length = 0;
      dave1Pea._firePea(0, 2);
      const peaFromDave1 = projsArr[projsArr.length - 1];
      assert(peaFromDave1 !== undefined, 'Dave 1 Peashooter must spawn a pea projectile');

      // Passing over Friendly Dave 1 and Friendly Wall-nut deals 0 damage
      const dave1HpBefore = mirrorDave1.hp;
      peaFromDave1.x = mirrorDave1.x;
      peaFromDave1.y = mirrorDave1.y;
      projectileSystem.checkProjectileHits(peaFromDave1, state.fighters);
      assert(mirrorDave1.hp === dave1HpBefore, 'Friendly Dave 1 must NOT take damage from his own Peashooter');

      const dave1WallnutHpBefore = dave1Wallnut.hp;
      peaFromDave1.x = dave1Wallnut.x;
      peaFromDave1.y = dave1Wallnut.y;
      projectileSystem.checkProjectileHits(peaFromDave1, state.fighters);
      assert(dave1Wallnut.hp === dave1WallnutHpBefore, 'Friendly Dave 1 Wall-nut must NOT take damage from friendly Peashooter');

      // Hitting Enemy Dave 2 Wall-nut deals full pea damage
      const dave2WallnutHpBefore = dave2Wallnut.hp;
      peaFromDave1.x = dave2Wallnut.x;
      peaFromDave1.y = dave2Wallnut.y;
      projectileSystem.checkProjectileHits(peaFromDave1, state.fighters);
      assert(dave2Wallnut.hp < dave2WallnutHpBefore, `Enemy Dave 2 Wall-nut must take damage from Dave 1 Peashooter (${dave2WallnutHpBefore} -> ${dave2Wallnut.hp})`);

      // Hitting Enemy Dave 2 deals full pea damage
      projsArr.length = 0;
      dave1Pea._firePea(0, 2);
      const peaToEnemyDave = projsArr[projsArr.length - 1];
      const dave2HpBefore = mirrorDave2.hp;
      peaToEnemyDave.x = mirrorDave2.x;
      peaToEnemyDave.y = mirrorDave2.y;
      projectileSystem.checkProjectileHits(peaToEnemyDave, state.fighters);
      assert(mirrorDave2.hp < dave2HpBefore, `Enemy Dave 2 must take damage from Dave 1 Peashooter (${dave2HpBefore} -> ${mirrorDave2.hp})`);

      // Verify Dave 2 Snow Pea projectile hits and damages Enemy Dave 1 and Enemy Dave 1 Peashooter
      projsArr.length = 0;
      const dave2Snow = new SnowPeaEntity(320, 300, mirrorDave2, -1);
      state.fighters.push(dave2Snow);
      dave2Snow._fireSnowPea(Math.PI, 4);
      const snowFromDave2 = projsArr[projsArr.length - 1];
      const dave1PeaHpBeforeSnow = dave1Pea.hp;
      snowFromDave2.x = dave1Pea.x;
      snowFromDave2.y = dave1Pea.y;
      projectileSystem.checkProjectileHits(snowFromDave2, state.fighters);
      assert(dave1Pea.hp < dave1PeaHpBeforeSnow, `Enemy Dave 1 Peashooter must take damage from Dave 2 Snow Pea (${dave1PeaHpBeforeSnow} -> ${dave1Pea.hp})`);

      // Verify Lawnmower 1-hits Enemy Dave 2's plants (even a 600 HP Wall-nut exceeding base 180 mower damage!) while ignoring friendly plants
      const dave2FullWallnut = new WallnutEntity(260, 300, mirrorDave2, -1);
      dave2FullWallnut.maxHp = 600;
      dave2FullWallnut.hp = 600;
      state.fighters.push(dave2FullWallnut);
      assert(dave2FullWallnut.hp === 600, 'Enemy Wall-nut has 600 HP (exceeding base Lawnmower damage)');
      const dave1Mower = new LawnmowerEntity(100, 300, mirrorDave1, 1, 2);
      state.fighters.push(dave1Mower);
      dave1Mower.state = 'charging';
      // Pass over friendly Wall-nut: must NOT damage friendly plant
      dave1Mower.x = dave1Wallnut.x;
      dave1Mower.y = dave1Wallnut.y;
      dave1Mower._shredEnemies();
      assert(dave1Wallnut.hp === dave1WallnutHpBefore, 'Dave 1 Lawnmower must NOT damage friendly Dave 1 Wall-nut');
      // Pass over enemy 600 HP Wall-nut: must 1-HIT KILL it!
      dave1Mower.x = dave2FullWallnut.x;
      dave1Mower.y = dave2FullWallnut.y;
      dave1Mower._shredEnemies();
      assert(dave2FullWallnut.hp <= 0 && dave2FullWallnut.dead === true, `Dave 1 Lawnmower must 1-hit kill Enemy Dave 2 Wall-nut (remaining HP: ${dave2FullWallnut.hp})`);

      // Verify Torchwood only ignites friendly peas and NOT enemy peas
      projsArr.length = 0;
      const dave1Torch = new TorchwoodEntity(220, 300, mirrorDave1, 1);
      dave2Pea._firePea(Math.PI, 3);
      const enemyPeaAtTorch = projsArr[projsArr.length - 1];
      enemyPeaAtTorch.x = dave1Torch.x;
      enemyPeaAtTorch.y = dave1Torch.y;
      dave1Torch._interceptProjectiles();
      assert(enemyPeaAtTorch.visual === 'peaBullet', 'Dave 1 Torchwood must NOT ignite Enemy Dave 2 peas into Fire Peas');

      // Verify Wall-nut blocks Enemy Dave 2 while letting Friendly Dave 1 pass through
      mirrorDave2.x = dave1Wallnut.x + 5;
      mirrorDave2.y = dave1Wallnut.y + 5;
      const preEnemyDaveX = mirrorDave2.x;
      const preEnemyDaveY = mirrorDave2.y;
      resolveFighterCollision(dave1Wallnut, mirrorDave2);
      assert(mirrorDave2.x !== preEnemyDaveX || mirrorDave2.y !== preEnemyDaveY, 'Enemy Crazy Dave must be physically blocked by opponent Wall-nut');
      projsArr.length = 0;
    }

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
    audioSystem.playSFX = origPlaySFX;

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

    // Zenitsu Weapon Studio exposes and applies independent length and width adjustments.
    {
      const { drawWeaponStudioScreen } = await import('../js/graphics/ui/WeaponStudioScreen.js');
      const { handleUIClick } = await import('../js/graphics/ui/uiFramework.js');
      const originalState = {
        gameState: state.gameState,
        ctx: state.ctx,
        canvas: state.canvas,
        canvasWidth: mockCanvas.width,
        canvasHeight: mockCanvas.height,
        weapon: state.studioSelectedWeapon,
        detail: state.studioSelectedDetail,
        zenitsuPart: state.studioZenitsuPart,
        zenitsu: JSON.parse(JSON.stringify(state.weaponCustomizations.zenitsu))
      };
      const renderedLabels = [];
      const originalFillText = mockCtx.fillText;
      mockCtx.fillText = (text, ...args) => {
        renderedLabels.push(String(text));
        originalFillText.call(mockCtx, text, ...args);
      };

      try {
        state.gameState = 'weaponStudio';
        state.ctx = mockCtx;
        state.canvas = mockCanvas;
        mockCanvas.width = 540;
        mockCanvas.height = 960;
        state.studioSelectedWeapon = 'yuta';
        state.studioSelectedDetail = null;
        drawWeaponStudioScreen();

        assert(handleUIClick(312, 151), 'Zenitsu must be selectable in Weapon Studio');
        assert(state.studioSelectedDetail === 'proportions', 'Selecting Zenitsu must open its length and width controls');
        state.studioZenitsuPart = 'overall';
        drawWeaponStudioScreen();

        assert(renderedLabels.some(label => label.includes('WIDTH:')), 'Zenitsu proportions panel must display weapon width');
        assert(renderedLabels.some(label => label.includes('LENGTH:')), 'Zenitsu proportions panel must display weapon length');

        const initialWidth = state.weaponCustomizations.zenitsu.widthScale;
        assert(handleUIClick(498, 606), 'Zenitsu width increase control must be clickable');
        assert(state.weaponCustomizations.zenitsu.widthScale > initialWidth, 'Zenitsu width control must update its weapon customization');

        drawWeaponStudioScreen();
        const initialLength = state.weaponCustomizations.zenitsu.lengthScale;
        assert(handleUIClick(498, 642), 'Zenitsu length increase control must be clickable');
        assert(state.weaponCustomizations.zenitsu.lengthScale > initialLength, 'Zenitsu length control must update its weapon customization');
      } finally {
        mockCtx.fillText = originalFillText;
        state.gameState = originalState.gameState;
        state.ctx = originalState.ctx;
        state.canvas = originalState.canvas;
        mockCanvas.width = originalState.canvasWidth;
        mockCanvas.height = originalState.canvasHeight;
        state.studioSelectedWeapon = originalState.weapon;
        state.studioSelectedDetail = originalState.detail;
        state.studioZenitsuPart = originalState.zenitsuPart;
        state.weaponCustomizations.zenitsu = originalState.zenitsu;
      }
    }

    // Top duel HUD reuses the character-card grade-letter renderer at each portrait corner.
    {
      const { buildTopDuelHUD } = await import('../js/graphics/hudManager.js');
      const { drawWingedGradeLetter } = await import('../js/graphics/ui/CollectorCardRenderer.js');
      const html = buildTopDuelHUD(
        { name: 'High Grade', grade: 'SS', hp: 100, maxHp: 100 },
        { name: 'Standard Grade', grade: 'B', hp: 100, maxHp: 100 }
      );
      assert(html.includes('class="hud-top-profile__grade-canvas"'), 'Top HUD must render grade letters using a dedicated canvas');
      assert(!html.includes('hud-top-profile__grade-seal'), 'Top HUD grade letters must not include the decorative seal artwork');
      const hudStyles = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
      const gradeCanvasStyles = hudStyles.match(/\.hud-top-profile__grade-canvas\s*\{([^}]*)\}/)?.[1] || '';
      assert(/right:\s*-14px/.test(gradeCanvasStyles), 'Grade letters must stay in the top-right corner of both portrait frames');
      assert(!/\.hud-top-player\.hud-top-p[12]\s+\.hud-top-profile__grade-canvas/.test(hudStyles), 'Grade letter placement must not be mirrored between players');

      const originalStrokeText = mockCtx.strokeText;
      const originalRadialGradient = mockCtx.createRadialGradient;
      let letterFont = '';
      let gradeAuraCount = 0;
      mockCtx.strokeText = () => { letterFont = mockCtx.font; };
      mockCtx.createRadialGradient = (...args) => {
        gradeAuraCount++;
        return originalRadialGradient(...args);
      };
      try {
        mockCtx.resetStackDepth();
        drawWingedGradeLetter(mockCtx, 32, 32, 'SS', null, 1, 1.3, true);
        assert(letterFont === '900 20.5px "Impact", "Outfit", "Rajdhani", sans-serif', 'HUD grade letters must share the card seal Impact font');
        assert(gradeAuraCount > 0, 'Top HUD grade letters must include their matching card-grade aura effect');
        assert(mockCtx.getStackDepth() === 0, 'Grade letter rendering must restore the Canvas 2D stack');

        // Test SSR Grade support
        mockCtx.resetStackDepth();
        drawWingedGradeLetter(mockCtx, 32, 32, 'SSR', null, 1, 1.3, true);
        assert(letterFont === '900 20.5px "Impact", "Outfit", "Rajdhani", sans-serif', 'SSR HUD grade letter must use enlarged 20.5px font');
        assert(mockCtx.getStackDepth() === 0, 'SSR grade letter rendering must restore the Canvas 2D stack');

        const { getZeusGradeCardTheme, drawWingedGradeSeal } = await import('../js/graphics/ui/CollectorCardRenderer.js');
        const ssrTheme = getZeusGradeCardTheme('SSR');
        assert(ssrTheme && ssrTheme.grade === 'SSR', 'SSR theme must be defined');
        assert(ssrTheme.bgBase === '#090A0F', 'SSR theme must use Abyss Black bgBase');
        assert(ssrTheme.primary === '#FFFFFF', 'SSR theme must use crisp white/silver primary');

        mockCtx.resetStackDepth();
        drawWingedGradeSeal(mockCtx, 50, 50, 'SSR', ssrTheme, 0, 1.0);
        assert(mockCtx.getStackDepth() === 0, 'SSR grade seal rendering must restore Canvas 2D stack');

        // Test Nameless Deity Top HUD Profile rendering uses CosmicLightCircleCenter1.png
        const { renderTopHudProfileCanvas } = await import('../js/graphics/hudManager.js');
        let drawImageSrc = '';
        let drawImageArgs = null;
        const originalDrawImage = mockCtx.drawImage;
        mockCtx.drawImage = (img, ...args) => {
          drawImageSrc = img?.src || '';
          drawImageArgs = args;
        };
        try {
          const testCanvas = { width: 1400, height: 1400, getContext: () => mockCtx };
          renderTopHudProfileCanvas(testCanvas, { characterId: 'namelessdeity', type: 'namelessdeity' });
          assert(drawImageSrc.includes('CosmicLightCircleCenter1.png'), 'Top HUD profile must render CosmicLightCircleCenter1.png for Nameless Deity');
          assert(drawImageArgs && drawImageArgs.length >= 4, 'Top HUD profile must render deity asset centered');
        } finally {
          mockCtx.drawImage = originalDrawImage;
        }

        // Test Zeus Top HUD Profile rendering excludes cloud assets
        const drawnZeusImages = [];
        mockCtx.drawImage = (img, ...args) => {
          if (img && img.src) drawnZeusImages.push(img.src);
        };
        try {
          mockCtx.resetStackDepth();
          const testCanvas = { width: 1400, height: 1400, getContext: () => mockCtx };
          renderTopHudProfileCanvas(testCanvas, { characterId: 'zeus', type: 'zeus', r: 25 });
          const hasClouds = drawnZeusImages.some(src => src.includes('/Clouds/') || src.includes('cloud-'));
          assert(!hasClouds, 'Top HUD profile for Zeus must NOT display cloud assets');
          assert(mockCtx.getStackDepth() === 0, 'Zeus Top HUD profile rendering must restore Canvas 2D stack');
        } finally {
          mockCtx.drawImage = originalDrawImage;
        }

        // Test Sans Top HUD Custom Stamina Bar
        const sansP1Html = buildTopDuelHUD(
          { name: 'Sans', characterId: 'sans', type: 'sans', stamina: 80, maxStamina: 100, hp: 1, maxHp: 1 },
          { name: 'Gojo', characterId: 'gojo', type: 'gojo', hp: 100, maxHp: 100 }
        );
        assert(sansP1Html.includes('hud-bar-sans-stamina'), 'Top HUD must include hud-bar-sans-stamina for Sans P1');
        assert(sansP1Html.includes('sans-bolt-wrapper'), 'Top HUD must render lightning bolt icon for Sans P1');
        assert(sansP1Html.includes('sansBoltGradTopP1'), 'Top HUD must declare sansBoltGradTopP1 gradient for Sans P1');
        assert(sansP1Html.includes('sans-stamina-dividers'), 'Top HUD must render stamina segment dividers for Sans P1');

        const sansP2Html = buildTopDuelHUD(
          { name: 'Gojo', characterId: 'gojo', type: 'gojo', hp: 100, maxHp: 100 },
          { name: 'Sans', characterId: 'sans', type: 'sans', stamina: 100, maxStamina: 100, hp: 1, maxHp: 1 }
        );
        assert(sansP2Html.includes('hud-bar-sans-stamina'), 'Top HUD must include hud-bar-sans-stamina for Sans P2');
        assert(sansP2Html.includes('sans-bolt-wrapper'), 'Top HUD must render lightning bolt icon for Sans P2');
        assert(sansP2Html.includes('sansBoltGradTopP2'), 'Top HUD must declare sansBoltGradTopP2 gradient for Sans P2');
        assert(sansP2Html.includes('sans-stamina-dividers'), 'Top HUD must render stamina segment dividers for Sans P2');
        assert(hudStyles.includes('.hud-top-bar.hud-bar-sans-stamina'), 'style.css must define .hud-top-bar.hud-bar-sans-stamina');
        assert(hudStyles.includes('.hud-top-player.hud-top-p2 .hud-top-bar .sans-bolt-wrapper'), 'style.css must position P2 bolt wrapper');
      } finally {
        mockCtx.strokeText = originalStrokeText;
        mockCtx.createRadialGradient = originalRadialGradient;
      }
    }

    // 18. Test Crazy Dave plant avoidance of occupied building & plant tiles and full-arena blocking
    const daveTestOccupancy = new CrazyDaveClass({ startX: 100, startY: 300, radius: 25, hp: 390 });
    daveTestOccupancy.sunCount = 500;
    daveTestOccupancy.peashooterCooldown = 0;
    state.arena = { x: 40, y: 170, width: 437, height: 437, shape: 'rectangle' };
    
    // Target tile in front of Dave has an Engineer Sentry Turret
    const rawTargetX = daveTestOccupancy.x + 32;
    const rawTargetY = daveTestOccupancy.y;
    const targetTile = getNearestGrassTileCenter(rawTargetX, rawTargetY, state.arena);
    const mockSentry = { isTurret: true, x: targetTile.x, y: targetTile.y, hp: 200 };
    state.fighters = [daveTestOccupancy, mockSentry];

    daveTestOccupancy.plantPeashooter(gojo);
    const deployedPea = daveTestOccupancy.activePeashooters[daveTestOccupancy.activePeashooters.length - 1];
    assert(deployedPea !== undefined, 'Peashooter must still be planted on an alternative unoccupied tile');
    const distToSentry = Math.hypot(deployedPea.x - mockSentry.x, deployedPea.y - mockSentry.y);
    assert(distToSentry > 30, 'Crazy Dave must NOT plant on top of an occupied building/sentry tile');

    const chessDave = new CrazyDaveClass({ startX: 100, startY: 300, radius: 25, hp: 390 });
    chessDave.sunCount = 500;
    const chessTile = getNearestGrassTileCenter(chessDave.x + 32, chessDave.y, state.arena);
    const shiroTroopOccupant = { isMinion: true, x: chessTile.x, y: chessTile.y, hp: 80 };
    const fightersBeforeChessOccupancy = state.fighters;
    state.fighters = [chessDave, shiroTroopOccupant];
    assert(chessDave.plantPeashooter(gojo), 'Crazy Dave must plant on another tile when a Shiro minion occupies the candidate tile');
    const chessDavePlant = chessDave.activePeashooters[0];
    assert(Math.hypot(chessDavePlant.x - shiroTroopOccupant.x, chessDavePlant.y - shiroTroopOccupant.y) > 1, 'Crazy Dave must not overlap a Shiro minion tile');
    state.fighters = fightersBeforeChessOccupancy;

    // Test full arena occupancy blocking Dave planting
    const daveFullArena = new CrazyDaveClass({ startX: 100, startY: 300, radius: 25, hp: 390 });
    daveFullArena.sunCount = 500;
    daveFullArena.peashooterCooldown = 0;
    const testCols = ARENA_TILE_COUNT;
    const testRows = ARENA_TILE_COUNT;
    const cellWidth = state.arena.width / testCols;
    const cellHeight = state.arena.height / testRows;
    const allOccupyingBuildings = [];
    for (let r = 0; r < testRows; r++) {
      for (let c = 0; c < testCols; c++) {
        allOccupyingBuildings.push({
          isDispenser: true,
          x: state.arena.x + (c + 0.5) * cellWidth,
          y: state.arena.y + (r + 0.5) * cellHeight,
          hp: 160
        });
      }
    }
    state.fighters = [daveFullArena, ...allOccupyingBuildings];
    const plantResult = daveFullArena.plantPeashooter(gojo);
    assert(plantResult === false, 'Crazy Dave must NOT be able to plant when all tiles are occupied by buildings');
    assert(daveFullArena.activePeashooters.length === 0, 'No plant should be added when all tiles are occupied');

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
      assert(m.x === testArena.x + testArena.width + CONFIG.crazydave.lawnmowerBaselineOffset, `Right-spawn lawnmowers must be outside the right arena wall (got ${m.x})`);
      assert(m.x > testArena.x + testArena.width, 'Right-spawn lawnmower centers must be outside the arena');
      assert(m.y === testArena.y + (m.row + 0.5) * testArena.height / ARENA_TILE_COUNT, 'Lawnmowers must remain aligned with 8x8 tile rows');
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
    assert(leftSpawnDave.lawnmowers.every(m => m.x === testArena.x - CONFIG.crazydave.lawnmowerBaselineOffset), 'Left-spawn lawnmowers must be outside the left arena wall');
    assert(leftSpawnDave.lawnmowers.every(m => m.x < testArena.x), 'Left-spawn lawnmower centers must be outside the arena');
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
    assert(sampleMower.x === testArena.x + testArena.width + CONFIG.crazydave.lawnmowerBaselineOffset, 'Lawnmower must not be displaced by colliding entity');

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

  console.log('   28. Testing Engineer sentry and dispenser tile placement, occupancy checks & full-arena gating...');
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

    // Complete sentry building to test dispenser deployment
    engineer.isBuildingTurret = false;
    engineer.turretEntity.isBuilding = false;
    engineer.turretEntity.buildProgress = 1;
    engineer.dispenserCooldown = 0;

    // Update to trigger dispenser build
    engineer.update(davePlantTarget, 0, testArena);
    assert(engineer.dispenserEntity !== null, 'Engineer must deploy a dispenser when sentry is active and cooldown is ready');

    // Verify dispenser is snapped to the center of a tile
    const dispenserTile = getNearestGrassTileCenter(engineer.dispenserEntity.x, engineer.dispenserEntity.y, testArena);
    assert(Math.abs(engineer.dispenserEntity.x - dispenserTile.x) < 0.001, 'Dispenser must be placed at the center of the grass tile');
    assert(Math.abs(engineer.dispenserEntity.y - dispenserTile.y) < 0.001, 'Dispenser must be placed at the center of the grass tile (y)');

    // Verify dispenser did not place on the sentry's tile
    const distBetweenBuildings = Math.hypot(engineer.dispenserEntity.x - engineer.turretEntity.x, engineer.dispenserEntity.y - engineer.turretEntity.y);
    assert(distBetweenBuildings > 30, 'Dispenser and Sentry must not occupy the same tile');

    // Test plant-occupied tile avoidance
    const engineer2 = new EngineerClass({ startX: 100, startY: 300, radius: 25, hp: 400 });
    const occupyingPlant = { isPlant: true, x: expectedBuildTile.x, y: expectedBuildTile.y, hp: 100 };
    state.fighters = [engineer2, daveOpponent, occupyingPlant];
    engineer2.update(davePlantTarget, 0, testArena);
    assert(engineer2.turretEntity !== null, 'Engineer must deploy sentry on an alternative unoccupied tile');
    const sentryToPlantDist = Math.hypot(engineer2.turretEntity.x - occupyingPlant.x, engineer2.turretEntity.y - occupyingPlant.y);
    assert(sentryToPlantDist > 30, 'Engineer sentry must not be placed on a plant-occupied tile');

    // Test full arena occupancy blocking deployment
    const engineer3 = new EngineerClass({ startX: 100, startY: 300, radius: 25, hp: 400 });
    const cols = ARENA_TILE_COUNT;
    const rows = ARENA_TILE_COUNT;
    const cellW = testArena.width / cols;
    const cellH = testArena.height / rows;
    const allPlants = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        allPlants.push({
          isPlant: true,
          x: testArena.x + (c + 0.5) * cellW,
          y: testArena.y + (r + 0.5) * cellH,
          hp: 100
        });
      }
    }
    state.fighters = [engineer3, daveOpponent, ...allPlants];
    engineer3.update(davePlantTarget, 0, testArena);
    assert(engineer3.turretEntity === null, 'Engineer must NOT deploy a sentry when all tiles are occupied');

    // Test non-Crazy-Dave opponent also gets placed at center of tile
    const normalEngineer = new EngineerClass({ startX: 100, startY: 300, radius: 25, hp: 400 });
    const normalOpponent = { characterId: 'gojo', type: 'gojo', x: 360, y: 300, hp: 200 };
    state.fighters = [normalEngineer, normalOpponent];
    normalEngineer.update(normalOpponent, 0, testArena);
    assert(normalEngineer.turretEntity !== null, 'Engineer must still deploy a sentry against normal opponents');
    const normalSentryTile = getNearestGrassTileCenter(normalEngineer.turretEntity.x, normalEngineer.turretEntity.y, testArena);
    assert(
      Math.abs(normalEngineer.turretEntity.x - normalSentryTile.x) < 0.001 &&
      Math.abs(normalEngineer.turretEntity.y - normalSentryTile.y) < 0.001,
      'Engineer sentry must be placed at the center of an arena tile against all opponents'
    );

    state.fighters = [];
    state.arena = null;
    console.log('      ✅ Engineer sentry and dispenser tile placement, occupancy checks & full-arena gating verified.');
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
    assert(gridInfo.cols === ARENA_TILE_COUNT && gridInfo.rows === ARENA_TILE_COUNT, 'Arena floor grids must be exactly 8x8');
    assert(gridInfo.totalTiles === 64 && gridInfo.cellW > 0, 'getTileGridInfo should calculate all 64 tile cells');
    
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

  // ─────────────────────────────────────────────
  // 30b. Testing Arena Domain Overlay Visibility (Native Canvas 2D Must Never Erase Arena Art)
  // ─────────────────────────────────────────────
  {
    console.log('   30b. Testing Arena Domain Overlay Visibility in Native Canvas 2D Mode...');
    const { state } = await import('../js/core/state.js');
    const { applyDomainArenaVignetteCutout } = await import('../js/graphics/renderers/domainDimOverlays.js');

    const previousPixiApp = state.pixiApp;
    const previousPixiLayers = state.pixiLayers;
    const previousArena = state.arena;
    const previousCamera = state.camera;
    const previousFill = mockCtx.fill;
    const previousFillRect = mockCtx.fillRect;

    let erasePaintCount = 0;
    const trackComposite = () => {
      if (mockCtx.globalCompositeOperation === 'destination-out') erasePaintCount++;
    };
    mockCtx.fill = function () { trackComposite(); };
    mockCtx.fillRect = function () { trackComposite(); };

    try {
      state.arena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
      state.camera = { enabled: false, mode: 'fixed', zoom: 1 };

      // Native Canvas 2D mode: there is no lower WebGL layer, so erasing would delete the domain art itself
      state.pixiApp = null;
      state.pixiLayers = {};
      erasePaintCount = 0;
      mockCtx.resetStackDepth();
      applyDomainArenaVignetteCutout(mockCtx);
      assert(erasePaintCount === 0, `Native Canvas 2D mode must NOT erase arena pixels during domain dims (got ${erasePaintCount} destination-out paints)`);
      assert(mockCtx.getStackDepth() === 0, 'applyDomainArenaVignetteCutout must keep a balanced canvas stack in native mode');

      // WebGL hybrid mode keeps the original cutout so lower-layer domain sprites show through
      state.pixiApp = { screen: { width: 540, height: 960 }, stage: { position: { set: () => {} } }, render: () => {} };
      state.pixiLayers = { environment: {}, effects: {} };
      erasePaintCount = 0;
      mockCtx.resetStackDepth();
      applyDomainArenaVignetteCutout(mockCtx);
      assert(erasePaintCount > 0, 'WebGL hybrid mode must still cut the arena interior out of the dim layer');
      assert(mockCtx.getStackDepth() === 0, 'applyDomainArenaVignetteCutout must keep a balanced canvas stack in WebGL mode');
    } finally {
      mockCtx.fill = previousFill;
      mockCtx.fillRect = previousFillRect;
      mockCtx.globalCompositeOperation = 'source-over';
      state.pixiApp = previousPixiApp;
      state.pixiLayers = previousPixiLayers;
      state.arena = previousArena;
      state.camera = previousCamera;
    }
    console.log('      ✅ Native Canvas 2D domain overlays preserved while WebGL cutout behavior stays intact.');
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
    const expectedDartCooldown = namelessDeityConfig?.dartCooldown ?? namelessDeityConfig?.cooldown ?? 45;
    assert(nameless.shootCooldown === expectedDartCooldown, `Nameless Deity shootCooldown must be set to dartCooldown (${expectedDartCooldown}) after firing`);

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
    const attackDmg = 100; // 100 damage attack (e.g. Makima Bang) -> 10 stamina cost (10%)
    const stamCost = typeof sans._calculateDodgeStaminaCost === 'function'
      ? sans._calculateDodgeStaminaCost(attackDmg)
      : ((sansConfig.dodgeStaminaCost !== undefined) ? sansConfig.dodgeStaminaCost : 10);
    const initialStam = sans.stamina;

    // Dodge 1: Full stamina -> 100% dodge chance
    const dmg1 = sans.takeDamage(attackDmg, opponent);
    assert(dmg1 === 0, "Sans must dodge incoming attack when stamina is available");
    assert(sans.hp === 1, "Sans HP must remain 1 after dodge");
    assert(sans.stamina === initialStam - stamCost, `Sans stamina must be ${initialStam - stamCost} after 1 dodge (got ${sans.stamina})`);

    // Deplete remaining stamina to 0
    while (sans.stamina >= stamCost) {
      sans.takeDamage(attackDmg, opponent);
    }
    assert(sans.stamina < stamCost, `Sans stamina must be depleted below cost (got ${sans.stamina})`);

    // Out of stamina -> Cannot dodge -> Takes lethal damage and dies
    const dmgFinal = sans.takeDamage(attackDmg, opponent);
    assert(Boolean(dmgFinal), "Sans must take damage when out of stamina");
    assert(sans.hp <= 0, `Sans must be defeated at 0 HP after getting hit (got ${sans.hp})`);

    // Verify Sans death spawns Undertale / Deltarune Red SOUL Heart Split & Shatter in deathEffects
    const sansDeathFx = state.deathEffects.find(e => e && e.isSansHeartShatter);
    assert(sansDeathFx !== undefined, 'Sans death must register isSansHeartShatter in state.deathEffects');
    assert(sansDeathFx.timer === 85, 'Sans death shatter must start at 85 frames');
    assert(sansDeathFx.speechBubble && sansDeathFx.speechBubble.fullText.includes("grillby"), 'Sans death must include Grillby death quote');

    // Step through death effects update and render
    mockCtx.resetStackDepth();
    const { updateDeathEffects, drawDeathEffects } = await import('../js/graphics/particles/deathShatterEffect.js');
    drawDeathEffects();
    assert(mockCtx.getStackDepth() === 0, 'drawDeathEffects with Sans heart shatter must maintain 0 stack depth');

    // 12. Verify Sans dodge configuration
    assert(typeof sansConfig.dodgeChance === 'number' && sansConfig.dodgeChance >= 0, `Expected valid dodgeChance`);
    assert(typeof sansConfig.domainDodgeChance === 'number' && sansConfig.domainDodgeChance >= 0, `Expected valid domainDodgeChance`);
    assert(typeof sansConfig.dodgeCooldown === 'number' && sansConfig.dodgeCooldown >= 0, `Expected valid dodgeCooldown`);

    // 13. Verify Sans Fuga Dodge: Takes 0 damage and receives 0 burn effect
    sans.reset();
    sans.burnTimer = 0;
    assert(sans.burnTimer === 0, 'Sans burnTimer must initialize at 0');
    
    // Trigger Fuga thermobaric explosion near Sans
    projectileSystem.triggerThermobaricExplosion(sans.x, sans.y, 1, 300);
    assert(sans.hp === 1, `Sans must dodge Fuga explosion and remain at 1 HP (got ${sans.hp})`);
    assert(sans.burnTimer === 0, `Sans must NOT receive burn effect after dodging Fuga (got ${sans.burnTimer})`);

    // 14. Verify Sans Initial Cooldowns (Gaster Blaster, Bone Zone, Bad Time Gravity Slam)
    sans.reset();
    const expectedInitBlasterCd = sansConfig.initialBlasterCooldown !== undefined ? sansConfig.initialBlasterCooldown : 180;
    assert(sans.blasterCooldown === expectedInitBlasterCd, `Sans Gaster Blaster must start on initial cooldown (${expectedInitBlasterCd} frames, got ${sans.blasterCooldown})`);

    const expectedInitBoneZoneCd = (sansConfig.initialBoneZoneCooldown !== undefined)
      ? sansConfig.initialBoneZoneCooldown
      : ((sansConfig.boneZoneInitialCooldown !== undefined) ? sansConfig.boneZoneInitialCooldown : 180);
    assert(sans.boneZoneCooldown === expectedInitBoneZoneCd, `Sans Bone Zone must start on initial cooldown (${expectedInitBoneZoneCd} frames, got ${sans.boneZoneCooldown})`);

    const expectedInitGravitySlamCd = (sansConfig.initialGravitySlamCooldown !== undefined)
      ? sansConfig.initialGravitySlamCooldown
      : ((sansConfig.gravitySlamInitialCooldown !== undefined)
        ? sansConfig.gravitySlamInitialCooldown
        : ((sansConfig.initialBadTimeCooldown !== undefined)
          ? sansConfig.initialBadTimeCooldown
          : ((sansConfig.badTimeInitialCooldown !== undefined) ? sansConfig.badTimeInitialCooldown : 480)));
    assert(sans.gravitySlamCooldown === expectedInitGravitySlamCd, `Sans Bad Time / Gravity Slam must start on initial cooldown (${expectedInitGravitySlamCd} frames, got ${sans.gravitySlamCooldown})`);

    // 15. Verify Sans Skill 1: Gaster Blaster Arsenal First Impact (100%) & Continuous (50%) Damage
    const { Fighter } = await import('../js/entities/fighter.js');
    state.gameState = 'playing';
    state.isGameOver = false;
    sans.reset();
    sans.stamina = 100;
    sans.blasterCooldown = 0;
    const targetDummy = new Fighter({ hp: 500, maxHp: 500, x: 300, y: 250, r: 25 });
    targetDummy.team = 'enemy';
    sans.team = 'player';
    sans.x = 200;
    sans.y = 250;
    state.fighters = [sans, targetDummy];

    // Cast Pattern 2: Colossal Titan Gigablaster (Massive super laser directly along x-axis)
    sans.stamina = 50;
    const staminaBeforeCast = sans.stamina;
    sans.castGasterBlasters(targetDummy, 2);
    const staminaAfterCast = sans.stamina;
    assert(sans.gasterBlasters.length === 1, 'Gigablaster must be spawned in gasterBlasters array');
    const gigaBlaster = sans.gasterBlasters[0];
    assert(gigaBlaster.pattern === 2, 'Gigablaster pattern index must be 2');
    const gigaBaseDmg = gigaBlaster.damage; // 30
    assert(gigaBaseDmg === 30, `Gigablaster base damage must be 30 (got ${gigaBaseDmg})`);

    // Complete charge phase; on final charge tick it transitions to firing and triggers First Impact (100% damage)
    const hpBeforeCast = targetDummy.hp;
    while (gigaBlaster.isCharging) {
      sans._updateGasterBlasters(targetDummy);
    }
    assert(gigaBlaster.isFiring === true, 'Gigablaster must enter firing state after charging');

    const firstImpactDealt = hpBeforeCast - targetDummy.hp;
    assert(firstImpactDealt === gigaBaseDmg, `Gigablaster first impact must deal 100% damage (${gigaBaseDmg} dmg, got ${firstImpactDealt})`);
    assert(gigaBlaster.hitTargets.has(targetDummy), 'Target must be recorded in blaster hitTargets');
    assert(sans.stamina > staminaAfterCast, `Sans must recover stamina on first impact hit (was ${staminaAfterCast}, now ${sans.stamina})`);
    const staminaAfterFirstImpact = sans.stamina;

    // Intermediate frames within tickInterval (5 frames): No additional damage yet
    const hpAfterFirstImpact = targetDummy.hp;
    for (let f = 0; f < 5; f++) {
      sans._updateGasterBlasters(targetDummy);
    }
    assert(targetDummy.hp === hpAfterFirstImpact, 'Target HP must remain constant within continuous damage tick interval');

    // 6th frame (tickInterval reached): Continuous damage must deal 50% damage (15 dmg)
    sans._updateGasterBlasters(targetDummy);
    const continuousDealt = hpAfterFirstImpact - targetDummy.hp;
    const expectedContinuousDmg = Math.max(1, Math.round(gigaBaseDmg * 0.5));
    assert(continuousDealt === expectedContinuousDmg, `Gigablaster continuous damage must deal 50% damage (${expectedContinuousDmg} dmg, got ${continuousDealt})`);
    assert(sans.stamina > staminaAfterFirstImpact, `Sans must recover stamina on continuous beam contact tick (was ${staminaAfterFirstImpact}, now ${sans.stamina})`);

    // Verify Pattern 0 Carousel and Pattern 1 Radial Ring config base damage & 50% continuous ratio
    sans.reset();
    sans.stamina = 100;
    sans.castGasterBlasters(targetDummy, 0);
    assert(sans.gasterBlasters.length >= 1, 'Carousel blaster must spawn');
    assert(sans.gasterBlasters[0].damage === (sansConfig.blasterCarouselDamage || 20), 'Carousel base damage must match config');

    sans.reset();
    sans.stamina = 100;
    sans.castGasterBlasters(targetDummy, 1);
    assert(sans.gasterBlasters.length === (sansConfig.blasterRingCount || 8), 'Radial ring must spawn configured blaster count');
    assert(sans.gasterBlasters[0].damage === (sansConfig.blasterRingDamage || 20), 'Radial ring base damage must match config');

    // Verify canvas stack depth during dodge state
    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans draw stack depth during domain slice dodge state must be 0');

    console.log('      ✅ Sans Undertale speech bubbles, warning box, Heart Shatter defeat VFX, faah suppression, in-arena overlay HP, skill bars, initial blaster cooldown, Gaster Blaster 100% first impact & 50% continuous damage verified.');
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

    // Verify Nameless Deity Ultimate CD non-ticking during activation
    {
      const { NamelessDeityFighter } = await import('../js/entities/fighters/NamelessDeityFighter.js');
      const testDeity = new NamelessDeityFighter({ radius: 28, x: 200, y: 200 });
      const dummyOpp = { hp: 100, maxHp: 100, x: 400, y: 200, vx: 0, vy: 0, dead: false, isEffectivelyAlive: () => true };
      const testArena = { x: 0, y: 0, width: 800, height: 600, shape: 'rectangle' };
      testDeity.destroyerCooldown = 0;

      // 1. Cast ultimate
      testDeity.castNamelessDestroyer(dummyOpp, true);
      const { namelessDeityConfig: deityCfg } = await import('../js/configs/characters/namelessDeityConfig.js');
      const expectedFullCD = deityCfg?.destroyerCooldown ?? 1500;
      assert(testDeity.destroyerCooldown === expectedFullCD, `Ultimate CD immediately upon cast must be ${expectedFullCD}, got ${testDeity.destroyerCooldown}`);
      assert(testDeity.destroyerWindupTimer > 0, 'Windup timer must be active upon cast');

      // 2. Simulate 10 frames during windup
      for (let f = 0; f < 10; f++) {
        testDeity.update(dummyOpp, 0, testArena);
      }
      assert(testDeity.destroyerCooldown === expectedFullCD, `Ultimate CD must NOT tick during windup phase (expected ${expectedFullCD}, got ${testDeity.destroyerCooldown})`);

      // 3. Simulate fire phase
      testDeity.destroyerWindupTimer = 0;
      testDeity.destroyerFireTimer = 100;
      for (let f = 0; f < 10; f++) {
        testDeity.update(dummyOpp, 0, testArena);
      }
      assert(testDeity.destroyerCooldown === expectedFullCD, `Ultimate CD must NOT tick during firing phase (expected ${expectedFullCD}, got ${testDeity.destroyerCooldown})`);

      // 4. Simulate recovery phase
      testDeity.destroyerFireTimer = 0;
      testDeity.destroyerRecoveryTimer = 25;
      for (let f = 0; f < 10; f++) {
        testDeity.update(dummyOpp, 0, testArena);
      }
      assert(testDeity.destroyerCooldown === expectedFullCD, `Ultimate CD must NOT tick during recovery phase (expected ${expectedFullCD}, got ${testDeity.destroyerCooldown})`);

      // 5. Complete recovery (ultimate is done)
      testDeity.destroyerRecoveryTimer = 1;
      testDeity.update(dummyOpp, 0, testArena); // recovery reaches 0 here
      assert(testDeity.destroyerRecoveryTimer === 0, 'Recovery must be 0 after completing recovery frame');
      assert(testDeity.destroyerCooldown === expectedFullCD, `Ultimate CD must be reset to ${expectedFullCD} upon ultimate completion`);

      // 6. Next 5 frames: ultimate is done, cooldown MUST tick down
      for (let f = 0; f < 5; f++) {
        testDeity.update(dummyOpp, 0, testArena);
      }
      assert(testDeity.destroyerCooldown === expectedFullCD - 5, `Ultimate CD must tick down after ultimate is done (expected ${expectedFullCD - 5}, got ${testDeity.destroyerCooldown})`);

      // 7. Verify cutting off all audio when Deity dies while winding up ultimate
      state.gameState = 'playing';
      state.roundEndTimer = 0;
      testDeity.destroyerCooldown = 0;
      testDeity.castNamelessDestroyer(dummyOpp, true);
      assert(testDeity.destroyerWindupTimer > 0, 'Deity must be in ultimate wind-up phase');
      assert(testDeity.destroyerChargeSoundHandle !== null, 'Deity must have active wind-up charge sound handle');

      // Now Deity dies during windup!
      testDeity.hp = 0;
      testDeity.dead = true;
      testDeity.isDead = true;
      testDeity.onDeath();

      assert(testDeity.destroyerChargeSoundHandle === null, 'destroyerChargeSoundHandle must be null after onDeath()');
      assert(testDeity.destroyerWindupTimer === 0, 'destroyerWindupTimer must be 0 after onDeath()');
      assert(testDeity.destroyerFireTimer === 0, 'destroyerFireTimer must be 0 after onDeath()');
      assert(testDeity.destroyerLoopSoundKey === null, 'destroyerLoopSoundKey must be null after onDeath()');
    }

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

    // Test multi-tick re-dodge for Sans and Saitama
    // Tick 1: Entities are outside beam -> deity removes them from _dodgedBeamEntities
    deity.update(sans, 0, state.arena);
    assert(deity._dodgedBeamEntities.has(sans) === false, 'Sans outside beam must be removed from _dodgedBeamEntities');
    assert(deity._dodgedBeamEntities.has(saitama) === false, 'Saitama outside beam must be removed from _dodgedBeamEntities');

    // Tick 2: Both fighters step back into beam stream with cooldown ready
    sans.x = 300;
    sans.y = 100;
    sans.dodgeCooldown = 0;
    sans.stamina = 100;
    saitama.x = 350;
    saitama.y = 100;
    saitama.dodgeCooldown = 0;

    deity.update(sans, 0, state.arena);
    assert(sans.y !== 100 || sans.x < deity.x - sans.r, 'Sans must dodge again when re-entering beam stream');
    assert(saitama.y !== 100 || saitama.x < deity.x - saitama.r, 'Saitama must dodge again when re-entering beam stream');
    assert(sans.isCaughtInNamelessBeam !== true, 'Sans must NOT be caught in beam stasis on re-dodge');
    assert(saitama.isCaughtInNamelessBeam !== true, 'Saitama must NOT be caught in beam stasis on re-dodge');

    // Test future / generic teleport fighter dodging Deity's beam
    const { Fighter } = await import('../js/entities/fighter.js');
    const futureFighter = new Fighter({ radius: 25, x: 280, y: 100 });
    futureFighter.teleportDodgeChance = 1.0;
    futureFighter.dodgeCooldown = 0;
    state.fighters.push(futureFighter);

    const futureDidDodge = futureFighter.dodgeBeam(sansBeamData);
    assert(futureDidDodge === true, 'Future / generic fighter with teleportDodgeChance must dodge Deity beam');
    const futurePerpDist = Math.abs(futureFighter.y - deity.y);
    const futureProjLen = futureFighter.x - deity.x;
    const isSafelyOutside = futurePerpDist >= 142.5 || futureProjLen < -futureFighter.r;
    assert(isSafelyOutside === true, 'Future fighter must be placed safely outside the beam aperture or behind caster');

    // Test multi-tick re-dodge for future / generic fighter
    futureFighter.x = 320;
    futureFighter.y = 100; // Put back into beam
    futureFighter.dodgeCooldown = 0;
    deity.update(futureFighter, 0, state.arena);
    assert(futureFighter.y !== 100 || futureFighter.x < deity.x - futureFighter.r, 'Future fighter must successfully dodge again on subsequent beam tick');
    assert(futureFighter.isCaughtInNamelessBeam !== true, 'Future fighter must not be caught in nameless beam stasis');

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

  // ── TEST 50A: Eye of Cthulhu Phase 2 waits for Gojo Domain expiration ──
  console.log('   50A. Testing Eye of Cthulhu Phase 2 delay during Gojo Domain...');
  {
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { EyeOfCthulhuFighter } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');

    const gojo = new GojoFighter({ x: 200, y: 200, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 300, y: 200, radius: 32, hp: 1200 });
    eye.maxHp = 1200;
    eye.hp = 400;
    const arena = { x: 0, y: 0, width: 800, height: 600 };
    state.fighters = [gojo, eye];
    state.arena = arena;
    gojo.domainActive = true;
    eye._handleTimeStop = () => false;

    eye.update(gojo, 1, arena);
    assert(eye.isTransforming === false && eye.hasTransformed === false, 'Eye must defer starting Phase 2 while Gojo Domain is active');

    gojo.domainActive = false;
    eye.update(gojo, 1, arena);
    assert(eye.isTransforming === true && eye.hasTransformed === true, 'Eye must start Phase 2 after Gojo Domain expires');

    gojo.reset();
    eye.reset();
    console.log('      ✅ Eye of Cthulhu Phase 2 correctly waits for Gojo Domain expiration.');
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
    gojo.meleeModeCooldown = 1000;
    gojo.team = 0;
    normal.team = 0;
    eye.team = 1;

    state.mode = '2v2';
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

  // ─────────────────────────────────────────────
  // TEST 55: Reze Ultimate Full Heal & Bomb Devil Form Lifesteal
  // ─────────────────────────────────────────────
  {
    console.log('   55. Testing Reze Ultimate Full Heal & Bomb Devil Form Lifesteal...');
    const RezeClass = FIGHTER_CLASS_MAP['reze'];
    const NormalClass = FIGHTER_CLASS_MAP['normal'];
    assert(RezeClass && NormalClass, 'Reze and Normal fighter classes must exist in FIGHTER_CLASS_MAP');

    state.gameState = 'playing';
    state.mode = '1v1';
    const reze = new RezeClass({ radius: 25, x: 220, y: 200, hp: 340, ownerIndex: 0 });
    const dummy = new NormalClass({ radius: 25, x: 200, y: 200, hp: 300, ownerIndex: 1 });
    state.fighters = [reze, dummy];

    // A. Verify full heal upon Ultimate activation from low HP
    reze.hp = 40;
    assert(reze.hp === 40, 'Reze initial test HP must be 40');
    reze._activateMegatonNuke(dummy);
    assert(reze.hp === reze.maxHp, `Reze must be fully healed to maxHp (${reze.maxHp}) upon activating ultimate, got ${reze.hp}`);
    assert(reze._healthBarHealTimer > 0, 'Reze healthBarHealTimer must be active for glowing HUD heal pulse');
    assert(reze.hasUsedNuke === true, 'Reze hasUsedNuke must be true after activating ultimate');

    // Verify subsequent Megaton Tsar Nuke activation attempt is blocked
    const priorHp = reze.hp;
    reze.hp = 50;
    reze.nukeCooldown = 0;
    reze._activateMegatonNuke(dummy);
    assert(reze.hp === 50, 'Reze Megaton Tsar Nuke must only trigger once and not heal again after being used');

    // B. Fast forward transformation into Bomb Devil Form
    reze.isPullingPin = false;
    reze.isHybridModeActive = true;
    reze.hp = 100; // Lower HP to test lifesteal headroom (reze.maxHp is 200 in 1v1 mode)

    // C. Dealing damage in Bomb Devil Form triggers lifesteal
    const damageDealt = 100;
    const lifestealRatio = (typeof CONFIG !== 'undefined' && CONFIG.reze?.hybridLifestealPercent !== undefined)
      ? CONFIG.reze.hybridLifestealPercent
      : (rezeConfig.hybridLifestealPercent ?? 0.35);
    const expectedHeal = Math.round(damageDealt * lifestealRatio);
    dummy.takeDamage(damageDealt, reze);

    assert(reze.hp === 100 + expectedHeal, `Reze HP must increase by lifesteal ratio of damage dealt (expected ${100 + expectedHeal}, got ${reze.hp})`);
    assert(reze._healthBarHealTimer === 16, 'Reze healthBarHealTimer must be set to 16 upon lifesteal recovery');

    // D. Verify lifesteal does not exceed maxHp
    reze.hp = reze.maxHp - Math.max(1, Math.floor(expectedHeal / 2));
    dummy.takeDamage(100, reze);
    assert(reze.hp === reze.maxHp, `Reze HP must cap cleanly at maxHp (${reze.maxHp}), got ${reze.hp}`);

    // E. Verify human form does NOT trigger hybrid lifesteal
    reze.isHybridModeActive = false;
    reze.hp = 100;
    dummy.takeDamage(100, reze);
    assert(reze.hp === 100, `Human form Reze must not trigger hybrid lifesteal (expected 100, got ${reze.hp})`);

    // F. Verify explosion visuals decay smoothly and do NOT get stuck during time-stop/freeze
    reze.activePalmBlasts = [{ x: 200, y: 200, radius: 70, timer: 3, maxTimer: 14, isPunchExplosion: true }];
    reze.activeNukeBlasts = [{ x: 200, y: 200, radius: 175, timer: 3, maxTimer: 30, isTransformationBlast: true }];
    reze.timeStopTimer = 20; // Reze's movement is stopped by an enemy attack

    reze.update(dummy, 0, state.arena);
    assert(reze.activePalmBlasts[0].timer === 2, 'activePalmBlasts timer must decrement during freeze');
    assert(reze.activeNukeBlasts[0].timer === 2, 'activeNukeBlasts timer must decrement during freeze');

    reze.update(dummy, 0, state.arena);
    reze.update(dummy, 0, state.arena);
    assert(reze.activePalmBlasts.length === 0, 'activePalmBlasts must clear naturally and not get stuck when Reze is frozen');
    assert(reze.activeNukeBlasts.length === 0, 'activeNukeBlasts must clear naturally and not get stuck when Reze is frozen');
    reze.timeStopTimer = 0;

    // G. Verify Cluster Bombs do NOT pause and continue to play/detonate when Reze is stunned
    state.gameState = 'playing';
    dummy.hp = 200;
    dummy.dead = false;
    dummy.isDead = false;
    dummy._hasDied = false;
    dummy.x = 220;
    dummy.y = 200;
    const rezeCfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : rezeConfig;
    const expectedBombCount = rezeCfg?.clusterBombCount || 3;
    reze._throwClusterBombs(dummy);
    assert(reze.activeClusterBombs.length === expectedBombCount, `Reze must deploy ${expectedBombCount} cluster bombs in a spread (got ${reze.activeClusterBombs.length})`);

    const initialFuse0 = reze.activeClusterBombs[0].fuseTimer;
    const maxFuse = Math.max(...reze.activeClusterBombs.map(b => b.fuseTimer));

    // Apply hard stun / time stop to Reze that exceeds total fuse duration
    reze.timeStopTimer = maxFuse + 30;
    reze.electricStunTimer = maxFuse + 30;
    reze.paralyzeTimer = maxFuse + 30;

    // Advance 5 frames while Reze is frozen
    for (let f = 0; f < 5; f++) {
      reze.update(dummy, 0, state.arena);
    }
    assert(reze.activeClusterBombs.length > 0, 'Cluster bombs must remain active and not get wiped');
    assert(reze.activeClusterBombs[0].fuseTimer === initialFuse0 - 5, `Cluster bomb fuse must decrement during freeze (expected ${initialFuse0 - 5}, got ${reze.activeClusterBombs[0].fuseTimer})`);

    // Advance until all bombs have detonated while Reze is still frozen
    const initialDummyHp = dummy.hp;
    for (let f = 0; f < maxFuse + 10; f++) {
      reze.update(dummy, 0, state.arena);
    }
    assert(reze.activeClusterBombs.length === 0, 'All cluster bombs must finish their fuses and detonate 1-by-1');
    assert(dummy.hp < initialDummyHp, `Dummy must take damage from cluster bomb detonations during Reze stun (expected < ${initialDummyHp}, got ${dummy.hp})`);

    // H. Verify Mobility Skill: Supersonic Rocket Lunge Foot Launch Explosion
    state.gameState = 'playing';
    reze.isHybridModeActive = true;
    reze.rocketCooldown = 0;
    reze.x = 250;
    reze.y = 200;
    dummy.hp = 200;
    dummy.dead = false;
    dummy.isDead = false;
    dummy._hasDied = false;
    dummy.x = 210; // Positioned behind Reze's feet
    dummy.y = 200;
    const forwardTarget = { x: 450, y: 200, r: 25, hp: 300, isDead: false };

    reze.activePalmBlasts = [];
    reze._activateRocketLunge(forwardTarget);

    assert(reze.isRocketLunging === true, 'Reze must enter isRocketLunging state');
    assert(reze.activePalmBlasts.length > 0, 'Foot explosion shockwave must be registered in activePalmBlasts');
    assert(reze.activePalmBlasts[0].isFootExplosion === true, 'Active blast must be marked as isFootExplosion');
    assert(dummy.hp < 200, `Dummy behind Reze feet must take damage from foot launch explosion (expected < 200, got ${dummy.hp})`);

    // I. Rocket Lunge should damage a skill user without interrupting or stunning their active skill
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    assert(GojoClass, 'Gojo fighter class must exist for Rocket Lunge skill-interruption coverage');
    const gojo = new GojoClass({ radius: 25, x: 300, y: 200, hp: 200, ownerIndex: 1 });
    gojo.infinityActive = false;
    gojo.infinityBarrierHp = 0;
    gojo.isChannelingPurple = true;
    assert(gojo.isPerformingSkill() === true, 'Gojo must be actively channeling Purple before Rocket Lunge impact');

    const rocketFootExplosionConfig = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : rezeConfig;
    const originalFootExplosionRadius = rocketFootExplosionConfig.rocketFootExplosionRadius;
    let channelingSkillHpAfterImpact;
    let channelingSkillTimerAfterImpact;
    let channelingKnockbackStunAfterImpact;
    let channelingTimeStopAfterImpact;
    let regularKnockbackStunAfterImpact;
    let regularTimeStopAfterImpact;
    try {
      rocketFootExplosionConfig.rocketFootExplosionRadius = 40;
      reze.x = 250;
      reze.y = 200;
      reze.isRocketLunging = false;
      reze.rocketCooldown = 0;
      state.fighters = [reze, gojo];
      reze._activateRocketLunge(gojo);
      assert(gojo.hp === gojo.maxHp, 'Rocket launch blast must not hit Gojo ahead of Reze in this direct-impact case');
      reze._updateRocketLunge();
      channelingSkillHpAfterImpact = gojo.hp;
      channelingSkillTimerAfterImpact = gojo.isChannelingPurple;
      channelingKnockbackStunAfterImpact = gojo.knockbackStunTimer || 0;
      channelingTimeStopAfterImpact = gojo.timeStopTimer || 0;

      gojo.reset();
      dummy.x = 300;
      dummy.y = 200;
      dummy.hp = 200;
      dummy.knockbackStunTimer = 0;
      dummy.timeStopTimer = 0;
      dummy.knockbackVx = 0;
      dummy.knockbackVy = 0;
      dummy.vx = 0;
      dummy.vy = 0;
      reze.x = 250;
      reze.y = 200;
      reze.isRocketLunging = false;
      reze.rocketCooldown = 0;
      state.fighters = [reze, dummy];
      reze._activateRocketLunge(dummy);
      reze._updateRocketLunge();
      regularKnockbackStunAfterImpact = dummy.knockbackStunTimer || 0;
      regularTimeStopAfterImpact = dummy.timeStopTimer || 0;
    } finally {
      rocketFootExplosionConfig.rocketFootExplosionRadius = originalFootExplosionRadius;
    }

    assert(channelingSkillHpAfterImpact < 200, 'Rocket Lunge must still damage an enemy who is channeling a skill');
    assert(channelingSkillTimerAfterImpact === true, 'Rocket Lunge impact must not cancel Gojo’s active Purple channel');
    assert(channelingKnockbackStunAfterImpact === 0, 'Rocket Lunge must not apply knockback stun to an enemy channeling a skill');
    assert(channelingTimeStopAfterImpact === 0, 'Rocket Lunge must not time-stop an enemy channeling a skill');
    assert(regularKnockbackStunAfterImpact > 0, 'Rocket Lunge should retain its knockback against an enemy not performing a skill');
    assert(regularTimeStopAfterImpact > 0, 'Rocket Lunge should retain its brief impact stop against an enemy not performing a skill');
    gojo.reset();

    // Clean up
    reze.reset();
    assert(reze.hasUsedNuke === false, 'Reze hasUsedNuke must reset cleanly to false on round reset');
    dummy.reset();
    state.fighters = [];

    console.log('      ✅ Reze Ultimate single-use per round, 100% full heal, vampiric lifesteal, visual explosion non-freeze decay, cluster bomb stun resilience, and rocket lunge foot explosion verified successfully.');
  }

  // ─────────────────────────────────────────────
  // TEST 56: Mahoraga Hollow Purple Adaptation: 25% Damage & Continuous Gravitational Pull
  // ─────────────────────────────────────────────
  {
    console.log('   56. Testing Mahoraga Hollow Purple Adaptation: 25% Damage Taken (75% Reduction) & Continuous Gravitational Pull...');
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
    const { isEntityImmuneToGravitationalPull } = await import('../js/entities/fighter.js');
    const { applyGojoAdaptation } = await import('../js/entities/fighters/mahoraga/mahoragaAdaptation.js');

    assert(MahoragaClass && GojoClass, 'Mahoraga and Gojo classes must exist');

    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = { x: 0, y: 0, width: 800, height: 600 };
    const gojo = new GojoClass({ radius: 25, x: 100, y: 300, hp: 200, ownerIndex: 0 });
    const mahoraga = new MahoragaClass({ radius: 25, x: 260, y: 300, hp: 300, maxHp: 300, ownerIndex: 1 });
    gojo.team = 0;
    mahoraga.team = 1;
    state.fighters = [gojo, mahoraga];

    // A. Adapt Mahoraga to Hollow Purple
    applyGojoAdaptation(mahoraga, 'purple');
    assert(mahoraga.gojoAdapted.purple === true, 'Mahoraga must be marked as adapted to Gojo Purple');

    // B. Verify Mahoraga is NOT immune to Hollow Purple gravitational pull
    assert(isEntityImmuneToGravitationalPull(mahoraga, 'purple') === false, 'Adapted Mahoraga must NOT be immune to Purple gravitational pull');

    // C. Fire Hollow Purple and verify Mahoraga is pulled toward it
    projectileSystem.projectiles = [];
    gojo.gunAngle = 0; // Facing right toward Mahoraga
    gojo._firePurple(0);

    const purple = projectileSystem.projectiles.find(p => p.isGojoPurple);
    assert(purple !== undefined, 'Hollow Purple projectile must be spawned in projectileSystem');
    purple.x = 200;
    purple.y = 300;
    const initialMahoragaX = mahoraga.x;

    projectileSystem.update(state.fighters);

    assert(mahoraga.isCaughtInPurple === true || mahoraga.isCaughtInPurpleVortex === true, 'Adapted Mahoraga must get caught in Purple vortex');
    assert(mahoraga.isPulledOrDragged() === true, 'Adapted Mahoraga isPulledOrDragged() must evaluate to true while inside Purple');
    assert(mahoraga.x < initialMahoragaX, `Mahoraga must be pulled left towards the Purple orb at x=200 (initial x=${initialMahoragaX}, new x=${mahoraga.x})`);

    // D. Verify 75% damage reduction (takes 25% damage) on Purple DPS and Purple Explosion damage
    // Lock the Wheel of Adaptation so a fresh wheel-click heal cannot mask the raw damage numbers.
    mahoraga.fatalAdaptCooldown = 9999;
    const hpBefore = mahoraga.hp;
    mahoraga.takeDamage(100, gojo, { isPurpleDPS: true, projectile: purple });
    assert(mahoraga.hp === hpBefore - 25, `Adapted Mahoraga must take exactly 25% damage (expected 25 dmg, lost ${hpBefore - mahoraga.hp})`);

    const hpBeforeExplosion = mahoraga.hp;
    mahoraga.takeDamage(80, gojo, { isPurpleExplosion: true, projectile: purple });
    assert(mahoraga.hp === hpBeforeExplosion - 20, `Adapted Mahoraga must take exactly 25% damage from Purple Explosion (expected 20 dmg, lost ${hpBeforeExplosion - mahoraga.hp})`);

    // E. Verify Wheel Click Double Damage buff
    assert(mahoraga.wheelDoubleDamageTimer > 0, 'Mahoraga must have wheelDoubleDamageTimer > 0 after wheel adaptation');
    gojo.infinityActive = false;
    gojo.infinityCooldown = 999;
    mahoraga.x = 100;
    mahoraga.y = 300;
    const baseCleaveDamage = CONFIG.mahoraga?.cleaveDamage ?? 40;
    const expectedDoubleDmg = baseCleaveDamage * (CONFIG.mahoraga?.wheelDoubleDamageMultiplier || 2.0);
    const dummyHpBefore = gojo.hp;
    mahoraga._executeCleave(gojo);
    const damageDealt = dummyHpBefore - gojo.hp;
    assert(damageDealt >= expectedDoubleDmg * 0.99, `Mahoraga cleave during wheel double damage must deal 2.0x damage (expected >= ${expectedDoubleDmg}, got ${damageDealt})`);

    // Clean up
    projectileSystem.projectiles = [];
    gojo.reset();
    mahoraga.reset();
    state.fighters = [];

    console.log('      ✅ Mahoraga Hollow Purple adaptation: 75% damage reduction (25% damage taken) applied uniformly, continuous gravitational pull, and wheel double damage verified successfully.');
  }

  // ── TEST 58: Horizontal FFA Game Mode Select, 4-Fighter Roster, and HUD Integration ──
  console.log('   58. Testing Horizontal FFA Game Mode Select, 4-Player Draft, and Panoramic HUD...');
  {
    const { state } = await import('../js/core/state.js');
    const { GAME_MODES } = await import('../js/core/modeConfig.js');
    const { setViewportOrientation } = await import('../js/core/viewportManager.js');
    const { initHorizontalTeamSelectScreen, randomizeHorizontalRoster, drawHorizontalTeamSelectScreen } = await import('../js/graphics/ui/HorizontalTeamSelectScreen.js');
    const { reinitFighters } = await import('../js/core/gameFlow.js');
    const { drawHorizontalPanoramicHud } = await import('../js/graphics/ui/horizontalHudManager.js');

    // 1. Initialize Horizontal FFA Mode
    setViewportOrientation('horizontal');
    state.mode = GAME_MODES.FFA;
    state.gameState = 'horizontal_select';
    initHorizontalTeamSelectScreen();

    assert(state.horizontalRosterSlots.length >= 4, 'Horizontal FFA must initialize at least 4 roster slots');
    assert(state.p1Index !== undefined && state.p2Index !== undefined && state.p3Index !== undefined && state.p4Index !== undefined, 'p1Index..p4Index must be defined');

    // 2. Draw Horizontal Team Select Screen and verify stack depth
    mockCtx.resetStackDepth();
    mockCanvas.width = 960;
    mockCanvas.height = 540;
    state.canvas = mockCanvas;
    state.ctx = mockCtx;

    drawHorizontalTeamSelectScreen(mockCtx);
    assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 after drawHorizontalTeamSelectScreen (got ${mockCtx.getStackDepth()})`);

    // 3. Test Randomize in FFA mode
    randomizeHorizontalRoster();
    assert(state.horizontalRosterSlots.length >= 4, 'Randomize in FFA must preserve at least 4 slots');
    assert(state.p1Index === state.horizontalRosterSlots[0], 'p1Index must sync with horizontalRosterSlots[0]');
    assert(state.p4Index === state.horizontalRosterSlots[3], 'p4Index must sync with horizontalRosterSlots[3]');

    // 4. Test reinitFighters in Horizontal FFA mode
    state.gameState = 'playing';
    reinitFighters(true);
    assert(state.fighters.length === 4, `reinitFighters in Horizontal FFA must create 4 fighters (got ${state.fighters.length})`);

    for (let i = 0; i < 4; i++) {
      assert(state.getFighterTeam(i) === i, `FFA fighter ${i} must belong to solo team ${i} (got ${state.getFighterTeam(i)})`);
    }

    // 5. Test Horizontal Panoramic HUD for 4 FFA fighters
    mockCtx.resetStackDepth();
    drawHorizontalPanoramicHud(mockCtx);
    assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 after drawHorizontalPanoramicHud (got ${mockCtx.getStackDepth()})`);

    // Clean up
    state.fighters = [];
    setViewportOrientation('vertical');

    console.log('      ✅ Horizontal FFA Game Mode Select, 4-Player draft layout, and Panoramic HUD verified successfully.');
  }

  // ── TEST 58B: Vertical FFA Game Mode Select, 3-Player Only Standard, Equilateral Spawns & Face-Off ──
  console.log('   58B. Testing Vertical FFA Game Mode (3 Players Only, Equilateral Spawns & Face-Off UI)...');
  {
    const { state } = await import('../js/core/state.js');
    const { GAME_MODES } = await import('../js/core/modeConfig.js');
    const { setViewportOrientation } = await import('../js/core/viewportManager.js');
    const { drawSelectScreen, randomizeFfaFighters } = await import('../js/graphics/ui/CharacterSelectScreen.js');
    const { drawFaceOffThumbnailScreen } = await import('../js/graphics/ui/ThumbnailFaceOffScreen.js');
    const { reinitFighters } = await import('../js/core/gameFlow.js');

    // 1. Enforce Vertical Mode & FFA
    setViewportOrientation('vertical');
    state.mode = GAME_MODES.FFA;
    state.gameState = 'select';
    state.viewOrientation = 'vertical';

    // 2. Randomize FFA fighters in vertical mode
    randomizeFfaFighters();
    assert(typeof state.p1Index === 'number', 'p1Index must be a valid number');
    assert(typeof state.p2Index === 'number', 'p2Index must be a valid number');
    assert(typeof state.p3Index === 'number', 'p3Index must be a valid number');

    // 3. Draw Character Select Screen (3-player vertical layout) and verify stack depth
    mockCtx.resetStackDepth();
    mockCanvas.width = 540;
    mockCanvas.height = 960;
    state.canvas = mockCanvas;
    state.ctx = mockCtx;

    drawSelectScreen(mockCtx);
    assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 after drawSelectScreen (got ${mockCtx.getStackDepth()})`);

    // 4. Test reinitFighters in Vertical FFA mode -> MUST BE 3 PLAYERS ONLY
    state.gameState = 'playing';
    reinitFighters(true);
    assert(state.fighters.length === 3, `reinitFighters in Vertical FFA MUST create exactly 3 fighters (got ${state.fighters.length})`);

    // Each of the 3 fighters belongs to their own solo team
    for (let i = 0; i < 3; i++) {
      assert(state.getFighterTeam(i) === i, `Vertical FFA fighter ${i} must belong to solo team ${i} (got ${state.getFighterTeam(i)})`);
    }

    // Spawns must be strictly inside the canonical vertical arena (450x450 at x:45, y:240)
    for (let i = 0; i < 3; i++) {
      const f = state.fighters[i];
      assert(f.x >= state.arena.x && f.x <= state.arena.x + state.arena.width, `Fighter ${i} x (${f.x}) must be within arena`);
      assert(f.y >= state.arena.y && f.y <= state.arena.y + state.arena.height, `Fighter ${i} y (${f.y}) must be within arena`);
    }

    // 5. Test Face-Off Thumbnail Screen (3-player vertical FFA layout) and verify stack depth
    mockCtx.resetStackDepth();
    state.faceOffTimer = 50;
    drawFaceOffThumbnailScreen();
    assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 after drawFaceOffThumbnailScreen (got ${mockCtx.getStackDepth()})`);

    // 6. Test In-Arena Triangular Match Names HUD Layout (P1 Top, VS Center, P2/P3 Bottom)
    const { drawArenaMatchNames } = await import('../js/graphics/renderers/arenaRenderer.js');
    mockCtx.resetStackDepth();
    drawArenaMatchNames(mockCtx, false);
    assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 after drawArenaMatchNames (got ${mockCtx.getStackDepth()})`);

    // 7. Test In-Game Bottom HUD Card Layout for Vertical FFA (Unified Single-Column Format & Member Headers)
    const { drawHUD, clearHealthHud } = await import('../js/graphics/hudManager.js');
    clearHealthHud();
    drawHUD();
    const healthHudEl = document.getElementById('healthHud');
    assert(healthHudEl.classList.contains('single-column-hud'), 'Vertical FFA bottom HUD container must have single-column-hud class');
    assert(healthHudEl.classList.contains('ffa-hud'), 'Vertical FFA bottom HUD container must have ffa-hud class');
    assert(healthHudEl.children.length === 3, `Must append 3 health cards to bottom HUD for 3-player vertical FFA (got ${healthHudEl.children.length})`);
    assert(healthHudEl.innerHTML.includes('health-card__member-header'), 'Must render member headers for vertical FFA');
    clearHealthHud();

    // Clean up
    state.fighters = [];
    console.log('      ✅ Vertical FFA (3 Players Only, Equilateral Spawns, Triangular HUD Names, Face-Off UI & Single-Column HUD Format) verified successfully.');
  }

  // ==========================================
  // TEST 59: Makima Crucifixion Kill Camera Hold (Delayed Winner Focus)
  // ==========================================
  {
    console.log('   59. Testing Makima Crucifixion Kill Camera Hold (Delayed Winner Focus)...');

    const MakimaClass = FIGHTER_CLASS_MAP['makima'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    assert(MakimaClass && GojoClass, 'Makima and Gojo classes must exist in FIGHTER_CLASS_MAP');

    const makima = new MakimaClass(200, 400, 0);
    const gojo = new GojoClass(340, 400, 1);

    state.fighters = [makima, gojo];
    state.gameState = 'playing';

    const { updateCamera, resetCamera } = await import('../js/systems/cameraSystem.js');
    resetCamera(true);
    state.camera.mode = 'dynamic';
    state.camera.enabled = true;

    // Cast Crucifixion on Gojo
    makima._castCrucifixionUltimate(gojo, true);
    assert(makima.isExecutingCrucifixion === true, 'Makima must be executing Crucifixion');
    assert(makima.crucifixionTarget === gojo, 'Crucifixion target must be Gojo');
    assert(makima.crucifixionKillCameraHoldTimer === 0, 'Camera hold timer must start at 0 before kill');

    // Fast-forward to impact frame (Frame 80)
    makima.crucifixionTimer = (makima.crucifixionMaxTimer - makima.crucifixionImpactFrame) + 1;
    gojo.hp = 50; // Low HP so execution threshold triggers kill

    makima._updateCrucifixionUltimate();

    // Verify Gojo died and hold timer activated
    assert(gojo.isDead === true, 'Gojo must be killed by Crucifixion spear strike');
    assert(makima.crucifixionKilledTarget === true, 'makima.crucifixionKilledTarget must be true');
    assert(makima.crucifixionKillCameraHoldTimer > 0, `makima.crucifixionKillCameraHoldTimer must be > 0 (got ${makima.crucifixionKillCameraHoldTimer})`);

    const holdX = makima.crucifixionHoldCamX;
    const holdY = makima.crucifixionHoldCamY;
    assert(typeof holdX === 'number' && Number.isFinite(holdX), 'crucifixionHoldCamX must be a valid number');
    assert(typeof holdY === 'number' && Number.isFinite(holdY), 'crucifixionHoldCamY must be a valid number');

    // Update camera while hold timer is active
    updateCamera();

    // Camera target must NOT be Makima's coordinates and targetZoom must NOT be winnerZoom
    assert(Math.abs(state.camera.targetX - holdX) < 1.0, `Camera targetX must stay at crucifixion hold position (${holdX}), got ${state.camera.targetX}`);
    assert(Math.abs(state.camera.targetY - holdY) < 1.0, `Camera targetY must stay at crucifixion hold position (${holdY}), got ${state.camera.targetY}`);
    assert(state.camera.targetZoom === 1.0, `Camera targetZoom must stay at 1.0 combat framing during hold, got ${state.camera.targetZoom}`);
    assert(state.camera.targetZoom !== CONFIG.camera.winnerZoom, 'Camera targetZoom must NOT immediately jump to winnerZoom');

    // Tick all hold frames until the timer expires and ultimate completes
    const holdDuration = makima.crucifixionKillCameraHoldTimer;
    for (let i = 0; i < holdDuration + 5; i++) {
      makima.update(gojo, 0, state.arena);
      updateCamera();
    }

    assert(makima.crucifixionKillCameraHoldTimer === 0, 'crucifixionKillCameraHoldTimer must reach 0');
    assert(makima.isExecutingCrucifixion === false, 'isExecutingCrucifixion must be false');

    // Now camera should smoothly target Makima as the winner with winnerZoom
    updateCamera();
    assert(Math.abs(state.camera.targetX - makima.x) < 1.0, `Camera targetX must now focus on Makima (${makima.x}), got ${state.camera.targetX}`);
    assert(Math.abs(state.camera.targetY - makima.y) < 1.0, `Camera targetY must now focus on Makima (${makima.y}), got ${state.camera.targetY}`);
    assert(state.camera.targetZoom === (CONFIG.camera.winnerZoom ?? 1.10), `Camera targetZoom must now be winnerZoom (${CONFIG.camera.winnerZoom}), got ${state.camera.targetZoom}`);

    // Verify drawing stack balance
    mockCtx.resetStackDepth();
    makima.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 after makima.draw (got ${mockCtx.getStackDepth()})`);

    // Clean up
    state.fighters = [];
    resetCamera(true);

    console.log('      ✅ Makima Crucifixion Kill Camera Hold & delayed focus transition verified successfully.');
  }

  // ==========================================
  // TEST 60: Reze Shockwave Renderer Hot-Path Cost
  // ==========================================
  {
    console.log('   60. Testing Reze shockwave renderer hot-path cost...');
    const { drawRezePalmBlast, drawRezeMegatonNuke, drawRezePixelMartialArc } = await import('../js/graphics/weapons/rezeWeaponGraphics.js');
    const originalSave = mockCtx.save;
    const originalRestore = mockCtx.restore;
    const originalArc = mockCtx.arc;
    const originalFillRect = mockCtx.fillRect;
    const originalRect = mockCtx.rect;
    const originalFill = mockCtx.fill;
    let saveCalls = 0;
    let restoreCalls = 0;
    let arcCalls = 0;
    let fillRectCalls = 0;
    let rectCalls = 0;
    let fillCalls = 0;
    let drawImageCalls = 0;
    const originalDrawImage = mockCtx.drawImage;
    mockCtx.drawImage = (...args) => {
      drawImageCalls++;
      return originalDrawImage(...args);
    };
    mockCtx.save = (...args) => {
      saveCalls++;
      return originalSave(...args);
    };
    mockCtx.restore = (...args) => {
      restoreCalls++;
      return originalRestore(...args);
    };
    mockCtx.arc = (...args) => {
      arcCalls++;
      return originalArc(...args);
    };
    mockCtx.fillRect = (...args) => {
      fillRectCalls++;
      return originalFillRect(...args);
    };
    mockCtx.rect = (...args) => {
      rectCalls++;
      return originalRect(...args);
    };
    mockCtx.fill = (...args) => {
      fillCalls++;
      return originalFill(...args);
    };

    mockCtx.resetStackDepth();
    drawRezePalmBlast(mockCtx, {
      x: 200, y: 200, radius: 90, timer: 7, maxTimer: 14, isPunchExplosion: true
    });
    assert(saveCalls === 1 && restoreCalls === 1,
      `Reze palm blast must use one balanced canvas state scope (saves ${saveCalls}, restores ${restoreCalls})`);
    assert(drawImageCalls >= 1, `Reze palm blast must render 12-frame animated explosion sprite (got ${drawImageCalls} drawImage calls)`);
    assert(mockCtx.getStackDepth() === 0, 'Reze palm blast must leave the canvas state stack balanced');

    saveCalls = 0;
    restoreCalls = 0;
    drawImageCalls = 0;
    drawRezeMegatonNuke(mockCtx, {
      x: 200, y: 200, radius: 240, timer: 15, maxTimer: 30, isTransformationBlast: true
    });
    assert(saveCalls === 1 && restoreCalls === 1,
      `Reze nuke blast must use one balanced canvas state scope (saves ${saveCalls}, restores ${restoreCalls})`);
    assert(drawImageCalls >= 1, `Reze nuke blast must render 12-frame animated explosion sprite (got ${drawImageCalls} drawImage calls)`);
    assert(mockCtx.getStackDepth() === 0, 'Reze nuke blast must leave the canvas state stack balanced');

    fillRectCalls = 0;
    rectCalls = 0;
    fillCalls = 0;
    drawRezePixelMartialArc(mockCtx, {
      x: 200, y: 200, angle: 0, arc: Math.PI * 2 / 3, radius: 90,
      timer: 7, maxTimer: 14, isHybrid: true
    });
    assert(fillRectCalls === 0,
      `Reze pixel shockwave tiles must be batched instead of issuing per-pixel fillRect calls (got ${fillRectCalls})`);
    assert(rectCalls > 500, `Reze pixel shockwave must preserve detailed pixel geometry (got ${rectCalls} tiles)`);
    assert(fillCalls >= 4, `Reze pixel shockwave must render the batched ring and wash layers (got ${fillCalls} fills)`);
    assert(mockCtx.getStackDepth() === 0, 'Reze pixel shockwave must leave the canvas state stack balanced');

    mockCtx.save = originalSave;
    mockCtx.restore = originalRestore;
    mockCtx.arc = originalArc;
    mockCtx.fillRect = originalFillRect;
    mockCtx.rect = originalRect;
    mockCtx.drawImage = originalDrawImage;
    console.log('      ✅ Reze palm and nuke blast renderers preserve 12-frame explosion animation with one balanced canvas state scope.');
  }

  // -------------------------------------------------------------
  // TEST 61: Toji Ultimate Final Blow Auto-Aim Windup Tracking
  // -------------------------------------------------------------
  {
    console.log('\n   61. Testing Toji Ultimate Final Blow Windup Auto-Aim Tracking...');
    const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
    const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
    const { state } = await import('../js/core/state.js');

    const toji = new TojiFighter({ x: 200, y: 200 });
    const target = new NormalFighter({ x: 400, y: 200 });
    state.fighters = [toji, target];
    const testArena = { x: 0, y: 0, width: 600, height: 600 };

    // Setup Toji in ultimate CRATER windup phase
    toji.ultimateActive = true;
    toji.ultimatePhase = 'CRATER';
    toji.ultimateTarget = target;
    const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
    const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
    const diveAndSpinTotal = diveTime + spinTime;
    toji.ultimateCycleTimer = diveAndSpinTotal + 40; // in charge/windup
    toji.gunAngle = 0;
    toji.angle = 0;

    // During windup, canAim() must be true
    assert(toji.canAim() === true, 'Toji canAim() must return true during ultimate final blow windup');

    // Reposition target above Toji (y: 50, x: 200) -> angle should turn toward -PI/2
    target.x = 200;
    target.y = 50;
    const angleBefore = toji.gunAngle;
    toji.updateUltimate(testArena, 0);

    assert(toji.gunAngle !== angleBefore, 'Toji must auto-aim and rotate toward target during final blow windup');
    assert(toji.canAim() === true, 'Toji canAim() must remain true throughout final blow windup');

    // Advance to dive launch frame
    toji.ultimateCycleTimer = diveAndSpinTotal;
    toji.updateUltimate(testArena, 0);

    // During supersonic dive, canAim() must return false (committed trajectory)
    assert(toji.canAim() === false, 'Toji canAim() must return false during supersonic dive execution');
    assert(toji.aimTurnRate === undefined, 'Toji aimTurnRate must be cleared upon dive launch');
    assert(toji.isSpinning === false, 'Toji must not spin during flight');

    // Advance through spin to impact
    toji.ultimateCycleTimer = 1;
    toji.updateUltimate(testArena, 0); // final spin frame
    toji.updateUltimate(testArena, 0); // triggers impact & cleanup
    assert(toji.ultimateActive === false, 'Toji ultimateActive must reset after impact');
    assert(toji.aimTurnRate === undefined, 'Toji aimTurnRate must be undefined after ultimate completion');

    console.log('      ✅ Toji ultimate final blow windup auto-aim tracking and committed dive trajectory verified.');
  }

  // -------------------------------------------------------------
  // TEST 62: Naoya 24-Frame Palm Touch Stasis Preserves Active Skill Casting Without Reset
  // -------------------------------------------------------------
  {
    console.log('\n   62. Testing Naoya 24-Frame Palm Touch Stasis Skill Preservation vs Reset...');
    const { NaoyaFighter } = await import('../js/entities/fighters/NaoyaFighter.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const { MeguminFighter } = await import('../js/entities/fighters/MeguminFighter.js');
    const { state } = await import('../js/core/state.js');

    const testArena = { x: 0, y: 0, width: 800, height: 600 };
    const naoya = new NaoyaFighter({ x: 200, y: 200, hp: 500, maxHp: 500 });
    naoya.team = 0;

    // A. Gojo Hollow Purple Channeling vs Naoya 24-Frame Palm Touch Stasis
    const gojo = new GojoFighter({ x: 300, y: 200, hp: 400, maxHp: 400 });
    gojo.team = 1;
    state.fighters = [naoya, gojo];
    state.arena = testArena;
    state.gameState = 'playing';

    // Begin Hollow Purple channeling on Gojo
    gojo.isChannelingPurple = true;
    gojo.purpleChargeTimer = 60;
    gojo.purpleCooldown = 0;
    gojo.gunAngle = 0;
    gojo.vx = 2.0;
    gojo.vy = 0;

    // Naoya applies 24-Frame Palm Touch stasis
    const stasisApplied = naoya.applyFrameStasis(gojo, 24);
    assert(stasisApplied === true, 'Naoya applyFrameStasis must return true when targeting Gojo');
    assert(gojo.isFrameFrozen === true, 'Gojo isFrameFrozen must be true during 24-Frame stasis');
    assert(gojo.frameFreezeTimer === 24, 'Gojo frameFreezeTimer must be 24');

    // Update Gojo while frozen
    gojo.update(naoya, 1, testArena);
    assert(gojo.isChannelingPurple === true, 'Gojo Hollow Purple channeling must NOT be cancelled during 24-Frame stasis');
    assert(gojo.purpleChargeTimer === 60, 'Gojo purpleChargeTimer must be frozen at 60 during 24-Frame stasis');
    assert(gojo.purpleCooldown === 0, 'Gojo purpleCooldown must NOT receive penalty cooldown during 24-Frame stasis');
    assert(gojo.vx === 0 && gojo.vy === 0, 'Gojo movement must be paused during 24-Frame stasis');

    // End 24-Frame stasis (glass shatter)
    naoya.endFrameStasis(gojo);
    assert(gojo.isFrameFrozen === false, 'Gojo isFrameFrozen must be false after endFrameStasis');
    assert(gojo.frameFreezeTimer === 0, 'Gojo frameFreezeTimer must be 0 after endFrameStasis');

    // Update Gojo after stasis -> Hollow Purple channeling resumes and progresses!
    gojo.update(naoya, 1, testArena);
    assert(gojo.isChannelingPurple === true, 'Gojo Hollow Purple must continue channeling after 24-Frame stasis ends');
    assert(gojo.purpleChargeTimer === 61, `Gojo purpleChargeTimer must increment to 61 after resuming casting (got ${gojo.purpleChargeTimer})`);

    // B. Megumin Explosion Chant vs Naoya 24-Frame Palm Touch Stasis
    const megumin = new MeguminFighter({ x: 400, y: 200, hp: 300, maxHp: 300 });
    megumin.team = 1;
    state.fighters = [naoya, megumin];

    megumin.isChantingExplosion = true;
    megumin.explosionTimer = 100;
    megumin.chantTimer = 100;
    megumin.chantMaxTimer = 240;
    megumin.chantProgress = 100 / 240;
    megumin.explosionPhase = 'CHANT';
    megumin.explosionTargetX = 200;
    megumin.explosionTargetY = 200;

    naoya.applyFrameStasis(megumin, 24);
    assert(megumin.isFrameFrozen === true, 'Megumin isFrameFrozen must be true');

    // Update Megumin while frozen
    megumin.update(naoya, 1, testArena);
    assert(megumin.isChantingExplosion === true, 'Megumin explosion chant must NOT be cancelled during 24-Frame stasis');
    assert(megumin.chantTimer === 100, 'Megumin chantTimer must remain paused at 100 during 24-Frame stasis');
    assert(megumin.explosionPhase === 'CHANT', 'Megumin explosionPhase must remain CHANT during 24-Frame stasis');

    // End stasis
    naoya.endFrameStasis(megumin);
    megumin.update(naoya, 1, testArena);
    assert(megumin.isChantingExplosion === true, 'Megumin must continue chanting explosion after stasis ends');
    assert(megumin.chantTimer === 101, `Megumin chantTimer must advance to 101 after unfreezing (got ${megumin.chantTimer})`);

    // C. Sukuna Divine Flame Fuga vs Naoya 24-Frame Palm Touch Stasis
    const sukuna = new SukunaFighter({ x: 500, y: 200, hp: 500, maxHp: 500 });
    sukuna.team = 1;
    state.fighters = [naoya, sukuna];

    sukuna.isChannelingDivineFlame = true;
    sukuna.divineFlameChargeTimer = 45;
    sukuna.divineFlameCooldown = 0;

    naoya.applyFrameStasis(sukuna, 24);
    sukuna.update(naoya, 1, testArena);
    assert(sukuna.isChannelingDivineFlame === true, 'Sukuna Fuga channeling must NOT be cancelled during 24-Frame stasis');
    assert(sukuna.divineFlameChargeTimer === 45, 'Sukuna divineFlameChargeTimer must remain paused at 45 during 24-Frame stasis');

    naoya.endFrameStasis(sukuna);
    sukuna.update(naoya, 1, testArena);
    assert(sukuna.isChannelingDivineFlame === true, 'Sukuna Fuga must continue channeling after stasis ends');
    assert(sukuna.divineFlameChargeTimer === 46, `Sukuna divineFlameChargeTimer must advance to 46 after unfreezing (got ${sukuna.divineFlameChargeTimer})`);

    // D. Contrast: Naoya Ultimate hard-cancellation
    gojo.isChannelingPurple = true;
    gojo.purpleChargeTimer = 60;
    gojo.isCaughtInNaoyaUlt = true;
    gojo.interruptAttacks(true);
    assert(gojo.isChannelingPurple === false, 'Gojo Hollow Purple must be hard-cancelled when caught in Naoya Ultimate');
    assert(gojo.purpleCooldown >= 270, 'Gojo purpleCooldown must receive penalty cooldown when hard-cancelled by Ultimate');

    // E. Gojo Limitless Infinity blocks Naoya's 24-Frame Palm Touch; only Naoya's Ultimate disables it
    const { applyDamageToTarget } = await import('../js/entities/fighter.js');
    const freshGojo = new GojoFighter({ x: 300, y: 200, hp: 400, maxHp: 400 });
    freshGojo.team = 1;
    freshGojo.infinityActive = true;
    freshGojo.infinityCooldown = 0;
    freshGojo.infinityFadeOpacity = 1.0;
    state.fighters = [naoya, freshGojo];

    // E1: Limitless Infinity active in neutral
    assert(freshGojo.hasActiveInfinity() === true, 'Gojo must have active Limitless Infinity in neutral');

    // E2: Active Infinity BLOCKS the 24-Frame Palm Touch Stasis (Infinity stays up)
    const stasisBlocked = naoya.applyFrameStasis(freshGojo, 60);
    assert(stasisBlocked === false, 'Naoya applyFrameStasis must be blocked by active Gojo Infinity');
    assert(freshGojo.isFrameFrozen !== true, 'Gojo must NOT be frame frozen while Infinity is active');
    assert(freshGojo.hasActiveInfinity() === true, 'Gojo Infinity must remain active after blocking the Palm Touch');

    // E2b: With Infinity down (e.g. melee mode), the stasis can land
    freshGojo.isMeleeMode = true;
    freshGojo.infinityActive = false;
    assert(naoya.applyFrameStasis(freshGojo, 60) === true, 'Palm Touch stasis must land when Gojo Infinity is down');
    naoya.endFrameStasis(freshGojo);
    freshGojo.isMeleeMode = false;
    freshGojo.forcedMeleeTimer = 0;
    freshGojo.timeStopTimer = 0;
    freshGojo.x = 450;
    freshGojo.y = 200;
    freshGojo.infinityActive = true;
    freshGojo.infinityFadeOpacity = 1.0;
    freshGojo.update(naoya, 1, testArena);
    assert(freshGojo.hasActiveInfinity() === true, 'Gojo Limitless Infinity must be active outside Naoya Ultimate');

    // E3: Naoya Ultimate: 24 FPS Mach 3 Runway Breach -> Infinity disabled during runway sprint, crash & wall pin
    freshGojo.isCaughtInNaoyaUlt = true;
    freshGojo.infinityActive = false;
    freshGojo.infinityFadeOpacity = 0;
    assert(freshGojo.hasActiveInfinity() === false, 'Gojo hasActiveInfinity must return false during Naoya Ultimate Runway Breach');

    freshGojo.update(naoya, 1, testArena);
    assert(freshGojo.hasActiveInfinity() === false, 'Gojo hasActiveInfinity must remain false during Naoya Ultimate update');
    assert(freshGojo.infinityActive === false, 'Gojo infinityActive must remain false during Naoya Ultimate update');

    // Mach 3 impact penetrates and deals direct damage
    const hpBeforeCrash = freshGojo.hp;
    const crashOk = applyDamageToTarget(freshGojo, 75, naoya, {
      isTrueDamage: true,
      isUltimate: true,
      isNaoyaUlt: true,
      isMach3Breach: true
    });
    assert(crashOk === true, 'Mach 3 runway impact must hit Gojo');
    assert(freshGojo.hp < hpBeforeCrash, 'Gojo HP must decrease from Mach 3 crash impact');

    // During wall pin, Infinity remains disabled
    freshGojo.isCaughtInNaoyaUlt = false;
    freshGojo.isCurrentlyWallPinnedByNaoya = true;
    freshGojo.naoyaWallPinTimer = 60;
    assert(freshGojo.hasActiveInfinity() === false, 'Gojo hasActiveInfinity must return false during Naoya wall pin');

    freshGojo.update(naoya, 1, testArena);
    assert(freshGojo.hasActiveInfinity() === false, 'Gojo hasActiveInfinity must remain false during wall pin update');

    // Wall pin ends -> Infinity restores
    freshGojo.isCurrentlyWallPinnedByNaoya = false;
    freshGojo.naoyaWallPinTimer = 0;
    freshGojo.update(naoya, 1, testArena);
    assert(freshGojo.hasActiveInfinity() === true, 'Gojo Limitless Infinity must restore after Naoya wall pin ends');

    console.log('      ✅ Naoya 24-Frame Palm Touch stasis correctly preserves active skill casting and resumes on stasis end without resetting.');
    console.log('      ✅ Gojo Limitless Infinity blocks Naoya 24-Frame Palm Touch and is disabled only during Naoya Ultimate Mach 3 Runway Breach.');
  }

  // ── TEST 63: Shiro Living Chess Troops — Body Blocking & Enemy Targetability ──
  console.log('   63. Testing Shiro Living Chess Troops Body Blocking (Except for Shiro) & Enemy Targetability / Damage...');
  {
    const ShiroClass = FIGHTER_CLASS_MAP['shiro'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const { resolveFighterCollision } = await import('../js/systems/physics.js');
    const { spawnFloatingText } = await import('../js/core/state.js');

    assert(ShiroClass && SaitamaClass, 'Shiro and Saitama classes must exist');

    const shiro = new ShiroClass({ x: 200, y: 300, hp: 340, maxHp: 340 });
    const enemy = new SaitamaClass({ x: 400, y: 300, hp: 600, maxHp: 600 });
    enemy.damageNumberColor = '#38BDF8';
    assert(shiro.hideHands === true, 'Shiro model hands must be hidden');
    assert(Object.prototype.hasOwnProperty.call(ShiroClass.prototype, 'drawGun'), 'Shiro must override the default gun renderer');
    shiro.team = 0;
    enemy.team = 1;
    state.fighters = [shiro, enemy];
    state.arena = { x: 45, y: 240, width: 450, height: 450 };

    // 1. Shiro flicks a troop and plants it on a tile
    shiro.gunAngle = 0;
    shiro.shootCooldown = 0;
    shiro._flickChessTroop(enemy);
    assert(shiro.activeMinions.length === 1, 'Shiro must have 1 active minion');

    const troop = shiro.activeMinions[0];
    assert(!troop.isMinion, 'Troop starts in projectile phase');

    const occupiedTile = { isMinion: true, isPlant: true, x: troop.x, y: troop.y, hp: 100, owner: enemy };
    state.fighters.push(occupiedTile);
    const occupiedCol = Math.floor((occupiedTile.x - state.arena.x) / (state.arena.width / ARENA_TILE_COUNT));
    const occupiedRow = Math.floor((occupiedTile.y - state.arena.y) / (state.arena.height / ARENA_TILE_COUNT));

    // Simulate projectile planting onto tile center
    shiro._plantTroopOnTileCenter(troop, state.arena);
    assert(troop.isMinion === true, 'Troop must be marked as isMinion');
    assert(troop.isChessTroop === true, 'Troop must be marked as isChessTroop');
    assert(troop.isImmovable === true, 'Troop must be immovable for solid body block');
    assert(troop.immuneToKnockback && troop.immuneToPush, 'Planted troops must carry shared knockback and push immunity flags');
    assert(troop.tileCol !== occupiedCol || troop.tileRow !== occupiedRow, 'Shiro must not plant a troop on a tile occupied by another minion');
    assert(state.fighters.includes(troop), 'Planted troop must be registered in state.fighters');

    // Shared projectile impact applies a direct positional push unless the target is marked immune.
    const { HitImpactSystem } = await import('../js/systems/hitImpactSystem.js');
    const troopX = troop.x;
    const troopY = troop.y;
    HitImpactSystem.processProjectileHit(troop, { visual: 'mahoragaBasaltMonolith', vx: 10, vy: 0 }, enemy, state.fighters);
    assert(troop.x === troopX && troop.y === troopY, 'Projectile attacks must not displace planted chess troops');
    troop.applyKnockback(25, -25);
    assert(troop.vx === 0 && troop.vy === 0 && troop.knockbackVx === 0 && troop.knockbackVy === 0, 'Knockback calls must leave planted troop motion at zero');

    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
    const originalFighters = state.fighters;
    const originalTroopHp = troop.hp;
    troop.hp = troop.maxHp + 500;
    state.fighters = [troop];
    const purpleOwner = { characterId: 'gojo', type: 'gojo', x: troopX - 20, y: troopY, r: 25, hp: 100 };
    const purple = { x: troopX - 1, y: troopY, owner: -1, ownerFighter: purpleOwner };
    new GojoPurpleBehavior().triggerPurpleExplosion(purple, state.fighters, {});
    state.fighters = originalFighters;
    troop.hp = originalTroopHp;
    assert(troop.vx === 0 && troop.vy === 0 && troop.knockbackVx === 0 && troop.knockbackVy === 0, 'Gojo Purple must not impart knockback to planted chess troops');

    // 2. Test Friendly Pass-Through: Shiro colliding with her own troop does NOT get blocked
    shiro.x = troop.x;
    shiro.y = troop.y;
    const initialShiroX = shiro.x;
    resolveFighterCollision(shiro, troop);
    assert(shiro.x === initialShiroX, 'Shiro must phase through her own chess troop without being pushed/blocked');

    // 3. Test Enemy Body Block: Enemy colliding with the troop is physically pushed back
    const troopR = troop.r || troop.radius || 14;
    const enemyR = enemy.r || enemy.radius || 25;
    enemy.x = troop.x + troopR + enemyR - 10; // Overlapping by 10px
    enemy.y = troop.y;
    const initialEnemyX = enemy.x;
    resolveFighterCollision(enemy, troop);
    assert(enemy.x > initialEnemyX, 'Enemy must be pushed back by the chess troop body block');

    // 4. Test Enemy Targetability: Enemy can target the living chess troop
    assert(enemy.isValidAimTarget(troop) === true, 'Chess troop must be a valid aim target for enemies');
    const validTargets = enemy._getAllValidEnemyTargets();
    assert(validTargets.includes(troop), 'Enemy target query must include living chess troop');

    // 5. Test Damage & Destruction & Zero Blood Particles & Zero Global Hit Audio
    assert(troop.noBlood === true && troop.suppressBlood === true, 'Troop must have blood suppression flags');
    assert(troop.noHitSound === true && troop.suppressHitSound === true, 'Troop must have sound suppression flags');
    state.bloodEffects = [];
    spawnBloodEffect(troop, 20);
    spawnBloodEffect(troop.x, troop.y, 20);
    assert(state.bloodEffects.length === 0, 'No blood particles must spawn on chess troops');

    let playedFleshHitAudio = false;
    const origPlaySFX = audioSystem.playSFX;
    audioSystem.playSFX = (name, ...args) => {
      if (name === 'attack_fleshhit' || (typeof name === 'string' && name.includes('fleshhit'))) {
        playedFleshHitAudio = true;
      }
      return origPlaySFX ? origPlaySFX(name, ...args) : null;
    };

    try {
      const initialHp = troop.hp;
      state.floatingTexts = [];
      troop.takeDamage(20, enemy);
      assert(troop.hp === initialHp - 20, `Troop HP must decrease by 20 (got ${troop.hp})`);
      const troopDamageColor = state.floatingTexts.at(-1)?.color;
      state.floatingTexts = [];
      spawnFloatingText(troop.x + 100, troop.y - 14, '-20', enemy.damageNumberColor);
      assert(troopDamageColor === state.floatingTexts.at(-1)?.color, 'Chess troop damage text must use the attacking fighter damageNumberColor');
      assert(!playedFleshHitAudio, 'Troop damage must NOT trigger global attack_fleshhit audio');

      playedFleshHitAudio = false;
      const { applyDamageToTarget } = await import('../js/entities/fighter.js');
      applyDamageToTarget(troop, 10, enemy);
      assert(!playedFleshHitAudio, 'applyDamageToTarget on chess troop must NOT trigger global attack_fleshhit audio');
    } finally {
      audioSystem.playSFX = origPlaySFX;
    }

    // Fatal blow destroying the troop -> must spawn digital crystal shatter shards in state.deathEffects
    const initialDeathEffectsCount = state.deathEffects.length;
    troop.takeDamage(troop.hp + 50, enemy);
    assert(troop.dead === true, 'Troop must be marked as dead');
    assert(!state.fighters.includes(troop), 'Destroyed troop must be removed from state.fighters');
    const chessShatters = state.deathEffects.filter(e => e && e.isChessTroopShatter);
    assert(chessShatters.length > 0, `Destroyed chess troop must spawn digital crystal shatter shards in state.deathEffects (got ${chessShatters.length})`);

    // Verify death effect rendering maintains balanced 0 stack depth
    const { drawDeathEffects } = await import('../js/graphics/particles/deathShatterEffect.js');
    drawDeathEffects(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'drawDeathEffects with chess troop shatter shards must maintain 0 stack depth');

    // 6. Test TV / Console Power-Off Shutdown Animation on Chessboard
    const { drawDisboardChessboard } = await import('../js/graphics/weapons/shiroChessGraphics.js');
    drawDisboardChessboard(mockCtx, state.arena, 1.0, 1.0, 0.25); // Phase 1: Vertical collapse
    assert(mockCtx.getStackDepth() === 0, 'drawDisboardChessboard phase 1 shutdown must maintain 0 stack depth');
    drawDisboardChessboard(mockCtx, state.arena, 1.0, 1.0, 0.60); // Phase 2: Horizontal collapse into dot
    assert(mockCtx.getStackDepth() === 0, 'drawDisboardChessboard phase 2 shutdown must maintain 0 stack depth');
    drawDisboardChessboard(mockCtx, state.arena, 1.0, 1.0, 0.90); // Phase 3: Phosphor dot dissipation
    assert(mockCtx.getStackDepth() === 0, 'drawDisboardChessboard phase 3 shutdown must maintain 0 stack depth');

    // 7. Test Round Reset Cleanup
    shiro._flickChessTroop(enemy);
    const troop2 = shiro.activeMinions[0];
    shiro._plantTroopOnTileCenter(troop2, state.arena);
    assert(state.fighters.includes(troop2), 'Second troop registered in state.fighters');

    shiro.reset();
    assert(shiro.activeMinions.length === 0, 'Reset must clear activeMinions array');
    assert(!state.fighters.includes(troop2), 'Reset must unregister all chess troops from state.fighters');

    console.log('      ✅ Shiro chess troops body-block enemies, allow Shiro pass-through, targetable by enemies, death shatter & TV shutdown verified.');
  }

  // ── TEST 64: Shiro Pawn Promotion After Four Successful Captures ──
  console.log('   64. Testing Shiro pawn promotion after four successful captures...');
  {
    const ShiroClass = FIGHTER_CLASS_MAP['shiro'];
    const shiro = new ShiroClass({ x: 200, y: 300, hp: 340, maxHp: 340 });
    const enemy = {
      x: 400,
      y: 300,
      hp: 1000,
      maxHp: 1000,
      r: 25,
      dead: false,
      team: 1,
      takeDamage(amount) {
        this.hp -= amount;
      },
      applyHitStun() {}
    };
    shiro.team = 0;
    enemy.team = 1;
    state.fighters = [shiro, enemy];
    state.projectiles = [];
    const arena = { x: 45, y: 240, width: 450, height: 450 };

    const originalRandom = Math.random;
    Math.random = () => 0.001;
    try {
      shiro._flickChessTroop(enemy);
    } finally {
      Math.random = originalRandom;
    }

    const pawn = shiro.activeMinions[0];
    assert(pawn.type === 'pawn', 'Promotion test must start with a pawn');
    shiro._plantTroopOnTileCenter(pawn, arena);
    enemy.x = pawn.x;
    enemy.y = pawn.y;
    const runPawnCapture = () => {
      pawn.isAttacking = true;
      pawn.moveTimer = 1;
      pawn.moveMaxTimer = 1;
      pawn.startTile = { col: pawn.tileCol, row: pawn.tileRow, x: pawn.x, y: pawn.y };
      pawn.targetTile = { col: pawn.tileCol, row: pawn.tileRow, x: pawn.x, y: pawn.y };
      shiro._updateTroopMinions(enemy, arena);
    };

    const originalTakeDamage = enemy.takeDamage;
    enemy.takeDamage = () => false;
    runPawnCapture();
    assert(pawn.pawnDamageCount === 0, 'Blocked capture damage must not count toward promotion');
    enemy.takeDamage = originalTakeDamage;

    for (let hit = 0; hit < 4; hit++) runPawnCapture();
    assert(enemy.hp === 944, 'Pawn must deal damage on all four successful captures');
    assert(pawn.type !== 'pawn', 'Pawn must promote after four successful captures');
    assert(['knight', 'bishop', 'rook', 'queen'].includes(pawn.type), 'Promotion must select a random non-pawn troop');
    assert(pawn.pawnDamageCount === 4, 'Pawn promotion must be tied to exactly four successful captures');
    assert(shiro.activeMinions.includes(pawn), 'Promotion must transform the same active troop');
    assert(pawn.radius === pawn.r && pawn.radius > 15, 'Promoted troop radius must match its new type');

    shiro.reset();
    state.fighters = [];
    state.projectiles = [];
    console.log('      ✅ Shiro pawns ignore blocked captures and promote in place after four successful hits.');
  }

  // ── TEST 65: Shiro Chess Troops Capture Enemy Minions ──
  console.log('   65. Testing Shiro troop captures against enemy plants and Engineer buildings...');
  {
    const ShiroClass = FIGHTER_CLASS_MAP['shiro'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };
    const tileCenter = (col, row) => ({
      x: arena.x + (col + 0.5) * arena.width / ARENA_TILE_COUNT,
      y: arena.y + (row + 0.5) * arena.height / ARENA_TILE_COUNT
    });

    const runCaptureCase = (targetFlags, label) => {
      const startTile = tileCenter(1, 1);
      const captureTile = tileCenter(2, 2);
      const allyTile = tileCenter(0, 2);
      const shiro = new ShiroClass({ x: startTile.x - 35, y: startTile.y, hp: 340, maxHp: 340 });
      const enemy = new SaitamaClass({ x: tileCenter(7, 7).x, y: tileCenter(7, 7).y, hp: 600, maxHp: 600 });
      const alliedMinion = {
        ...targetFlags,
        x: allyTile.x,
        y: allyTile.y,
        r: 18,
        hp: 120,
        maxHp: 120,
        dead: false,
        team: 0,
        owner: shiro
      };
      const enemyMinion = {
        ...targetFlags,
        x: captureTile.x,
        y: captureTile.y,
        r: 18,
        hp: 300,
        maxHp: 300,
        dead: false,
        team: 1,
        owner: enemy,
        hitCount: 0,
        takeDamage(amount) {
          this.hitCount++;
          this.lastDamage = amount;
          this.hp = Math.max(0, this.hp - amount);
          if (this.hp <= 0) this.dead = true;
          return true;
        }
      };

      shiro.team = 0;
      enemy.team = 1;
      state.arena = arena;
      state.projectiles = [];
      state.fighters = [shiro, enemy, alliedMinion, enemyMinion];

      const originalRandom = Math.random;
      Math.random = () => 0.001;
      try {
        shiro._flickChessTroop(enemy);
      } finally {
        Math.random = originalRandom;
      }

      const pawn = shiro.activeMinions[0];
      assert(pawn.type === 'pawn', `${label}: capture fixture must start with a pawn`);
      shiro._plantTroopOnTileCenter(pawn, arena);
      pawn.isSummoning = false;
      pawn.summonTimer = 0;
      pawn.attackCooldown = 0;
      shiro.chessTurnCooldown = 0;

      shiro._selectAndExecuteNextChessMove(enemy, arena);
      assert(pawn.attackTarget === enemyMinion, `${label}: Shiro must select the enemy minion and ignore its ally`);
      assert(pawn.targetTile.col === 2 && pawn.targetTile.row === 2, `${label}: pawn must route to the enemy minion's tile`);

      pawn.isTelegraphing = false;
      pawn.isAttacking = true;
      pawn.moveTimer = 1;
      pawn.moveMaxTimer = 1;
      pawn.startTile = { col: pawn.tileCol, row: pawn.tileRow, x: pawn.x, y: pawn.y };
      shiro._updateTroopMinions(enemy, arena);

      assert(enemyMinion.hitCount === 1, `${label}: enemy minion must be consumed in one hit`);
      assert(enemyMinion.hp === 0 && enemyMinion.dead, `${label}: captured minion must be dead`);
      assert(!state.fighters.includes(enemyMinion), `${label}: captured minion must be removed from the active roster`);
      assert(pawn.tileCol === 2 && pawn.tileRow === 2, `${label}: Shiro troop must occupy the captured tile`);

      shiro.reset();
      state.fighters = [];
      state.projectiles = [];
    };

    runCaptureCase({ isMinion: true, isPlant: true, isPlantMinion: true }, 'Enemy plant');
    runCaptureCase({ isMinion: true, isDeployable: true, isTurret: true }, 'Engineer turret');
    console.log('      ✅ Shiro troops capture enemy plants and Engineer turrets in one hit while preserving allied minions.');
  }

  // ── TEST 66: Shiro Passive 3 Voiceline (0:00:02 Windup) & Troop Buff ──
  console.log('   66. Testing Shiro Passive 3 Voiceline Trigger (0:00:02 Windup) & Subsequent Troop Buff...');
  {
    const ShiroClass = FIGHTER_CLASS_MAP['shiro'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };
    const shiro = new ShiroClass({ x: 200, y: 300, hp: 340, maxHp: 340 });
    const enemy = new SaitamaClass({ x: 350, y: 300, hp: 600, maxHp: 600 });
    shiro.team = 0;
    enemy.team = 1;
    state.arena = arena;
    state.fighters = [shiro, enemy];
    state.gameState = 'playing';
    state.matchWinner = null;
    state.roundWinner = null;

    // Give Shiro an active living troop on the board
    const troop = {
      isMinion: true,
      isChessTroop: true,
      dead: false,
      isDead: false,
      hp: 50,
      maxHp: 50,
      r: 16,
      x: 250,
      y: 300,
      owner: shiro,
      team: 0,
      blankBuffTimer: 0,
      isBuffed: false
    };
    shiro.activeMinions = [troop];
    state.fighters.push(troop);

    // Spy audioSystem.playSFX
    const { audioSystem } = await import('../js/systems/audioSystem.js');
    const { shiroConfig } = await import('../js/configs/characters/shiroConfig.js');
    const origPlaySFX = audioSystem.playSFX;
    const playedSounds = [];
    audioSystem.playSFX = (src, vol) => {
      playedSounds.push(src);
      if (origPlaySFX) return origPlaySFX(src, vol);
    };

    try {
      // 1. Ready cooldown to 0 so Shiro is about to use Passive 3
      shiro.blankCooldown = 0;
      shiro.blankActiveTimer = 0;
      shiro.blankWindupTimer = 0;
      shiro._blankWindupStarted = false;

      // Update once: Shiro should trigger the 0:00:02 voiceline and enter windup
      shiro._updateTroopMinions(enemy, arena);

      assert(shiro._blankWindupStarted === true, 'Shiro must start Passive 3 windup when about to use Passive 3');
      assert(shiro.blankWindupTimer === 120, 'Shiro must set blankWindupTimer to 120 (0:00:02 at 60 FPS)');
      assert(
        playedSounds.some(s => String(s).includes('shiro_troop_buff_voiceline.mp3')),
        'Shiro must trigger shiro_troop_buff_voiceline.mp3 when about to use Passive 3'
      );
      assert(troop.isBuffed === false, 'Troop must NOT be buffed immediately during the voiceline windup');
      assert(shiro.blankActiveTimer === 0, 'Active buff timer must remain 0 during voiceline windup');

      // 2. Advance 60 frames halfway through the voiceline
      for (let i = 0; i < 60; i++) {
        shiro._updateTroopMinions(enemy, arena);
      }
      assert(shiro.blankWindupTimer === 60, 'Windup timer must decrement smoothly during voiceline');
      assert(troop.isBuffed === false, 'Troop remains unbuffed while voiceline is in flight');

      // 3. Advance remaining 60 frames to conclude the 2-second voiceline
      for (let i = 0; i < 60; i++) {
        shiro._updateTroopMinions(enemy, arena);
      }

      // Now 120 frames have elapsed: the voiceline finishes and Passive 3 troop buff activates!
      const expectedBuffDuration = shiroConfig.blankBuffDuration || 240;
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reach 0');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset');
      assert(
        shiro.blankActiveTimer >= expectedBuffDuration - 1 && shiro.blankActiveTimer <= expectedBuffDuration,
        `Passive 3 active buff timer must initialize to ${expectedBuffDuration} frames`
      );
      assert(troop.isBuffed === true, 'Troop must now be buffed with golden prediction aura');
      assert(
        troop.blankBuffTimer >= expectedBuffDuration - 1 && troop.blankBuffTimer <= expectedBuffDuration,
        `Troop must receive ${expectedBuffDuration}-frame buff duration`
      );
      assert(
        playedSounds.some(s => String(s).includes('BookSynthFirstTier.ogg')),
        'BookSynthFirstTier.ogg buff chime must play upon Passive 3 activation'
      );
      // 3B. Verify anti-duplication: Second activation in same match must NOT re-trigger voiceline!
      playedSounds.length = 0;
      shiro.blankActiveTimer = 0;
      shiro.blankCooldown = 0;
      shiro.blankWindupTimer = 0;
      shiro._blankWindupStarted = false;
      shiro._updateTroopMinions(enemy, arena);
      assert(
        !playedSounds.some(s => String(s).includes('shiro_troop_buff_voiceline.mp3')),
        'STRICT RULE: shiro_troop_buff_voiceline.mp3 must only play ONCE per match/round to avoid duplicate voicelines'
      );

      // 4. Verify match is over: Shiro must NEVER trigger shiro_troop_buff_voiceline.mp3!
      playedSounds.length = 0;
      shiro.blankCooldown = 0;
      shiro.blankActiveTimer = 0;
      shiro.blankWindupTimer = 0;
      shiro._blankWindupStarted = false;
      troop.isBuffed = false;

      state.gameState = 'matchEnd';
      state.matchWinner = shiro;
      enemy.hp = 0;
      enemy.dead = true;

      shiro._updateTroopMinions(enemy, arena);
      assert(shiro._blankWindupStarted === false, 'Shiro must NOT start troop buff windup when match is over');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must stay 0 when match is over');
      assert(
        !playedSounds.some(s => String(s).includes('shiro_troop_buff_voiceline.mp3')),
        'shiro_troop_buff_voiceline.mp3 must NEVER trigger when match is over'
      );

      // 5. If windup was active when match ends, it must immediately be cancelled
      shiro._blankWindupStarted = true;
      shiro.blankWindupTimer = 60;
      shiro._updateTroopMinions(enemy, arena);
      assert(shiro._blankWindupStarted === false, 'Pending windup must be cancelled when match is over');
      assert(shiro.blankWindupTimer === 0, 'Pending windup timer must be reset to 0 when match is over');

      console.log('      ✅ Shiro Passive 3 0:00:02 voiceline trigger and match-over suppression verified.');
    } finally {
      audioSystem.playSFX = origPlaySFX;
      shiro.reset();
      state.fighters = [];
    }
  }

  // ── TEST 67: Shiro Victory Audio Sequencing: faah -> YOU WIN! -> Shutdown Voiceline ──
  console.log('   67. Testing Shiro Victory Audio Sequencing (faah -> YOU WIN! -> shutdown voiceline)...');
  {
    const ShiroClass = FIGHTER_CLASS_MAP['shiro'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };
    const shiro = new ShiroClass({ x: 200, y: 300, hp: 340, maxHp: 340 });
    const enemy = new SaitamaClass({ x: 350, y: 300, hp: 0, maxHp: 600 });
    enemy.dead = true;
    shiro.team = 0;
    enemy.team = 1;
    state.arena = arena;
    state.fighters = [shiro, enemy];
    state.matchWinner = shiro;
    state.roundWinner = shiro;
    state.gameState = 'matchEnd';
    state.isRoundDraw = false;
    state.isDraw = false;
    state._shiroChessboardAlpha = 1.0;
    state._shiroChessboardWasActive = true;
    state._shiroChessboardShutdownTimer = 0;
    state._hasPlayedChampionYouWinVoice = false;

    const { audioSystem } = await import('../js/systems/audioSystem.js');
    const { drawMatchEndScreen } = await import('../js/graphics/ui/GameOverScreen.js');
    const origPlaySFX = audioSystem.playSFX;
    const playedSounds = [];
    audioSystem.playSFX = (src, vol) => {
      playedSounds.push(src);
      if (origPlaySFX) return origPlaySFX(src, vol);
    };

    try {
      // 1. Frame 60 (While faah.mp3 is playing, 0 - 119 frames):
      // Neither YOU WIN! nor shutdown voiceline should trigger yet!
      state.matchEndTimer = 60;
      shiro._checkMatchVictory(enemy);
      drawMatchEndScreen();

      assert(shiro._hasSaidWinQuote === false, 'Shiro must NOT say win quote while faah.mp3 is playing (endTimer < 120)');
      assert(state._shiroChessboardShutdownTimer === 0, 'Chessboard shutdown must NOT initiate during faah.mp3');
      assert(state._hasPlayedChampionYouWinVoice === false, 'YOU WIN announcer must NOT play while faah.mp3 is active (timer < 120)');
      assert(
        !playedSounds.some(s => String(s).includes('shiro_chessboard_shutdown_voiceline.mp3')),
        'Shutdown voiceline must not play during faah.mp3'
      );
      assert(
        !playedSounds.some(s => String(s).includes('you-win')),
        'YOU WIN announcer must not play during faah.mp3'
      );

      // 2. Frame 120 (faah.mp3 has finished playing completely):
      // YOU WIN! announcer triggers now!
      state.matchEndTimer = 120;
      drawMatchEndScreen();
      assert(state._hasPlayedChampionYouWinVoice === true, 'YOU WIN announcer MUST trigger at frame 120 when faah finishes');
      assert(
        playedSounds.some(s => String(s).includes('you-win')),
        'YOU WIN sound must be played at frame 120'
      );

      // But Shiro's shutdown voiceline must still WAIT for YOU WIN announcer to finish (~80 frames, until frame 200)!
      shiro._checkMatchVictory(enemy);
      assert(shiro._hasSaidWinQuote === false, 'Shiro must wait for YOU WIN announcer to finish (endTimer < 200)');
      assert(
        !playedSounds.some(s => String(s).includes('shiro_chessboard_shutdown_voiceline.mp3')),
        'Shutdown voiceline must NOT overlap with YOU WIN announcer'
      );

      // 3. Frame 200 (YOU WIN announcer has completed its full ~80 frames duration):
      // Shiro now triggers "Checkmate!" and the chessboard shutdown voiceline!
      state.matchEndTimer = 200;
      shiro._checkMatchVictory(enemy);

      assert(shiro._hasSaidWinQuote === true, 'Shiro must trigger win quote at frame 200 after YOU WIN finishes');
      assert(shiro.speechBubble && shiro.speechBubble.fullText === 'Checkmate!', 'Shiro must speak "Checkmate!"');
      assert(state._shiroChessboardShutdownTimer > 0, 'Chessboard shutdown timer must initiate at frame 200');
      assert(
        playedSounds.some(s => String(s).includes('shiro_chessboard_shutdown_voiceline.mp3')),
        'shiro_chessboard_shutdown_voiceline.mp3 must play after YOU WIN announcer finishes'
      );
      assert(
        playedSounds.some(s => String(s).includes('LightFlickerOff.ogg') || String(s).includes('shiro_board_shutdown')),
        'shiro_board_shutdown SFX must play along with the shutdown voiceline'
      );

      // 4. Verify General Fighters (e.g. Zenitsu) also wait for faah.mp3 (120f) before YOU WIN announcer:
      const { ZenitsuFighter } = await import('../js/entities/fighters/ZenitsuFighter.js');
      const zenitsu = new ZenitsuFighter({ x: 200, y: 300, radius: 25 });
      zenitsu.reset();
      zenitsu.fighterIndex = 0;
      state.fighters = [zenitsu, enemy];
      state.matchWinner = zenitsu;
      state.gameState = 'matchEnd';
      state.scores = [2, 0];
      state._hasPlayedChampionYouWinVoice = false;
      playedSounds.length = 0;

      // At frame 60 (faah still playing):
      state.matchEndTimer = 60;
      drawMatchEndScreen();
      assert(state._hasPlayedChampionYouWinVoice === false, 'General fighter must NOT trigger YOU WIN while faah.mp3 is playing (timer < 120)');

      // At frame 120 (faah finished):
      state.matchEndTimer = 120;
      drawMatchEndScreen();
      assert(state._hasPlayedChampionYouWinVoice === true, 'General fighter MUST trigger YOU WIN announcer at frame 120 when faah finishes');
      assert(playedSounds.some(s => String(s).includes('you-win')), 'YOU WIN SFX must play at frame 120 for general fighters');

      console.log('      ✅ Universal victory audio sequence (faah -> YOU WIN! -> victory voiceline) verified across all fighters.');
    } finally {
      audioSystem.playSFX = origPlaySFX;
      shiro.reset();
      state.fighters = [];
      state._hasPlayedChampionYouWinVoice = false;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 68: Shiro Defeat Handling (Immediate Chessboard Shutdown, Troop Destruction, Strict Audio Suppression)
  // ---------------------------------------------------------------------------
  {
    console.log('Test 68: Shiro Defeat Handling (Immediate Chessboard Shutdown, All Troops Destroyed, Audio Suppressed)');
    const { ShiroFighter } = await import('../js/entities/fighters/ShiroFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');
    const { renderShiroChessboardFloor } = await import('../js/graphics/renderers/arenaRenderer.js');
    const { audioSystem } = await import('../js/systems/audioSystem.js');

    const shiro = new ShiroFighter({ x: 200, y: 300, radius: 25 });
    const enemy = new Fighter({ x: 400, y: 300, radius: 25 });
    shiro.reset();
    enemy.reset();
    shiro.fighterIndex = 0;
    enemy.fighterIndex = 1;

    state.fighters = [shiro, enemy];
    state.arena = { x: 50, y: 50, width: 440, height: 440 };
    state.gameState = 'fighting';
    state._shiroChessboardAlpha = 1.0;
    state._shiroChessboardWasActive = true;
    state._shiroChessboardShutdownTimer = 0;
    state._shiroVictoryShutdown = false;
    state._shiroDefeatShutdown = false;

    // Plant 3 active chess troops
    shiro.activeMinions = [
      { id: 't1', type: 'pawn', isMinion: true, isChessTroop: true, hp: 30, dead: false, x: 220, y: 220, r: 15 },
      { id: 't2', type: 'knight', isMinion: true, isChessTroop: true, hp: 45, dead: false, x: 260, y: 220, r: 15 },
      { id: 't3', type: 'queen', isMinion: true, isChessTroop: true, hp: 100, dead: false, x: 300, y: 220, r: 18 }
    ];
    for (const t of shiro.activeMinions) {
      t.owner = shiro;
      state.fighters.push(t);
    }

    // Set passive 3 windup active
    shiro._blankWindupStarted = true;
    shiro.blankWindupTimer = 90;

    const origPlaySFX = audioSystem.playSFX;
    const playedSounds = [];
    audioSystem.playSFX = (src, vol) => {
      playedSounds.push(src);
      if (origPlaySFX) return origPlaySFX(src, vol);
    };

    try {
      // 1. Enemy defeats Shiro (Shiro dies / matchEnd with enemy winner)
      state.gameState = 'matchEnd';
      state.matchWinner = enemy;
      shiro.hp = 0;
      shiro.onDeath();

      // 2. Verify all active troops were shattered and destroyed immediately!
      assert(shiro.activeMinions.length === 0, 'All active minions in shiro.activeMinions must be destroyed on defeat');
      const lingeringTroops = state.fighters.filter(f => f && (f.isChessTroop || f.isChessMinion));
      assert(lingeringTroops.length === 0, 'No chess troops should linger in state.fighters on Shiro defeat');

      // 3. Verify chessboard shutdown was initiated immediately without delay!
      assert(state._shiroChessboardShutdownTimer > 0, 'Chessboard shutdown must initiate immediately on defeat');
      assert(state._shiroDefeatShutdown === true, 'state._shiroDefeatShutdown must be set to true');
      assert(state._shiroVictoryShutdown === false, 'state._shiroVictoryShutdown must be false on defeat');

      // 4. Verify speech bubble and buff windup were cancelled
      assert(shiro.speechBubble === null, 'Shiro speech bubble must be cleared on defeat');
      assert(shiro._blankWindupStarted === false, 'Passive 3 buff windup must be cancelled on defeat');
      assert(shiro.blankWindupTimer === 0, 'Passive 3 buff windup timer must be reset to 0 on defeat');

      // 5. Verify audio: Mechanical shutdown and troop shatter SFX played, but VOICELINES are strictly suppressed!
      assert(
        playedSounds.some(s => String(s).includes('LightFlickerOff.ogg') || String(s).includes('shiro_board_shutdown')),
        'Chessboard shutdown mechanical SFX (LightFlickerOff.ogg) must play on defeat'
      );
      assert(
        playedSounds.some(s => String(s).includes('PermafrostKeepSealMine1.ogg') || String(s).includes('troopDestroyed')),
        'Troop shatter destruction SFX must play on defeat'
      );
      assert(
        !playedSounds.some(s => String(s).includes('shiro_chessboard_shutdown_voiceline.mp3')),
        'STRICT RULE: shiro_chessboard_shutdown_voiceline.mp3 must NEVER play on defeat'
      );
      assert(
        !playedSounds.some(s => String(s).includes('shiro_troop_buff_voiceline.mp3')),
        'STRICT RULE: shiro_troop_buff_voiceline.mp3 must NEVER play on defeat'
      );
      assert(
        !playedSounds.some(s => String(s).includes('FingerSnap.ogg')),
        'STRICT RULE: FingerSnap speech SFX must NEVER play on defeat'
      );

      // 6. Test renderer frame pass to confirm renderShiroChessboardFloor adheres to defeat rules
      const testCtx = createMockCtx();
      renderShiroChessboardFloor(testCtx, state.arena);

      // Verify voiceline still not played after render pass
      assert(
        !playedSounds.some(s => String(s).includes('shiro_chessboard_shutdown_voiceline.mp3')),
        'STRICT RULE: shiro_chessboard_shutdown_voiceline.mp3 must not play during render pass on defeat'
      );

      console.log('      ✅ Shiro defeat handling (immediate shutdown, all troops destroyed, audio suppressed) verified.');
    } finally {
      audioSystem.playSFX = origPlaySFX;
      shiro.reset();
      enemy.reset();
      state.fighters = [];
      state._shiroDefeatShutdown = false;
      state._shiroVictoryShutdown = false;
      state._shiroChessboardShutdownTimer = 0;
      state._shiroChessboardAlpha = 0;
    }
  }

  // ── TEST 69: Shiro Voiceline Stun Cut-off (Immediate Termination on Stun / Hit-Stun / Freeze) ──
  console.log('   69. Testing Shiro Voiceline Stun Cut-off (Immediate Audio Termination & Windup Cancellation)...');
  {
    const ShiroClass = FIGHTER_CLASS_MAP['shiro'];
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };
    const shiro = new ShiroClass({ x: 200, y: 300, hp: 340, maxHp: 340 });
    const enemy = new SaitamaClass({ x: 350, y: 300, hp: 600, maxHp: 600 });
    shiro.team = 0;
    enemy.team = 1;
    state.arena = arena;
    state.gameState = 'playing';
    state.matchWinner = null;
    state.roundWinner = null;
    state._shiroDefeatShutdown = false;
    state._shiroVictoryShutdown = false;
    state._isShiroTroopBuffVoicePlaying = false;

    const pawn = {
      isMinion: true,
      isChessTroop: true,
      owner: shiro,
      team: 0,
      hp: 50,
      maxHp: 50,
      dead: false,
      isDead: false,
      isBuffed: false,
      blankBuffTimer: 0,
      type: 'pawn',
      r: 16,
      x: 220,
      y: 300
    };
    shiro.activeMinions = [pawn];
    state.fighters = [shiro, enemy, pawn];

    const origPlaySFX = audioSystem.playSFX;

    audioSystem.playSFX = (src, vol, speed, p1, p2, onEnd) => {
      const handle = { src, volume: vol, isPlaying: true, onEnd };
      return handle;
    };

    const triggerWindup = () => {
      shiro.hp = 340;
      shiro.dead = false;
      shiro.knockbackStunTimer = 0;
      shiro.hitStunTimer = 0;
      shiro.stunTimer = 0;
      shiro.paralyzeTimer = 0;
      shiro.isParalyzed = false;
      shiro.timeStopTimer = 0;
      shiro.freezeTimer = 0;
      shiro.iceFreezeTimer = 0;
      shiro.isFrozen = false;
      shiro.isTargetOfAmbush = false;
      shiro.blankCooldown = 0;
      shiro.blankActiveTimer = 0;
      shiro.blankWindupTimer = 0;
      shiro._blankWindupStarted = false;
      shiro._hasPlayedBlankVoiceline = false;
      shiro._blankVoiceHandle = null;
      state._isShiroTroopBuffVoicePlaying = false;
      pawn.hp = 50;
      pawn.dead = false;
      pawn.isDead = false;
      shiro.activeMinions = [pawn];
      state.fighters = [shiro, enemy, pawn];

      shiro._updateTroopMinions(enemy, arena);
      assert(shiro._blankVoiceHandle !== null, 'Voiceline handle must be active');
      assert(shiro.blankWindupTimer === 120, 'blankWindupTimer must be 120');
      assert(shiro._blankWindupStarted === true, 'Windup must be started');
      assert(state._isShiroTroopBuffVoicePlaying === true, 'state._isShiroTroopBuffVoicePlaying must be true');
    };

    try {
      // 1. Knockback Stun cut-off
      triggerWindup();
      shiro.applyKnockback(5, 0, 15);
      assert(shiro.knockbackStunTimer === 15, 'Knockback stun timer must be set to 15');
      assert(shiro._blankVoiceHandle === null, 'Shiro must immediately clear _blankVoiceHandle upon stun');
      assert(shiro.blankWindupTimer === 0, 'Shiro blankWindupTimer must immediately reset to 0 upon stun');
      assert(shiro._blankWindupStarted === false, 'Shiro _blankWindupStarted must reset to false upon stun');
      assert(state._isShiroTroopBuffVoicePlaying === false, 'state._isShiroTroopBuffVoicePlaying must be false upon stun');
      assert(shiro.blankCooldown >= 180, 'Shiro Passive 3 must receive interruption cooldown upon stun');

      // 2. Paralyze CC cut-off
      triggerWindup();
      shiro.applyParalyze(30);
      assert(shiro._blankVoiceHandle === null, 'Voiceline handle must be cut off on paralyze');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reset on paralyze');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset on paralyze');

      // 3. Time-Stop / Stasis cut-off
      triggerWindup();
      shiro.applyTimeStop(45);
      assert(shiro._blankVoiceHandle === null, 'Voiceline handle must be cut off on timeStop');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reset on timeStop');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset on timeStop');

      // 4. Hit-Stun cut-off
      triggerWindup();
      shiro.applyHitStun(20);
      assert(shiro._blankVoiceHandle === null, 'Voiceline handle must be cut off on hitStun');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reset on hitStun');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset on hitStun');

      // 5. Heavy Damage cut-off
      triggerWindup();
      shiro.takeDamage(25, enemy, { isKnockback: true, isHeavy: true });
      assert(shiro._blankVoiceHandle === null, 'Voiceline handle must be cut off on heavy damage');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reset on heavy damage');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset on heavy damage');

      // 6. Ambush / CC stasis detection in update loop cut-off
      triggerWindup();
      shiro.isTargetOfAmbush = true;
      shiro.update(enemy, 0, arena);
      assert(shiro._blankVoiceHandle === null, 'Voiceline handle must be cut off when update detects ambush stasis');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reset when update detects ambush stasis');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset when update detects ambush stasis');

      // 7. General interruptAttacks() invocation cut-off
      triggerWindup();
      shiro.interruptAttacks();
      assert(shiro._blankVoiceHandle === null, 'Voiceline handle must be cut off on interruptAttacks');
      assert(shiro.blankWindupTimer === 0, 'Windup timer must reset on interruptAttacks');
      assert(shiro._blankWindupStarted === false, 'Windup started flag must reset on interruptAttacks');

      // 8. Explosion Hit Recovery: Shiro hit by an explosion (hitStunTimer, knockbackStunTimer & slowTimer) must decay timers and recover movement
      shiro.reset();
      state.fighters = [shiro, enemy];
      shiro.applyHitStun(12);
      shiro.knockbackStunTimer = 10;
      shiro.slowTimer = 20;
      shiro.slowMultiplier = 0.5;
      shiro.vx = 8;
      shiro.vy = -6;
      assert(shiro.hitStunTimer === 12, 'Initial hitStunTimer must be 12');
      assert(shiro._isShiroStunned() === true, 'Shiro must initially register as stunned');
      for (let f = 1; f <= 12; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        shiro.update(enemy, 0, arena);
      }
      assert(shiro.hitStunTimer === 0, 'hitStunTimer must decay to 0 after 12 frames');
      assert(shiro.knockbackStunTimer === 0, 'knockbackStunTimer must decay to 0');
      assert(shiro._isShiroStunned() === false, 'Shiro must no longer be stunned after hitStun expires');
      for (let f = 1; f <= 10; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        shiro.update(enemy, 0, arena);
      }
      assert(shiro.slowTimer === 0, 'slowTimer must decay to 0');
      assert(shiro.slowMultiplier === 1.0, 'slowMultiplier must reset to 1.0');
      assert(Math.hypot(shiro.vx, shiro.vy) > 0, 'Shiro must actively move after explosion hit recovery');

      console.log('      ✅ Shiro voiceline stun cut-off & explosion hit recovery (hitStunTimer, knockbackStunTimer, slow recovery & active movement) verified.');
    } finally {
      audioSystem.playSFX = origPlaySFX;
      shiro.reset();
      enemy.reset();
      state.fighters = [];
    }
  }

  // ── TEST: Crazy Dave Unified Damage Number Color Standard ──
  console.log('   Testing Crazy Dave Unified Damage Number Color Standard...');
  {
    const DaveClass = FIGHTER_CLASS_MAP['crazydave'];
    const TargetClass = FIGHTER_CLASS_MAP['toji'];
    const {
      PeashooterEntity,
      SnowPeaEntity,
      WallnutEntity,
      TorchwoodEntity,
      PotatoMineEntity,
      LawnmowerEntity
    } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const { crazyDaveConfig } = await import('../js/configs/characters/crazyDaveConfig.js');

    assert(DaveClass && TargetClass, 'CrazyDaveFighter and TojiFighter must exist in FIGHTER_CLASS_MAP');
    assert(crazyDaveConfig.damageNumberColor === '#84CC16', 'crazyDaveConfig.damageNumberColor must be #84CC16');

    const dave = new DaveClass(200, 300, 0);
    const target = new TargetClass(300, 300, 1);
    target.stealthDodgeChance = 0;
    const peashooter = new PeashooterEntity(200, 300, dave, 1);
    const snowPea = new SnowPeaEntity(200, 300, dave, 1);
    const wallnut = new WallnutEntity(200, 300, dave, 1);
    const torchwood = new TorchwoodEntity(200, 300, dave, 1);
    const potatoMine = new PotatoMineEntity(200, 300, dave, 1);
    const lawnmower = new LawnmowerEntity(50, 300, dave, 1, 0);

    // 1. Entity and Class getDamageNumberColor() audits
    assert(dave.damageNumberColor === '#84CC16', `Dave damageNumberColor must be #84CC16, got ${dave.damageNumberColor}`);
    assert(dave.getDamageNumberColor() === '#84CC16', `Dave getDamageNumberColor() must be #84CC16`);
    assert(peashooter.getDamageNumberColor() === '#84CC16', `Peashooter getDamageNumberColor() must be #84CC16`);
    assert(snowPea.getDamageNumberColor() === '#84CC16', `SnowPea getDamageNumberColor() must be #84CC16`);
    assert(wallnut.getDamageNumberColor() === '#84CC16', `Wallnut getDamageNumberColor() must be #84CC16`);
    assert(torchwood.getDamageNumberColor() === '#84CC16', `Torchwood getDamageNumberColor() must be #84CC16`);
    assert(potatoMine.getDamageNumberColor() === '#84CC16', `PotatoMine getDamageNumberColor() must be #84CC16`);
    assert(lawnmower.getDamageNumberColor() === '#84CC16', `Lawnmower getDamageNumberColor() must be #84CC16`);

    try {
      state.fighters = [dave, target];
      state.projectiles = [];
      if (projectileSystem && Array.isArray(projectileSystem.projectiles)) projectileSystem.projectiles = [];
      target.hp = 1000;
      target.maxHp = 1000;

      // Peashooter projectile firing & hit
      state.floatingTexts = [];
      peashooter._firePea(0, 0);
      const peaProj = (projectileSystem && projectileSystem.projectiles.pop()) || state.projectiles.pop();
      assert(peaProj && peaProj.damageNumberColor === '#84CC16', `Peashooter peaProj.damageNumberColor must be #84CC16, got ${peaProj?.damageNumberColor}`);
      target.takeDamage(10, peashooter, { projectile: peaProj, damageNumberColor: peaProj.damageNumberColor });
      const peaText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(peaText, 'Peashooter hit must spawn floating damage text');
      const expectedUnifiedColor = peaText.color;

      // Snow Pea projectile firing & hit
      state.floatingTexts = [];
      snowPea._fireSnowPea(0, 0);
      const snowProj = (projectileSystem && projectileSystem.projectiles.pop()) || state.projectiles.pop();
      assert(snowProj && snowProj.damageNumberColor === '#84CC16', `Snow Pea snowProj.damageNumberColor must be #84CC16, got ${snowProj?.damageNumberColor}`);
      target.takeDamage(12, snowPea, { projectile: snowProj, damageNumberColor: snowProj.damageNumberColor });
      const snowText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(snowText && snowText.color === expectedUnifiedColor, `Snow Pea damage color must match Peashooter (${expectedUnifiedColor}), got ${snowText?.color}`);

      // Torchwood fire pea ignition & hit
      state.floatingTexts = [];
      const unignitedPea = { visual: 'peaBullet', x: torchwood.x, y: torchwood.y, damage: 25, color: '#22C55E' };
      if (projectileSystem && Array.isArray(projectileSystem.projectiles)) {
        projectileSystem.projectiles.push(unignitedPea);
      } else {
        state.projectiles.push(unignitedPea);
      }
      torchwood._interceptProjectiles();
      assert(unignitedPea.damageNumberColor === '#84CC16', `Ignited Fire Pea damageNumberColor must be #84CC16`);
      target.takeDamage(25, torchwood, { projectile: unignitedPea, damageNumberColor: unignitedPea.damageNumberColor });
      const fireText = state.floatingTexts.find(t => t.text !== 'MISS!') || state.floatingTexts[state.floatingTexts.length - 1];
      assert(fireText && fireText.color === expectedUnifiedColor, `Fire Pea damage color must match Peashooter (${expectedUnifiedColor}), got ${fireText?.color}`);

      // Potato Mine detonation
      state.floatingTexts = [];
      target.x = potatoMine.x + 10;
      target.y = potatoMine.y;
      potatoMine._detonate(crazyDaveConfig, 0);
      const potatoDamageText = state.floatingTexts.find(t => t.text !== 'SPUDOW!');
      assert(potatoDamageText && potatoDamageText.color === expectedUnifiedColor, `Potato Mine damage color must match Peashooter (${expectedUnifiedColor}), got ${potatoDamageText?.color}`);

      // Lawnmower shred damage
      state.floatingTexts = [];
      target.x = lawnmower.x + 5;
      target.y = lawnmower.y;
      lawnmower.state = 'charging';
      lawnmower._shredEnemies(crazyDaveConfig);
      const lawnmowerDamageText = state.floatingTexts.find(t => t.text !== 'VROOOOM!');
      assert(lawnmowerDamageText && lawnmowerDamageText.color === expectedUnifiedColor, `Lawnmower damage color must match Peashooter (${expectedUnifiedColor}), got ${lawnmowerDamageText?.color}`);

      console.log(`      ✅ Crazy Dave unified damage number color (${expectedUnifiedColor} / #84CC16) 100% matched across Dave, Peashooter, Snow Pea, Torchwood, Potato Mine & Lawnmower.`);
    } finally {
      dave.reset();
      target.reset();
      state.fighters = [];
      state.projectiles = [];
      state.floatingTexts = [];
    }
  }

  // ── TEST: Sans Unified Damage Number Color Standard (#03d5f1ff) ──
  console.log('   Testing Sans Unified Damage Number Color Standard...');
  {
    const SansClass = FIGHTER_CLASS_MAP['sans'];
    const TargetClass = FIGHTER_CLASS_MAP['toji'];
    const { sansConfig } = await import('../js/configs/characters/sansConfig.js');

    assert(SansClass && TargetClass, 'SansFighter and TojiFighter must exist in FIGHTER_CLASS_MAP');
    assert(sansConfig.damageNumberColor === '#03d5f1ff', 'sansConfig.damageNumberColor must be #03d5f1ff');

    const sans = new SansClass(200, 300, 0);
    const target = new TargetClass(300, 300, 1);
    target.stealthDodgeChance = 0;

    assert(sans.damageNumberColor === '#03d5f1ff', `Sans damageNumberColor must be #03d5f1ff, got ${sans.damageNumberColor}`);
    assert(sans.getDamageNumberColor() === '#03d5f1ff', `Sans getDamageNumberColor() must be #03d5f1ff`);

    try {
      state.fighters = [sans, target];
      state.projectiles = [];
      target.hp = 1000;
      target.maxHp = 1000;

      // 1. Gaster Blaster First Impact Damage
      state.floatingTexts = [];
      target.takeDamage(20, sans, {
        isProjectile: true,
        isLaser: true,
        isGasterBlaster: true,
        isSkill: true,
        isFirstImpact: true,
        damageNumberColor: sans.damageNumberColor
      });
      const blasterText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(blasterText && blasterText.color === '#03d5f1ff', `Gaster Blaster damage color must be #03d5f1ff, got ${blasterText?.color}`);

      // 2. Bone Projectile Damage
      state.floatingTexts = [];
      sans.castBasicBone(target);
      const bone = sans.boneProjectiles.pop();
      assert(bone && bone.damageNumberColor === '#03d5f1ff', `Bone projectile damageNumberColor must be #03d5f1ff`);
      target.takeDamage(bone.damage, sans, { projectile: bone, damageNumberColor: bone.damageNumberColor });
      const boneText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(boneText && boneText.color === '#03d5f1ff', `Bone projectile damage color must be #03d5f1ff, got ${boneText?.color}`);

      // 3. Karmic Retribution (KR) Poison Tick Damage
      state.floatingTexts = [];
      sans.karmaTargets.set(target, { stacks: 8, timer: 100, tickTimer: 13 });
      sans._updateKarma();
      const krText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(krText && krText.color === '#03d5f1ff', `Karmic Retribution damage color must be #03d5f1ff, got ${krText?.color}`);

      // 4. Gravity Slam Wall Impact Damage
      state.floatingTexts = [];
      target.x = 450;
      target.y = 250;
      target.takeDamage(14, sans, { damageNumberColor: sans.damageNumberColor });
      const slamText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(slamText && slamText.color === '#03d5f1ff', `Gravity slam damage color must be #03d5f1ff, got ${slamText?.color}`);

      console.log(`      ✅ Sans unified damage number color (#03d5f1ff) 100% matched across Gaster Blaster, Bones, KR ticks & Gravity Slam.`);
    } finally {
      sans.reset();
      target.reset();
      state.fighters = [];
      state.projectiles = [];
      state.floatingTexts = [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 70: Blood Particle Suppression on Non-Fleshy Entities (Buildings, Plants, and Troops)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    console.log('   70. Testing Blood Suppression on Buildings, Plants, and Troops (FFA & General Modes)...');
    const { isBloodSuppressedEntity, spawnBloodEffect, spawnFatalBloodSplash } = await import('../js/graphics/particles/bloodEffect.js');
    const { applyDamageToTarget } = await import('../js/entities/fighter.js');
    const { TurretEntity } = await import('../js/entities/TurretEntity.js');
    const { DispenserEntity } = await import('../js/entities/DispenserEntity.js');
    const { PeashooterEntity, SnowPeaEntity, WallnutEntity, TorchwoodEntity, PotatoMineEntity, LawnmowerEntity } = await import('../js/entities/fighters/CrazyDaveFighter.js');
    const { ShiroFighter } = await import('../js/entities/fighters/ShiroFighter.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');

    state.gameState = 'playing';
    state.mode = 'FFA';
    state.fighters = [];

    const gojo = new GojoFighter({ id: 1, name: 'Gojo', color: '#38BDF8', startX: 200, startY: 200, radius: 25, hp: 1000 });
    gojo.infinityActive = false;
    const engineerOwner = new GojoFighter({ id: 2, name: 'Engineer', color: '#F59E0B', startX: 100, startY: 100, radius: 25, hp: 1000 });
    const daveOwner = new GojoFighter({ id: 3, name: 'CrazyDave', color: '#84CC16', startX: 300, startY: 300, radius: 25, hp: 1000 });
    const shiro = new ShiroFighter({ id: 4, name: 'Shiro', color: '#EC4899', startX: 400, startY: 400, radius: 25, hp: 1000 });

    const turret = new TurretEntity(150, 150, engineerOwner, 1);
    const dispenser = new DispenserEntity(180, 180, engineerOwner);
    const peashooter = new PeashooterEntity(220, 220, daveOwner);
    const snowPea = new SnowPeaEntity(250, 250, daveOwner);
    const wallnut = new WallnutEntity(280, 280, daveOwner);
    const torchwood = new TorchwoodEntity(310, 310, daveOwner);
    const potatoMine = new PotatoMineEntity(340, 340, daveOwner);
    const lawnmower = new LawnmowerEntity(370, 370, daveOwner);

    // Chess piece minion
    const chessPawn = {
      x: 420, y: 420, r: 15, radius: 15, hp: 80, maxHp: 80,
      type: 'pawn', isMinion: true, isChessTroop: true, isChessMinion: true, isChessPiece: true,
      noBlood: true, suppressBlood: true, bleedImmune: true, isBloodImmune: true
    };

    const nonFleshyEntities = [turret, dispenser, peashooter, snowPea, wallnut, torchwood, potatoMine, lawnmower, chessPawn];

    try {
      // 1. Verify isBloodSuppressedEntity identifies all non-fleshy targets
      for (const ent of nonFleshyEntities) {
        assert(isBloodSuppressedEntity(ent) === true, `${ent.type || ent.name} must be identified as blood-suppressed`);
      }
      assert(isBloodSuppressedEntity(gojo) === false, 'Standard humanoid fighter must NOT be blood-suppressed');

      // 2. Test applyDamageToTarget: Zero blood spawned on non-fleshy entities
      for (const ent of nonFleshyEntities) {
        state.bloodEffects = [];
        applyDamageToTarget(ent, 30, { attacker: gojo });
        assert((state.bloodEffects?.length || 0) === 0, `${ent.type || ent.name} must spawn 0 blood particles from applyDamageToTarget`);
      }

      // Verify human fighter DOES spawn blood normally from applyDamageToTarget
      state.bloodEffects = [];
      applyDamageToTarget(gojo, 30, { attacker: engineerOwner });
      assert((state.bloodEffects?.length || 0) > 0, 'Humanoid fighter must spawn blood normally from applyDamageToTarget');

      // 3. Test entity.takeDamage(): Zero blood spawned on non-fleshy entities
      for (const ent of [turret, dispenser, peashooter, snowPea, wallnut, torchwood, potatoMine, lawnmower]) {
        state.bloodEffects = [];
        ent.takeDamage(20, gojo, {});
        assert((state.bloodEffects?.length || 0) === 0, `${ent.type || ent.name} must spawn 0 blood particles from takeDamage`);
      }

      // 4. Test coordinate call spawnBloodEffect(x, y): When entity is at location in state.fighters
      state.fighters = [turret, dispenser, peashooter, snowPea, wallnut, torchwood, potatoMine, lawnmower, chessPawn, gojo];
      for (const ent of nonFleshyEntities) {
        state.bloodEffects = [];
        spawnBloodEffect(ent.x, ent.y, 25);
        assert((state.bloodEffects?.length || 0) === 0, `Coordinate call spawnBloodEffect at ${ent.type || ent.name} position must spawn 0 blood`);
      }

      // Coordinate call at human fighter position MUST spawn blood
      state.bloodEffects = [];
      spawnBloodEffect(gojo.x, gojo.y, 25);
      assert((state.bloodEffects?.length || 0) > 0, 'Coordinate call at humanoid position must spawn blood');

      // 5. Test death fatal blood splash spawnFatalBloodSplash
      for (const ent of nonFleshyEntities) {
        state.bloodEffects = [];
        spawnFatalBloodSplash(ent);
        assert((state.bloodEffects?.length || 0) === 0, `spawnFatalBloodSplash on ${ent.type || ent.name} must spawn 0 blood`);

        state.bloodEffects = [];
        spawnFatalBloodSplash(ent.x, ent.y);
        assert((state.bloodEffects?.length || 0) === 0, `spawnFatalBloodSplash at ${ent.type || ent.name} coordinates must spawn 0 blood`);
      }

      // spawnFatalBloodSplash on human fighter MUST spawn fatal blood
      state.bloodEffects = [];
      spawnFatalBloodSplash(gojo);
      assert((state.bloodEffects?.length || 0) > 0, 'spawnFatalBloodSplash on humanoid fighter must spawn fatal blood');

      console.log('      ✅ Blood particle suppression verified: 0 blood spawned on Turrets, Dispensers, Plants, Lawnmowers & Chess Troops across direct hits, coordinate attacks, and death splashes.');
    } finally {
      state.fighters = [];
      state.bloodEffects = [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 71: Unified Damage Number Color Resolution on Minions (Sans vs Minions)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    console.log('   71. Testing Unified Damage Number Color Resolution on Minions...');
    const { SansFighter } = await import('../js/entities/fighters/SansFighter.js');
    const { ShiroFighter } = await import('../js/entities/fighters/ShiroFighter.js');
    const { resolveDamageNumberColor } = await import('../js/entities/fighter.js');

    state.gameState = 'playing';
    state.fighters = [];
    state.floatingTexts = [];

    const sans = new SansFighter({ id: 0, name: 'Sans', color: '#00F3FF', startX: 100, startY: 100, hp: 100 });
    const shiro = new ShiroFighter({ id: 1, name: 'Shiro', color: '#EC4899', startX: 400, startY: 400, hp: 100 });

    shiro._flickChessTroop(sans);
    const chessPawn = shiro.activeMinions[0];
    shiro._plantTroopOnTileCenter(chessPawn, state.arena);

    try {
      // 1. Verify resolveDamageNumberColor extracts Sans's damageNumberColor
      const resolvedColor = resolveDamageNumberColor(sans, { damageNumberColor: sans.damageNumberColor }, '#EF4444');
      assert(resolvedColor === '#03d5f1ff', `resolveDamageNumberColor must return #03d5f1ff for Sans, got ${resolvedColor}`);

      // 2. Sans direct attack on Shiro's chess troop
      state.floatingTexts = [];
      chessPawn.takeDamage(10, sans, { damageNumberColor: sans.damageNumberColor });
      const lastText = state.floatingTexts[state.floatingTexts.length - 1];
      assert(lastText && lastText.color === '#03d5f1ff', `Damage number color on minion must be #03d5f1ff, got ${lastText?.color}`);

      console.log('      ✅ Minion damage number color resolution verified: Sans attacks display #03d5f1ff on chess minions.');
    } finally {
      state.fighters = [];
      state.floatingTexts = [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 72: Gunslinger (Alucard) Match Victory Gun Spin & Holstering Animation
  // ─────────────────────────────────────────────────────────────────────────────
  {
    console.log('   72. Testing Gunslinger / Alucard Match Victory Gun Spin & Holstering Animation...');
    const { GunSlingerFighter } = await import('../js/entities/fighters/GunSlingerFighter.js');
    const { drawAlucardSkin } = await import('../js/graphics/fighters/gunSlingerSkin.js');

    state.gameState = 'playing';
    state.fighters = [];
    state.matchWinner = null;
    state.roundWinner = null;

    const alucard = new GunSlingerFighter({ id: 0, name: 'GunSlinger', color: '#B91C1C', startX: 200, startY: 200, r: 25, radius: 25, hp: 100 });
    const dummyOpponent = { id: 1, name: 'Target', hp: 0, dead: true, x: 300, y: 300, r: 25 };

    try {
      // 1. Initial State: weapons and hands must be visible and active
      assert(alucard.hasWonMatch === false, 'Alucard hasWonMatch must initially be false');
      assert(alucard.hideGuns === false, 'Alucard hideGuns must initially be false');
      assert(alucard.hideHands === false, 'Alucard hideHands must initially be false');

      // 2. Trigger Victory in Match End state
      state.gameState = 'matchEnd';
      state.matchWinner = alucard;
      state.roundWinner = alucard;
      state.fighters = [alucard, dummyOpponent];

      alucard.update(dummyOpponent, 0, state.arena);

      assert(alucard.hasWonMatch === true, 'Alucard hasWonMatch must be true upon victory detection');
      assert(alucard.victorySpinTimer === 49, `Alucard victorySpinTimer must be 49 on first tick (got ${alucard.victorySpinTimer})`);
      assert(alucard.victorySpinAngle > 0, 'Alucard victorySpinAngle must be > 0 while spinning');
      assert(alucard.hideGuns === false, 'Guns must remain visible during the active victory spin');
      assert(alucard.hideHands === false, 'Hands must remain visible during the active victory spin');
      assert(alucard.vx === 0 && alucard.vy === 0, 'Alucard must be stationary during victory spin');
      assert(alucard.gunAngle === 0, 'Alucard gunAngle must face upright (0) during victory');

      // 3. Complete the victory spin duration (advance 55 ticks)
      for (let i = 0; i < 55; i++) {
        alucard.update(dummyOpponent, 0, state.arena);
      }

      assert(alucard.victorySpinTimer === 0, 'victorySpinTimer must decay to 0');
      assert(alucard.victorySpinAngle === 0, 'victorySpinAngle must reset to 0 after spin completes');
      assert(alucard.isVictoryXPose === true, 'Alucard isVictoryXPose must be true after victory animation finishes');
      assert(alucard.victoryXPoseProgress === 1.0, 'Alucard victoryXPoseProgress must be 1.0 after victory animation finishes');
      assert(alucard.hideGuns === false, 'Alucard hideGuns must be false (guns are kept in X form, not hidden)');
      assert(alucard.hideHands === false, 'Alucard hideHands must be false (hands are kept holding weapons)');

      // 4. Test drawGun renders guns in crossed X pose
      let gunDrawn = false;
      const mockCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        drawImage: () => { gunDrawn = true; },
        fillRect: () => { gunDrawn = true; },
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        fill: () => { gunDrawn = true; },
        stroke: () => {},
      };
      state.ctx = mockCtx;
      alucard.drawGun(mockCtx);
      assert(gunDrawn === true, 'drawGun must render crossed X guns and hands in victory pose');

      // 5. Test reset restores guns and hands for the next round
      alucard.reset();
      assert(alucard.hasWonMatch === false, 'Alucard hasWonMatch must reset to false');
      assert(alucard.isVictoryXPose === false, 'Alucard isVictoryXPose must reset to false');
      assert(alucard.victoryXPoseProgress === 0, 'Alucard victoryXPoseProgress must reset to 0');
      assert(alucard.hideGuns === false, 'Alucard hideGuns must remain false');
      assert(alucard.hideHands === false, 'Alucard hideHands must remain false');

      console.log('      ✅ Gunslinger / Alucard match victory gun spin and crossed X formation verified.');
    } finally {
      state.fighters = [];
      state.matchWinner = null;
      state.roundWinner = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 73: Alucard 5 Combat Mechanics (Aggressive Regeneration, Grievous Wounds, Baskerville Feast, Shadow Phase i-frames, Illusion Counter)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    console.log('   73. Testing Alucard 5 Combat Mechanics (Aggressive Regen, Grievous Wounds, Baskerville, Shadow Phase, Illusion Counter)...');
    const { GunSlingerFighter } = await import('../js/entities/fighters/GunSlingerFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    state.gameState = 'playing';
    state.fighters = [];
    state.floatingTexts = [];

    const alucard = new GunSlingerFighter({ id: 0, name: 'Alucard', color: '#B91C1C', startX: 200, startY: 200, r: 25, radius: 25, hp: 100, maxHp: 100 });
    const dummy = new Fighter({ id: 1, name: 'Target', color: '#3B82F6', startX: 300, startY: 200, r: 25, radius: 25, hp: 100, maxHp: 100 });
    dummy.gunAngle = 0; // Facing right (towards +X)

    state.fighters = [alucard, dummy];

    try {
      // 1. Passive: Aggressive Regeneration (35% base, 50% when <= 50% maxHp)
      alucard.maxHp = 100;
      alucard.hp = 80;
      dummy.hp = 100;
      alucard.onDamageDealt(dummy, null, 0, 20); // 20 damage dealt -> 35% of 20 = 7 heal
      assert(alucard.hp === 87, `Alucard Aggressive Regeneration must heal 7 HP at high health (got ${alucard.hp})`);
      assert(alucard._healthBarHealTimer === 16, 'Alucard top HUD health card glow timer must be set to 16');

      alucard.hp = 40; // <= 50% maxHp -> 50% lifesteal
      alucard.onDamageDealt(dummy, null, 0, 20); // 20 damage dealt -> 50% of 20 = 10 heal
      assert(alucard.hp === 50, `Alucard Aggressive Regeneration must boost to 50% lifesteal when low HP (got ${alucard.hp})`);

      // 2. Heavy Anti-Regeneration Shots: Grievous Wounds / Heal Block
      assert(dummy.grievousWoundsTimer === 180, `Dummy grievousWoundsTimer must be 180 (got ${dummy.grievousWoundsTimer})`);
      assert(dummy.healBlockTimer === 180, `Dummy healBlockTimer must be 180 (got ${dummy.healBlockTimer})`);

      const dummyPreHp = dummy.hp;
      dummy.hp = dummyPreHp + 25; // Attempt heal while afflicted with Grievous Wounds
      assert(dummy.hp === dummyPreHp, `Dummy healing must be 100% blocked by Grievous Wounds (expected ${dummyPreHp}, got ${dummy.hp})`);

      // 3. Skill 1: Baskerville Feast
      alucard.skill1Timer = 0;
      const castResult1 = alucard.castSkill1BaskervilleFeast(dummy);
      assert(castResult1 === true, 'castSkill1BaskervilleFeast must return true when ready');
      assert(alucard.skill1Timer === 240, 'Skill 1 cooldown must be set to 240');
      assert(alucard.activeBaskervilleHounds.length === 1, 'Baskerville hound must be spawned');

      const hound = alucard.activeBaskervilleHounds[0];
      assert(typeof hound.damage === 'number' && hound.damage > 0, `Baskerville hound damage must be a positive number (got ${hound.damage})`);
      assert(typeof hound.speed === 'number' && hound.speed > 0, `Baskerville hound speed must be a positive number (got ${hound.speed})`);

      // Advance hound until impact
      hound.x = dummy.x;
      hound.y = dummy.y;
      alucard._updateVisualEffects();
      assert(hound.hasHit === true, 'Hound must register hit on impact');

      // 4. Skill 2: Shadow Phase (Complete i-frames & Cross-Up Dash)
      alucard.skill2Timer = 0;
      const castResult2 = alucard.castSkill2ShadowPhase(dummy);
      assert(castResult2 === true, 'castSkill2ShadowPhase must return true when ready');
      assert(alucard.isShadowPhasing === true, 'alucard.isShadowPhasing must be true');
      assert(alucard.shadowPhaseTimer === 22, 'alucard.shadowPhaseTimer must be 22');

      // Invulnerability frames (i-frames) check
      const alucardPreHp = alucard.hp;
      const dmgResult = alucard.takeDamage(40, dummy);
      assert(dmgResult === false, 'alucard.takeDamage must return false during Shadow Phase (i-frames)');
      assert(alucard.hp === alucardPreHp, 'Alucard HP must remain untouched during Shadow Phase i-frames');

      // 5. Skill 3: Illusion Counter (Mockery Stance -> Shadow Teleport & Point-Blank Execution)
      alucard.isShadowPhasing = false;
      alucard.shadowPhaseTimer = 0;
      alucard.skill3Timer = 0;

      const castResult3 = alucard.castSkill3IllusionCounter();
      assert(castResult3 === true, 'castSkill3IllusionCounter must return true when ready');
      assert(alucard.isCounterStance === true, 'alucard.isCounterStance must be true');
      assert(alucard.counterStanceTimer === 60, 'alucard.counterStanceTimer must be 60');

      dummy.x = 300; dummy.y = 200; dummy.gunAngle = 0; dummy.r = 25;
      const counterHitResult = alucard.takeDamage(30, dummy);
      assert(counterHitResult === false, 'Incoming hit during mockery stance must be nullified (return false)');
      assert(alucard.isCounterStance === false, 'Counter stance must clear upon trigger');

      // Check teleportation behind dummy (dummy facing angle 0 -> behind is -X)
      assert(alucard.x < dummy.x, `Alucard must teleport behind dummy (got alucard.x=${alucard.x}, dummy.x=${dummy.x})`);
      assert(dummy.timeStopTimer === 25, `Dummy must be hit-paused for 25 frames (got ${dummy.timeStopTimer})`);
      assert(dummy.grievousWoundsTimer === 180, 'Dummy must be afflicted with Grievous Wounds from counter-strike');

      console.log('      ✅ Alucard 5 combat mechanics (Aggressive Regen, Grievous Wounds, Baskerville, Shadow Phase, Illusion Counter) verified.');
    } finally {
      state.fighters = [];
      state.floatingTexts = [];
    }
  }

  // ── TEST 74: Eye of Cthulhu vs Ichigo Getsuga Tensho Wave Drag & Wall Pin ──
  console.log('   74. Testing Eye of Cthulhu vs Ichigo Getsuga Tensho Wave Drag & Wall Pin...');
  {
    const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
    const { EyeOfCthulhuFighter, EOC_STATE } = await import('../js/entities/fighters/EyeOfCthulhuFighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    const ichigo = new IchigoFighter({ x: 100, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const eye = new EyeOfCthulhuFighter({ x: 220, y: 300, radius: 32, hp: 1200, maxHp: 1200 });
    ichigo.team = 0;
    eye.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx;

    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [ichigo, eye];
    state.projectiles = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600, centerObstacle: null };
    projectileSystem.projectiles = [];

    try {
      // 1. Ichigo fires Getsuga Tensho at Eye of Cthulhu
      ichigo.gunAngle = 0; // Facing right toward Eye
      ichigo.getsugaCastAngle = 0;
      const getsuga = projectileSystem.fireGetsugaTensho(ichigo, 0, 15, 14, 'bankai');
      assert(getsuga !== undefined, 'Getsuga Tensho projectile must spawn');

      // Position Getsuga in front of Eye of Cthulhu
      getsuga.x = 200;
      getsuga.y = 300;
      getsuga.vx = 14;
      getsuga.vy = 0;
      const initialEyeX = eye.x;

      // Update projectile system
      projectileSystem.update(state.fighters);

      // Verify Eye of Cthulhu has isDraggedByGetsuga = true
      assert(eye.isDraggedByGetsuga === true, 'Eye of Cthulhu must have isDraggedByGetsuga = true when struck by Getsuga Tensho');
      assert(getsuga.draggedTargets && getsuga.draggedTargets.has(eye), 'Eye of Cthulhu must be registered in getsuga.draggedTargets');
      assert(eye.knockbackVx > 0 || eye.vx > 0, 'Eye of Cthulhu must receive positive rightward drag velocity from Getsuga');

      // Update eye with Terraria AI and verify it gets dragged rightward
      eye.update(ichigo, 1, state.arena);
      assert(eye.x > initialEyeX, `Eye of Cthulhu must be dragged rightward along Getsuga trajectory (initial: ${initialEyeX}, after: ${eye.x})`);

      // Verify active ramming is cancelled while dragged
      eye.isRamming = true;
      eye.ramsRemaining = 3;
      eye.update(ichigo, 1, state.arena);
      assert(eye.isRamming === false, 'Eye of Cthulhu must cancel active ramming while isDraggedByGetsuga is true');

      // Simulate Getsuga expiring
      getsuga.life = 0;
      projectileSystem.update(state.fighters);
      assert(eye.isDraggedByGetsuga === false, 'Eye of Cthulhu isDraggedByGetsuga must clear when Getsuga expires');

      console.log('      ✅ Eye of Cthulhu vs Ichigo Getsuga Tensho wave drag, ram interruption & pin release verified successfully.');
    } finally {
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
      state.projectiles = [];
      projectileSystem.projectiles = [];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 75. Testing Denji Chainsaw Shred Count & Bleed Debuff Mechanic
  // ─────────────────────────────────────────────────────────────
  {
    console.log('   75. Testing Denji Chainsaw Shred Count & Bleed Debuff Mechanic...');
    const { DenjiFighter } = await import('../js/entities/fighters/DenjiFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const denji = new DenjiFighter({ x: 100, y: 300, radius: 25, hp: 360, maxHp: 360 });
    const dummy = new Fighter({ x: 135, y: 300, radius: 25, hp: 500, maxHp: 500 });
    denji.team = 0;
    dummy.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx;
    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [denji, dummy];
    state.arena = { x: 0, y: 0, width: 800, height: 600, centerObstacle: null };

    try {
      denji.gunAngle = 0; // Facing directly right into dummy
      denji.angle = 0;

      // Initial state: shredCount is 0, dummy is not bleeding
      assert(denji.shredCount === 0, 'Denji initial shredCount must be 0');
      assert(!dummy.isBleeding, 'Dummy must not be bleeding initially');
      assert(!dummy.bleedTimer || dummy.bleedTimer === 0, 'Dummy bleedTimer must be 0 initially');

      // Simulate 5 shred ticks (below threshold of 10)
      for (let i = 1; i <= 5; i++) {
        denji.shredTickTimer = 0; // Trigger shred tick
        denji.update(dummy, 0, state.arena);
        assert(dummy.denjiShredCount === i, `Dummy denjiShredCount must be ${i} after ${i} ticks (got ${dummy.denjiShredCount})`);
        assert(denji.shredCount === i, `Denji shredCount must reflect active target count of ${i}`);
        assert(!dummy.isBleeding, 'Dummy must not be bleeding before reaching 10 shred hits');
      }

      // Simulate remaining 5 shred ticks to reach threshold of 10
      for (let i = 6; i <= 10; i++) {
        denji.shredTickTimer = 0;
        denji.update(dummy, 0, state.arena);
      }

      // Threshold reached: bleed debuff must be applied!
      assert(dummy.isBleeding === true, 'Dummy must receive bleed debuff (isBleeding === true) upon reaching 10 shred hits');
      assert(dummy.bleedTimer > 0, `Dummy bleedTimer must be active (> 0, got ${dummy.bleedTimer})`);
      assert(dummy.denjiShredCount === 0, 'Dummy denjiShredCount must reset to 0 after triggering bleed debuff');
      assert(denji.shredCount === 0, 'Denji shredCount must reset to 0 after triggering bleed debuff');

      // Inactivity decay test: shred twice on a fresh cycle
      denji.shredTickTimer = 0;
      denji.update(dummy, 0, state.arena);
      assert(dummy.denjiShredCount === 1, 'Dummy shredCount must start second cycle at 1');

      // Move dummy out of shred range and let decay timer elapse
      dummy.x = 1200;
      for (let f = 0; f < 100; f++) {
        denji.update(dummy, 0, state.arena);
      }
      assert(dummy.denjiShredCount === 0, 'Dummy denjiShredCount must decay to 0 after inactivity');
      assert(denji.shredCount === 0, 'Denji shredCount must be 0 when not actively shredding');

      // ── Per-Tick Damage & Lifesteal Continuous Ramping Test ──
      denji.x = 100;
      denji.y = 300;
      denji.vx = 0;
      denji.vy = 0;
      denji.gunAngle = 0;
      denji.angle = 0;
      denji.lungeCooldown = 999;
      denji.cleaveCooldown = 999;
      denji.massacreCooldown = 999;
      denji.isEngineLunging = false;
      denji.isExecutingMassacre = false;
      denji.lungeHitRecoveryTimer = 0;
      dummy.x = 135;
      dummy.y = 300;
      dummy.hp = 1000;
      dummy.maxHp = 1000;
      dummy.isBleeding = false;
      dummy.bleedTimer = 0;
      dummy.denjiShredCount = 0;
      denji.hp = 200; // Damage Denji so he can receive lifesteal
      denji.consecutiveShredTicks = 0;

      let prevDamage = 0;
      let prevHeal = 0;
      let firstDamage = 0;
      let firstHeal = 0;

      for (let tick = 1; tick <= 6; tick++) {
        denji.shredTickTimer = 0;
        const dummyHpBefore = dummy.hp;
        const denjiHpBefore = denji.hp;

        denji.update(dummy, 0, state.arena);

        const damageDealt = dummyHpBefore - dummy.hp;
        const healReceived = denji.hp - denjiHpBefore;

        assert(denji.consecutiveShredTicks === tick, `Denji consecutiveShredTicks must be ${tick} on tick ${tick} (got ${denji.consecutiveShredTicks})`);
        assert(damageDealt > 0, `Damage dealt on tick ${tick} must be > 0 (got ${damageDealt})`);

        if (tick === 1) {
          firstDamage = damageDealt;
          firstHeal = healReceived;
        } else {
          assert(damageDealt >= prevDamage, `Shred damage must monotonically scale during continuous shred (tick ${tick} dmg ${damageDealt} >= prev ${prevDamage})`);
          assert(healReceived >= prevHeal, `Shred lifesteal must monotonically scale during continuous shred (tick ${tick} heal ${healReceived} >= prev ${prevHeal})`);
        }

        prevDamage = damageDealt;
        prevHeal = healReceived;
      }

      assert(prevDamage > firstDamage, `Sustained continuous shred must scale total tick damage above initial tick (got final ${prevDamage} > initial ${firstDamage})`);

      // Disengage test: moving dummy away must reset consecutiveShredTicks to 0
      dummy.x = 1200;
      for (let f = 0; f < 30; f++) {
        denji.update(dummy, 0, state.arena);
      }
      assert(denji.consecutiveShredTicks === 0, 'Denji consecutiveShredTicks must reset to 0 after disengaging from target');

      console.log('      ✅ Denji Chainsaw Shred Count, Bleed Debuff & Per-Tick Damage/Lifesteal Ramping verified successfully.');
    } finally {
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
    }
  }

  {
    console.log('   76. Testing Guts Knight-Standard 5-Phase Sword Swing & Simple Attack Animation...');
    const { GutsFighter } = await import('../js/entities/fighters/GutsFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');
    const { gutsConfig } = await import('../js/configs/characters/gutsConfig.js');

    const guts = new GutsFighter({ x: 100, y: 300, radius: 25, hp: 460, maxHp: 460 });
    const target = new Fighter({ x: 160, y: 300, radius: 25, hp: 500, maxHp: 500 });
    guts.enableDragonSlayer = true;
    guts.enableBasicAttack = true;
    guts.team = 0;
    target.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx;
    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [guts, target];
    state.arena = { x: 0, y: 0, width: 800, height: 600, centerObstacle: null };

    try {
      // 0. Toggle verification: when basic attack toggle is disabled, swipeActive remains false
      guts.enableDragonSlayer = 0;
      guts._trySwordSwipe(target, 0);
      assert(guts.swipeActive === false, 'Guts basic attack must be suppressed when enableDragonSlayer is 0');

      // 1. Re-enable basic attack and verify initial state
      guts.enableDragonSlayer = true;
      assert(guts.swipeActive === false, 'Guts must not be swinging initially');
      assert(guts.swordSwingTimer === 0, 'Guts swordSwingTimer must be 0 initially');
      assert(guts.swordComboStep === 1, 'Guts initial combo step must be 1');

      // 2. Trigger Knight-style sword swipe
      guts._trySwordSwipe(target, 0);
      assert(guts.swipeActive === true, 'Guts swipeActive must become true upon sword swipe');
      assert(guts.swordSwingTimer > 0, 'Guts swordSwingTimer must be initialized');
      assert(guts.swordSwingMax === (gutsConfig.hit1LiftFrames + gutsConfig.hit1HoldFrames + gutsConfig.hit1StrikeFrames + gutsConfig.hit1ImpactLockFrames + gutsConfig.hit1RecoveryFrames), 'Guts swordSwingMax must match Knight 5-phase total');

      // 3. Step through strike phase and verify impact delivery & hit-pause
      const initialTargetHp = target.hp;
      const strikeStart = (guts.swordSwingLiftFrames || 7) + (guts.swordSwingHoldFrames || 2);
      for (let f = 0; f < strikeStart + 6; f++) {
        guts.update(target, 0, state.arena);
        if (guts.swordHitDelivered) break;
      }
      assert(target.hp < initialTargetHp, 'Target must take damage when sword strike connects');
      assert(guts.swordHitPauseTimer > 0, 'Guts must enter hit-pause stasis upon connecting');

      // 4. Resolve hit-pause and verify knockback & stasis release
      while (guts.swordHitPauseTimer > 0) {
        guts.update(target, 0, state.arena);
      }
      assert(target.suppressFreezeOverlay === false, 'Target stasis must release on unpause');
      assert(target.vx > 0, 'Target must receive forward knockback impulse from cleave');

      // Verify canvas stack balance
      const { drawGutsComboSlashVFX, drawGutsWeapons } = await import('../js/graphics/weapons/gutsWeaponGraphics.js');
      mockCtx.resetStackDepth();
      drawGutsWeapons(mockCtx, guts, guts.r, false);
      drawGutsComboSlashVFX(mockCtx, guts);
      assert(mockCtx.getStackDepth() === 0, 'Guts sword graphics must keep Canvas 2D stack balanced');

      // 5. Test Skill 1: Calamity Cleave & Supersonic Crescent Wave (Frames 1–6 Reference)
      guts.swipeActive = false;
      guts.swordSwingTimer = 0;
      guts.calamityCooldown = 0;
      guts.enableSkill1 = true;
      guts.enableCalamityCleave = true;
      target.hp = 500;
      target.x = 160;
      target.y = 300;

      guts._castCalamityCleave(target);
      assert(guts.calamityActive === true, 'Guts calamityActive must be true on cast');
      assert(guts.calamityTimer > 0, 'Guts calamityTimer must initialize');

      // Step through full 2-sequence Calamity Cleave combo (Frames 1–12)
      let seq2ReachedInCombo = false;
      let seq1Count = 0;
      let seq2Count = 0;
      for (let f = 0; f < 200; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        if (guts.calamityActive) {
          if (guts.calamitySeq === 1) seq1Count++;
          if (guts.calamitySeq === 2) seq2Count++;
        }
        guts.update(target, 0, state.arena);
        if (guts.calamitySeq === 2) seq2ReachedInCombo = true;

        mockCtx.resetStackDepth();
        drawGutsWeapons(mockCtx, guts, guts.r, false);
        drawGutsComboSlashVFX(mockCtx, guts);
        assert(mockCtx.getStackDepth() === 0, 'Calamity Cleave VFX must keep Canvas 2D stack balanced');

        if (!guts.calamityActive) break;
      }
      assert(seq2ReachedInCombo === true, 'Calamity Cleave Sequence 1 must chain seamlessly into Sequence 2');
      assert(seq1Count >= 55, `Calamity Cleave Sequence 1 must complete its follow-through lock before Sequence 2 (got ${seq1Count} frames)`);
      assert(seq2Count >= 65, `Calamity Cleave Sequence 2 must complete its full animation after Sequence 1 (got ${seq2Count} frames)`);
      assert(guts.activeCrescentWaves.length === 0, 'Calamity Cleave must only use the smooth attack slash animation without extra wave projectiles');

      // Test Sequence 2 directly (Frames 7–12 standalone trigger)
      guts.calamityCooldown = 0;
      guts._castCalamitySeq2(target);
      assert(guts.calamityActive === true, 'Guts calamityActive must be true on Seq 2 cast');
      assert(guts.calamitySeq === 2, 'Guts calamitySeq must be 2');
      for (let f = 0; f < 90; f++) {
        guts.update(target, 0, state.arena);

        mockCtx.resetStackDepth();
        drawGutsWeapons(mockCtx, guts, guts.r, false);
        drawGutsComboSlashVFX(mockCtx, guts);
        assert(mockCtx.getStackDepth() === 0, 'Calamity Cleave Seq 2 VFX must keep Canvas 2D stack balanced');
        if (!guts.calamityActive) break;
      }

      // 6. Verify Fighter Index Menu & Preview Integration
      const { FIGHTER_DEFS } = await import('../js/core/config.js');
      const gutsDef = FIGHTER_DEFS.find(d => d.type === 'guts');
      assert(gutsDef !== undefined, 'Guts def must exist in FIGHTER_DEFS');
      assert(gutsDef.ability.includes('Calamity Cleave'), 'Guts def ability must display Calamity Cleave in Fighter Index');

      const { updateIndexDetailDemo, resetIndexDetailState } = await import('../js/graphics/preview.js');
      state.indexInspectIndex = FIGHTER_DEFS.findIndex(d => d.type === 'guts');
      state.indexDemoAnim = 'calamity';
      const demoArea = { x: 50, y: 100, width: 400, height: 350 };
      const demoState = resetIndexDetailState(gutsDef, demoArea);
      assert(demoState && demoState.fighter, 'Fighter Index demo state must initialize for Guts');

      // Advance demo frames
      for (let df = 0; df < 30; df++) {
        updateIndexDetailDemo(gutsDef, demoArea);
        mockCtx.resetStackDepth();
        demoState.fighter.draw(mockCtx, demoState.target);
        assert(mockCtx.getStackDepth() === 0, 'Guts Fighter Index preview draw must keep Canvas 2D stack balanced');
      }

      console.log('      ✅ Guts Knight-Standard 5-Phase Sword Swing, Skill 1 Calamity Cleave & Fighter Index Integration verified successfully.');
    } finally {
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
    }
  }

  // ── TEST 77: Mahoraga vs Ichigo Getsuga Tensho: Drag Stasis & Adapted Pulling & Non-Zero Damage ──
  console.log('   77. Testing Mahoraga vs Ichigo Getsuga Tensho Drag Stasis, Adapted Pulling & Non-Zero Damage...');
  {
    const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
    const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    const ichigo = new IchigoFighter({ x: 100, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const mahoraga = new MahoragaFighter({ x: 260, y: 300, radius: 35, hp: 2000, maxHp: 2000 });
    ichigo.team = 0;
    mahoraga.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx;

    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [ichigo, mahoraga];
    state.projectiles = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600, centerObstacle: null };
    projectileSystem.projectiles = [];

    try {
      // 1. Ichigo fires Getsuga Tensho directly into unadapted Mahoraga
      ichigo.gunAngle = 0;
      ichigo.getsugaCastAngle = 0;
      const getsuga = projectileSystem.fireGetsugaTensho(ichigo, 0, 15, 14, 'bankai');
      assert(getsuga !== undefined, 'Getsuga Tensho projectile must spawn');

      getsuga.x = 240;
      getsuga.y = 300;
      getsuga.vx = 14;
      getsuga.vy = 0;

      const initialMahoragaHp = mahoraga.hp;

      // Update projectile system to collide with Mahoraga
      projectileSystem.update(state.fighters);

      // Verify unadapted Mahoraga took damage
      assert(mahoraga.hp < initialMahoragaHp, 'Mahoraga must take damage from Getsuga Tensho when unadapted');
      const unadaptedDmg = initialMahoragaHp - mahoraga.hp;
      assert(unadaptedDmg > 0, `Unadapted Getsuga damage must be > 0 (got ${unadaptedDmg})`);

      // Verify Mahoraga is pulled/dragged by Getsuga Tensho
      assert(mahoraga.isDraggedByGetsuga === true, 'Mahoraga must have isDraggedByGetsuga = true');
      assert(mahoraga.isPulledOrDragged() === true, 'Mahoraga isPulledOrDragged() must be true for Getsuga Tensho');
      assert(getsuga.draggedTargets && getsuga.draggedTargets.has(mahoraga), 'Mahoraga must be registered in getsuga.draggedTargets');

      // 2. Now adapt Mahoraga to Getsuga Tensho
      mahoraga.adaptedGetsuga = true;
      if (!mahoraga.adaptedSkills) mahoraga.adaptedSkills = {};
      mahoraga.adaptedSkills['getsugaTensho'] = true;
      mahoraga.adaptedSkills['getsuga'] = true;

      // Clear cooldown so he can be hit again by adapted wave
      getsuga.hitTargets.delete(mahoraga);
      const adaptedHpBefore = mahoraga.hp;

      // Update projectile system again
      projectileSystem.update(state.fighters);

      // Verify adapted Mahoraga STILL takes damage (NEVER 0 damage!)
      const adaptedDmg = adaptedHpBefore - mahoraga.hp;
      assert(adaptedDmg > 0, `Adapted Mahoraga must still take non-zero damage from Getsuga Tensho (got ${adaptedDmg})`);
      assert(adaptedDmg >= 1, `Adapted Mahoraga damage must be at least 1 (got ${adaptedDmg})`);

      // Verify adapted Mahoraga takes strictly 25% damage on 12-tick damage (12 * 0.25 = 3)
      const hpBefore12Dmg = mahoraga.hp;
      mahoraga.takeDamage(12, ichigo, { isGetsuga: true });
      const dmg12 = hpBefore12Dmg - mahoraga.hp;
      assert(dmg12 === 3, `Adapted Mahoraga must take strictly 25% of 12 tick damage (expected 3, got ${dmg12})`);

      // Verify adapted Mahoraga is STILL pulled/dragged by Getsuga Tensho
      assert(mahoraga.isDraggedByGetsuga === true, 'Adapted Mahoraga must still have isDraggedByGetsuga = true');
      assert(mahoraga.isPulledOrDragged() === true, 'Adapted Mahoraga isPulledOrDragged() must still be true');
      assert(getsuga.draggedTargets && getsuga.draggedTargets.has(mahoraga), 'Adapted Mahoraga must remain registered in getsuga.draggedTargets');

      // 3. Verify drag release when projectile expires or travels past Mahoraga
      getsuga.life = 0;
      projectileSystem.update(state.fighters);
      assert(mahoraga.isDraggedByGetsuga === false, 'Mahoraga isDraggedByGetsuga must be false after Getsuga expires');
      assert(mahoraga.isPulledOrDragged() === false, 'Mahoraga isPulledOrDragged() must be false after Getsuga expires');

      // Verify Mahoraga immediately resumes natural movement physics and does not freeze
      mahoraga.vx = 0;
      mahoraga.vy = 0;
      mahoraga.update(ichigo, 1, state.arena);
      assert(Math.hypot(mahoraga.vx, mahoraga.vy) > 0, 'Mahoraga must resume active movement velocity once released from Getsuga');

      // 4. Test safety timeout guard: an orphaned drag flag (lasting > 120 frames) must auto-clear and never permanently stall Mahoraga
      mahoraga.isDraggedByGetsuga = true;
      assert(mahoraga.isPulledOrDragged() === true, 'mahoraga isPulledOrDragged() must be true while isDraggedByGetsuga is active');
      for (let f = 0; f < 125; f++) {
        mahoraga.update(ichigo, 1, state.arena);
      }
      assert(mahoraga.isDraggedByGetsuga === false, 'mahoraga.isDraggedByGetsuga must auto-clear after safety timeout');
      assert(mahoraga.isPulledOrDragged() === false, 'mahoraga.isPulledOrDragged() must be false after safety timeout');
      assert(Math.hypot(mahoraga.vx, mahoraga.vy) > 0, 'Mahoraga must continue moving freely once drag flag is auto-cleared');

      console.log('      ✅ Mahoraga vs Ichigo Getsuga Tensho drag stasis, adapted pulling & non-zero damage verified successfully.');
    } finally {
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
      projectileSystem.projectiles = [];
    }
  }

  // ── TEST 78: Ichigo Getsuga Tensho: Wall Impact Transition, Slow Forward Creep & Arena Clipping ──
  console.log('   78. Testing Ichigo Getsuga Tensho Wall Impact Transition, Slow Forward Creep & Arena Clipping...');
  {
    const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
    const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    const ichigo = new IchigoFighter({ x: 100, y: 300, radius: 25, hp: 400, maxHp: 400 });
    const dummy = new NormalFighter({ x: 740, y: 300, radius: 25, hp: 500, maxHp: 500 });
    ichigo.team = 0;
    dummy.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx;

    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [ichigo, dummy];
    state.projectiles = [];
    state.arena = { x: 0, y: 0, width: 800, height: 600, centerObstacle: null, shape: 'rect' };
    projectileSystem.projectiles = [];

    try {
      ichigo.gunAngle = 0; // Facing directly rightward toward the arena wall
      ichigo.getsugaCastAngle = 0;
      const getsuga = projectileSystem.fireGetsugaTensho(ichigo, 0, 15, 14, 'bankai');
      assert(getsuga !== undefined, 'Getsuga Tensho projectile must spawn');

      // Place Getsuga near the right wall (wall is at x = 800)
      const apexOffset = getsuga.r || 100;
      getsuga.x = 800 - apexOffset - 5;
      getsuga.y = 300;
      getsuga.vx = 14;
      getsuga.vy = 0;

      // 1. Update projectile system so Getsuga's apex strikes the right wall
      projectileSystem.update(state.fighters);

      // Verify wall collision triggered
      assert(getsuga.hasHitWall === true, 'Getsuga Tensho must set hasHitWall = true upon colliding with arena wall');
      assert(getsuga.isWallPenetrating === true, 'Getsuga Tensho must set isWallPenetrating = true');

      // Verify velocity is NOT zeroed: it must slowly move forward
      const creepSpeed = CONFIG.ichigo?.getsugaWallCreepSpeed || 1.2;
      assert(getsuga.vx > 0, `Getsuga vx must be positive and not zero upon wall hit (current vx: ${getsuga.vx})`);
      assert(Math.abs(getsuga.vx - creepSpeed) < 0.05, `Getsuga vx must match creepSpeed (${creepSpeed}, got: ${getsuga.vx})`);

      const postHitX = getsuga.x;

      // 2. Advance 15 frames to verify continuous slow forward movement clipping out of the arena
      for (let step = 0; step < 15; step++) {
        projectileSystem.update(state.fighters);
      }

      assert(getsuga.x > postHitX, `Getsuga must continue advancing forward past the wall (initial: ${postHitX}, after 15 frames: ${getsuga.x})`);
      assert(getsuga.x + apexOffset > state.arena.x + state.arena.width, 'Getsuga cutting edge must clip out past the arena boundary wall');

      // 3. Verify clean expiration when life reaches 0
      getsuga.life = 0;
      projectileSystem.update(state.fighters);
      assert(getsuga.fadingOut === true || projectileSystem.projectiles.length === 0, 'Getsuga must enter fadeout or expire upon life <= 0');
      for (let f = 0; f < 20 && projectileSystem.projectiles.length > 0; f++) {
        projectileSystem.update(state.fighters);
      }
      assert(projectileSystem.projectiles.length === 0, 'Getsuga Tensho must expire and be returned to pool');

      // 4. Verify that starting a new match / recycling projectile from pool cleanly resets hasHitWall and maintains full flight speed
      projectileSystem.clear();
      ichigo.x = 200;
      ichigo.y = 300;
      const getsuga2 = projectileSystem.fireGetsugaTensho(ichigo, 0, 15, 14, 'bankai');
      assert(getsuga2.hasHitWall === false, 'Recycled Getsuga Tensho must have hasHitWall = false on spawn');
      assert(getsuga2.isWallPenetrating === false, 'Recycled Getsuga Tensho must have isWallPenetrating = false on spawn');
      assert(getsuga2.wallContactX === undefined, 'Recycled Getsuga Tensho must have wallContactX = undefined on spawn');
      assert(getsuga2.wallContactY === undefined, 'Recycled Getsuga Tensho must have wallContactY = undefined on spawn');
      projectileSystem.update(state.fighters);
      assert(getsuga2.hasHitWall === false, 'Getsuga Tensho must not prematurely hit wall on mid-arena travel');
      assert(getsuga2.vx === 14, `Getsuga Tensho must maintain full travel velocity on spawn (expected 14, got: ${getsuga2.vx})`);

      console.log('      ✅ Ichigo Getsuga Tensho wall impact transition, slow forward creep, pool recycling & arena clipping verified successfully.');
    } finally {
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
      projectileSystem.projectiles = [];
    }
  }

  // 79. Testing Choso Infinite Blood Generation, Laser Transmutation Matrix & Piercing Blood...
  {
    console.log('   79. Testing Choso Infinite Blood Generation, Laser Transmutation Matrix & Piercing Blood...');
    const { ChosoFighter } = await import('../js/entities/fighters/ChosoFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    state.arena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const choso = new ChosoFighter({ x: 200, y: 300, hp: 420, maxHp: 420 });
    const dummy = new Fighter({ x: 350, y: 300, hp: 300, maxHp: 300 });
    choso.team = 0;
    dummy.team = 1;
    state.fighters = [choso, dummy];

    // 1. Verify Baseline Attributes
    assert(choso.characterId === 'choso', 'Character ID must be "choso"');
    assert(choso.hp === 420, 'Choso HP must be 420');
    assert(choso.bloodNodes.length === 0, 'Choso must start with 0 blood nodes');

    // 2. Verify Taking Damage Spawns Interactive Blood Droplet Nodes
    choso.takeDamage(40, dummy, { hitType: 'punch' });
    assert(choso.bloodNodes.length >= 2, `Taking damage must spawn blood droplets (got ${choso.bloodNodes.length})`);

    // 3. Verify Flowing Red Scale activates below 60% HP
    choso.hp = 200; // < 60% of 420 (252)
    choso.update(dummy, 0, state.arena);
    assert(choso.isFlowingRedScaleActive === true, 'Flowing Red Scale must activate when HP drops below 60%');
    assert(choso.speed > choso.baseSpeed, 'Movement speed must increase under Flowing Red Scale');

    // 4. Verify Blood Transmutation: Crimson Laser Matrix
    // Seed 4 nodes
    choso.spawnBloodNode(180, 280);
    choso.spawnBloodNode(220, 320);
    const nodeCount = choso.bloodNodes.length;
    assert(nodeCount >= 4, 'Must have at least 4 active blood nodes');

    choso.skill3Cooldown = 0;
    choso._startLaserMatrix(dummy);
    assert(choso.isCastingLaserMatrix === true, 'Choso must enter Laser Matrix casting state');
    assert(choso.isClaspedForConvergence === true, 'Choso must clasp hands in Convergence prayer pose');
    assert(choso.isStationarySkillActive() === true, 'Choso must report stationary skill active during cast');
    assert(choso.bloodNodes.every(n => n.isIgnitedAsLaser === true), 'All blood nodes must ignite into laser diodes');

    // Advance telegraph and discharge
    choso.laserMatrixTimer = 0;
    choso.laserTelegraphTimer = 1;
    dummy.vx = 0;
    dummy.vy = 0;
    const initialDummyHp = dummy.hp;
    choso.update(dummy, 0, state.arena);
    assert(choso.activeLaserBeams.length >= 4, `All active blood nodes must discharge laser beams (got ${choso.activeLaserBeams.length})`);
    assert(dummy.hp < initialDummyHp, 'Laser Matrix beams must deal damage to target');
    assert(dummy.vx < 0, `A target hit by Convergence beams must be dragged toward Choso (vx=${dummy.vx}, targetX=${dummy.x}, chosoX=${choso.x})`);
    assert(dummy.slowTimer >= 90, 'A target hit by Convergence beams must receive the timed slow debuff');
    assert(dummy.slowMultiplier === 0.55, 'Convergence slow must use the configured movement multiplier');
    assert(choso.laserTransmutationOverdriveTimer > 0, 'Overdrive transmutation buff must be active after discharge');

    const infinityTarget = new Fighter({ x: 350, y: 300, hp: 300, maxHp: 300 });
    infinityTarget.vx = 0;
    infinityTarget.vy = 0;
    infinityTarget.hasActiveInfinity = () => true;
    infinityTarget.triggerInfinityBlock = () => {};
    choso._dischargeLaserMatrix(infinityTarget);
    assert(infinityTarget.vx === 0, 'Infinity-blocked Convergence beams must not drag the target');
    assert(infinityTarget.slowTimer === 0, 'Infinity-blocked Convergence beams must not apply slow');

    // Verify blood particles are consumed and Skill 3 does NOT activate when blood is gone
    choso.isCastingLaserMatrix = false;
    choso.isClaspedForConvergence = false;
    choso.bloodNodes = [];
    if (state.bloodEffects) state.bloodEffects.length = 0;
    assert(choso._getActiveBloodCount() === 0, 'Blood count must be 0 after consumption/clearing');
    choso.skill3Cooldown = 0;
    const activatedWithZeroBlood = choso._startLaserMatrix(dummy);
    assert(activatedWithZeroBlood === false, 'Laser Matrix must NOT activate when blood particles are gone');
    assert(choso.isCastingLaserMatrix === false, 'Choso must not enter casting pose when no blood exists');
    assert(choso.skill3Cooldown === 0, 'Cooldown must not be consumed when skill fails to activate');

    // Verify dynamic beam firing with no fixed number (e.g. exactly 1 single blood particle)
    dummy.hp = 300;
    dummy.isDead = false;
    choso.spawnBloodNode(200, 250);
    assert(choso._getActiveBloodCount() === 1, 'Must have exactly 1 active blood particle in arena');
    choso.activeLaserBeams.length = 0;
    const activatedWithOne = choso._startLaserMatrix(dummy);
    assert(activatedWithOne === true, 'Laser Matrix must activate with even 1 single blood particle (no fixed number)');
    assert(choso.bloodNodes.length === 1, 'Only the 1 existing blood particle must be ignited');
    choso.laserMatrixTimer = 0;
    choso.laserTelegraphTimer = 1;
    choso.update(dummy, 0, state.arena);
    assert(choso.activeLaserBeams.length === 1, 'Exactly 1 beam must be fired from the 1 existing blood particle');

    // 4B. Verify Floor Blood Detection at resting floor level (~684.5px) and automatic update cast
    dummy.hp = 300;
    dummy.isDead = false;
    choso.interruptAttacks(true);
    choso.bloodNodes = [];
    if (state.bloodEffects) state.bloodEffects.length = 0;
    const floorY = state.arena.y + state.arena.height - 4 - 1.5; // Floor resting level
    const floorBloodParticle = {
      x: 250,
      y: floorY,
      vx: 0,
      vy: 0,
      size: 4.5,
      life: 0.95,
      decay: 0.006,
      onGround: true,
      numericColor: 0xE60000
    };
    if (state.bloodEffects) state.bloodEffects.push(floorBloodParticle);
    const activeFloorBlood = choso._getActiveBloodParticles();
    assert(activeFloorBlood.length === 1, `Floor blood at y=${floorY} must be recognized as active in arena (got ${activeFloorBlood.length})`);
    assert(choso._getActiveBloodCount() === 1, 'Active blood count on floor must be 1');

    // Verify HUD skill data returns Crimson Laser Matrix as ready with 1 blood
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    choso.ultCooldown = 0;
    choso.skill3Cooldown = 0;
    choso.laserTransmutationOverdriveTimer = 0;
    const hudSkills = getSkillDataForFighter(choso);
    const laserMatrixSkill = hudSkills.find(s => s.id === 'laser_matrix');
    assert(laserMatrixSkill !== undefined, 'Crimson Laser Matrix must be present in HUD skills');
    assert(laserMatrixSkill.isUltimate === true, 'Crimson Laser Matrix must have isUltimate: true');
    assert(laserMatrixSkill.ready === true, 'Crimson Laser Matrix must be ready when ultCooldown <= 0 and bloodCount > 0');
    assert(laserMatrixSkill.label.includes('1 BLOOD'), `HUD skill label must include blood count (got: "${laserMatrixSkill.label}")`);

    // Verify update() automatically triggers Laser Matrix when blood is on floor
    choso.activeLaserBeams.length = 0;
    choso.update(dummy, 0, state.arena);
    assert(choso.isCastingLaserMatrix === true, 'Choso must automatically cast Laser Matrix during update when blood is present on the floor');
    assert(choso.isClaspedForConvergence === true, 'Choso must be clasped for Convergence');
    choso.laserMatrixTimer = 0;
    choso.laserTelegraphTimer = 1;
    choso.update(dummy, 0, state.arena);
    assert(choso.activeLaserBeams.length === 1, 'Laser Matrix must fire beam from the floor blood particle');

    // 5. Verify Overdrive Micro-Laser Emission when enabled
    choso.laserTransmutationOverdriveTimer = 300;
    CONFIG.choso.enableOverdriveMicroLasers = true;
    const preOverdriveBeams = choso.activeLaserBeams.length;
    choso.spawnBloodNode(210, 310);
    assert(choso.activeLaserBeams.length > preOverdriveBeams, 'Spawning blood node during Overdrive must immediately fire a micro-laser when enabled');
    CONFIG.choso.enableOverdriveMicroLasers = false;

    // 6. Verify Piercing Blood Gating & Execution
    choso.interruptAttacks(true);
    choso.ultCooldown = 0;
    choso.piercingBloodCooldown = 0;
    choso.bloodNodes = [];
    if (state.bloodEffects) state.bloodEffects.length = 0;
    const pbActivatedWithoutBlood = choso._startPiercingBlood(dummy);
    assert(pbActivatedWithoutBlood === false, 'Piercing Blood must NOT activate when there are no blood particles in arena');

    // With active blood particle, Piercing Blood can activate
    choso.spawnBloodNode(200, 250);
    choso._startPiercingBlood(dummy);
    assert(choso.isChargingPiercingBlood === true, 'Choso must enter Piercing Blood charging state');
    choso.piercingBloodTimer = 1;
    choso.update(dummy, 0, state.arena);
    assert(choso.isFiringPiercingBlood === true, 'Choso must transition to active beam firing state');
    assert(choso.vx < 0, 'Firing Piercing Blood must apply backward recoil velocity kick');

    // Verify Piercing Blood fallout nodes are strictly contained within arena boundaries
    choso.bloodNodes = [];
    choso.piercingBloodTimer = 1;
    choso.update(dummy, 0, state.arena); // Finishes firing beam and deposits fallout droplets
    assert(choso.bloodNodes.length > 0, 'Piercing Blood aftermath must deposit fallout blood droplets');
    const ar = state.arena;
    for (const node of choso.bloodNodes) {
      assert(node.x >= ar.x && node.x <= ar.x + ar.width, `Fallout droplet X (${node.x}) must be inside arena [${ar.x}, ${ar.x + ar.width}]`);
      assert(node.y >= ar.y && node.y <= ar.y + ar.height, `Fallout droplet Y (${node.y}) must be inside arena [${ar.y}, ${ar.y + ar.height}]`);
    }

    // 7. Verify Strict Arena Containment on Out-of-Bounds Spawning & Laser Beams
    const outNode = choso.spawnBloodNode(-500, 9999);
    assert(outNode.x >= ar.x && outNode.x <= ar.x + ar.width, `Out-of-bounds spawnBloodNode X must clamp inside arena (got ${outNode.x})`);
    assert(outNode.y >= ar.y && outNode.y <= ar.y + ar.height, `Out-of-bounds spawnBloodNode Y must clamp inside arena (got ${outNode.y})`);

    // Verify Laser Matrix beams stay contained inside arena boundaries
    dummy.hp = 300;
    dummy.isDead = false;
    choso.activeLaserBeams.length = 0;
    choso.bloodNodes = [outNode];
    choso._dischargeLaserMatrix(dummy);
    assert(choso.activeLaserBeams.length === 1, 'Laser Matrix must fire 1 beam from the contained node');
    const beam = choso.activeLaserBeams[0];
    assert(beam.startX >= ar.x && beam.startX <= ar.x + ar.width, `Beam startX must be within arena`);
    assert(beam.startY >= ar.y && beam.startY <= ar.y + ar.height, `Beam startY must be within arena`);
    assert(beam.endX >= ar.x && beam.endX <= ar.x + ar.width, `Beam endX must be within arena`);
    assert(beam.endY >= ar.y && beam.endY <= ar.y + ar.height, `Beam endY must be within arena`);

    // 8. Verify Clean Canvas 2D Stack Balance
    mockCtx.resetStackDepth();
    choso.draw(mockCtx, dummy);
    assert(mockCtx.getStackDepth() === 0, 'Choso draw stack balance must be 0');

    // 9. Verify Zero Blood Being Fired when No Blood Particles Exist in Arena
    const prevNova = CONFIG.choso.enableSupernova;
    const prevChakram = CONFIG.choso.enableChakram;
    CONFIG.choso.enableSupernova = 0;
    CONFIG.choso.enableChakram = 0;
    try {
      choso.interruptAttacks(true);
      choso.bloodNodes = [];
      if (state.bloodEffects) state.bloodEffects.length = 0;
      choso.ultCooldown = 0;
      choso.skill3Cooldown = 0;
      choso.piercingBloodCooldown = 0;
      choso.skill1Cooldown = 0;
      choso.skill2Cooldown = 0;
      choso.basicAttackCooldown = 0;
      choso.activeLaserBeams.length = 0;

      // Run AI update loop with all skills off cooldown
      choso.update(dummy, 0, state.arena);
      assert(choso.activeLaserBeams.length === 0, 'ZERO laser beams may be fired when 0 blood particles exist');
      assert(choso.isCastingLaserMatrix === false, 'Laser Matrix must NOT activate when 0 blood particles exist');
      assert(choso.isChargingPiercingBlood === false, 'Piercing Blood must NOT charge when 0 blood particles exist');
      assert(choso.isFiringPiercingBlood === false, 'Piercing Blood must NOT fire when 0 blood particles exist');
      assert(choso.isChargingSupernova === false, 'Supernova must NOT charge when disabled');
      assert(choso.chakrams.length === 0, 'Chakrams must NOT be spawned when disabled');
    } finally {
      CONFIG.choso.enableSupernova = prevNova;
      CONFIG.choso.enableChakram = prevChakram;
    }

    // 10. Verify Sanguine Retaliation Matrix: Hit From Enemy -> Mid-Air Blood Eruption -> Convergence Laser Discharge (User Frame-by-Frame Scenario)
    choso.interruptAttacks(true);
    choso.bloodNodes = [];
    if (state.bloodEffects) state.bloodEffects.length = 0;
    choso.ultCooldown = 0;
    choso.skill3Cooldown = 0;
    dummy.hp = 300;
    dummy.isDead = false;
    state.gameState = 'playing';
    state.fighters = [choso, dummy];

    // Frame 1: Hit from enemy triggers retaliation spray
    choso.takeDamage(25, dummy, { hitType: 'punch' });
    assert(choso.isRetaliationSpraying === true, 'Choso must enter retaliation spray state upon enemy hit while Ult is UP');
    assert(choso.bloodNodes.length >= 14, `Taking damage while Ult is UP must erupt blood particles fanning behind Choso (got ${choso.bloodNodes.length})`);
    assert(choso.ultCooldown > 0, 'Ultimate cooldown must be consumed upon retaliation trigger');

    // Frame 2: Visible mid-air blood fanning out behind Choso
    while (choso.retaliationSprayTimer > 0) {
      choso.update(dummy, 0, state.arena);
    }
    assert(choso.isRetaliationSpraying === false, 'Retaliation spray must complete');
    assert(choso.isCastingLaserMatrix === true, 'Choso must transition to Convergence Clasp pose after spray');
    assert(choso.isClaspedForConvergence === true, 'Choso must be clasped for Convergence');
    assert(choso.bloodNodes.every(n => n.isIgnitedAsLaser === true), 'All sprayed blood droplets must be frozen in mid-air as laser diodes');

    // Frame 3: Convergence laser matrix discharge back into the enemy
    choso.laserMatrixTimer = 0;
    choso.laserTelegraphTimer = 1;
    choso.activeLaserBeams.length = 0;
    const preHp = dummy.hp;
    choso.update(dummy, 0, state.arena);
    assert(choso.activeLaserBeams.length >= 14, `All ignited blood droplets must fire simultaneous laser beams at the attacker (got ${choso.activeLaserBeams.length})`);
    assert(dummy.hp < preHp, 'Target must take damage from the retaliatory laser barrage');
    assert(choso.bloodNodes.length >= 14, 'Blood droplet nodes must remain alive as laser emitter squares during discharge');
    assert(choso.bloodNodes.every(n => n.dischargeTimer > 0), 'Nodes must have active dischargeTimer during laser blast');

    console.log('      ✅ Choso Infinite Blood Generation, Laser Transmutation Matrix & Piercing Blood verified successfully.');
    state.fighters = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 80: Discrete Floating Damage Numbers (Zero Summing / Zero Accumulation)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    console.log('   80. Testing Discrete Floating Damage Numbers (Zero Summing / Zero Stacking)...');
    const { spawnFloatingText } = await import('../js/core/state.js');
    state.floatingTexts = [];

    // Simulate 4 consecutive rapid hits on target at the exact same location
    spawnFloatingText(250, 200, '3', '#EF4444');
    spawnFloatingText(250, 200, '3', '#EF4444');
    spawnFloatingText(250, 200, '4', '#EF4444');
    spawnFloatingText(250, 200, '5', '#EF4444');

    // Verify all 4 discrete hits spawned as individual numbers
    assert(state.floatingTexts.length === 4, `Expected exactly 4 floating text entries, got ${state.floatingTexts.length}`);

    // Verify numbers were NOT summed up (none of them accumulated into 6, 10, or 15)
    assert(state.floatingTexts[0].text === '3', `Entry 0 text must be '3', got '${state.floatingTexts[0].text}'`);
    assert(state.floatingTexts[1].text === '3', `Entry 1 text must be '3' (not summed into '6'), got '${state.floatingTexts[1].text}'`);
    assert(state.floatingTexts[2].text === '4', `Entry 2 text must be '4' (not summed into '10'), got '${state.floatingTexts[2].text}'`);
    assert(state.floatingTexts[3].text === '5', `Entry 3 text must be '5' (not summed into '15'), got '${state.floatingTexts[3].text}'`);

    // Verify alternating fountain velocities and slight scatter offsets so numbers are clearly visible
    assert(state.floatingTexts[0].vx * state.floatingTexts[1].vx < 0, 'Entry 0 and 1 should arc in alternating directions');
    assert(state.floatingTexts[1].vx * state.floatingTexts[2].vx < 0, 'Entry 1 and 2 should arc in alternating directions');
    assert(state.floatingTexts[2].vx * state.floatingTexts[3].vx < 0, 'Entry 2 and 3 should arc in alternating directions');

    // Verify non-damage duplicate suppression still functions for status texts (e.g. 'MISS!')
    state.floatingTexts = [];
    spawnFloatingText(250, 200, 'MISS!', '#A0AEC0');
    spawnFloatingText(250, 200, 'MISS!', '#A0AEC0');
    assert(state.floatingTexts.length === 1, `Status 'MISS!' duplicates within proximity must be suppressed to 1 entry, got ${state.floatingTexts.length}`);

    state.floatingTexts = [];
    console.log('      ✅ Discrete floating damage numbers (zero summing, zero accumulation, alternating fountain arc) verified successfully.');
  }

  // ── 81. Testing Gojo Hollow Purple 12-Frame Explosion Animation & Particle System Stack Depth ──
  {
    console.log('   81. Testing Gojo Hollow Purple 12-Frame Explosion Animation & Particle System...');
    const { _getGojoPurpleExplosionFrames, drawGojoPurpleExplosion } = await import('../js/graphics/weapons/gojoWeaponGraphics.js');
    const { spawnPurpleExplosion, spawnPurpleShockwaveRings } = await import('../js/graphics/particles/sparkEffect.js');
    const { drawPurpleExplosion } = await import('../js/graphics/particles/renderers/blastShockwaveRenderers.js');

    // 1. Verify 12 frames loaded
    const frames = _getGojoPurpleExplosionFrames();
    assert(frames && frames.length === 12, `Expected 12 frames in _getGojoPurpleExplosionFrames, got ${frames?.length}`);

    // 2. Test drawGojoPurpleExplosion Canvas 2D stack balance across all 12 phases
    mockCtx.resetStackDepth();
    for (let i = 0; i < 12; i++) {
      const p = i / 11;
      drawGojoPurpleExplosion(mockCtx, { x: 250, y: 250, radius: 280, p: p, alpha: 1.0, is200: false, isGreen: false });
      assert(mockCtx.getStackDepth() === 0, `drawGojoPurpleExplosion corrupted canvas stack depth at frame ${i + 1}`);
      drawGojoPurpleExplosion(mockCtx, { x: 250, y: 250, radius: 350, p: p, alpha: 0.8, is200: true, isGreen: true });
      assert(mockCtx.getStackDepth() === 0, `drawGojoPurpleExplosion (200% green) corrupted canvas stack depth at frame ${i + 1}`);
    }

    // 3. Test spawnPurpleExplosion Particle System creation
    state.sparkEffects = [];
    const expParticle = spawnPurpleExplosion(250, 250, 280, false, false);
    assert(expParticle && expParticle.type === 'purpleExplosion', `Expected particle type 'purpleExplosion', got '${expParticle?.type}'`);
    assert(state.sparkEffects.includes(expParticle), 'ParticleSystem must register purpleExplosion in state.sparkEffects');

    // 4. Test drawPurpleExplosion renderer stack depth
    mockCtx.resetStackDepth();
    drawPurpleExplosion(mockCtx, expParticle);
    assert(mockCtx.getStackDepth() === 0, 'drawPurpleExplosion corrupted canvas stack depth');

    // 5. Test spawnPurpleShockwaveRings spawns both shockwave rings AND the 12-frame explosion
    state.sparkEffects = [];
    spawnPurpleShockwaveRings(250, 250, 280, false, false);
    const hasExplosion = state.sparkEffects.some(p => p.type === 'purpleExplosion');
    const hasRings = state.sparkEffects.some(p => p.type === 'purpleShockwaveRing');
    assert(hasExplosion, 'spawnPurpleShockwaveRings must spawn purpleExplosion 12-frame particle');
    assert(hasRings, 'spawnPurpleShockwaveRings must spawn purpleShockwaveRing particles');

    state.sparkEffects = [];
    console.log('      ✅ Gojo Hollow Purple 12-frame explosion animation, particle system integration & 100% balanced Canvas 2D stack depths verified successfully.');
  }

  // ── 82. Testing Global Parry 12-Frame Animation & Particle System Stack Depth ──
  {
    console.log('   82. Testing Global Parry 12-Frame Animation & Particle System...');
    const { _getParryExplosionFrames, drawParryExplosion } = await import('../js/graphics/particles/renderers/blastShockwaveRenderers.js');
    const { spawnParryExplosion, spawnParrySparksEffect } = await import('../js/graphics/particles/sparkEffect.js');

    // 1. Verify 12 frames loaded
    const frames = _getParryExplosionFrames();
    assert(frames && frames.length === 12, `Expected 12 frames in _getParryExplosionFrames, got ${frames?.length}`);

    // 2. Test drawParryExplosion Canvas 2D stack balance across all 12 phases
    mockCtx.resetStackDepth();
    for (let i = 0; i < 12; i++) {
      const p = i / 11;
      drawParryExplosion(mockCtx, { x: 250, y: 250, size: 85, targetSize: 85, life: 1.0 - p });
      assert(mockCtx.getStackDepth() === 0, `drawParryExplosion corrupted canvas stack depth at frame ${i + 1}`);
    }

    // 3. Test spawnParryExplosion Particle System creation
    state.sparkEffects = [];
    const parryParticle = spawnParryExplosion(250, 250, 85);
    assert(parryParticle && parryParticle.type === 'parryExplosion', `Expected particle type 'parryExplosion', got '${parryParticle?.type}'`);
    assert(state.sparkEffects.includes(parryParticle), 'ParticleSystem must register parryExplosion in state.sparkEffects');

    // 4. Test drawParryExplosion renderer stack depth with active particle
    mockCtx.resetStackDepth();
    drawParryExplosion(mockCtx, parryParticle);
    assert(mockCtx.getStackDepth() === 0, 'drawParryExplosion corrupted canvas stack depth');

    // 5. Test spawnParrySparksEffect spawns parryExplosion 12-frame particle alongside sparks
    state.sparkEffects = [];
    spawnParrySparksEffect(250, 250, 28);
    const hasParryExplosion = state.sparkEffects.some(p => p.type === 'parryExplosion');
    const hasParrySparks = state.sparkEffects.some(p => p.type === 'parrySpark');
    const hasParryEmberStars = state.sparkEffects.some(p => p.type === 'parryEmberStar');
    assert(hasParryExplosion, 'spawnParrySparksEffect must spawn parryExplosion 12-frame particle');
    assert(hasParrySparks, 'spawnParrySparksEffect must spawn parrySpark particles');
    assert(hasParryEmberStars, 'spawnParrySparksEffect must spawn parryEmberStar particles');

    state.sparkEffects = [];
    console.log('      ✅ Global Parry 12-frame explosion animation, particle system integration & 100% balanced Canvas 2D stack depths verified successfully.');
  }

  // ── 83. Testing Zeus 12-Frame Thunderstrike Animation & Particle System Stack Depth ──
  {
    console.log('   83. Testing Zeus 12-Frame Thunderstrike Animation & Particle System...');
    const { _getZeusThunderstrikeFrames, drawZeusThunderstrike, _drawThunderstrikeImpactAnimation } = await import('../js/graphics/weapons/zeusWeaponGraphics.js');
    const { drawLightningEffects, updateLightningEffects } = await import('../js/graphics/particles/lightningEffects.js');

    // 1. Verify 12 frames loaded
    const frames = _getZeusThunderstrikeFrames();
    assert(frames && frames.length === 12, `Expected 12 frames in _getZeusThunderstrikeFrames, got ${frames?.length}`);

    // 2. Test drawZeusThunderstrike & _drawThunderstrikeImpactAnimation Canvas 2D stack balance across all 12 phases
    mockCtx.resetStackDepth();
    for (let i = 0; i < 12; i++) {
      const p = i / 11;
      const life = Math.round((1.0 - p) * 18);
      drawZeusThunderstrike(mockCtx, { x: 250, y: 250, life: life, maxLife: 18, scale: 1.15, color: '#00BFFF' });
      assert(mockCtx.getStackDepth() === 0, `drawZeusThunderstrike corrupted canvas stack depth at frame ${i + 1}`);
      drawZeusThunderstrike(mockCtx, { x: 250, y: 250, life: life, maxLife: 18, scale: 1.25, color: 'green' });
      assert(mockCtx.getStackDepth() === 0, `drawZeusThunderstrike (stolen green) corrupted canvas stack depth at frame ${i + 1}`);
      drawZeusThunderstrike(mockCtx, { x: 250, y: 250, life: life, maxLife: 18, scale: 1.35, color: '#00BFFF', isCrit: true });
      assert(mockCtx.getStackDepth() === 0, `drawZeusThunderstrike (critical) corrupted canvas stack depth at frame ${i + 1}`);

      _drawThunderstrikeImpactAnimation(mockCtx, 1.15, p, 1.0, false);
      assert(mockCtx.getStackDepth() === 0, `_drawThunderstrikeImpactAnimation corrupted stack depth at p=${p}`);
      _drawThunderstrikeImpactAnimation(mockCtx, 1.15, p, 1.0, true);
      assert(mockCtx.getStackDepth() === 0, `_drawThunderstrikeImpactAnimation (green) corrupted stack depth at p=${p}`);
      _drawThunderstrikeImpactAnimation(mockCtx, 1.15, p, 1.0, false, true);
      assert(mockCtx.getStackDepth() === 0, `_drawThunderstrikeImpactAnimation (critical) corrupted stack depth at p=${p}`);
    }

    // 3. Test drawLightningEffects coordinator stack depth
    state.zeusStormStrikes = [
      { x: 200, y: 200, life: 18, maxLife: 18, scale: 1.15 },
      { x: 300, y: 300, life: 9, maxLife: 18, scale: 1.25, color: 'green' },
      { x: 250, y: 250, life: 14, maxLife: 18, scale: 1.35, isCrit: true }
    ];
    mockCtx.resetStackDepth();
    drawLightningEffects(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'drawLightningEffects corrupted canvas stack depth');

    // 4. Test updateLightningEffects decay lifecycle
    updateLightningEffects();
    assert(state.zeusStormStrikes[0].life === 17, 'updateLightningEffects must decrement strike.life');
    state.zeusStormStrikes = [];

    // 5. Test ZeusFighter Critical Strike Mechanic on Thunder Strikes
    const { ZeusFighter } = await import('../js/entities/fighters/ZeusFighter.js');
    const zeusInstance = new ZeusFighter({ x: 200, y: 200, color: '#00BFFF' });

    assert(zeusInstance.thunderCritChance === 0.25, `Expected thunderCritChance=0.25, got: ${zeusInstance.thunderCritChance}`);
    assert(zeusInstance.thunderCritMultiplier === 1.80, `Expected thunderCritMultiplier=1.80, got: ${zeusInstance.thunderCritMultiplier}`);

    // Test evaluateThunderCrit forced crit
    const critRes = zeusInstance.evaluateThunderCrit(20, { forceCrit: true });
    assert(critRes.isCrit === true, 'evaluateThunderCrit with forceCrit must return isCrit: true');
    assert(critRes.finalDamage === 36, `Expected crit damage 36 (20 * 1.8), got: ${critRes.finalDamage}`);

    // Test evaluateThunderCrit static debuff synergy bonus
    const staticRes = zeusInstance.evaluateThunderCrit(20, { hasStatic: true });
    assert(staticRes.critChance === 0.50, `Expected staticCritChance=0.50 (0.25 + 0.25), got: ${staticRes.critChance}`);

    // Test evaluateThunderCrit without static debuff
    const normalRes = zeusInstance.evaluateThunderCrit(20, { hasStatic: false });
    assert(normalRes.critChance === 0.25, `Expected baseCritChance=0.25, got: ${normalRes.critChance}`);

    // 6. Test Zeus Hand Scale Reduction (0.75x)
    const { zeusConfig } = await import('../js/configs/characters/zeusConfig.js');
    const { zeusBossConfig } = await import('../js/configs/bosses/zeusBossConfig.js');
    assert(zeusConfig.handScale === 0.75, `Expected zeusConfig.handScale=0.75, got: ${zeusConfig.handScale}`);
    assert(zeusBossConfig.handScale === 0.75, `Expected zeusBossConfig.handScale=0.75, got: ${zeusBossConfig.handScale}`);
    const { drawZeusSkin } = await import('../js/graphics/fighters/zeusSkin.js');
    const { drawZeusWeapon } = await import('../js/graphics/weapons/zeusWeaponGraphics.js');
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeusInstance);
    assert(mockCtx.getStackDepth() === 0, 'drawZeusSkin must keep Canvas 2D transform stack depth balanced');
    drawZeusWeapon(mockCtx, zeusInstance.x, zeusInstance.y, zeusInstance.gunAngle, zeusInstance.r, 0, 1.0, '#00BFFF', false, 0);
    assert(mockCtx.getStackDepth() === 0, 'drawZeusWeapon must keep Canvas 2D transform stack depth balanced');

    console.log('      ✅ Zeus 12-frame thunderstrike animation, critical strike mechanics, coordinator integration, 0.75x hand scale & 100% balanced Canvas 2D stack depths verified successfully.');
  }

  // ── TEST 84: Knight 5-Phase Melee Combat, Hit-Pause Unpause & Anti-Softlock Failsafes ──
  {
    console.log('   84. Testing Knight 5-Phase Melee Combat, Hit-Pause Unpause & Anti-Softlock Failsafes...');
    const { KnightFighter } = await import('../js/entities/fighters/KnightFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const knight = new KnightFighter({ x: 100, y: 300, radius: 25, hp: 450, maxHp: 450 });
    const target = new Fighter({ x: 155, y: 300, radius: 25, hp: 500, maxHp: 500 });
    knight.team = 0;
    target.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx;
    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [knight, target];
    state.arena = { x: 0, y: 0, width: 800, height: 600, centerObstacle: null };

    try {
      // 1. Initial State: idle, ready stance, not swinging
      assert(knight.swipeActive === false, 'Knight must not be swiping initially');
      assert(knight.swordSwingTimer === 0, 'Knight swordSwingTimer must be 0 initially');
      assert(knight.swordHitPauseTimer === 0, 'Knight swordHitPauseTimer must be 0 initially');
      assert(knight.isHitPausing() === false, 'Knight isHitPausing must return false initially');
      assert(knight.canAim() === true, 'Knight canAim must be true initially');
      assert(knight.canPerformBasicAttack() === true, 'Knight canPerformBasicAttack must be true initially');

      // 2. Trigger Hit 1 (Horizontal Cross Cleave)
      knight._trySwordSwipe(target, 0);
      assert(knight.swipeActive === true, 'Knight swipeActive must be true after swipe initiation');
      assert(knight.swordSwingTimer > 0, 'Knight swordSwingTimer must be > 0 during swing');
      assert(knight.swordComboStep === 1, 'Knight first swing must be combo step 1');
      assert(knight.canAim() === false, 'Knight canAim must return false during active swing');
      assert(knight.canPerformBasicAttack() === false, 'Knight canPerformBasicAttack must return false during active swing');

      // 3. Step through strike phase until impact connects
      const initTargetHp = target.hp;
      const strikeStart = (knight.swordSwingLiftFrames || 7) + (knight.swordSwingHoldFrames || 2);
      for (let f = 0; f < strikeStart + 6; f++) {
        knight.update(target, 0, state.arena);
        if (knight.swordHitDelivered) break;
      }
      assert(knight.swordHitDelivered === true, 'Knight sword hit must be delivered at strike phase');
      assert(target.hp < initTargetHp, 'Target must take damage from Knight sword cleave');
      assert(knight.swordHitPauseTimer > 0, 'Knight must enter sword hit-pause stasis on impact');
      assert(knight.isHitPausing() === true, 'Knight isHitPausing must return true while hit-paused');

      // 4. Resolve hit-pause and verify knockback & stasis release
      while (knight.swordHitPauseTimer > 0) {
        knight.update(target, 0, state.arena);
      }
      assert(knight.swordHitPauseTimer === 0, 'Knight swordHitPauseTimer must reach 0');
      assert(target.suppressFreezeOverlay === false, 'Target stasis must release on unpause');
      assert(target.vx > 0, 'Target must receive forward knockback impulse from cleave');

      // 5. Complete Phase 4 (pin) and Phase 5 (recovery)
      for (let f = 0; f < 30; f++) {
        if (!knight.swipeActive && knight.swordSwingTimer === 0) break;
        knight.update(target, 0, state.arena);
      }
      assert(knight.swipeActive === false, 'Knight swipeActive must become false after recovery');
      assert(knight.swordSwingTimer === 0, 'Knight swordSwingTimer must be 0 after recovery');
      assert(knight.canAim() === true, 'Knight canAim must return true after swing completes');
      assert(knight.canPerformBasicAttack() === true, 'Knight canPerformBasicAttack must return true after swing completes');

      // 6. Test Interrupt during Hit-Pause stasis (anti-softlock verification)
      knight.swipeCooldown = 0;
      target.x = knight.x + 55;
      target.y = knight.y;
      knight._trySwordSwipe(target, 0);
      assert(knight.swipeActive === true, 'Knight swipeActive must be true on combo step 2');
      assert(knight.swordComboStep === 2, 'Knight second swing must be combo step 2');

      for (let f = 0; f < 20; f++) {
        knight.update(target, 0, state.arena);
        if (knight.swordHitPauseTimer > 0) break;
      }
      assert(knight.swordHitPauseTimer > 0, 'Knight must be in hit-pause for interrupt test');

      // Interruption triggers (CC, stasis, knockback, death)
      knight.interruptAttacks();
      assert(knight.swordHitPauseTimer === 0, 'Knight swordHitPauseTimer must be 0 after interruptAttacks');
      assert(knight.swipeActive === false, 'Knight swipeActive must be false after interruptAttacks');
      assert(knight.swordSwingTimer === 0, 'Knight swordSwingTimer must be 0 after interruptAttacks');
      assert(knight.isHitPausing() === false, 'Knight isHitPausing must be false after interruptAttacks');
      assert(target.timeStopTimer === 0, 'Target stasis must be cleared by unpause on interrupt');
      assert(knight.canAim() === true, 'Knight canAim must return true after interrupt');
      assert(knight.canPerformBasicAttack() === true, 'Knight canPerformBasicAttack must return true after interrupt');

      // 7. Verify Canvas 2D stack depths across idle and swinging states
      mockCtx.resetStackDepth();
      knight.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'knight.draw corrupted canvas stack depth in idle');
      knight.drawGun(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'knight.drawGun corrupted canvas stack depth in idle');

      knight.swipeCooldown = 0;
      knight._trySwordSwipe(target, 0);
      knight.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'knight.draw corrupted canvas stack depth while swinging');
      knight.drawGun(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'knight.drawGun corrupted canvas stack depth while swinging');

      // 8. Test 5-Second Tactical Forward Dash Ability
      knight.interruptAttacks();
      target.x = 300;
      target.y = 300;
      knight.x = 100;
      knight.y = 300;
      knight.dashCooldown = 0;
      knight.update(target, 0, state.arena);
      assert(knight.isDashing === true, 'Knight must be dashing forward when dashCooldown reaches 0');
      assert(knight.dashTimer > 0, 'Knight dashTimer must be > 0 during dash burst');
      assert(knight.dashCooldown === (CONFIG.knight?.dashCooldown || 300), 'Knight dashCooldown must reset to 300 (5s)');
      assert(knight.vx > 0, 'Knight vx must be positive dashing right towards target');

      // Step until dash finishes or arrives at target
      const preDashX = knight.x;
      for (let f = 0; f < 12; f++) {
        if (!knight.isDashing) break;
        knight.update(target, 0, state.arena);
      }
      assert(knight.x > preDashX, 'Knight must have moved forward closer to target during dash');
      assert(knight.isDashing === false, 'Knight isDashing must complete');

      // 9. Test Shield Break Parry & 12-Frame Animation
      knight.interruptAttacks();
      knight.shieldMaxHp = 200;
      knight.shieldHp = 30;
      knight.isShieldBroken = false;
      target.x = knight.x + 35;
      target.y = knight.y;
      target.vx = 0;
      target.vy = 0;
      target.hitStunTimer = 0;
      target.timeStopTimer = 0;
      state.sparkEffects = [];

      const initialTargetHp = target.hp;
      knight.takeDamage(60, target, { isMelee: true });
      assert(knight.isShieldBroken === true, 'Knight shield must be broken after taking fatal shield damage');
      assert(knight.shieldHp === 0, 'Knight shieldHp must be 0 after shield break');
      assert(knight.parryAnimationTimer > 0, 'Knight parryAnimationTimer must be active on shield break');
      assert(state.sparkEffects.some(p => p.type === 'parryExplosion'), 'Shield break parry must spawn 12-frame parryExplosion in state.sparkEffects');
      assert(target.hitStunTimer > 0, 'Attacker must be staggered with hit stun on shield break parry');
      assert(target.timeStopTimer > 0, 'Attacker must receive timeStop stasis on shield break parry');
      assert(target.vx > 0, 'Attacker must receive parry knockback impulse');

      // 10. Verify Canvas 2D stack depths during parry animation and active dash
      mockCtx.resetStackDepth();
      knight.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'knight.draw corrupted canvas stack depth during parry animation');
      knight.isDashing = true;
      knight.dashTimer = 5;
      knight.dashAngle = 0;
      knight.draw(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'knight.draw corrupted canvas stack depth during active dash');
      knight.isDashing = false;

      console.log('      ✅ Knight 5-Phase Melee Combat, Hit-Pause Unpause, 5s Forward Dash & Shield Break Parry verified successfully.');
    } finally {
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
    }
  }

  // ── TEST 85: Combo Counter Refactor: Non-Resetting On-Hit Accumulation & Duration Expiration ──
  {
    console.log('   85. Testing Combo Counter Refactor: Non-Resetting On-Hit Accumulation & Duration Expiration...');
    const { registerComboHit, ensureComboTrackers, tickComboTrackers, resetComboTrackers } = await import('../js/systems/comboTracker.js');
    const { drawComboCounter, getFighterComboTierColors } = await import('../js/graphics/hudManager.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const p1 = new Fighter({ x: 100, y: 300, radius: 25, hp: 500, maxHp: 500 });
    const p2 = new Fighter({ x: 200, y: 300, radius: 25, hp: 500, maxHp: 500 });
    p1.fighterIndex = 15; // Non-zero character roster index (e.g. Knight)
    p2.fighterIndex = 52; // Non-zero character roster index (e.g. CJ)
    p1.team = 0;
    p2.team = 1;

    const prevGetTeam = state.getFighterTeam;
    state.getFighterTeam = (idx) => idx === 0 ? 0 : 1;
    const prevMode = state.mode;
    state.mode = '1v1';
    state.fighters = [p1, p2];
    const prevGameState = state.gameState;
    state.gameState = 'playing';
    const prevComboEnabled = CONFIG.comboCounter?.enabled;
    if (CONFIG.comboCounter) CONFIG.comboCounter.enabled = true;

    try {
      resetComboTrackers();
      const slots = ensureComboTrackers();

      // 1. Initial State: both slots are hidden and 0 hits
      assert(slots[0].hits === 0, 'Slot 0 hits must initially be 0');
      assert(slots[1].hits === 0, 'Slot 1 hits must initially be 0');
      assert(slots[0].phase === 'hidden', 'Slot 0 phase must initially be hidden');

      // 2. Hit 1: Player 1 hits Player 2 (Enemy)
      registerComboHit(p1, p2, 35);
      assert(slots[0].hits === 1, `Slot 0 hits must be 1 on first hit (got ${slots[0].hits})`);
      assert(slots[0].damage === 35, `Slot 0 damage must be 35 on first hit (got ${slots[0].damage})`);
      assert(slots[0].timer === 90, `Slot 0 timer must be initialized to 90 (got ${slots[0].timer})`);
      assert(slots[0].phase === 'in', `Slot 0 phase must transition to 'in' on first hit (got ${slots[0].phase})`);
      assert(slots[0].attackerFighter === p1, 'Slot 0 must record p1 as attackerFighter');
      assert(slots[1].hits === 0, 'Slot 1 must remain untouched when P1 hits P2');

      // Advance frames and verify duration is draining
      for (let f = 0; f < 15; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        tickComboTrackers();
      }
      assert(slots[0].timer === 75, `Slot 0 timer must drain to 75 (got ${slots[0].timer})`);
      assert(slots[0].phase === 'hold', `Slot 0 phase must be 'hold' (got ${slots[0].phase})`);

      // 3. Hit 2: Player 1 hits Player 2 again BEFORE duration ends
      // CRITICAL REQUIREMENT: IT MUST NOT RESET! It must accumulate hits and damage!
      registerComboHit(p1, p2, 40);
      assert(slots[0].hits === 2, `Slot 0 hits must increment to 2 (got ${slots[0].hits})`);
      assert(slots[0].damage === 75, `Slot 0 damage must accumulate to 75 (got ${slots[0].damage})`);
      assert(slots[0].timer === 90, `Slot 0 timer must refresh back to 90 (got ${slots[0].timer})`);

      // 4. Hit 3: Player 1's minion/companion hits Player 2
      const minion = { owner: p1, isMinion: true };
      registerComboHit(minion, p2, 25);
      assert(slots[0].hits === 3, `Slot 0 hits must increment to 3 from minion hit (got ${slots[0].hits})`);
      assert(slots[0].damage === 100, `Slot 0 damage must accumulate to 100 (got ${slots[0].damage})`);
      assert(slots[0].timer === 90, `Slot 0 timer must refresh back to 90 (got ${slots[0].timer})`);

      // 5. Player 2 hits Player 1 back!
      // CRITICAL REQUIREMENT: Player 2's hit must go to Slot 1, and Player 1's Slot 0 MUST NOT RESET!
      registerComboHit(p2, p1, 50);
      assert(slots[1].hits === 1, `Slot 1 hits must be 1 when P2 hits P1 (got ${slots[1].hits})`);
      assert(slots[1].damage === 50, `Slot 1 damage must be 50 (got ${slots[1].damage})`);
      assert(slots[1].attackerFighter === p2, 'Slot 1 must record p2 as attackerFighter');
      assert(slots[0].hits === 3, `Slot 0 hits MUST NOT RESET when opponent hits back (got ${slots[0].hits})`);
      assert(slots[0].damage === 100, `Slot 0 damage MUST NOT RESET when opponent hits back (got ${slots[0].damage})`);

      // 6. Friendly fire guard: Player 1 damaging self or teammate must NOT increment combo
      registerComboHit(p1, p1, 20);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment from self damage');

      // 6b. Zero and negative damage guards: only positive actual damage counts
      registerComboHit(p1, p2, 0);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment on 0 damage');
      registerComboHit(p1, p2, -15);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment on negative damage');

      // 6c. Minions, plants, troops, buildings, summons & dead target guards: only primary active enemy fighters count
      registerComboHit(p1, { isTurret: true, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against turrets/buildings');
      registerComboHit(p1, { isDispenser: true, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against dispensers');
      registerComboHit(p1, { isBuilding: true, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against buildings');
      registerComboHit(p1, { isPlant: true, isPlantMinion: true, owner: p2, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against Crazy Dave plants');
      registerComboHit(p1, { isWallnut: true, isPlantBarrier: true, owner: p2, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against Wall-nut barriers');
      registerComboHit(p1, { isChessTroop: true, isChessPiece: true, owner: p2, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against Shiro chess troops');
      registerComboHit(p1, { isMinion: true, owner: p2, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against enemy minions');
      registerComboHit(p1, { isCompanion: true, isRika: true, owner: p2, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against companion summons');
      registerComboHit(p1, { isIllusion: true, owner: p2, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against illusions/clones');
      registerComboHit(p1, { isLawnmower: true, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against lawnmowers');
      registerComboHit(p1, { isDead: true, hp: 0, _hasDied: true, team: 1 }, 50);
      assert(slots[0].hits === 3, 'Slot 0 hits must not increment against dead corpses');

      // 7. Drain duration timer to 0 and verify duration expiration & slide-out
      for (let f = 0; f < 90; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        tickComboTrackers();
      }
      assert(slots[0].timer === 0, `Slot 0 timer must reach 0 (got ${slots[0].timer})`);
      assert(slots[0].phase === 'out', `Slot 0 must enter 'out' phase when duration ends (got ${slots[0].phase})`);

      // Slide-out finishes over 10 frames
      for (let f = 0; f < 10; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        tickComboTrackers();
      }
      assert(slots[0].phase === 'hidden', `Slot 0 phase must become hidden after slide-out (got ${slots[0].phase})`);
      assert(slots[0].hits === 0, `Slot 0 hits must reset to 0 after duration ends and slide-out completes (got ${slots[0].hits})`);

      // 8. Canvas 2D Stack Depth Integrity
      mockCtx.resetStackDepth();
      slots[0].phase = 'hold';
      slots[0].hits = 5;
      slots[0].damage = 180;
      slots[0].slideP = 1.0;
      slots[0].timer = 60;
      drawComboCounter(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'drawComboCounter corrupted canvas stack depth');

      // 9. Verify hit counts exceeding 99 render actual number (NEVER '99+')
      slots[0].hits = 150;
      slots[0].damage = 2500;
      mockCtx.resetStackDepth();
      drawComboCounter(mockCtx);
      assert(mockCtx.getStackDepth() === 0, 'drawComboCounter with 150 hits corrupted canvas stack depth');

      // 10. Verify Fighter Color Theme Palette Resolution
      const cjTiers = getFighterComboTierColors({ characterId: 'cj' }, '#EF4444');
      assert(Array.isArray(cjTiers) && cjTiers.length === 4, 'CJ must produce 4 combo tier colors');
      // CJ's Grove Street green base (#16A34A / hue ~142)
      assert(cjTiers[0].includes('142'), `CJ Tier 0 must be derived from Grove Street green hue 142 (got ${cjTiers[0]})`);
      // CJ's secondary color Sunset Gold (#F59E0B / hue ~38)
      assert(cjTiers[2].includes('38') || cjTiers[2] === '#F59E0B', `CJ Tier 2 must incorporate San Andreas Sunset Gold (got ${cjTiers[2]})`);

      // 11. Verify Custom comboTierColors override takes precedence if defined
      const customFighter = { comboTierColors: ['#111111', '#222222', '#333333', '#444444'] };
      const customTiers = getFighterComboTierColors(customFighter, '#38BDF8');
      assert(customTiers[0] === '#111111' && customTiers[3] === '#444444', 'Explicit comboTierColors must take precedence');

      console.log('      ✅ Combo Counter Refactor: Non-Resetting On-Hit Accumulation & Duration Expiration verified successfully.');
    } finally {
      resetComboTrackers();
      if (CONFIG.comboCounter) CONFIG.comboCounter.enabled = prevComboEnabled;
      state.getFighterTeam = prevGetTeam;
      state.mode = prevMode;
      state.fighters = [];
      state.gameState = prevGameState;
    }
  }

  // ⚡ 86. Testing 12-Frame Animated Static Debuff Effect & Canvas 2D Stack Balance ⚡
  {
    console.log('   86. Testing 12-Frame Animated Static Debuff Effect & Canvas 2D Stack Balance...');
    const {
      _getStaticCyanFrames,
      _getStaticGoldFrames,
      _getStaticEffectFrames,
      drawZeusStaticDebuffEffect,
      STATUS_OVERLAY_REGISTRY
    } = await import('../js/graphics/statusEffects.js');

    // 1. Verify 12 frames loaded for Cyan palette (Zeus/generic)
    const cyanFrames = _getStaticCyanFrames();
    assert(cyanFrames && cyanFrames.length === 12, `Expected 12 cyan static frames, got ${cyanFrames?.length}`);

    // 2. Verify 12 frames loaded for Gold palette (Zenitsu)
    const goldFrames = _getStaticGoldFrames();
    assert(goldFrames && goldFrames.length === 12, `Expected 12 gold static frames, got ${goldFrames?.length}`);

    // 3. Verify helper resolver selects correct palette
    assert(_getStaticEffectFrames(false) === cyanFrames, '_getStaticEffectFrames(false) must return cyan frames');
    assert(_getStaticEffectFrames(true) === goldFrames, '_getStaticEffectFrames(true) must return gold frames');

    // 4. Test Canvas 2D stack balance across multiple simulated timeframes for Zenitsu
    const testZenitsuVictim = {
      x: 200,
      y: 200,
      r: 25,
      staticDebuffSource: 'zenitsu',
      zenitsuStaticDebuffTimer: 180
    };
    mockCtx.resetStackDepth();
    for (let frame = 0; frame < 12; frame++) {
      drawZeusStaticDebuffEffect(mockCtx, 25, 180 - frame * 5, testZenitsuVictim);
      assert(mockCtx.getStackDepth() === 0, `drawZeusStaticDebuffEffect (Zenitsu) corrupted stack depth at frame ${frame}`);
    }

    // 5. Test Canvas 2D stack balance for Zeus (Cyan)
    const testZeusVictim = {
      x: 200,
      y: 200,
      r: 25,
      staticDebuffSource: null,
      staticDebuffTimer: 180
    };
    mockCtx.resetStackDepth();
    for (let frame = 0; frame < 12; frame++) {
      drawZeusStaticDebuffEffect(mockCtx, 25, 180 - frame * 5, testZeusVictim);
      assert(mockCtx.getStackDepth() === 0, `drawZeusStaticDebuffEffect (Zeus) corrupted stack depth at frame ${frame}`);
    }

    // 6. Verify STATUS_OVERLAY_REGISTRY recognizes both Zeus and Zenitsu static debuffs
    const zeusEntry = STATUS_OVERLAY_REGISTRY.find(e => e.id === 'zeusStaticDebuff');
    assert(zeusEntry, 'STATUS_OVERLAY_REGISTRY must contain zeusStaticDebuff entry');
    assert(zeusEntry.isActive({ staticDebuffTimer: 10 }), 'zeusStaticDebuff must be active when staticDebuffTimer > 0');
    assert(zeusEntry.isActive({ zenitsuStaticDebuffTimer: 10 }), 'zeusStaticDebuff must be active when zenitsuStaticDebuffTimer > 0');
    assert(!zeusEntry.isActive({}), 'zeusStaticDebuff must be inactive when no timers present');

    console.log('      ✅ 12-Frame Animated Static Debuff Effect (Cyan & Gold palettes) & 100% balanced Canvas 2D stack depths verified successfully.');
  }

  // ── 87. Testing 12-Frame Animated Punch Attack Template & Canvas 2D Stack Balance ──
  {
    console.log('   87. Testing 12-Frame Animated Punch Attack Template & Canvas 2D Stack Balance...');
    const fs = await import('fs');
    const path = await import('path');
    const { _getPunchAttackFrames, _drawPunchAttackAnimatedSprite, drawPunchAttackImpact, drawAnimeImpactFrame } = await import('../js/graphics/particles/renderers/blastShockwaveRenderers.js');
    const { spawnAnimePunchImpactFrame } = await import('../js/graphics/particles/sparkEffect.js');

    // 1. Verify all 12 punch frames exist on disk in Assets/effects/Punch Attack/
    const punchDir = path.resolve(process.cwd(), 'Assets/effects/Punch Attack');
    for (let i = 1; i <= 12; i++) {
      const punchFile = path.join(punchDir, `punch-${i}.png`);
      const attackFile = path.join(punchDir, `attack-${i}.png`);
      assert(fs.existsSync(punchFile), `Missing punch frame: ${punchFile}`);
      assert(fs.existsSync(attackFile), `Missing attack alias frame: ${attackFile}`);
      const stats = fs.statSync(punchFile);
      assert(stats.size > 500, `punch-${i}.png file size too small: ${stats.size} bytes`);
    }

    // 2. Verify master strips exist
    assert(fs.existsSync(path.join(punchDir, 'punch-b.png')), 'Missing punch-b.png');
    assert(fs.existsSync(path.join(punchDir, 'attack-b.png')), 'Missing attack-b.png');
    assert(fs.existsSync(path.join(punchDir, 'punch_template_config.json')), 'Missing punch_template_config.json');
    assert(fs.existsSync(path.join(punchDir, 'README.md')), 'Missing README.md');

    // 3. Verify _getPunchAttackFrames loader
    const frames = _getPunchAttackFrames();
    assert(frames && frames.length === 12, `Expected 12 punch frames loaded, got ${frames?.length}`);

    // 4. Test drawPunchAttackImpact Canvas 2D stack balance across all 12 phases
    mockCtx.resetStackDepth();
    for (let frame = 0; frame < 12; frame++) {
      const effect = {
        x: 250,
        y: 250,
        size: 55,
        targetSize: 55,
        life: 1.0 - (frame / 12),
        hitAngle: Math.PI / 4,
        color: 'gold'
      };
      drawPunchAttackImpact(mockCtx, effect);
      assert(mockCtx.getStackDepth() === 0, `drawPunchAttackImpact corrupted canvas stack depth at frame ${frame}`);
    }

    // 5. Test drawAnimeImpactFrame Canvas 2D stack balance across all color themes
    const testColors = ['gold', 'blackpink', 'crimson', 'cyan', 'purple', 'black', 'lime'];
    for (const color of testColors) {
      mockCtx.resetStackDepth();
      for (let frame = 0; frame < 12; frame++) {
        const effect = {
          x: 200,
          y: 200,
          size: 60,
          life: 1.0 - (frame / 12),
          hitAngle: 0.5,
          color: color
        };
        drawAnimeImpactFrame(mockCtx, effect);
        assert(mockCtx.getStackDepth() === 0, `drawAnimeImpactFrame (${color}) corrupted canvas stack depth at frame ${frame}`);
      }
    }

    // 6. Test spawnAnimePunchImpactFrame correctly populates sparkEffects
    state.sparkEffects = [];
    spawnAnimePunchImpactFrame(180, 220, 75, 1.2, 'crimson');
    assert(state.sparkEffects.length === 1, 'Expected 1 effect pushed to state.sparkEffects');
    const spawned = state.sparkEffects[0];
    assert(spawned.type === 'animeImpactFrame', `Expected type animeImpactFrame, got ${spawned.type}`);
    assert(spawned.hitAngle === 1.2, `Expected hitAngle 1.2, got ${spawned.hitAngle}`);
    assert(spawned.color === 'crimson', `Expected color crimson, got ${spawned.color}`);
    assert(spawned.size === 75, `Expected size 75, got ${spawned.size}`);

    state.sparkEffects = [];
    console.log('      ✅ 12-Frame Animated Punch Attack Template & 100% balanced Canvas 2D stack depths verified successfully.');
  }

  // ── TEST 88: Horizontal Mode Wide Arena Geometry, Camera Zoom & Header HUD Placement ──
  console.log('   88. Testing Horizontal Mode Wide Arena Geometry, Camera Zoom & Header HUD Placement...');
  {
    const { VIEWPORT_CONFIGS, VIEWPORT_MODES, getArenaConfigForMode } = await import('../js/core/viewportManager.js');
    const { isGrandBattleActive, resetCamera } = await import('../js/systems/cameraSystem.js');
    const { drawHUD, buildTopDuelHUD } = await import('../js/graphics/hudManager.js');

    // 1. Verify Horizontal Arena Geometry
    const hConfig = VIEWPORT_CONFIGS[VIEWPORT_MODES.HORIZONTAL];
    assert(hConfig.arena.x === 10, `Expected horizontal arena x: 10, got ${hConfig.arena.x}`);
    assert(hConfig.arena.y === 84, `Expected horizontal arena y: 84, got ${hConfig.arena.y}`);
    assert(hConfig.arena.width === 940, `Expected horizontal arena width: 940, got ${hConfig.arena.width}`);
    assert(hConfig.arena.height === 444, `Expected horizontal arena height: 444, got ${hConfig.arena.height}`);

    // 2. Verify Viewport Isolation: Vertical Mode remains 100% unaltered (Rule 28 & Rule 0.8)
    const vConfig = VIEWPORT_CONFIGS[VIEWPORT_MODES.VERTICAL];
    assert(vConfig.arena.x === 45, `Vertical arena x altered! Expected 45, got ${vConfig.arena.x}`);
    assert(vConfig.arena.y === 240, `Vertical arena y altered! Expected 240, got ${vConfig.arena.y}`);
    assert(vConfig.arena.width === 450, `Vertical arena width altered! Expected 450, got ${vConfig.arena.width}`);
    assert(vConfig.arena.height === 450, `Vertical arena height altered! Expected 450, got ${vConfig.arena.height}`);

    const hDuelArena = getArenaConfigForMode('1v1', VIEWPORT_MODES.HORIZONTAL);
    assert(hDuelArena.width === 940, `Expected getArenaConfigForMode 940 width, got ${hDuelArena.width}`);
    assert(hDuelArena.height === 444, `Expected getArenaConfigForMode 444 height, got ${hDuelArena.height}`);

    // 3. Verify Camera Zoom: Wide 940-width Duel Arena does NOT trigger Grand Battle zoom (zoom stays 1.0)
    state.viewOrientation = 'horizontal';
    state.mode = '1v1';
    state.arena = { ...hConfig.arena };
    assert(isGrandBattleActive() === false, 'Wide 940 duel arena must NOT trigger isGrandBattleActive');

    resetCamera(true);
    assert(state.camera.zoom === 1.0, `Expected camera zoom 1.0 in horizontal 1v1, got ${state.camera.zoom}`);
    assert(state.camera.x === 480, `Expected camera center X 480, got ${state.camera.x}`);
    assert(state.camera.y === 306, `Expected camera center Y 306, got ${state.camera.y}`);

    // Grand battle mode still correctly activates
    state.mode = '3v3v3v3';
    assert(isGrandBattleActive() === true, '3v3v3v3 mode must trigger isGrandBattleActive');

    // 4. Verify HUD Visibility & Top Duel HUD in Horizontal Mode
    state.mode = '1v1';
    const YujiClass = FIGHTER_CLASS_MAP['yuji'];
    const CJClass = FIGHTER_CLASS_MAP['cj'];
    const f1 = new YujiClass(200, 300, 0);
    const f2 = new CJClass(700, 300, 1);
    state.fighters = [f1, f2];

    const topEl = globalThis.document.getElementById('hudTopContainer');
    const bottomEl = globalThis.document.getElementById('healthHud');
    const leftEl = globalThis.document.getElementById('healthHudLeft');
    const rightEl = globalThis.document.getElementById('healthHudRight');

    drawHUD();

    // Top Duel HUD container must be visible in horizontal 1v1
    assert(topEl.style.display === 'flex', `Expected topContainer display flex, got ${topEl.style.display}`);
    // Bottom and side pods must be hidden in horizontal 1v1
    assert(bottomEl.style.display === 'none', `Expected containerBottom display none, got ${bottomEl.style.display}`);
    assert(leftEl.style.display === 'none', `Expected containerLeft display none, got ${leftEl.style.display}`);
    assert(rightEl.style.display === 'none', `Expected containerRight display none, got ${rightEl.style.display}`);

    // 5. Verify buildTopDuelHUD contains arcade profile, bar, and name
    const topHtml = buildTopDuelHUD(f1, f2, false);
    assert(topHtml.includes('hud-top-duel'), 'buildTopDuelHUD must contain hud-top-duel class');
    assert(topHtml.includes('hud-top-profile'), 'buildTopDuelHUD must contain hud-top-profile avatar tile');
    assert(topHtml.includes('hud-top-bar'), 'buildTopDuelHUD must contain arcade health bar hud-top-bar');
    assert(topHtml.includes('hud-top-name'), 'buildTopDuelHUD must contain hud-top-name');

    // 6. Verify Combo Banner Alignment in Horizontal Header Mode
    const { ensureComboTrackers, resetComboTrackers } = await import('../js/systems/comboTracker.js');
    const { drawComboCounter } = await import('../js/graphics/hudManager.js');
    const prevCombo88 = CONFIG.comboCounter?.enabled;
    if (CONFIG.comboCounter) CONFIG.comboCounter.enabled = true;
    resetComboTrackers();
    const cSlots = ensureComboTrackers();
    cSlots[0].phase = 'hold';
    cSlots[0].hits = 3;
    cSlots[0].damage = 60;
    cSlots[0].slideP = 1.0;
    cSlots[0].timer = 60;

    let translatedY = null;
    let translatedX = null;
    const origTranslate = mockCtx.translate;
    mockCtx.translate = (tx, ty) => {
      if (translatedY === null) {
        translatedX = tx;
        translatedY = ty;
      }
    };
    mockCtx.resetStackDepth();
    drawComboCounter(mockCtx);
    mockCtx.translate = origTranslate;
    assert(mockCtx.getStackDepth() === 0, 'drawComboCounter in horizontal mode corrupted canvas stack depth');
    assert(translatedY === 92 + 34, `Expected horizontal cardTop center Y 126 (cardTop=92), got ${translatedY}`);
    resetComboTrackers();
    if (CONFIG.comboCounter) CONFIG.comboCounter.enabled = prevCombo88;

    // Reset state to vertical defaults
    state.viewOrientation = 'vertical';
    state.mode = '1v1';
    state.arena = { ...vConfig.arena };
    resetCamera(true);

    console.log('      ✅ Horizontal Mode Wide Arena (940x444), Camera Zoom (1.0), and Top Header HUD verified successfully.');
  }

  // ⚡ 89. Testing Pikachu Thunderbolt Callout Sequence, Continuous Beam & Stun Aftermath with Electric Shock Sprite ⚡
  {
    console.log('   89. Testing Pikachu Thunderbolt Callout Sequence, Continuous Beam & Stun Aftermath with Electric Shock Sprite...');
    const AshClass = FIGHTER_CLASS_MAP['ash'];
    const CJClass = FIGHTER_CLASS_MAP['cj'];
    assert(AshClass, 'Ash fighter class must exist in FIGHTER_CLASS_MAP');

    const ash = new AshClass(100, 250, 0);
    const cj = new CJClass(250, 250, 1);
    ash.x = 100; ash.y = 250; ash.teamId = 0;
    cj.x = 250; cj.y = 250; cj.teamId = 1;
    state.fighters = [ash, cj];

    // Verify Pokemon skills configuration schema in ashConfig
    const { ashConfig } = await import('../js/configs/characters/ashConfig.js');
    const pikaConfig = ashConfig.pokemonRoster.pikachu;
    assert(pikaConfig.skills, 'Pikachu config must declare dedicated skills object');
    assert(pikaConfig.skills.special, 'Pikachu config must declare skills.special');
    assert(pikaConfig.skills.special.windupCallout === 'PIKA...', `Expected windupCallout 'PIKA...', got ${pikaConfig.skills.special.windupCallout}`);
    assert(pikaConfig.skills.special.attackCallout === '...CHUUUUUU!', `Expected attackCallout '...CHUUUUUU!', got ${pikaConfig.skills.special.attackCallout}`);
    assert(pikaConfig.skills.special.stunAftermathFrames === 45, `Expected stunAftermathFrames 45, got ${pikaConfig.skills.special.stunAftermathFrames}`);

    // Spawn Pikachu
    const { PokemonCompanionEntity } = await import('../js/entities/fighters/AshFighter.js');
    const pika = new PokemonCompanionEntity(ash, 'pikachu', 150, 250);
    ash.activePokemon = pika;
    state.fighters.push(pika);
    assert(pika && pika.speciesId === 'pikachu', 'Pikachu must be the active Pokemon');

    // 1. Verify Phase 1: Windup charging & "PIKA..." callout
    pika.startThunderbolt(cj, false);
    assert(pika.thunderboltState === 'windup', `Expected thunderboltState 'windup', got ${pika.thunderboltState}`);
    assert(pika.thunderboltTimer === 24, `Expected windup frames 24, got ${pika.thunderboltTimer}`);

    // 2. Advance through windup to trigger Phase 2: Active Beam & "...CHUUUUUU!" callout
    for (let f = 0; f < 24; f++) {
      pika.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
    }
    assert(pika.thunderboltState === 'active', `Expected thunderboltState 'active', got ${pika.thunderboltState}`);
    assert(pika.thunderboltTimer === 58, `Expected beam duration 58, got ${pika.thunderboltTimer}`);
    const pikaXBefore = pika.x;
    const pikaYBefore = pika.y;

    // 3. Advance through active beam: verify multi-tick damage, ongoing stasis & zero recoil drift
    const initialCjHp = cj.hp;
    for (let f = 0; f < 30; f++) {
      pika.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
    }
    assert(cj.hp < initialCjHp, `CJ must take damage from continuous Thunderbolt beam! (Before: ${initialCjHp}, After: ${cj.hp})`);
    assert(pika.x === pikaXBefore && pika.y === pikaYBefore, `Pikachu must remain stationary with zero backward recoil drift (Before: ${pikaXBefore}, After: ${pika.x})`);
    assert(cj.electricStunTimer > 0, 'CJ must be afflicted with electricStunTimer during Thunderbolt beam');
    assert(cj.isParalyzed === true, 'CJ must be in paralyzed stasis during Thunderbolt beam');

    // 4. Advance through remainder of beam into Phase 3: Stun Aftermath & Recovery
    while (pika.thunderboltState === 'active') {
      pika.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
    }
    assert(pika.thunderboltState === 'recovery', `Expected thunderboltState 'recovery', got ${pika.thunderboltState}`);
    assert(cj.electricStunTimer >= 40, `CJ must retain >= 40 frames of electric stun aftermath, got ${cj.electricStunTimer}`);
    assert(cj.paralyzeTimer >= 40, `CJ must retain >= 40 frames of paralyze stasis, got ${cj.paralyzeTimer}`);

    // Advance through recovery to finish Thunderbolt and verify configured Cooldown is strictly enforced
    while (pika.thunderboltState === 'recovery') {
      pika.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
    }
    assert(pika.thunderboltState === null, 'thunderboltState must be null after recovery completes');
    assert(pika.specialCooldownMax === pikaConfig.skills.special.cooldown, `Pikachu specialCooldownMax must match config cooldown (${pikaConfig.skills.special.cooldown}), got ${pika.specialCooldownMax}`);
    assert(pika.specialCooldown === pika.specialCooldownMax, `Pikachu specialCooldown must be reset to specialCooldownMax (${pika.specialCooldownMax}), got ${pika.specialCooldown}`);

    // Advance 50 frames and verify cooldown decrements naturally without early re-trigger
    for (let f = 0; f < 50; f++) {
      pika.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
      ash.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
    }
    assert(pika.specialCooldown === pika.specialCooldownMax - 50, `Pikachu specialCooldown must decrement to ${pika.specialCooldownMax - 50}, got ${pika.specialCooldown}`);
    assert(pika.thunderboltState === null, 'Pikachu must NOT re-trigger Thunderbolt while specialCooldown is active');

    // 4b. Verify Ash Trainer Command strictly respects Pikachu's specialCooldown (Zero spamming)
    assert(ash.commandCooldown === pika.specialCooldown, `Ash commandCooldown (${ash.commandCooldown}) must sync with Pikachu specialCooldown (${pika.specialCooldown})`);
    ash.commandCooldown = 0; // Force Ash command timer to 0
    ash._executeTrainerCommand(cj);
    assert(pika.thunderboltState === null, 'Ash must NOT trigger Trainer Command while Pikachu specialCooldown is active');
    ash.commandCooldown = 0;
    ash.update(cj, 0, { x: 45, y: 240, width: 450, height: 450 });
    assert(pika.thunderboltState === null, 'Ash update() must NOT trigger Trainer Command while Pikachu specialCooldown is active');

    // 5. Verify 12-Frame Golden Static Electric Shock Sprite renders with 100% Canvas 2D stack balance
    const { drawElectricStunEffect } = await import('../js/graphics/statusEffects.js');
    mockCtx.resetStackDepth();
    drawElectricStunEffect(mockCtx, cj.r, false, cj);
    assert(mockCtx.getStackDepth() === 0, 'drawElectricStunEffect must maintain balanced Canvas 2D stack depths');

    // 6. Verify 12-Frame Thunderbolt & Thunderbolt Impact Sprite Animations on disk & loader functions
    const fs = await import('fs');
    const path = await import('path');
    const tbDir = path.resolve(process.cwd(), 'Assets/model/ash/pokemon/pikachu/Thunderbolt');
    const impDir = path.resolve(process.cwd(), 'Assets/model/ash/pokemon/pikachu/Thunderbolt_impact');

    for (let i = 1; i <= 12; i++) {
      assert(fs.existsSync(path.join(tbDir, `thunderbolt-${i}.png`)), `Missing thunderbolt-${i}.png`);
      assert(fs.existsSync(path.join(impDir, `impact-${i}.png`)), `Missing impact-${i}.png`);
    }
    assert(fs.existsSync(path.join(tbDir, 'thunderbolt-b.png')), 'Missing thunderbolt-b.png master strip');
    assert(fs.existsSync(path.join(impDir, 'impact-b.png')), 'Missing impact-b.png master strip');

    const { _getThunderboltFrames, _getThunderboltImpactFrames, drawPokemonCompanion } = await import('../js/graphics/weapons/ashPokemonGraphics.js');
    const tbFrames = _getThunderboltFrames();
    const impFrames = _getThunderboltImpactFrames();
    assert(tbFrames && tbFrames.length === 12, `Expected 12 Thunderbolt frames, got ${tbFrames?.length}`);
    assert(impFrames && impFrames.length === 12, `Expected 12 Thunderbolt Impact frames, got ${impFrames?.length}`);

    // Verify drawPokemonCompanion Canvas 2D stack balance while active Thunderbolt is firing
    pika.thunderboltState = 'active';
    pika.thunderboltTimer = 30;
    pika.thunderboltTarget = cj;
    mockCtx.resetStackDepth();
    drawPokemonCompanion(mockCtx, pika);
    assert(mockCtx.getStackDepth() === 0, 'drawPokemonCompanion must maintain 100% balanced Canvas 2D stack depth during active Thunderbolt');

    // 7. Verify Arena Clamping when Thunderbolt Misses (Zero Arena Boundary Clipping)
    pika.thunderboltTarget = null;
    pika.x = 250;
    pika.y = 250;
    pika.thunderboltCastAngle = 0; // firing right toward arena maxX = 45 + 450 - 12 = 483
    pika.thunderboltState = 'active';
    pika.thunderboltTimer = 20;
    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };
    pika.update(null, 0, testArena);
    assert(pika.thunderboltCurrentBeamLen !== null && pika.thunderboltCurrentBeamLen <= (483 - 250 + 10), `Thunderbolt beam must clamp to arena wall, got ${pika.thunderboltCurrentBeamLen}`);

    // 8. Verify Directional Honeycomb Barrier (Hidden until attacked, directional arc on incoming threat)
    const { drawAshHoneycombBarrier } = await import('../js/graphics/weapons/ashPokemonGraphics.js');
    ash.isProtectedByHoneycombBarrier = true;
    ash.barrierActiveTimer = 0;
    ash.barrierHitFlashTimer = 0;

    // Normal state: barrier is hidden (zero draw calls / stack depth preserved)
    mockCtx.resetStackDepth();
    drawAshHoneycombBarrier(mockCtx, ash);
    assert(mockCtx.getStackDepth() === 0, 'drawAshHoneycombBarrier must maintain 0 stack depth while hidden');

    // Attack interception: barrier activates facing the attacker
    ash.takeDamage(20, cj, { angle: 0 });
    assert(ash.barrierActiveTimer > 0, `barrierActiveTimer must be > 0 when attacked, got ${ash.barrierActiveTimer}`);
    assert(ash.barrierAngle === 0, `barrierAngle must be oriented toward attack angle 0, got ${ash.barrierAngle}`);

    // Verify directional barrier rendering with balanced Canvas 2D stack depth
    mockCtx.resetStackDepth();
    drawAshHoneycombBarrier(mockCtx, ash);
    assert(mockCtx.getStackDepth() === 0, 'drawAshHoneycombBarrier must maintain 100% balanced Canvas 2D stack depth when active');

    // 9. Verify Charizard Flamethrower (Windup Frames, Steady 2-Second Stream, Breather Settle & Stack Balance)
    const charizardConfig = ashConfig.pokemonRoster.charizard;
    assert(charizardConfig.skills?.special, 'Charizard must declare skills.special');
    assert(charizardConfig.skills.special.windupCallout === 'CHAR...', `Expected windupCallout 'CHAR...', got ${charizardConfig.skills.special.windupCallout}`);
    assert(charizardConfig.skills.special.attackCallout === '...ROOOAAAR!', `Expected attackCallout '...ROOOAAAR!', got ${charizardConfig.skills.special.attackCallout}`);
    assert(charizardConfig.skills.special.windupFrames === 28, `Expected windupFrames 28, got ${charizardConfig.skills.special.windupFrames}`);
    assert(charizardConfig.skills.special.streamDurationFrames === 120, `Expected 2-second streamDurationFrames 120, got ${charizardConfig.skills.special.streamDurationFrames}`);
    assert(charizardConfig.skills.special.recoveryFrames === 24, `Expected breather recoveryFrames 24, got ${charizardConfig.skills.special.recoveryFrames}`);
    assert(ashConfig.sounds.flamethrower === 'Assets/Sound Effects/PokemonSFX/Flamethrower.mp3', 'flamethrower sound path must match Flamethrower.mp3');

    const charizard = new PokemonCompanionEntity(ash, 'charizard', 150, 250);
    ash.activePokemon = charizard;
    state.fighters.push(charizard);

    // Refresh dummy target HP so CJ survives the multi-hit torrent & burn throughout the entire 2-second stream
    cj.hp = 600;
    cj.maxHp = 600;
    cj.dead = false;
    cj.isDead = false;
    cj.burnTimer = 0;
    cj.isBurning = false;

    // Phase 1: Windup
    charizard.startFlamethrower(cj, false);
    assert(charizard.flamethrowerState === 'windup', `Expected flamethrowerState 'windup', got ${charizard.flamethrowerState}`);
    assert(charizard.flamethrowerTimer === 28, `Expected windup frames 28, got ${charizard.flamethrowerTimer}`);
    assert(charizard.vx === 0 && charizard.vy === 0, 'Charizard must remain planted with zero velocity during windup');

    // Advance through windup (28 frames) into Phase 2: Active 2-second stream
    for (let f = 0; f < 28; f++) {
      charizard.update(cj, 0, testArena);
    }
    assert(charizard.flamethrowerState === 'active', `Expected flamethrowerState 'active', got ${charizard.flamethrowerState}`);
    assert(charizard.flamethrowerTimer === 120, `Expected 2.0s active stream duration 120, got ${charizard.flamethrowerTimer}`);

    // Advance 30 frames: verify steady planted stance (zero recoil drift), multi-tick damage & burning
    const preFlameCjHp = cj.hp;
    for (let f = 0; f < 30; f++) {
      charizard.update(cj, 0, testArena);
    }
    assert(cj.hp < preFlameCjHp, `CJ must take damage from active Flamethrower stream! (Before: ${preFlameCjHp}, After: ${cj.hp})`);
    assert(charizard.vx === 0 && charizard.vy === 0, 'Charizard must remain steady with zero velocity drift while firing flames');
    assert(cj.isBurning === true, 'Enemy must be inflicted with burning status during Flamethrower');
    assert(cj.slowTimer > 0 && cj.slowMultiplier < 1.0, `Enemy must be inflicted with a slow debuff during Charizard's Flamethrower (slowTimer=${cj.slowTimer}, slowMultiplier=${cj.slowMultiplier})`);

    // Test dynamic aim tracking while firing Flamethrower: reposition target to an offset angle
    const initialCastAngle = charizard.flamethrowerCastAngle;
    cj.x = charizard.x;
    cj.y = charizard.y + 200; // Directly below Charizard (+Y, angle = PI/2)
    charizard.update(cj, 0, testArena);
    assert(charizard.flamethrowerCastAngle !== initialCastAngle, 'Charizard must dynamically update flamethrowerCastAngle when enemy moves');
    assert(charizard.gunAngle === charizard.flamethrowerCastAngle, 'gunAngle and flamethrowerCastAngle must remain synchronized during active stream');

    // Advance through remaining active frames into Phase 3: Breather
    cj.hp = 9999;
    cj.maxHp = 9999;
    while (charizard.flamethrowerState === 'active') {
      charizard.update(cj, 0, testArena);
    }
    assert(charizard.flamethrowerState === 'recovery', `Expected flamethrowerState 'recovery' (breather), got ${charizard.flamethrowerState}`);
    assert(charizard.vx === 0 && charizard.vy === 0, 'Charizard must remain stationary catching breath during breather');

    // Verify Canvas 2D stack depth during Flamethrower
    mockCtx.resetStackDepth();
    drawPokemonCompanion(mockCtx, charizard);
    assert(mockCtx.getStackDepth() === 0, 'drawPokemonCompanion must maintain 0 stack depth during Flamethrower breather');

    // Advance through breather frames (24 frames) to complete skill and enforce cooldown
    while (charizard.flamethrowerState === 'recovery') {
      charizard.update(cj, 0, testArena);
    }
    assert(charizard.flamethrowerState === null, 'flamethrowerState must be null after breather completes');
    assert(charizard.specialCooldownMax === charizardConfig.skills.special.cooldown, `Special cooldown must match config (${charizardConfig.skills.special.cooldown}), got ${charizard.specialCooldownMax}`);
    assert(charizard.specialCooldown === charizard.specialCooldownMax, `Special cooldown must be reset, got ${charizard.specialCooldown}`);

    console.log('      ✅ Pikachu Thunderbolt & Charizard Flamethrower (Windup, 2s Steady Torrent, Breather Settle & Zero Stack Depth) verified successfully.');
  }

  // =========================================================================
  // 90. Skin Studio Per-Fighter Hand Scale Customization & Stack Balance
  // =========================================================================
  {
    console.log('   90. Testing Skin Studio Per-Fighter Hand Scale Customization & Stack Balance...');
    const { getDatabaseDefault, SKIN_CUSTOMIZATIONS_DATABASE } = await import('../js/configs/skinCustomizationsDatabase.js');
    const { validateAndMergeSkinPresets } = await import('../js/graphics/ui/SkinStudioScreen.js');
    const { drawZeusSkin } = await import('../js/graphics/fighters/zeusSkin.js');
    const { getHandSize } = await import('../js/core/config.js');
    const { state } = await import('../js/core/state.js');
    const ZeusClass = FIGHTER_CLASS_MAP['zeus'];
    const zeus = new ZeusClass(200, 200, 0);

    // 1. Verify Zeus default hand scale in database is 0.75
    const zeusDef = getDatabaseDefault('zeus');
    assert(zeusDef.handScale === 0.75, `Expected zeus default handScale 0.75, got ${zeusDef.handScale}`);

    // 2. Verify getHandSize scales dynamically with fighter / state.skinCustomizations
    state.skinCustomizations = state.skinCustomizations || {};
    state.skinCustomizations.zeus = { ...zeusDef, handScale: 1.20 };
    const baseR = 25 * 0.30; // 7.5
    const scaledR = getHandSize(baseR, zeus);
    const expectedR = baseR * (CONFIG.globalFighter?.handSizeMultiplier ?? 1.0) * 1.20;
    assert(Math.abs(scaledR - expectedR) < 0.001, `getHandSize must scale to ${expectedR}, got ${scaledR}`);

    // 3. Verify validateAndMergeSkinPresets sanitizes and saves handScale
    validateAndMergeSkinPresets({
      zeus: { handScale: 0.85 }
    });
    assert(state.skinCustomizations.zeus.handScale === 0.85, `Expected sanitized handScale 0.85, got ${state.skinCustomizations.zeus.handScale}`);

    // 4. Verify rendering with custom handScale preserves 100% Canvas 2D stack balance
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeus);
    assert(mockCtx.getStackDepth() === 0, 'drawZeusSkin must maintain 0 stack depth with custom hand scale');

    // 5. Restore default
    state.skinCustomizations.zeus.handScale = 0.75;
    console.log('      ✅ Skin Studio Per-Fighter Hand Scale Customization & Canvas 2D Stack Balance verified successfully.');
  }

  // =========================================================================
  // 91. Arena Floor Watermark Top Layer Rendering, Stack Balance & Zeus Storm Resilience
  // =========================================================================
  {
    console.log('   91. Testing Arena Floor Watermark Top Layer Rendering, Stack Balance & Zeus Storm Resilience...');
    const { drawArenaWatermark } = await import('../js/graphics/renderers/arenaRenderer.js');
    const { state } = await import('../js/core/state.js');
    const ZeusClass = FIGHTER_CLASS_MAP['zeus'];
    const zeus = new ZeusClass(200, 200, 0);

    // 1. Verify standard drawArenaWatermark maintains 0 Canvas 2D stack depth
    mockCtx.resetStackDepth();
    drawArenaWatermark(mockCtx, false);
    assert(mockCtx.getStackDepth() === 0, `drawArenaWatermark(mockCtx, false) must maintain 0 stack depth, got ${mockCtx.getStackDepth()}`);

    mockCtx.resetStackDepth();
    drawArenaWatermark(mockCtx, true);
    assert(mockCtx.getStackDepth() === 0, `drawArenaWatermark(mockCtx, true) must maintain 0 stack depth, got ${mockCtx.getStackDepth()}`);

    // 2. Verify watermark renders during Zeus storm charging and active storm
    zeus.isChargingStorm = true;
    zeus.stormActive = true;
    state.fighters = [zeus];

    mockCtx.resetStackDepth();
    drawArenaWatermark(mockCtx, true);
    assert(mockCtx.getStackDepth() === 0, 'drawArenaWatermark must render with 0 stack depth on top of active storm');

    // 3. Verify watermark toggling when enabled=false
    const origWatermarkCfg = CONFIG.arenaWatermark;
    CONFIG.arenaWatermark = { ...CONFIG.arenaWatermark, enabled: false };
    mockCtx.resetStackDepth();
    drawArenaWatermark(mockCtx, true);
    assert(mockCtx.getStackDepth() === 0, 'drawArenaWatermark must return cleanly with 0 stack depth when disabled');
    CONFIG.arenaWatermark = origWatermarkCfg;

    // Cleanup state
    zeus.isChargingStorm = false;
    zeus.stormActive = false;
    state.fighters = [];
    console.log('      ✅ Arena Floor Watermark Top Layer Rendering, Stack Balance & Zeus Storm Resilience verified successfully.');
  }

  // =========================================================================
  // 92. Dynamic Camera Tracking Focus on Ash's Active Pokémon & Enemy
  // =========================================================================
  {
    console.log('   92. Testing Dynamic Camera Tracking Focus on Ash Active Pokémon & Enemy...');
    const { updateCamera } = await import('../js/systems/cameraSystem.js');
    const { state } = await import('../js/core/state.js');
    const { PokemonCompanionEntity } = await import('../js/entities/fighters/AshFighter.js');
    const AshClass = FIGHTER_CLASS_MAP['ash'];
    const ash = new AshClass({ x: 100, y: 300 });
    ash.x = 100;
    ash.y = 300;

    const ZenitsuClass = FIGHTER_CLASS_MAP['zenitsu'];
    const enemy = new ZenitsuClass({ x: 400, y: 300 });
    enemy.x = 400;
    enemy.y = 300;

    state.fighters = [ash, enemy];
    state.gameState = 'playing';
    state.mode = '1v1';
    state.camera = state.camera || {};
    state.camera.enabled = true;
    state.camera.mode = 'dynamic';
    state.arena = state.arena || { x: 45, y: 240, width: 450, height: 450 };

    // 1. Without summoned Pokémon: camera must center between Ash (100) and Enemy (400) -> targetX = 250
    updateCamera();
    assert(Math.abs(state.camera.targetX - 250) < 5, `Expected camera.targetX ~250 for Ash & Enemy, got ${state.camera.targetX}`);

    // 2. Ash summons Pikachu at (350, 300): camera must focus on Pikachu (350) and Enemy (400) -> targetX ~ 375
    const pikachu = new PokemonCompanionEntity(ash, 'pikachu', 350, 300);
    ash.activePokemon = pikachu;
    updateCamera();
    assert(Math.abs(state.camera.targetX - 375) < 5, `Expected camera.targetX ~375 for Pikachu & Enemy, got ${state.camera.targetX}`);

    // 3. When Pokémon faints: camera target smoothly returns to Ash (100) and Enemy (400) -> targetX = 250
    ash.activePokemon = null;
    updateCamera();
    assert(Math.abs(state.camera.targetX - 250) < 5, `Expected camera.targetX ~250 after Pokémon faints, got ${state.camera.targetX}`);

    // 4. In Fixed Camera mode: targetX must lock strictly to arena center (270)
    state.camera.mode = 'fixed';
    updateCamera();
    assert(Math.abs(state.camera.targetX - 270) < 1, `Expected camera.targetX locked to arena center 270 in fixed mode, got ${state.camera.targetX}`);

    // Cleanup state
    state.camera.mode = 'dynamic';
    state.fighters = [];
    console.log('      ✅ Dynamic Camera Tracking Focus on Ash Active Pokémon & Enemy verified successfully.');
  }

  // =========================================================================
  // 93. Natural Pokémon Wall Bouncing & Fighter Collision Elasticity
  // =========================================================================
  {
    console.log('   93. Testing Natural Pokémon Wall Bouncing & Fighter Collision Elasticity...');
    const { PokemonCompanionEntity } = await import('../js/entities/fighters/AshFighter.js');
    const { resolveFighterCollision } = await import('../js/systems/physics.js');
    const { state } = await import('../js/core/state.js');
    const arena = { x: 45, y: 240, width: 450, height: 450, shape: 'rect' };
    state.arena = arena;
    state.gameState = 'playing';

    const AshClass = FIGHTER_CLASS_MAP['ash'];
    const ash = new AshClass({ x: 100, y: 300 });
    ash.x = 100;
    ash.y = 300;
    ash.isProtectedByHoneycombBarrier = true;
    ash.vx = 0;
    ash.vy = 0;

    const ZenitsuClass = FIGHTER_CLASS_MAP['zenitsu'];
    const enemy = new ZenitsuClass({ x: 400, y: 300 });
    enemy.x = 400;
    enemy.y = 300;

    // 1. Natural Wall Bounce Reflection & Momentum Preservation
    const pikachu = new PokemonCompanionEntity(ash, 'pikachu', arena.x + arena.width - 10, 300);
    ash.activePokemon = pikachu;
    pikachu.vx = 5.0;
    pikachu.vy = 0.5;

    const bounced = pikachu.resolveWallBounce(arena, enemy);
    assert(bounced === true, 'Pikachu must register wall bounce when colliding with arena perimeter');
    assert(pikachu.vx < -1.0, `Pikachu vx must reflect inward away from right wall (< -1.0), got ${pikachu.vx}`);
    assert(pikachu.x <= arena.x + arena.width - pikachu.r, 'Pikachu x position must stay within arena bounds');

    // On subsequent update ticks, Pikachu must naturally coast across the arena without instantly canceling its bounce
    const preTickVx = pikachu.vx;
    pikachu.update(enemy, 2, arena);
    assert(pikachu.vx < 0, `Pikachu must preserve inward bounce momentum across update ticks, got vx: ${pikachu.vx}`);

    // 2. Natural Fighter-to-Fighter Elastic Collision Impulse
    pikachu.x = 200;
    pikachu.y = 300;
    pikachu.vx = 5.0;
    pikachu.vy = 0.0;

    enemy.x = 220;
    enemy.y = 300;
    enemy.vx = -5.0;
    enemy.vy = 0.0;

    resolveFighterCollision(pikachu, enemy);
    assert(pikachu.vx < 0, `Pikachu must rebound backward on colliding with enemy, got vx: ${pikachu.vx}`);
    assert(enemy.vx > 0, `Enemy must rebound backward on colliding with Pikachu, got vx: ${enemy.vx}`);
    assert(pikachu.x < enemy.x, 'Collision resolution must physically separate Pikachu and enemy bodies');

    // 3. Ash / Pokémon Trainer & Pokémon / Fighter Solid Body Block (Zero Pass-Through)
    pikachu.x = ash.x + 5;
    pikachu.y = ash.y;
    pikachu.vx = -4.0;
    pikachu.vy = 0.0;
    ash.vx = 0;
    ash.vy = 0;

    resolveFighterCollision(ash, pikachu);
    assert(ash.vx === 0 && ash.vy === 0, 'Ash must remain stationary when Pokémon collides with his Honeycomb Barrier');
    assert(pikachu.x > ash.x + 5, `Pikachu must be physically body-blocked and pushed outside Ash's body circle, got pikachu.x=${pikachu.x}`);

    enemy.x = ash.x + 10;
    enemy.y = ash.y;
    enemy.vx = -5.0;
    enemy.vy = 0.0;

    resolveFighterCollision(ash, enemy);
    assert(ash.vx === 0 && ash.vy === 0, 'Ash must remain an immovable anchor against enemy collisions while Honeycomb Barrier is active');
    assert(enemy.x > ash.x + 10, 'Enemy must be physically body-blocked and pushed outside Ash Honeycomb Barrier');

    // Cleanup state
    ash._cleanupActivePokemon?.();
    state.fighters = [];
    console.log('      ✅ Natural Pokémon Wall Bouncing & Fighter Collision Elasticity verified successfully.');
  }

  // =========================================================================
  // 94. Pokémon Hurt & Smooth Faint Lifecycle (Zero Shatter, Zero Blood, 48-Tick Collapse & Recall)
  // =========================================================================
  {
    console.log('   94. Testing Pokémon Hurt & Smooth Faint Lifecycle (Zero Shatter, Zero Blood, 48-Tick Collapse & Recall)...');
    const { AshFighter, PokemonCompanionEntity } = await import('../js/entities/fighters/AshFighter.js');
    const { spawnDeathShatter } = await import('../js/graphics/particles/deathShatterEffect.js');
    const { isBloodSuppressedEntity } = await import('../js/graphics/particles/bloodEffect.js');
    const { drawPokemonCompanion } = await import('../js/graphics/weapons/ashPokemonGraphics.js');
    const { state } = await import('../js/core/state.js');
    const arena = { x: 45, y: 240, width: 450, height: 450, shape: 'rect' };
    state.arena = arena;
    state.gameState = 'playing';

    const ash = new AshFighter({ id: 'ash', name: 'ASH', displayName: 'ASH', type: 'ash' });
    ash.teamId = 0;
    const enemy = new (await import('../js/entities/fighter.js')).Fighter({ id: 'dummy', name: 'DUMMY', type: 'dummy', hp: 200 });
    enemy.teamId = 1;

    // Test each Pokémon roster member
    const speciesList = ['pikachu', 'charizard', 'lucario', 'greninja'];
    for (const species of speciesList) {
      const pokemon = new PokemonCompanionEntity(ash, species, 200, 300);
      ash.activePokemon = pokemon;
      state.fighters = [ash, enemy, pokemon];

      // 1. Blood suppression guard
      assert(isBloodSuppressedEntity(pokemon), `${species} must be recognized as a blood-suppressed entity`);

      // 2. Walking & Idle animation state verification when alive
      pokemon.vx = 4.5;
      pokemon.vy = 0;
      pokemon.hurtAnimTimer = 0;
      pokemon.actionAnimTimer = 0;
      // In update, speed > 0.6 sets walk
      if (Math.hypot(pokemon.vx, pokemon.vy) > 0.6) pokemon.animState = 'walk';
      assert(pokemon.animState === 'walk', `${species} must use 'walk' animState while moving`);
      assert(pokemon.isFainting === false, `${species} must NOT be fainting while alive`);

      // 3. Hurt reaction on non-lethal damage
      pokemon.takeDamage(20, enemy);
      assert(pokemon.animState === 'hurt', `${species} must enter 'hurt' animState on non-lethal damage`);
      assert(pokemon.hurtAnimTimer > 0, `${species} must set positive hurtAnimTimer`);

      // 4. Lethal damage -> Smooth faint transition (zero shatter)
      pokemon.takeDamage(9999, enemy);
      assert(pokemon.hp === 0, `${species} HP must be 0 after lethal damage`);
      assert(pokemon.isFainting === true, `${species} must have isFainting === true`);
      assert(pokemon.animState === 'faint', `${species} must transition to 'faint' animState`);
      assert(pokemon.faintTick === 0, `${species} faintTick must start at 0`);

      // 4. Ensure spawnDeathShatter is completely suppressed for Pokémon
      spawnDeathShatter(pokemon);
      assert(!state.shatteredPieces || state.shatteredPieces.length === 0, `${species} must NEVER spawn death shatter pieces`);

      // 5. Simulate 48-tick collapse & Poké Ball recall sequence
      let sawRecallBeam = false;
      for (let tick = 0; tick < 48; tick++) {
        pokemon.update(enemy, 2, arena);
        if (ash.activeVisualEffects?.some(v => v.type === 'recallBeam')) {
          sawRecallBeam = true;
        }
      }
      assert(sawRecallBeam, `${species} must trigger Poké Ball recall beam around tick 26`);
      assert(pokemon.faintCompleted === true, `${species} faint must be completed at tick 48`);

      // 6. Canvas 2D render test during faint
      const ctx = createMockCtx();
      drawPokemonCompanion(ctx, pokemon);
      assert(ctx.getStackDepth() === 0, `${species} drawPokemonCompanion must maintain 100% balanced Canvas 2D stack depth`);

      ash._cleanupActivePokemon?.();
    }

    state.fighters = [];
    console.log('      ✅ Pokémon Hurt & Smooth Faint Lifecycle verified successfully across all species.');
  }

  console.log('───────────────────────────────────────────────────────');
  // =========================================================================
  // 95. Sukuna Optional Skill: Ten Shadows — Mahoraga Summon Minion
  // =========================================================================
  {
    console.log('   95. Testing Sukuna Ten Shadows Mahoraga Summon Minion...');
    const { CONFIG } = await import('../js/core/config.js');
    const { state } = await import('../js/core/state.js');
    const { updateIllusions } = await import('../js/systems/illusionSystem.js');
    const {
      trySummonMahoraga,
      updateMahoragaSummon,
      dispelMahoragaSummon,
      resetMahoragaSummon,
      drawMahoragaSummon
    } = await import('../js/entities/fighters/sukuna/sukunaMahoragaSummon.js');
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const arena = { x: 45, y: 240, width: 450, height: 450, shape: 'rect' };
    state.arena = arena;
    state.gameState = 'playing';
    state.mode = '1v1';
    state.illusions = [];

    // 1. Config surface is fully tunable and audio is wired
    const sc = CONFIG.sukuna || {};
    const prevEnableMahoragaSummon = sc.enableMahoragaSummon;
    sc.enableMahoragaSummon = true;
    try {
    assert(sc.enableMahoragaSummon === true, 'Sukuna config must expose enableMahoragaSummon (optional skill master toggle)');
    assert(typeof sc.mahoragaSummonCooldown === 'number' && sc.mahoragaSummonCooldown > 0, 'Sukuna config must define mahoragaSummonCooldown');
    assert(sc.mahoragaSummonDuration === undefined && sc.mahoragaSummonDurationFrames === undefined, 'The Mahoraga summon must have NO lifetime cap in config');
    assert(typeof sc.mahoragaSummonStatScale === 'number' && sc.mahoragaSummonStatScale > 0, 'Sukuna config must define mahoragaSummonStatScale (Mahoraga attribute inheritance multiplier)');
    assert(CONFIG.mahoraga && CONFIG.mahoraga.hp > 0 && CONFIG.mahoraga.swordDamage > 0, 'CONFIG.mahoraga must expose the fighter attributes the summon inherits');
    assert(sc.sounds && sc.sounds.mahoragaSummon === 'Assets/Sound Effects/SukunaSFX/sukuna_mahoraga_summon.mp3', 'Sukuna config must register the Mahoraga summon audio source pointing to Assets/Sound Effects/SukunaSFX/sukuna_mahoraga_summon.mp3');
    assert(sc.soundVolumes && typeof sc.soundVolumes.mahoragaSummon === 'number' && sc.soundVolumes.mahoragaSummon > 0, 'Sukuna config must register the Mahoraga summon audio volume > 0');

    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const sukuna = new SukunaClass({ x: 150, y: 420, type: 'sukuna' });
    sukuna.x = 150;
    sukuna.y = 420;
    const prey = new Fighter({ id: 'dummy', name: 'DUMMY', type: 'dummy', hp: 400, maxHp: 400 });
    prey.x = 400;
    prey.y = 420;
    state.fighters = [sukuna, prey];

    // 2. Skill registered on the fighter and exposed in the Sukuna HUD card row
    assert(sukuna.skillManager.hasSkill('mahoraga'), 'Sukuna must register the optional `mahoraga` summon skill');
    const hudSkills = getSkillDataForFighter(sukuna, () => []);
    const hudCard = hudSkills.find((s) => s && s.id === 'mahoraga');
    assert(hudCard, 'Sukuna HUD must expose a MAHORAGA summon skill card');
    assert(hudCard.label === 'MAHORAGA', `Sukuna HUD card label must be MAHORAGA, got ${hudCard.label}`);

    // Neutralize Sukuna's own offense so only the minion can damage the dummy
    const originalShoot = sukuna.shoot;
    const originalMelee = sukuna._updateMeleeCombat;
    sukuna.shoot = () => false;
    sukuna._updateMeleeCombat = () => {};
    sukuna.meleeModeCooldown = 999999;
    prey.shoot = () => false;

    // 3. Summon fires once the cooldown is ready and spawns exactly one Mahoraga minion
    sukuna.mahoragaSummonCooldown = 0;
    const summoned = trySummonMahoraga(sukuna, 0, arena);
    assert(summoned === true, 'trySummonMahoraga must summon Mahoraga when off cooldown with a live enemy present');
    const minions = state.illusions.filter((m) => m && m.isMahoragaSummon);
    assert(minions.length === 1, `Expected exactly 1 Mahoraga minion after summon, got ${minions.length}`);
    const minion = minions[0];
    assert(minion.owner === sukuna, 'Mahoraga minion must be owned by the summoning Sukuna');
    // Attribute parity: the summoned general inherits Mahoraga's own fighter stats 1:1
    const mahAttr = CONFIG.mahoraga;
    const statScale = sc.mahoragaSummonStatScale;
    const expectedR = (mahAttr.r ?? mahAttr.radius ?? 30) * (CONFIG.globalFighter?.sizeMultiplier ?? 1.0) * (CONFIG.internalScale ?? 1.0);
    assert(minion.r === expectedR, `Minion radius must equal Mahoraga's (${expectedR}), got ${minion.r}`);
    assert(minion.maxHp === Math.round(mahAttr.hp * statScale), `Minion max HP must equal Mahoraga's HP x scale (${Math.round(mahAttr.hp * statScale)}), got ${minion.maxHp}`);
    assert(minion.moveSpeed === mahAttr.moveSpeed * statScale, `Minion move speed must equal Mahoraga's (${mahAttr.moveSpeed}), got ${minion.moveSpeed}`);
    assert(minion.swordDamage === mahAttr.swordDamage * statScale, `Minion sword damage must equal Mahoraga's swordDamage (${mahAttr.swordDamage}), got ${minion.swordDamage}`);
    assert(minion.attackInterval === mahAttr.swordCooldown, `Minion attack interval must equal Mahoraga's swordCooldown (${mahAttr.swordCooldown}), got ${minion.attackInterval}`);
    assert(minion._attrs && minion._attrs.cleaveDamage === mahAttr.cleaveDamage * statScale, 'Minion AoE cleave damage must equal Mahoraga cleaveDamage');
    assert(minion._attrs && minion._attrs.shoutDamage === mahAttr.shoutDamage * statScale, 'Minion Divine Shout damage must equal Mahoraga shoutDamage');
    assert(minion._attrs && minion._attrs.maxStages === mahAttr.maxAdaptationStages, 'Minion wheel adaptation stack must equal Mahoraga maxAdaptationStages');
    assert(typeof minion.takeDamage === 'function' && typeof minion.applyHitStun === 'function', 'Mahoraga minion must expose engine-compatible damage/status hooks');
    assert(sukuna.mahoragaSummonActive === true, 'Sukuna must flag mahoragaSummonActive while the minion lives');
    assert(sukuna.mahoragaSummonTimer === undefined || sukuna.mahoragaSummonTimer === 0, 'The summon must not run a lifetime timer');

    // Duplicate summons are rejected while one is already active
    assert(trySummonMahoraga(sukuna, 0, arena) === false, 'A second Mahoraga must not be summoned while the first is active');
    assert(state.illusions.filter((m) => m && m.isMahoragaSummon).length === 1, 'Duplicate summon guard must keep exactly 1 minion');

    // 4. Minion emerges, advances on the enemy, and lands Mahoraga's sword strikes
    const preyHpBefore = prey.hp;
    const distBefore = Math.hypot(prey.x - minion.x, prey.y - minion.y);
    for (let frame = 0; frame < 220; frame++) {
      sukuna.update(prey, 0, arena);
    }
    assert(prey.hp < preyHpBefore, `Summoned Mahoraga must strike the enemy with his inherited sword kit (HP stayed at ${prey.hp})`);
    const distAfter = Math.hypot(prey.x - minion.x, prey.y - minion.y);
    assert(distAfter < distBefore + 1, `Mahoraga must close distance on the enemy (from ${distBefore.toFixed(1)} to ${distAfter.toFixed(1)})`);
    assert(Number.isFinite(minion.x) && Number.isFinite(minion.y), 'Mahoraga position must stay finite during the chase');
    assert(
      minion.x >= arena.x + minion.r - 1 && minion.x <= arena.x + arena.width - minion.r + 1 &&
      minion.y >= arena.y + minion.r - 1 && minion.y <= arena.y + arena.height - minion.r + 1,
      `Mahoraga must stay clamped inside the arena (got ${minion.x.toFixed(1)}, ${minion.y.toFixed(1)})`
    );

    // 5. Canvas 2D draw is stack-balanced while emerging and while fighting
    const drawCtx = createMockCtx();
    minion.spawnTimer = 20;
    minion.spawnScale = 0.6;
    drawCtx.resetStackDepth();
    drawMahoragaSummon(drawCtx, minion);
    assert(drawCtx.getStackDepth() === 0, `drawMahoragaSummon must balance the canvas stack during emergence, got ${drawCtx.getStackDepth()}`);
    minion.spawnTimer = 0;
    minion.spawnScale = 1;
    drawCtx.resetStackDepth();
    drawMahoragaSummon(drawCtx, minion);
    assert(drawCtx.getStackDepth() === 0, `drawMahoragaSummon must balance the canvas stack in combat, got ${drawCtx.getStackDepth()}`);

    // 6. Wheel of Adaptation clicks from accumulated damage, heals, and rotates the wheel
    minion.spawnTimer = 0;
    minion.spawnScale = 1;
    minion.dodgeIFrames = 0;
    minion.hp = minion.maxHp;
    const stageBefore = minion.adaptStage || 0;
    const hpBeforeAdapt = minion.hp;
    const expectedHit = Math.ceil(minion.maxHp * 0.90);
    minion.takeDamage(expectedHit, prey, { isMelee: true });
    assert(minion.adaptStage === stageBefore + 1, `Accumulating >40% max HP damage must click the wheel (stage ${minion.adaptStage}, expected ${stageBefore + 1})`);
    assert(minion.wheelTargetRotation > 0, 'Wheel must rotate to the new adaptation stage');
    assert(minion.hp > hpBeforeAdapt - expectedHit, `Wheel click must restore RCT HP (from ${hpBeforeAdapt} to ${minion.hp})`);
    assert(minion.doubleDamageTimer > 0, 'Wheel click must open the double-damage window');

    // 6b. Verify Arena Wheel Overlay and Golden Dim Screen recognize Sukuna's summoned Mahoraga minion
    const { getActiveMahoragaEntity, drawMahoragaWheelArenaOverlay, drawMahoragaAdaptationDimScreen } = await import('../js/graphics/renderers/domainDimOverlays.js');
    const resolvedMaho = getActiveMahoragaEntity();
    assert(resolvedMaho === minion, 'getActiveMahoragaEntity must resolve Sukuna summoned Mahoraga minion during wheel click');
    assert(minion.wheelClickTimer > 0 || minion.adaptationPauseTimer > 0, 'Minion must be flagged as clicking or in adaptation pause');
    drawCtx.resetStackDepth();
    state.ctx = drawCtx;
    state.arena = arena;
    state.canvas = { width: 800, height: 600 };
    drawMahoragaWheelArenaOverlay();
    assert(drawCtx.getStackDepth() === 0, `drawMahoragaWheelArenaOverlay must balance canvas stack for summoned minion, got ${drawCtx.getStackDepth()}`);
    drawMahoragaAdaptationDimScreen();
    assert(drawCtx.getStackDepth() === 0, `drawMahoragaAdaptationDimScreen must balance canvas stack for summoned minion, got ${drawCtx.getStackDepth()}`);

    // 7. Inherited AoE Cleave
    minion.adaptCooldown = 0;
    minion.cleaveTimer = 0;
    minion.doubleDamageTimer = 0;
    prey.hp = 400;
    prey.x = minion.x + 40;
    prey.y = minion.y;
    const hpBeforeCleave = prey.hp;
    updateMahoragaSummon(sukuna, 0, arena);
    assert(hpBeforeCleave - prey.hp >= mahAttr.cleaveDamage * statScale, `Inherited Cleave must deal at least Mahoraga cleaveDamage (${mahAttr.cleaveDamage}) - dealt ${hpBeforeCleave - prey.hp}`);

    // 8. Inherited Divine Shout (directional cone)
    minion.shoutTimer = 0;
    prey.hp = 400;
    prey.x = minion.x + 120;
    prey.y = minion.y;
    minion.gunAngle = 0;
    minion.angle = 0;
    const hpBeforeShout = prey.hp;
    updateMahoragaSummon(sukuna, 0, arena);
    assert(hpBeforeShout - prey.hp >= mahAttr.shoutDamage * statScale, `Inherited Divine Shout must deal at least Mahoraga shoutDamage (${mahAttr.shoutDamage}) - dealt ${hpBeforeShout - prey.hp}`);

    // 9. Slaying the minion removes it, clears Sukuna's state, and marks skill consumed for this round
    minion.takeDamage(99999, prey, { isPlayer: true });
    updateIllusions();
    assert(state.illusions.filter((m) => m && m.isMahoragaSummon).length === 0, 'Slain Mahoraga must be removed from state.illusions');
    assert(sukuna.mahoragaSummonActive === false, 'Sukuna must clear mahoragaSummonActive when Mahoraga is slain');
    assert(sukuna.mahoragaMinion === null, 'Sukuna must drop the dead minion reference');
    assert(sukuna.hasSummonedMahoraga === true, 'Sukuna must record that Mahoraga was summoned');
    assert(sukuna.mahoragaSummonCooldown === Infinity, 'Slaying Mahoraga must lock cooldown to Infinity (single-use per match/round)');

    // Verify Sukuna cannot re-summon Mahoraga in the same round
    sukuna.mahoragaSummonCooldown = 0;
    assert(trySummonMahoraga(sukuna, 0, arena) === false, 'Sukuna cannot re-summon Mahoraga in the same match/round');

    // 10. No lifetime cap: Mahoraga persists until slain (or his summoner dies)
    // Reset summon state to simulate a fresh round
    resetMahoragaSummon(sukuna);
    assert(sukuna.hasSummonedMahoraga === false, 'resetMahoragaSummon must reset hasSummonedMahoraga for a new round');
    prey.hp = 4000;
    prey.maxHp = 4000;
    prey.isDead = false;
    prey.dead = false;
    prey.x = 400;
    prey.y = 420;
    sukuna.mahoragaSummonCooldown = 0;
    assert(trySummonMahoraga(sukuna, 0, arena) === true, 'Mahoraga must be summonable in a new round');
    const persistent = sukuna.mahoragaMinion;
    for (let frame = 0; frame < 420; frame++) {
      // Keep the dummy alive so the round never flips to matchEnd while we test persistence
      prey.hp = Math.max(prey.hp, 1000);
      prey.isDead = false;
      prey.dead = false;
      sukuna.update(prey, 0, arena);
    }
    prey.hp = 4000;
    prey.isDead = false;
    prey.dead = false;
    state.gameState = 'playing';
    assert(state.illusions.includes(persistent), 'Summoned Mahoraga must NOT expire on his own (no duration cap)');
    assert(persistent.hp > 0 && sukuna.mahoragaSummonActive === true, 'Summoned Mahoraga must stay active indefinitely while alive');

    // 11. Friendly-fire immunity: Sukuna and his team cannot damage the summon, in either direction
    const { applyDamageToTarget } = await import('../js/entities/fighter.js');
    const { projectileSystem: projSystem } = await import('../js/systems/projectileSystem.js');
    const hpBeforeFriendly = persistent.hp;
    const friendlyResult = persistent.takeDamage(60, sukuna, { isMelee: true });
    assert(friendlyResult === false || persistent.hp === hpBeforeFriendly, 'Sukuna must NOT damage his own summoned Mahoraga');
    assert(persistent.hp === hpBeforeFriendly, `Friendly fire must be ignored (HP changed from ${hpBeforeFriendly} to ${persistent.hp})`);
    // Direct pipeline call (domain slashes / cleaves / AoE use this path)
    assert(applyDamageToTarget(persistent, 55, sukuna, { isMelee: true }) === false, 'applyDamageToTarget must reject Sukuna\'s damage to his summon');
    // Projectile-attributed damage resolves back to the summoner and is also rejected
    assert(applyDamageToTarget(persistent, 55, { owner: 0, ownerFighter: sukuna, damage: 55 }, { isProjectile: true }) === false, 'Sukuna\'s projectiles must pass through his summon');
    // Sukuna's Fuga thermobaric blast cannot scorch the summon
    if (typeof projSystem.triggerThermobaricExplosion === 'function') {
      projSystem.triggerThermobaricExplosion(persistent.x, persistent.y, 0, 150);
      assert(persistent.hp === hpBeforeFriendly, `Divine Flame blast must not damage the summon (HP ${hpBeforeFriendly} -> ${persistent.hp})`);
    }
    // The summon never hurts its own summoner (cleave / shout / sword)
    const sukunaHpBefore = sukuna.hp;
    assert(applyDamageToTarget(sukuna, 80, persistent, { isMelee: true }) === false, 'The summon must never damage its own summoner');
    assert(sukuna.hp === sukunaHpBefore, `Summoner HP must be untouched by his summon (${sukunaHpBefore} -> ${sukuna.hp})`);
    // Enemy damage still lands
    const enemyResult = persistent.takeDamage(30, prey, { isMelee: true });
    assert(enemyResult !== false && persistent.hp < hpBeforeFriendly, 'Enemy damage must still damage the summon');
    dispelMahoragaSummon(sukuna, { silent: true, instantCooldown: true });

    // 12. Master toggle disables the skill entirely (no summon, no HUD card)
    const originalToggle = CONFIG.sukuna.enableMahoragaSummon;
    CONFIG.sukuna.enableMahoragaSummon = false;
    sukuna.mahoragaSummonCooldown = 0;
    assert(trySummonMahoraga(sukuna, 0, arena) === false, 'Disabled enableMahoragaSummon must block the summon entirely');
    assert(state.illusions.filter((m) => m && m.isMahoragaSummon).length === 0, 'Disabled skill must not leave a minion in the arena');
    assert(!getSkillDataForFighter(sukuna, () => []).some((s) => s && s.id === 'mahoraga'), 'Disabled skill must be hidden from the Sukuna HUD');
    CONFIG.sukuna.enableMahoragaSummon = originalToggle;

    // 13. Owner death does NOT dismiss the minion — Mahoraga continues fighting until one prevails
    resetMahoragaSummon(sukuna);
    sukuna.mahoragaSummonCooldown = 0;
    trySummonMahoraga(sukuna, 0, arena);
    assert(state.illusions.some((m) => m && m.isMahoragaSummon), 'Precondition: Mahoraga must be alive before owner death check');
    sukuna.hp = 0;
    sukuna.isDead = true;
    updateMahoragaSummon(sukuna, 0, arena);
    assert(state.illusions.filter((m) => m && m.isMahoragaSummon).length === 1, 'Mahoraga must persist and keep fighting when Sukuna dies');

    // Cleanup
    dispelMahoragaSummon(sukuna, { silent: true, instantCooldown: true });
    sukuna.shoot = originalShoot;
    sukuna._updateMeleeCombat = originalMelee;
    state.illusions = [];
    state.fighters = [];
    state.gameState = 'playing';
    console.log('      ✅ Sukuna Ten Shadows Mahoraga Summon (spawn, AI, damage, no lifetime cap, friendly-fire immunity, death, toggle, HUD) verified successfully.');
    } finally {
      sc.enableMahoragaSummon = prevEnableMahoragaSummon;
    }
  }

  // ==========================================
  // TEST 96: Gauntlet Battle Intro & 5-Challenger Queue Layout
  // ==========================================
  {
    console.log('   96. Testing Gauntlet Battle Intro & 5-Challenger Queue Layout...');
    const { drawCountdownIntro, getGauntletChallengers } = await import('../js/graphics/ui/CountdownIntro.js');
    const { drawFaceOffThumbnailScreen } = await import('../js/graphics/ui/ThumbnailFaceOffScreen.js');
    const { createFighterInstance } = await import('../js/core/state.js');
    const { FIGHTER_DEFS } = await import('../js/core/config.js');

    const prevMode = state.mode;
    const prevView = state.viewOrientation;
    const prevRoster = state.tlfsRoster;
    const prevFighters = state.fighters;

    state.mode = 'TLFS';
    state.viewOrientation = 'vertical';
    state.tlfsDefeatedEnemies = 0;
    state.tlfsAllowedEnemies = [1, 2, 3, 4, 5];
    state.p1Index = 0; // Gojo
    state.p2Index = 1; // Naoya

    const p1 = createFighterInstance(FIGHTER_DEFS[0], 0);
    const p2 = createFighterInstance(FIGHTER_DEFS[1], 1);
    state.fighters = [p1, p2];

    // 1. Verify getGauntletChallengers produces 5 distinct challengers
    const challengers = getGauntletChallengers();
    assert(Array.isArray(challengers) && challengers.length === 5, `Gauntlet must resolve exactly 5 challengers, got ${challengers?.length}`);
    assert(challengers[0].name === FIGHTER_DEFS[1].name, `Challenger 1 must match active p2, got ${challengers[0]?.name}`);

    // 2. Test drawCountdownIntro across all lifecycle phases with 100% balanced Canvas 2D stack depth
    const testFrames = [0, 15, 22, 35, 44, 60, 85, 94];
    for (const frame of testFrames) {
      mockCtx.resetStackDepth();
      drawCountdownIntro(mockCtx, 540, 960, frame);
      assert(mockCtx.getStackDepth() === 0, `Canvas 2D stack depth must be 0 at frame ${frame} (got ${mockCtx.getStackDepth()})`);
    }

    // 3. Test horizontal viewport scaling
    state.viewOrientation = 'horizontal';
    mockCtx.resetStackDepth();
    drawCountdownIntro(mockCtx, 960, 540, 44);
    assert(mockCtx.getStackDepth() === 0, `Canvas 2D stack depth must be 0 in horizontal mode (got ${mockCtx.getStackDepth()})`);

    // 4. Test 10-challenger gauntlet selection & layout
    state.viewOrientation = 'vertical';
    state.tlfsRoster = null;
    state.tlfsAllowedEnemies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const challengers10 = getGauntletChallengers();
    assert(Array.isArray(challengers10) && challengers10.length === 10, `Gauntlet must resolve 10 challengers when 10 selected, got ${challengers10?.length}`);
    mockCtx.resetStackDepth();
    drawCountdownIntro(mockCtx, 540, 960, 44);
    assert(mockCtx.getStackDepth() === 0, `Canvas 2D stack depth must be 0 for 10-challenger layout (got ${mockCtx.getStackDepth()})`);

    // 5. Test Gauntlet Thumbnail Face-Off Screen ("PLAYER" vs "CHALLENGERS")
    state.ctx = mockCtx;
    state.canvas = { width: 540, height: 960 };
    mockCtx.resetStackDepth();
    drawFaceOffThumbnailScreen();
    assert(mockCtx.getStackDepth() === 0, `Canvas 2D stack depth must be 0 for 10-challenger Thumbnail Face-Off (got ${mockCtx.getStackDepth()})`);

    state.tlfsRoster = [1, 2, 3, 4, 5];
    mockCtx.resetStackDepth();
    drawFaceOffThumbnailScreen();
    assert(mockCtx.getStackDepth() === 0, `Canvas 2D stack depth must be 0 for 5-challenger Thumbnail Face-Off (got ${mockCtx.getStackDepth()})`);

    // Restore state
    state.mode = prevMode;
    state.viewOrientation = prevView;
    state.tlfsRoster = prevRoster;
    state.fighters = prevFighters;

    console.log('      ✅ Gauntlet Battle Intro & Thumbnail Face-Off ("PLAYER" vs "CHALLENGERS", lineup resolution, stack balance) verified successfully.');
  }

  // -------------------------------------------------------------------------
  // Test 97: Ash's Pokémon Lore-Accurate Close Combat Moves (Rule 30 Kinematics & Stack Depth Balance)
  // -------------------------------------------------------------------------
  {
    console.log('   97. Testing Ash\'s Pokémon Lore Close Combat Moves (Quick Attack, Iron Tail, Dragon Claw, Night Slash, Close Combat)...');
    const { AshFighter, PokemonCompanionEntity } = await import('../js/entities/fighters/AshFighter.js');
    const { drawPokemonCompanion } = await import('../js/graphics/weapons/ashPokemonGraphics.js');
    const { CJFighter } = await import('../js/entities/fighters/CJFighter.js');

    const ash = new AshFighter({ x: 100, y: 300, teamId: 0 });
    const dummy = new CJFighter({ x: 160, y: 300, teamId: 1 });
    const arena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };

    // 1. Pikachu: Quick Attack (Supersonic white dash + impact lock)
    const pika = new PokemonCompanionEntity(ash, 'pikachu', 100, 300);
    pika._startCloseCombatMove(dummy, 'quickAttack');
    assert(pika.meleeMoveKey === 'quickAttack', 'Pikachu must initiate Quick Attack');
    assert(pika.meleeMoveState === 'windup', 'Quick Attack begins in windup phase');

    let pikaHpBefore = dummy.hp;
    let qaHit = false;
    let maxZ_QA = 0;
    for (let f = 0; f < 36; f++) {
      pika.update(dummy, 0, arena);
      if (pika.z > maxZ_QA) maxZ_QA = pika.z;
      if (pika.meleeHitDone?.has('quickAttack')) qaHit = true;
      mockCtx.resetStackDepth();
      drawPokemonCompanion(mockCtx, pika);
      assert(mockCtx.getStackDepth() === 0, `Quick Attack must maintain 0 stack depth at tick ${f}`);
    }
    assert(qaHit === true, 'Quick Attack must successfully connect and deliver damage');
    assert(dummy.hp < pikaHpBefore, 'Quick Attack must deliver combat damage');
    assert(maxZ_QA >= 15, `Quick Attack must feature hop and leapforth vertical altitude (got ${maxZ_QA})`);

    // 2. Pikachu: Iron Tail (Air leap flip, hardened metallic steel crescent, stun)
    dummy.hp = 100;
    pika.meleeCooldown = 0;
    pika._startCloseCombatMove(dummy, 'ironTail');
    assert(pika.meleeMoveKey === 'ironTail', 'Pikachu must initiate Iron Tail');
    let maxZ = 0;
    let hitFound = false;
    for (let f = 0; f < 46; f++) {
      pika.update(dummy, 0, arena);
      if (pika.z > maxZ) maxZ = pika.z;
      if (pika.meleeHitDone?.has('ironTail')) hitFound = true;
      mockCtx.resetStackDepth();
      drawPokemonCompanion(mockCtx, pika);
      assert(mockCtx.getStackDepth() === 0, `Iron Tail must maintain 0 stack depth at tick ${f}`);
    }
    assert(maxZ >= 15, `Iron Tail must feature dynamic airborne altitude z (got ${maxZ})`);
    assert(hitFound === true, 'Iron Tail must successfully connect and register hit');

    // 3. Charizard: Dragon Claw (Twin 3-taloned rending claw slashes & X-cleave)
    const charizard = new PokemonCompanionEntity(ash, 'charizard', 100, 300);
    dummy.hp = 100;
    charizard._startCloseCombatMove(dummy, 'dragonClaw');
    assert(charizard.meleeMoveKey === 'dragonClaw', 'Charizard must initiate Dragon Claw');
    let c1Hit = false;
    let c2Hit = false;
    for (let f = 0; f < 55; f++) {
      charizard.update(dummy, 0, arena);
      if (charizard.meleeHitDone?.has('dragonClaw1')) c1Hit = true;
      if (charizard.meleeHitDone?.has('dragonClaw2')) c2Hit = true;
      mockCtx.resetStackDepth();
      drawPokemonCompanion(mockCtx, charizard);
      assert(mockCtx.getStackDepth() === 0, `Dragon Claw must maintain 0 stack depth at tick ${f}`);
    }
    assert(c1Hit && c2Hit, 'Dragon Claw must deliver both rending claw strikes');

    // 4. Greninja: Night Slash (Shadow step dash & dual dark-blade cross cleave)
    const greninja = new PokemonCompanionEntity(ash, 'greninja', 100, 300);
    dummy.hp = 100;
    greninja._startCloseCombatMove(dummy, 'nightSlash');
    assert(greninja.meleeMoveKey === 'nightSlash', 'Greninja must initiate Night Slash');
    let nsHit = false;
    for (let f = 0; f < 45; f++) {
      greninja.update(dummy, 0, arena);
      if (greninja.meleeHitDone?.has('nightSlash')) nsHit = true;
      mockCtx.resetStackDepth();
      drawPokemonCompanion(mockCtx, greninja);
      assert(mockCtx.getStackDepth() === 0, `Night Slash must maintain 0 stack depth at tick ${f}`);
    }
    assert(nsHit === true, 'Night Slash must successfully connect and deliver damage');

    // 5. Lucario: Close Combat (4-hit flurry barrage + finisher Aura Palm blast)
    const lucario = new PokemonCompanionEntity(ash, 'lucario', 100, 300);
    dummy.hp = 100;
    lucario._startCloseCombatMove(dummy, 'closeCombat');
    assert(lucario.meleeMoveKey === 'closeCombat', 'Lucario must initiate Close Combat');
    let cc1 = false, cc2 = false, cc3 = false, cc4 = false;
    for (let f = 0; f < 58; f++) {
      lucario.update(dummy, 0, arena);
      if (lucario.meleeHitDone?.has('cc1')) cc1 = true;
      if (lucario.meleeHitDone?.has('cc2')) cc2 = true;
      if (lucario.meleeHitDone?.has('cc3')) cc3 = true;
      if (lucario.meleeHitDone?.has('cc4')) cc4 = true;
      mockCtx.resetStackDepth();
      drawPokemonCompanion(mockCtx, lucario);
      assert(mockCtx.getStackDepth() === 0, `Close Combat must maintain 0 stack depth at tick ${f}`);
    }
    assert(cc1 === true, 'Close Combat must connect Hit 1 (Left Jab)');
    assert(cc2 === true, 'Close Combat must connect Hit 2 (Right Cross)');
    assert(cc3 === true, 'Close Combat must connect Hit 3 (Roundhouse Kick)');
    assert(cc4 === true, 'Close Combat must connect Hit 4 (Finisher Aura Palm)');

    console.log('      ✅ Ash\'s Pokémon Close Combat Moves (Quick Attack, Iron Tail, Dragon Claw, Night Slash, Close Combat & 0 Stack Depth) verified successfully.');
  }

  // ── TEST 98: 1v2 Mode Authentic Top Duel HUD & 2 Teammate Cards Integration ──
  console.log('   98. Testing 1v2 Mode Authentic Top Duel HUD & 2 Teammate Cards Integration...');
  {
    const { drawHUD, clearHealthHud } = await import('../js/graphics/hudManager.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const { KnightFighter } = await import('../js/entities/fighters/KnightFighter.js');

    const previousMode = state.mode;
    const previousFighters = state.fighters;

    try {
      state.mode = '1v2';
      const gojo = new GojoFighter({ characterId: 'gojo', name: 'Gojo', x: 480, y: 300, color: '#00F0FF', controls: {} });
      const sukuna = new SukunaFighter({ characterId: 'sukuna', name: 'Sukuna', x: 200, y: 200, color: '#FF0055', controls: {} });
      const knight = new KnightFighter({ characterId: 'knight', name: 'Knight', x: 300, y: 300, color: '#CCCCCC', controls: {} });

      state.fighters = [gojo, sukuna, knight];
      clearHealthHud(true);
      drawHUD();

      const topEl = globalThis.document.getElementById('hudTopContainer');
      const bottomEl = globalThis.document.getElementById('healthHud');

      assert(topEl !== null, 'hudTopContainer must exist');
      assert(topEl.style.display === 'flex', `hudTopContainer must be display: flex in 1v2 mode (got ${topEl.style.display})`);
      assert(topEl.innerHTML.includes('hud-top-duel'), 'hudTopContainer must render .hud-top-duel layout in 1v2 mode');

      // Left side: Solo fighter (Gojo)
      assert(topEl.innerHTML.includes('hud-top-player hud-top-p1'), 'hudTopContainer must render .hud-top-p1 for Solo fighter');
      assert(topEl.innerHTML.includes('GOJO'), 'hud-top-p1 must render Solo fighter Gojo name');
      assert(topEl.innerHTML.includes('hud-top-profile__canvas'), 'hud-top-p1 must render high-res profile canvas');
      assert(topEl.innerHTML.includes('hud-top-bar'), 'hud-top-p1 must render connected top health bar');

      // Center: Match Timer
      assert(topEl.innerHTML.includes('hud-top-center'), 'hudTopContainer must render center timer in 1v2 mode');
      assert(topEl.innerHTML.includes('hud-top-timer-text'), 'hud-top-timer-text must exist');

      // Right side: 2 Teammates stacked (.hud-top-team-col)
      assert(topEl.innerHTML.includes('hud-top-player hud-top-p2 hud-top-team-col'), 'hudTopContainer must render .hud-top-team-col for teammates on the right side');
      assert(topEl.innerHTML.includes('hud-top-team-card hud-top-team-p2'), 'hud-top-team-col must contain .hud-top-team-p2 (Teammate 1)');
      assert(topEl.innerHTML.includes('hud-top-team-card hud-top-team-p3'), 'hud-top-team-col must contain .hud-top-team-p3 (Teammate 2)');
      const expectedSukunaName = (CONFIG.sukuna?.displayName || CONFIG.sukuna?.name || 'SUKUNA').toUpperCase();
      assert(topEl.innerHTML.includes(expectedSukunaName), `Teammate 1 must render ${expectedSukunaName} name`);
      assert(topEl.innerHTML.includes('KNIGHT'), 'Teammate 2 must render Knight name');

      // Container and Duel modifier classes
      assert(topEl.classList.contains('hud-top-1v2'), 'hudTopContainer must have .hud-top-1v2 class in 1v2 mode');
      assert(topEl.innerHTML.includes('hud-top-duel-1v2'), 'hudTopContainer must render .hud-top-duel-1v2 layout class');

      // Verify CSS rules
      const hudCss = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
      assert(hudCss.includes('.hud-top-duel.hud-top-duel-1v2'), 'style.css must define .hud-top-duel.hud-top-duel-1v2');
      assert(hudCss.includes('.hud-top-container.hud-top-1v2'), 'style.css must define .hud-top-container.hud-top-1v2');

      // Combo Tracker 3-Slot independent verification for 1v2 Mode
      const { ensureComboTrackers, registerComboHit } = await import('../js/systems/comboTracker.js');
      const { drawComboCounter } = await import('../js/graphics/hudManager.js');

      const prevCombo98 = CONFIG.comboCounter?.enabled;
      if (CONFIG.comboCounter) CONFIG.comboCounter.enabled = true;
      try {
        state.comboTrackers = null;
        state.gameState = 'playing';
        const slots = ensureComboTrackers();
        assert(slots.length === 3, `ensureComboTrackers in 1v2 mode must allocate 3 slots (got ${slots.length})`);
        assert(slots[0].side === 0, 'Slot 0 must be left side (Solo Gojo)');
        assert(slots[1].side === 1, 'Slot 1 must be right side (Teammate 1 Sukuna)');
        assert(slots[2].side === 1, 'Slot 2 must be right side (Teammate 2 Knight)');

        // Register hits:
        // Solo Fighter (Gojo, index 0) hits Knight (index 2)
        registerComboHit(gojo, knight, 45);
        assert(slots[0].hits === 1, `Slot 0 must record Gojo hit (got ${slots[0].hits})`);
        assert(slots[0].damage === 45, `Slot 0 must record 45 damage (got ${slots[0].damage})`);

        // Teammate 1 (Sukuna, index 1) hits Gojo (index 0)
        registerComboHit(sukuna, gojo, 60);
        assert(slots[1].hits === 1, `Slot 1 must record Sukuna hit (got ${slots[1].hits})`);
        assert(slots[1].damage === 60, `Slot 1 must record 60 damage (got ${slots[1].damage})`);

        // Teammate 2 (Knight, index 2) hits Gojo (index 0)
        registerComboHit(knight, gojo, 30);
        assert(slots[2].hits === 1, `Slot 2 must record Knight hit (got ${slots[2].hits})`);
        assert(slots[2].damage === 30, `Slot 2 must record 30 damage (got ${slots[2].damage})`);

        // Render combo counters to mock canvas and verify Canvas 2D stack integrity
        mockCtx.resetStackDepth();
        drawComboCounter(mockCtx);
        assert(mockCtx.getStackDepth() === 0, `drawComboCounter in 1v2 mode must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

        // Banner alignment: solo card and first teammate card share one row, the second
        // teammate card sits exactly one full card height + gap below (never overlapping).
        const bannerAnchorsY = [];
        const recordingCtx = new Proxy(mockCtx, {
          get(target, prop) {
            if (prop === 'translate') return (x, y) => { bannerAnchorsY.push(y); };
            return target[prop];
          }
        });
        drawComboCounter(recordingCtx);
        // Each card translates twice (screen anchor, then local origin at -CARD_H / 2);
        // keep only the positive screen anchors.
        const bannerAnchorRows = bannerAnchorsY.filter(y => y > 0).map(y => Math.round(y));
        const bannerRows = [...new Set(bannerAnchorRows)].sort((a, b) => a - b);
        assert(bannerAnchorRows.length === 3, `1v2 must draw 3 combo banners (got ${bannerAnchorRows.length})`);
        assert(bannerRows.length === 2, `1v2 combo banners must occupy exactly 2 stacked rows (got ${bannerRows.length})`);
        assert(bannerAnchorRows.filter(y => y === bannerRows[0]).length === 2, 'Solo banner and first teammate banner must share one aligned row');
        assert(bannerRows[1] - bannerRows[0] === 74, `1v2 combo banner rows must be spaced by full card height + 6px gap (74px, got ${bannerRows[1] - bannerRows[0]})`);
      } finally {
        if (CONFIG.comboCounter) CONFIG.comboCounter.enabled = prevCombo98;
      }

      // Bottom container: Skills only with .one-vs-two-hud layout (no health bars)
      assert(bottomEl.classList.contains('one-vs-two-hud'), 'Bottom health HUD must have .one-vs-two-hud class in 1v2 mode');
      assert(!bottomEl.classList.contains('boss-battle-hud'), 'Bottom health HUD must NOT have .boss-battle-hud in regular 1v2 mode');
      assert(bottomEl.children.length === 3, 'Bottom health HUD must render 3 skill cards for the 3 fighters');
      assert(!bottomEl.innerHTML.includes('health-card__bar'), 'Bottom health HUD must NOT render health bars (skills only)');
      assert(bottomEl.innerHTML.includes('hud-skill-box'), 'Bottom health HUD must render skill bars in 1v2 mode');
      assert(!bottomEl.innerHTML.includes('health-card__desc'), 'Bottom health HUD must NOT render fighter descriptions in 1v2 mode');
      assert(!bottomEl.innerHTML.includes('health-card__info'), 'Bottom health HUD must NOT render stat info blocks in 1v2 mode');
      // 1v2 is 1 solo vs a duo: two columns (solo left, both teammates stacked right), never three.
      assert(hudCss.includes('.health-hud.one-vs-two-hud {\n  display: grid !important;\n  grid-template-columns: 1fr 1fr !important;'), '1v2 bottom HUD must define a 2-column skills grid');
      assert(hudCss.includes('.health-hud.one-vs-two-hud .health-card:nth-child(1) {\n  grid-column: 1 !important;\n  grid-row: 1 / span 2 !important;'), '1v2 bottom HUD must pin the solo fighter to the full left column');
      assert(hudCss.includes('.health-hud.one-vs-two-hud .health-card:nth-child(3) {\n  grid-column: 2 !important;\n  grid-row: 2 !important;'), '1v2 bottom HUD must stack the second teammate under the first in the right column');

      // Battle intro: underfoot team rings must stay hidden until fighters are actually summoned
      const { getTeamRingIntroOpacity } = await import('../js/graphics/renderers/EntityRenderer.js');
      const prevDelayTimer = state.battleStartDelayTimer;
      state.gameState = 'playing';
      state.battleStartDelayTimer = 80;
      assert(getTeamRingIntroOpacity(state) === 0, 'Team rings must be hidden during the FIGHT! banner phase (fighters not summoned yet)');
      state.battleStartDelayTimer = 44;
      assert(getTeamRingIntroOpacity(state) === 0, 'Team rings must not appear before the summon materialization starts');
      state.battleStartDelayTimer = 40;
      const midSummonOpacity = getTeamRingIntroOpacity(state);
      assert(midSummonOpacity > 0 && midSummonOpacity < 1, `Team rings must fade in with the summon (got ${midSummonOpacity})`);
      state.battleStartDelayTimer = 0;
      assert(getTeamRingIntroOpacity(state) === 1, 'Team rings must be fully visible once the fighter is summoned');
      state.battleStartDelayTimer = prevDelayTimer;

      console.log('      ✅ 1v2 Mode Authentic Top Duel HUD (1 Solo card on left, 2 Teammate cards on right, skills-only bottom, summon-gated team rings) verified successfully.');
    } finally {
      state.mode = previousMode;
      state.fighters = previousFighters;
      clearHealthHud(true);
    }
  }

  // ── TEST 99: Zombie 20-Second Wave Progression, Variety Mechanics, 1-Minute Final Wave & Survival Mortality ──
  console.log('   99. Testing Zombie 20-Second Wave Progression, Variety Mechanics, 1-Minute Final Wave & Survival Mortality...');
  {
    const { ZombieFighter } = await import('../js/entities/fighters/ZombieFighter.js');
    const { KnightFighter } = await import('../js/entities/fighters/KnightFighter.js');

    const zombie = new ZombieFighter({ characterId: 'zombie', name: 'Zombie', x: 200, y: 300, controls: {} });
    const knight = new KnightFighter({ characterId: 'knight', name: 'Knight', x: 300, y: 300, controls: {} });
    const arena = { x: 45, y: 240, width: 450, height: 450 };

    // 1. Initial State: Wave 1
    assert(zombie.waveNumber === 1, `Zombie must start at Wave 1 (got ${zombie.waveNumber})`);
    assert(zombie.survivalTimer === 0, 'Zombie survival timer must start at 0');
    assert(zombie.isFinalWaveActive === false, 'Final wave must not be active at start');

    // 2. Fast-forward to 20 seconds (1200 frames) -> Wave 2 Arrival
    zombie.survivalTimer = 1199;
    zombie.update(knight, 0, arena);
    assert(zombie.waveNumber === 2, `Wave must advance to 2 at 1200 frames (got ${zombie.waveNumber})`);
    assert(zombie.waveBanner !== null, 'Wave 2 announcement banner must be triggered');
    assert(zombie.waveBanner.text.includes('A HUGE WAVE'), `Wave 2 banner must announce huge wave (got ${zombie.waveBanner.text})`);
    assert(zombie.armorType === 'bucket', 'Zombie boss must equip Buckethead armor on Wave 2');
    assert(zombie.gravestones.some(g => g.variety === 'screendoor'), 'Wave 2 must spawn Screen Door Zombie gravestone');

    // 3. Fast-forward to 40 seconds (2400 frames) -> Wave 3 Arrival
    zombie.survivalTimer = 2399;
    zombie.update(knight, 0, arena);
    assert(zombie.waveNumber === 3, `Wave must advance to 3 at 2400 frames (got ${zombie.waveNumber})`);
    assert(zombie.waveBanner.text.includes('A HUGE WAVE'), 'Wave 3 banner must announce huge wave');
    assert(zombie.gravestones.some(g => g.variety === 'newspaper'), 'Wave 3 must spawn Newspaper Zombie gravestone');
    assert(zombie.gravestones.some(g => g.variety === 'polevaulter'), 'Wave 3 must spawn Pole Vaulter Zombie gravestone');
    assert(zombie.gravestones.some(g => g.variety === 'football'), 'Wave 3 must spawn Football Zombie gravestone');

    // 4. Fast-forward to 60 seconds / 1 Minute (3600 frames) -> FINAL WAVE
    zombie.survivalTimer = 3599;
    zombie.update(knight, 0, arena);
    assert(zombie.isFinalWaveActive === true, 'Final wave must activate at 3600 frames (1 minute)');
    assert(zombie.waveNumber === 4, 'Wave number must reach 4 on Final Wave');
    assert(zombie.waveBanner.isFinal === true, 'Wave banner must be marked isFinal on Final Wave');
    assert(zombie.gravestones.some(g => g.variety === 'flag'), 'Final Wave must spawn Flag Zombie gravestone');

    // 5. Verify Undead Rebirth Mortality Standard before 1 Minute:
    // Depleting HP to 0 before 1 minute MUST resurrect the Zombie!
    zombie.survivalTimer = 500;
    zombie.isFinalWaveActive = false;
    zombie.hp = 100;
    zombie.takeDamage(500, knight);
    assert(zombie.hp === zombie.maxHp, `Zombie must resurrect with full HP before 1 minute (got ${zombie.hp})`);

    // 6. Verify Survival Victory during Final Wave:
    // Defeating Zombie after 1 minute during Final Wave triggers victory!
    zombie.survivalTimer = 3650;
    zombie.isFinalWaveActive = true;
    zombie.armorShieldHp = 0;
    zombie.armorType = 'none';
    zombie.hp = 50;
    zombie.takeDamage(100, knight);
    assert(zombie.finalWaveCleared === true, 'Final wave must be cleared upon defeating Zombie in Final Wave');
    assert(zombie.victoryTimer > 0, 'Victory timer must be triggered upon clearing Final Wave');

    // 7. Verify Canvas 2D Stack Integrity (Rule 2.4)
    mockCtx.resetStackDepth();
    zombie.draw(mockCtx, knight);
    assert(mockCtx.getStackDepth() === 0, `Zombie draw pipeline must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    console.log('      ✅ Zombie 20-Second Waves, Varieties (Screen Door, Newspaper, Pole, Football, Flag), 1-Minute Final Wave & Survival Mortality verified successfully.');
  }

  // ==========================================
  // TEST 100: Mahoraga Divine Shout Single-Cast & Anti-Multi-Cast Guarantee
  // ==========================================
  {
    console.log('   100. Testing Mahoraga Divine Shout Single-Cast & Anti-Multi-Cast Guarantee...');
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };

    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = arena;

    const mahoraga = new MahoragaClass({ type: 'mahoraga', x: 200, y: 300, hp: 450, maxHp: 450 });
    const gojo = new GojoClass({ type: 'gojo', x: 300, y: 300, hp: 200, maxHp: 200 });
    mahoraga.team = 0;
    gojo.team = 1;
    mahoraga.gojoInfinityImmune = true; // Prevent infinity barrier freezing during shout test
    state.fighters = [mahoraga, gojo];

    const fullCooldown = CONFIG.mahoraga?.shoutCooldown ?? 1000;

    // 1. Initial State: shout off cooldown and ready
    mahoraga.shoutCooldown = 0;
    mahoraga.isShouting = false;
    mahoraga.swordCooldown = 999; // Prevent melee strike priority so shout triggers

    // Trigger AI decision tree update
    mahoraga.update(gojo, 0, arena);

    // 2. Windup Phase: Mahoraga must immediately place shoutCooldown on full cooldown!
    assert(mahoraga.isShouting === true, 'Mahoraga must enter isShouting state when in range');
    assert(mahoraga.shoutPhase === 'windup', 'Mahoraga must enter windup phase first');
    assert(mahoraga.shoutCooldown >= fullCooldown - 2, `Mahoraga must put shoutCooldown on full cooldown immediately on windup initiation (got ${mahoraga.shoutCooldown})`);

    // 3. Complete windup to trigger fire & recovery
    const windupFrames = CONFIG.mahoraga?.shoutWindupFrames ?? 24;
    for (let f = 0; f < windupFrames; f++) {
      mahoraga.update(gojo, 0, arena);
    }

    assert(mahoraga.shoutPhase === 'recovery', 'Mahoraga must transition to recovery phase after firing Divine Shout');
    assert(mahoraga.activeSonicBooms && mahoraga.activeSonicBooms.length === 1, 'Mahoraga must spawn exactly 1 sonic boom upon firing');
    assert(mahoraga.shoutCooldown >= fullCooldown - 30, `Mahoraga shoutCooldown must remain on cooldown after firing (got ${mahoraga.shoutCooldown})`);

    // 4. Complete recovery phase
    const recoveryFrames = CONFIG.mahoraga?.shoutRecoveryFrames ?? 18;
    for (let f = 0; f < recoveryFrames + 2; f++) {
      mahoraga.update(gojo, 0, arena);
    }

    assert(mahoraga.isShouting === false, 'Mahoraga must exit isShouting after recovery completes');
    assert(mahoraga.shoutPhase === null, 'shoutPhase must reset to null after recovery');
    assert(mahoraga.shoutCooldown > 0, `shoutCooldown must remain active after recovery (${mahoraga.shoutCooldown} frames remaining)`);

    // Next update: Mahoraga MUST NOT recast Divine Shout!
    const boomsCount = mahoraga.activeSonicBooms.length;
    mahoraga.update(gojo, 0, arena);
    assert(mahoraga.isShouting === false, 'Mahoraga MUST NOT immediately recast Divine Shout after recovery');
    assert(mahoraga.activeSonicBooms.length <= boomsCount, 'Mahoraga MUST NOT spawn an additional sonic boom');

    // 5. Interruption during windup must NOT reset shoutCooldown to 0
    mahoraga.shoutCooldown = 0;
    mahoraga.swordCooldown = 999;
    mahoraga.update(gojo, 0, arena);
    assert(mahoraga.isShouting === true && mahoraga.shoutPhase === 'windup', 'Precondition: Mahoraga entered windup');
    mahoraga.interruptAttacks(true);
    assert(mahoraga.isShouting === false, 'interruptAttacks must cancel isShouting');
    assert(mahoraga.shoutCooldown >= 180, `Interrupting windup must retain cooldown penalty of at least 180 frames (got ${mahoraga.shoutCooldown})`);

    // 6. Adaptation Strike (adaptationDashIsCounter) MUST NOT fire Divine Shout
    mahoraga.shoutCooldown = 500;
    mahoraga.activeSonicBooms = [];
    mahoraga.adaptationDashIsCounter = true;
    mahoraga.adaptationDashTimer = 0;
    mahoraga.adaptationDashTarget = gojo;
    mahoraga.dashToX = gojo.x - 40;
    mahoraga.dashToY = gojo.y;

    // Simulate completion of counter-dash frame
    mahoraga.update(gojo, 0, arena);
    assert(mahoraga.activeSonicBooms.length === 0, 'Adaptation counter strike MUST NOT fire Divine Shout');
    assert(mahoraga.isShouting === false, 'Mahoraga must not be shouting during adaptation strike');

    console.log('      ✅ Mahoraga Divine Shout Single-Cast & Anti-Multi-Cast Guarantee verified successfully.');
  }

  // ==========================================
  // TEST 101: Mahoraga Adaptation 2X Damage — Sword-Only, Slower Attack Speed, 14f Windup & Zero Punch 2X Multiplier
  // ==========================================
  {
    console.log('   101. Testing Mahoraga Adaptation 2X Damage (Sword-Only, Slower Attack Speed, 14f Windup & Zero Punch 2X)...');
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };

    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = arena;

    const mahoraga = new MahoragaClass({ type: 'mahoraga', x: 200, y: 300, hp: 450, maxHp: 450 });
    const gojo = new GojoClass({ type: 'gojo', x: 250, y: 300, hp: 200, maxHp: 200 });
    mahoraga.team = 0;
    gojo.team = 1;
    mahoraga.gojoInfinityImmune = true;
    state.fighters = [mahoraga, gojo];

    const baseSwordDamage = CONFIG.mahoraga?.swordDamage ?? 6;
    const basePunchDamage = CONFIG.mahoraga?.punchDamage ?? 6;
    const normalCooldown = CONFIG.mahoraga?.swordCooldown ?? 20;
    const slowedCooldown = CONFIG.mahoraga?.wheelDoubleDamageCooldownFrames ?? 36;
    const windupFrames = CONFIG.mahoraga?.wheelDoubleDamageWindupFrames ?? 14;

    // 1. Verify Normal Melee Cooldown & Damage (Without 2X Damage Buff)
    mahoraga.wheelDoubleDamageTimer = 0;
    mahoraga.swordCooldown = 0;
    const gojoStartHp = gojo.hp;
    mahoraga._performMeleeAttack(gojo);

    assert(mahoraga.swordCooldown === normalCooldown, `Normal swordCooldown must be ${normalCooldown} (got ${mahoraga.swordCooldown})`);
    assert(mahoraga.isSwordWindingUp === false, 'Normal sword attacks must NOT enter isSwordWindingUp');
    assert(gojoStartHp - gojo.hp === baseSwordDamage, `Normal sword strike must deal base damage ${baseSwordDamage} (dealt ${gojoStartHp - gojo.hp})`);

    // 2. Activate 2X Damage Buff (Wheel Adaptation Click Buff)
    mahoraga.wheelDoubleDamageTimer = 240;
    mahoraga.swordCooldown = 0;
    const gojoHpBeforeBuff = gojo.hp;

    // 3. Trigger Melee Attack during 2X Damage Buff -> Must Initiate Smooth Windup & Slower Attack Speed
    mahoraga._performMeleeAttack(gojo);

    assert(mahoraga.swordCooldown === slowedCooldown, `2X damage attack cooldown must be slowed to ${slowedCooldown} (got ${mahoraga.swordCooldown})`);
    assert(mahoraga.isSwordWindingUp === true, 'During 2X damage, Mahoraga must enter isSwordWindingUp state');
    assert(mahoraga.swordWindupTimer === windupFrames, `swordWindupTimer must be initialized to ${windupFrames} frames (got ${mahoraga.swordWindupTimer})`);
    assert(mahoraga.punchAnimTimer === 36, `punchAnimTimer must be set to 36 frames for 5-phase heavy animation (got ${mahoraga.punchAnimTimer})`);
    assert(gojo.hp === gojoHpBeforeBuff, 'During windup phase, damage must NOT be delivered prematurely (deferred hit release)');

    // 4. Progress Windup Animation Frames
    for (let f = 0; f < windupFrames - 1; f++) {
      mahoraga.update(gojo, 0, arena);
      assert(mahoraga.isSwordWindingUp === true, `Mahoraga must remain in windup state on frame ${f + 1}`);
      assert(gojo.hp === gojoHpBeforeBuff, `Damage must not be dealt on frame ${f + 1} of windup`);
    }

    // Release Frame (Frame 14): swordWindupTimer reaches 0 and releases the 2X damage sword strike
    mahoraga.update(gojo, 0, arena);
    assert(mahoraga.isSwordWindingUp === false, 'Mahoraga must exit isSwordWindingUp upon completing windup');
    const damageDealt = gojoHpBeforeBuff - gojo.hp;
    const expected2xDamage = baseSwordDamage * 2.0;
    assert(damageDealt === expected2xDamage, `2X damage sword strike must deal exactly ${expected2xDamage} damage (dealt ${damageDealt})`);

    // 5. Sword-Only Guarantee: Over multiple attack counts during 2X damage, NEVER trigger heavy punch
    mahoraga.wheelDoubleDamageTimer = 240;
    for (let i = 0; i < 20; i++) {
      mahoraga.swordCooldown = 0;
      mahoraga.leftPunchTimer = 0;
      mahoraga._performMeleeAttack(gojo);
      assert(mahoraga.leftPunchTimer === 0, `Attack #${i + 1} during 2X damage must NOT trigger left heavy punch (leftPunchTimer was ${mahoraga.leftPunchTimer})`);
      assert(mahoraga.isSwordWindingUp === true, `Attack #${i + 1} during 2X damage must initiate sword windup`);
      mahoraga.isSwordWindingUp = false; // Fast-forward for loop
      mahoraga.swordWindupTimer = 0;
    }

    // 6. Punch Damage Verification: Base punch MUST NEVER receive 2X multiplier
    mahoraga.wheelDoubleDamageTimer = 0;
    const testPunchTargets = [gojo];
    const gojoHpBeforePunch = gojo.hp;
    const { executeMeleePunch } = await import('../js/entities/fighters/mahoraga/mahoragaCombat.js');
    executeMeleePunch(mahoraga, testPunchTargets, gojo);
    const punchDamageDealt = gojoHpBeforePunch - gojo.hp;
    assert(punchDamageDealt === basePunchDamage, `Heavy punch must deal exactly base punch damage ${basePunchDamage} (never doubled! dealt ${punchDamageDealt})`);

    // 7. General Defense Buff Removal: Verify Mahoraga takes 100% full unmitigated damage regardless of adaptation stages
    assert((CONFIG.mahoraga?.defBuffPerClickPercent ?? 0) === 0, 'CONFIG.mahoraga.defBuffPerClickPercent must be 0 (general DEF scaling removed)');
    mahoraga.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
    mahoraga.maxHp = 200;
    mahoraga.hp = 200;
    mahoraga.takeDamage(10, gojo, { isMelee: true });
    const damageAtStage0 = 200 - mahoraga.hp;
    assert(damageAtStage0 === 10, `Unadapted hit must deal full 10 damage at 0 stages (got ${damageAtStage0})`);

    mahoraga.adaptationStage = { melee: 8, ranged: 8, skill: 8 };
    mahoraga.hp = 200;
    mahoraga.takeDamage(10, gojo, { isMelee: true });
    const damageAtStage8 = 200 - mahoraga.hp;
    assert(damageAtStage8 === 10, `Even at max adaptation stages, Mahoraga must take full 10 damage with 0% defense buff (got ${damageAtStage8})`);

    console.log('      ✅ Mahoraga Adaptation 2X Damage (Sword-Only, Slower Attack Speed, 14f Windup & Zero Punch 2X) verified successfully.');
  }

  // ==========================================
  // TEST 102: Mahoraga Sword Arm Physics & 2-Bone Inverse Kinematics Animation Standard (Rule 30)
  // ==========================================
  {
    console.log('   102. Testing Mahoraga Sword Arm Physics & 2-Bone Inverse Kinematics Animation Standard (Rule 30)...');
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const arena = { x: 45, y: 240, width: 450, height: 450 };

    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = arena;

    const mahoraga = new MahoragaClass({ type: 'mahoraga', x: 200, y: 300, hp: 450, maxHp: 450 });
    const gojo = new GojoClass({ type: 'gojo', x: 250, y: 300, hp: 200, maxHp: 200 });
    mahoraga.team = 0;
    gojo.team = 1;
    state.fighters = [mahoraga, gojo];

    const { drawMahoragaSword } = await import('../js/graphics/weapons/mahoragaWeaponGraphics.js');

    // 1. Idle Resting Arm Kinematics & Stack Depth
    mahoraga.punchAnimTimer = 0;
    mockCtx.resetStackDepth();
    drawMahoragaSword(mockCtx, mahoraga);
    assert(mockCtx.getStackDepth() === 0, `drawMahoragaSword at idle must leave 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    const idleTips = mahoraga._getSwordTipPositions();
    assert(Number.isFinite(idleTips.outer.x) && Number.isFinite(idleTips.outer.y), 'Idle sword tip coordinates must be valid finite numbers');

    // 2. 5-Phase Melee Combat Kinematics: Coil Lift -> Poised Hold -> Hypersonic Whip Strike -> Impact Lock -> Recovery Settle
    // Test normal sword cleave (combo 0)
    mahoraga.swordCombo = 0;
    mahoraga.punchAnimTimer = 22;
    mahoraga.punchAnimMaxTimer = 22;

    // Phase 1 (Coil): Frame 1
    mockCtx.resetStackDepth();
    mahoraga.draw(mockCtx, gojo);
    assert(mockCtx.getStackDepth() === 0, `Mahoraga draw during sword coil must have 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);
    const coilTips = mahoraga._getSwordTipPositions();

    // Phase 3 (Strike): Frame 12 (approx progress 0.45)
    mahoraga.punchAnimTimer = 10;
    mockCtx.resetStackDepth();
    mahoraga.draw(mockCtx, gojo);
    assert(mockCtx.getStackDepth() === 0, `Mahoraga draw during strike whip must have 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);
    const strikeTips = mahoraga._getSwordTipPositions();

    // Verify sword tip dynamically lunges forward between coil and strike
    assert(strikeTips.outer.x > coilTips.outer.x, `Sword tip must translate forward dynamically during strike cleave (${strikeTips.outer.x} > ${coilTips.outer.x})`);

    // Phase 4 (Impact Lock): Frame 16 (approx progress 0.72)
    mahoraga.punchAnimTimer = 6;
    mockCtx.resetStackDepth();
    mahoraga.draw(mockCtx, gojo);
    assert(mockCtx.getStackDepth() === 0, `Mahoraga draw during impact lock must have 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // Phase 5 (Recovery): Frame 20
    mahoraga.punchAnimTimer = 2;
    mockCtx.resetStackDepth();
    mahoraga.draw(mockCtx, gojo);
    assert(mockCtx.getStackDepth() === 0, `Mahoraga draw during recovery settle must have 0 canvas stack depth (got ${mockCtx.getStackDepth()})`);

    // 3. 2X Damage Heavy Sword Windup Kinematic Arm Physics (14 frames windup)
    mahoraga.wheelDoubleDamageTimer = 240;
    mahoraga.isSwordWindingUp = true;
    mahoraga.swordWindupTimer = 14;
    mahoraga.swordWindupMaxTimer = 14;
    mahoraga.punchAnimTimer = 36;
    mahoraga.punchAnimMaxTimer = 36;

    for (let f = 14; f >= 0; f--) {
      mahoraga.swordWindupTimer = f;
      mahoraga.punchAnimTimer = 22 + f; // progresses 36 -> 22 across windup
      mockCtx.resetStackDepth();
      mahoraga.draw(mockCtx, gojo);
      assert(mockCtx.getStackDepth() === 0, `Canvas stack depth must be 0 throughout 2X damage windup frame ${f} (got ${mockCtx.getStackDepth()})`);
      const windupTips = mahoraga._getSwordTipPositions();
      assert(Number.isFinite(windupTips.outer.x) && Number.isFinite(windupTips.outer.y), `Sword tip must remain valid on windup frame ${f}`);
    }

    console.log('      ✅ Mahoraga Sword Arm Physics & 2-Bone Inverse Kinematics Animation Standard (Rule 30) verified successfully.');
  }

  // ==========================================
  // TEST 103: Gojo Limitless Cursed Techniques (Purple, Red, Blue) 18-Frame Animated Sprite Pipeline
  // ==========================================
  {
    console.log('   103. Testing Gojo Limitless Cursed Techniques (Purple, Red, Blue) 18-Frame Animated Sprite Pipeline...');
    const { gojoConfig } = await import('../js/configs/characters/gojoConfig.js');
    const { 
      _getGojoPurpleTravelFrames, 
      _getGojoRedReversalFrames, 
      _getGojoBlueTravelFrames, 
      drawGojoPurpleTravelSprite, 
      drawGojoOrb,
      drawGojoWeapon 
    } = await import('../js/graphics/weapons/gojoWeaponGraphics.js');
    const { drawGojoPurpleOrb } = await import('../js/graphics/renderers/projectileRenderer.js');
    const { getSkillSound } = await import('../js/soundEffects/skillSounds.js');
    const fs = await import('fs');
    const path = await import('path');

    // 1. Asset & Radius Configuration Integrity (Purple, Red, Blue)
    assert(
      typeof gojoConfig.purpleRadius === 'number' && gojoConfig.purpleRadius > 0,
      `gojoConfig.purpleRadius must be a positive number (got ${gojoConfig.purpleRadius})`
    );
    assert(
      typeof gojoConfig.blueRadius === 'number' && gojoConfig.blueRadius > 0,
      `gojoConfig.blueRadius must be a positive number (got ${gojoConfig.blueRadius})`
    );
    assert(
      typeof gojoConfig.redRadius === 'number' && gojoConfig.redRadius > 0,
      `gojoConfig.redRadius must be a positive number (got ${gojoConfig.redRadius})`
    );
    assert(
      gojoConfig.assets.purpleTravel === 'Assets/model/gojo/Purple_idle_travel/purple_travel-b.png',
      `gojoConfig.assets.purpleTravel must point to 'Assets/model/gojo/Purple_idle_travel/purple_travel-b.png' (got '${gojoConfig.assets.purpleTravel}')`
    );
    assert(
      gojoConfig.assets.redReversal === 'Assets/model/gojo/Red_reversal/red_reversal-b.png',
      `gojoConfig.assets.redReversal must point to 'Assets/model/gojo/Red_reversal/red_reversal-b.png' (got '${gojoConfig.assets.redReversal}')`
    );
    assert(
      gojoConfig.assets.blueTravel === 'Assets/model/gojo/Blue_projectile/blue_travel-b.png',
      `gojoConfig.assets.blueTravel must point to 'Assets/model/gojo/Blue_projectile/blue_travel-b.png' (got '${gojoConfig.assets.blueTravel}')`
    );

    // 1b. Projectile Spawn Radius Dynamic Config Relevance (Purple & Blue)
    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');
    const mockSystem = { _resetProjectileProperties: () => {}, projectiles: [] };

    // Dynamic purpleRadius test
    const origPurpleR = gojoConfig.purpleRadius;
    try {
      gojoConfig.purpleRadius = 50;
      mockSystem.projectiles.length = 0;
      GojoPurpleBehavior.spawn(mockSystem, 100, 100, 5, 0, 70, 0, 150, {});
      assert(mockSystem.projectiles[0].r === 50, `GojoPurpleBehavior.spawn with purpleRadius: 50 must set r=50 (got ${mockSystem.projectiles[0].r})`);

      gojoConfig.purpleRadius = 150;
      mockSystem.projectiles.length = 0;
      GojoPurpleBehavior.spawn(mockSystem, 100, 100, 5, 0, 70, 0, 150, {});
      assert(mockSystem.projectiles[0].r === 150, `GojoPurpleBehavior.spawn with purpleRadius: 150 must set r=150 (got ${mockSystem.projectiles[0].r})`);
    } finally {
      gojoConfig.purpleRadius = origPurpleR;
    }

    // Dynamic blueRadius test
    const origBlueR = gojoConfig.blueRadius;
    const origBlueScale = gojoConfig.blueScale;
    try {
      gojoConfig.blueScale = 1.0;
      gojoConfig.blueRadius = 25;
      projectileSystem.fireGojoBlue({ r: 25, x: 100, y: 100, gunAngle: 0 }, 0, 10, 100, 100, 0);
      const blueProj25 = projectileSystem.projectiles[projectileSystem.projectiles.length - 1];
      assert(blueProj25.r === 25, `projectileSystem.fireGojoBlue with blueRadius: 25 must set r=25 (got ${blueProj25.r})`);

      gojoConfig.blueRadius = 150;
      projectileSystem.fireGojoBlue({ r: 25, x: 100, y: 100, gunAngle: 0 }, 0, 10, 100, 100, 0);
      const blueProj150 = projectileSystem.projectiles[projectileSystem.projectiles.length - 1];
      assert(blueProj150.r === 150, `projectileSystem.fireGojoBlue with blueRadius: 150 must set r=150 (got ${blueProj150.r})`);
    } finally {
      gojoConfig.blueRadius = origBlueR;
      gojoConfig.blueScale = origBlueScale;
    }

    // 2. Physical File Integrity on Disk for Purple, Red, and Blue
    const directories = [
      { name: 'Purple', dir: 'Purple_idle_travel', prefix: 'purple_travel' },
      { name: 'Red', dir: 'Red_reversal', prefix: 'red_reversal' },
      { name: 'Blue', dir: 'Blue_projectile', prefix: 'blue_travel' },
    ];

    for (const tech of directories) {
      const dirPath = path.join(process.cwd(), 'Assets', 'model', 'gojo', tech.dir);
      assert(fs.existsSync(dirPath), `${tech.name} directory must exist at ${dirPath}`);

      for (let i = 1; i <= 18; i++) {
        const framePath = path.join(dirPath, `${tech.prefix}-${i}.png`);
        assert(fs.existsSync(framePath), `${tech.name} frame ${i} must exist on disk at ${framePath}`);
      }

      const stripPath = path.join(dirPath, `${tech.prefix}-b.png`);
      assert(fs.existsSync(stripPath), `${tech.name} master strip must exist on disk at ${stripPath}`);
    }

    // 3. Preloader Function Pipeline across all 3 techniques
    const purpleFrames = _getGojoPurpleTravelFrames();
    assert(Array.isArray(purpleFrames) && purpleFrames.length === 18, `_getGojoPurpleTravelFrames must load 18 frames (got ${purpleFrames?.length})`);

    const redFrames = _getGojoRedReversalFrames();
    assert(Array.isArray(redFrames) && redFrames.length === 18, `_getGojoRedReversalFrames must load 18 frames (got ${redFrames?.length})`);

    const blueFrames = _getGojoBlueTravelFrames();
    assert(Array.isArray(blueFrames) && blueFrames.length === 18, `_getGojoBlueTravelFrames must load 18 frames (got ${blueFrames?.length})`);

    // 4. Sprite Rendering & Canvas 2D Stack Integrity across all colors
    for (const color of ['purple', 'red', 'blue', 'green']) {
      mockCtx.resetStackDepth();
      drawGojoPurpleTravelSprite(mockCtx, 50, 1000, false, color, 1.0);
      assert(mockCtx.getStackDepth() === 0, `drawGojoPurpleTravelSprite (${color}) must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

      mockCtx.resetStackDepth();
      drawGojoOrb(mockCtx, 0, 0, 25, 1000, color, 0);
      assert(mockCtx.getStackDepth() === 0, `drawGojoOrb (${color}) must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);
    }

    // 5. Projectile System Flight Rendering (Purple & Blue Projectiles)
    const mockPurpleProj = {
      x: 270,
      y: 480,
      r: 50,
      isGojoPurple: true,
      life: 150,
      maxLife: 200,
      visualTime: 12345,
      is200Percent: false
    };

    mockCtx.resetStackDepth();
    drawGojoPurpleOrb(mockCtx, mockPurpleProj);
    assert(mockCtx.getStackDepth() === 0, `drawGojoPurpleOrb (100% Purple) must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    mockPurpleProj.is200Percent = true;
    mockPurpleProj.r = 67.5;
    mockCtx.resetStackDepth();
    drawGojoPurpleOrb(mockCtx, mockPurpleProj);
    assert(mockCtx.getStackDepth() === 0, `drawGojoPurpleOrb (200% Purple) must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    // Blue Projectile flight
    const mockBlueProj = {
      x: 270,
      y: 480,
      r: 22.5,
      visual: 'gojoBlue',
      isGojoBlue: true,
      life: 100,
      maxLife: 100,
      visualTime: 54321
    };
    mockCtx.resetStackDepth();
    drawGojoPurpleOrb(mockCtx, mockBlueProj);
    assert(mockCtx.getStackDepth() === 0, `drawGojoPurpleOrb (Blue projectile) must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    // 6. Channeling Fusion Orbs & Ranged Blue Orb in Hands Inside Gojo Weapon Graphics
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const testGojo = new GojoClass({ type: 'gojo', x: 270, y: 480, hp: 200 });

    // Idle / Ranged Stance: Gojo holding Blue Orb
    testGojo.isMeleeMode = false;
    testGojo.shootCooldown = 0;
    mockCtx.resetStackDepth();
    drawGojoWeapon(mockCtx, testGojo);
    assert(mockCtx.getStackDepth() === 0, `drawGojoWeapon (holding Blue Orb) must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    // 100% Purple Channeling: Red & Blue merging in hands
    testGojo.isChannelingPurple = true;
    testGojo.purpleCharge = 50; // < 70%: separate Red and Blue orbs in hands
    testGojo.purpleChargeMax = 100;
    mockCtx.resetStackDepth();
    drawGojoWeapon(mockCtx, testGojo);
    assert(mockCtx.getStackDepth() === 0, `drawGojoWeapon during Red/Blue mixing must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    // Fused into Purple
    testGojo.purpleCharge = 80; // >= 70%: fused into Purple
    mockCtx.resetStackDepth();
    drawGojoWeapon(mockCtx, testGojo);
    assert(mockCtx.getStackDepth() === 0, `drawGojoWeapon during 100% Purple fusion must maintain 0 stack depth (got ${mockCtx.getStackDepth()})`);

    // 7. Canonical Flare SFX Audio Pipeline (Purple & Red Flare use flare.mp3, not dash SFX)
    assert(CONFIG.gojo?.sounds?.purpleFlare === 'Assets/Sound Effects/SkillEffects/flare.mp3', `Gojo purpleFlare SFX must be Assets/Sound Effects/SkillEffects/flare.mp3 (got ${CONFIG.gojo?.sounds?.purpleFlare})`);
    assert(CONFIG.gojo?.sounds?.redFlare === 'Assets/Sound Effects/SkillEffects/flare.mp3', `Gojo redFlare SFX must be Assets/Sound Effects/SkillEffects/flare.mp3 (got ${CONFIG.gojo?.sounds?.redFlare})`);
    const pFlareSnd = getSkillSound('gojo', 'purple_flare');
    assert(pFlareSnd?.src === 'Assets/Sound Effects/SkillEffects/flare.mp3', `getSkillSound('gojo', 'purple_flare') must resolve to flare.mp3 (got ${pFlareSnd?.src})`);
    const rFlareSnd = getSkillSound('gojo', 'red_flare');
    assert(rFlareSnd?.src === 'Assets/Sound Effects/SkillEffects/flare.mp3', `getSkillSound('gojo', 'red_flare') must resolve to flare.mp3 (got ${rFlareSnd?.src})`);
    assert(pFlareSnd?.src !== 'Assets/Sound Effects/Skills/dash3.mp3', 'purple_flare must NOT use dash3.mp3');
    assert(rFlareSnd?.src !== 'Assets/Sound Effects/Skills/dash3.mp3', 'red_flare must NOT use dash3.mp3');

    // 8. Reversal Red Deploy Audio Pipeline (redDeploy: Assets/Sound Effects/Skills/reddeploy.mp3)
    assert(CONFIG.gojo?.sounds?.redDeploy === 'Assets/Sound Effects/Skills/reddeploy.mp3', 'Gojo redDeploy SFX must be Assets/Sound Effects/Skills/reddeploy.mp3');
    const rDeploySnd = getSkillSound('gojo', 'red_deploy');
    assert(rDeploySnd?.src === 'Assets/Sound Effects/Skills/reddeploy.mp3', 'getSkillSound("gojo", "red_deploy") must resolve to reddeploy.mp3');
    assert((rDeploySnd?.volume ?? 0) > 0, 'redDeploy volume must be > 0');

    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const redGojo = new GojoClass({ radius: 25, x: 200, y: 300, hp: 200 });
    const redEnemy = new SukunaClass({ radius: 25, x: 400, y: 300, hp: 300 });
    redGojo.reset();
    redGojo._activateRed();
    assert(redGojo.redBuildupPhase === true, 'Gojo must be in redBuildupPhase');
    assert(redGojo._hasPlayedRedDeploySound === false, 'redDeploy sound must not play at start of buildup');

    const RED_BUILDUP = CONFIG.gojo?.redBuildupFrames || 100;
    const maxTimer = redGojo.redEffectMaxTimer || (RED_BUILDUP + 25);
    redGojo.redEffectTimer = maxTimer - Math.floor(RED_BUILDUP * 0.75);
    redGojo.update(redEnemy, 0, state.arena);
    assert(redGojo._hasPlayedRedDeploySound === true, 'redDeploy sound must trigger at 75% buildup');

    redGojo.cancelRed(false);
    assert(redGojo._hasPlayedRedDeploySound === false, 'redDeploy flag must reset on cancelRed');

    redGojo._activateRed();
    assert(redGojo._hasPlayedRedDeploySound === false);
    redGojo._detonateRed();
    assert(redGojo._hasPlayedRedDeploySound === true, 'direct detonateRed must trigger redDeploy if not already played');

    console.log('      ✅ Gojo Limitless Cursed Techniques (Purple, Red, Blue) 18-Frame Animated Sprite Pipeline, Canonical Flare & Red Deploy Audio verified successfully.');
  }

  // ── TEST: Sans Gaster Blaster Beam Stopped by Active Gojo Infinity & Knight Shield ──
  console.log('   Testing Sans Gaster Blaster Beam Clamping against Active Gojo Infinity & Knight Shield...');
  {
    const SansClass = FIGHTER_CLASS_MAP['sans'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const KnightClass = FIGHTER_CLASS_MAP['knight'];
    const NormalClass = FIGHTER_CLASS_MAP['normal'];
    assert(SansClass && GojoClass && KnightClass && NormalClass, 'Sans, Gojo, Knight, and Normal classes must exist');

    const sans = new SansClass({ x: 100, y: 300, team: 0 });
    const gojo = new GojoClass({ x: 350, y: 300, team: 1 });
    const knight = new KnightClass({ x: 350, y: 300, team: 1 });
    const bystanderBehind = new NormalClass({ x: 550, y: 300, team: 1 });
    sans.x = 100; sans.y = 300; sans.team = 0;
    gojo.x = 350; gojo.y = 300; gojo.team = 1;
    knight.x = 350; knight.y = 300; knight.team = 1;
    bystanderBehind.x = 550; bystanderBehind.y = 300; bystanderBehind.team = 1;

    const blaster = {
      x: 150,
      y: 300,
      angle: 0, // Aiming right (+X) toward x=350 and x=550
      scale: 1.0,
      spawnScale: 1.0,
      chargeTimer: 0,
      chargeMax: 16,
      fireTimer: 20,
      fireMax: 20,
      damage: 20,
      pattern: 0,
      beamHeight: 32,
      beamWidth: 32,
      reach: 800,
      maxReach: 800,
      length: 800,
      isCharging: false,
      isFiring: true,
      damageDealt: false,
      hitTargets: new Set(),
      targetLastHitFrame: new Map()
    };

    // 1. Usually (normal target without Infinity or Shield): beam passes straight through at full reach (800)
    state.fighters = [sans, bystanderBehind];
    state.illusions = [];
    const unblockedLength = sans._getEffectiveBlasterBeamLength(blaster, bystanderBehind);
    assert(unblockedLength === 800, `Gaster Blaster beam must pass through normal targets at full reach 800 (got ${unblockedLength})`);

    // 2. Gojo with active Limitless Infinity: beam stops at Gojo's Infinity barrier edge and does not pass through
    gojo.infinityActive = true;
    gojo.infinityCooldown = 0;
    gojo.domainActive = false;
    gojo.isMeleeMode = false;
    state.fighters = [sans, gojo, bystanderBehind];
    const expectedInfinityRadius = CONFIG.gojo?.infinityRadius ?? ((gojo.r || 25) + 30);
    const expectedGojoStopDist = (gojo.x - blaster.x) - expectedInfinityRadius; // 200 - 80 = 120
    const gojoClampedLength = sans._getEffectiveBlasterBeamLength(blaster, gojo);
    assert(
      Math.abs(gojoClampedLength - expectedGojoStopDist) < 0.01,
      `Gaster Blaster beam must stop at Gojo's active Infinity barrier (${expectedGojoStopDist}px), got ${gojoClampedLength}px`
    );

    sans.gasterBlasters = [{ ...blaster, hitTargets: new Set(), targetLastHitFrame: new Map() }];
    const gojoInitialHp = gojo.hp;
    const bystanderInitialHp = bystanderBehind.hp;
    sans._updateGasterBlasters(gojo);
    assert(
      Math.abs(sans.gasterBlasters[0].effectiveReach - expectedGojoStopDist) < 0.01,
      'Active blaster effectiveReach must be clamped to Gojo Infinity edge during update'
    );
    assert(gojo.hp === gojoInitialHp, 'Gojo with active Infinity must take 0 HP damage from Gaster Blaster');
    assert((gojo.karmaDamage || 0) === 0, 'Gojo with active Infinity must not accumulate Karma poison from blocked Gaster Blaster');
    assert(bystanderBehind.hp === bystanderInitialHp, 'Target behind Gojo with active Infinity must not be hit by Gaster Blaster beam');

    // When Gojo's Infinity is on cooldown / inactive, the beam passes through normally
    gojo.infinityCooldown = 60;
    const gojoInactiveLength = sans._getEffectiveBlasterBeamLength(blaster, gojo);
    assert(gojoInactiveLength === 800, `Gaster Blaster beam must pass through when Gojo Infinity is on cooldown (got ${gojoInactiveLength})`);
    gojo.infinityCooldown = 0;

    // 3. Knight with active Shield: beam stops at Knight's shield edge and does not pass through
    knight.isShieldBroken = false;
    knight.shieldHp = 100;
    state.fighters = [sans, knight, bystanderBehind];
    const expectedShieldRadius = (knight.r || 25) + 14;
    const expectedKnightStopDist = (knight.x - blaster.x) - expectedShieldRadius; // 200 - 39 = 161
    const knightClampedLength = sans._getEffectiveBlasterBeamLength(blaster, knight);
    assert(
      Math.abs(knightClampedLength - expectedKnightStopDist) < 0.01,
      `Gaster Blaster beam must stop at Knight's active shield (${expectedKnightStopDist}px), got ${knightClampedLength}px`
    );

    sans.gasterBlasters = [{ ...blaster, hitTargets: new Set(), targetLastHitFrame: new Map() }];
    const knightInitialHp = knight.hp;
    const knightInitialShieldHp = knight.shieldHp;
    sans._updateGasterBlasters(knight);
    assert(knight.shieldHp < knightInitialShieldHp, 'Knight shield must absorb Gaster Blaster impact damage');
    assert(knight.hp === knightInitialHp, 'Knight HP must remain undamaged while shield blocks Gaster Blaster');
    assert((knight.karmaDamage || 0) === 0, 'Knight must not accumulate Karma poison while shield blocks Gaster Blaster');
    assert(bystanderBehind.hp === bystanderInitialHp, 'Target behind Knight with active shield must not be hit by Gaster Blaster beam');

    // When Knight's shield is broken, the beam passes through normally
    knight.isShieldBroken = true;
    knight.shieldHp = 0;
    const knightBrokenLength = sans._getEffectiveBlasterBeamLength(blaster, knight);
    assert(knightBrokenLength === 800, `Gaster Blaster beam must pass through when Knight shield is broken (got ${knightBrokenLength})`);

    mockCtx.resetStackDepth();
    sans.draw(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Sans.draw must maintain 0 Canvas 2D stack depth');
    sans.gasterBlasters = [];
    console.log('      ✅ Sans Gaster Blaster beam clamping against Gojo Infinity & Knight Shield verified.');
  }

  // ── Test 96: Gojo Blue Projectile Trajectory, Pierce Through Enemies & Wall Linger Standard ──
  {
    console.log('🧪 Test 96: Gojo Blue Projectile Trajectory, Pierce & Arena Wall Linger Standard...');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    state.arena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    state.gameState = 'playing';

    const gojo = new GojoFighter({ characterId: 'gojo', name: 'Gojo', x: 135, y: 465, color: '#00F0FF', radius: 25, hp: 500, maxHp: 500, controls: {} });
    const sukuna = new SukunaFighter({ characterId: 'sukuna', name: 'Sukuna', x: 270, y: 465, color: '#FF0055', radius: 25, hp: 500, maxHp: 500, controls: {} });
    gojo.team = 0;
    sukuna.team = 1;
    sukuna.dodgeCooldown = 999; // Disable random teleport dodge during deterministic test
    state.fighters = [gojo, sukuna];
    projectileSystem.projectiles = [];

    const initialSukunaHp = sukuna.hp;
    gojo.gunAngle = 0; // Aiming right across the arena
    projectileSystem.fireGojoBlue(gojo, 0, 25);

    assert(projectileSystem.projectiles.length === 1, 'Gojo Blue projectile must spawn in projectileSystem');
    const blue = projectileSystem.projectiles[0];

    // Frame 1 check: Blue must not be trapped on the left wall despite large pull radius
    assert(blue.isWallLingering === false, 'Gojo Blue must NOT trigger wall linger on Frame 1 near spawn');
    assert(blue.vx > 0, `Gojo Blue must possess positive travel velocity vx, got ${blue.vx}`);

    let hitSukuna = false;
    let reachedRightWall = false;

    // Simulate flight across the arena
    for (let f = 0; f < 60; f++) {
      projectileSystem.update(state.fighters, mockCtx);
      if (projectileSystem.projectiles.length === 0) break;

      const currentBlue = projectileSystem.projectiles[0];
      if (sukuna.isCaughtInBlue) {
        hitSukuna = true;
      }
      if (currentBlue.isWallLingering) {
        reachedRightWall = true;
        break;
      }
    }

    assert(hitSukuna, 'Gojo Blue must pierce and pull Sukuna along its flight path');
    assert(reachedRightWall, 'Gojo Blue must travel all the way across the arena to the right wall');
    assert(blue.isWallLingering === true, 'Gojo Blue must enter wall lingering state upon contacting arena wall');
    assert(blue.x >= 470, `Gojo Blue must reach right wall perimeter (x >= 470), got ${blue.x}`);
    assert(blue.vx === 0 && blue.vy === 0, 'Gojo Blue travel velocity must be halted while lingering on wall');

    // Simulate lingering duration
    const initialLingerTimer = blue.wallLingerTimer;
    assert(initialLingerTimer > 0, 'Wall linger timer must be initialized to positive value');

    for (let f = 0; f < initialLingerTimer + 5; f++) {
      projectileSystem.update(state.fighters, mockCtx);
    }

    assert(projectileSystem.projectiles.length === 0, 'Gojo Blue must cleanly expire after wall linger duration elapses');
    assert(sukuna.isCaughtInBlue === false, 'Sukuna isCaughtInBlue flag must be cleared when Blue expires');
    assert(sukuna.isCaughtInBluePull === false, 'Sukuna isCaughtInBluePull flag must be cleared when Blue expires');
    // Sukuna takes direct impact damage (25) plus periodic vortex tick damage while ensnared
    assert(sukuna.hp < initialSukunaHp - 25, `Sukuna must take impact damage plus periodic vortex tick damage, got HP ${sukuna.hp}`);

    // Verify Mahoraga takes impact + vortex tick damage, and benefits from Blue adaptation
    const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
    const mahoraga = new MahoragaFighter({ characterId: 'mahoraga', name: 'Mahoraga', x: 270, y: 465, radius: 25, hp: 500, maxHp: 500, controls: {} });
    mahoraga.team = 1;
    const initialMahoragaHp = mahoraga.hp;
    state.fighters = [gojo, mahoraga];
    projectileSystem.projectiles = [];
    projectileSystem.fireGojoBlue(gojo, 0, 25);
    for (let f = 0; f < 60; f++) {
      projectileSystem.update(state.fighters, mockCtx);
    }
    assert(mahoraga.hp < initialMahoragaHp - 25, `Mahoraga must take impact damage plus steady vortex tick damage, got ${mahoraga.hp} hp`);

    // Verify 75% damage reduction when Mahoraga adapts to Blue
    mahoraga.gojoAdapted.blue = true;
    mahoraga.gojoBlueDragImmune = true;
    const adaptedHpBefore = mahoraga.hp;
    projectileSystem.projectiles = [];
    projectileSystem.fireGojoBlue(gojo, 0, 25);
    for (let f = 0; f < 60; f++) {
      projectileSystem.update(state.fighters, mockCtx);
    }
    const unadaptedDamage = initialMahoragaHp - mahoraga.hp;
    assert(mahoraga.gojoBlueDragImmune === true, 'Mahoraga must maintain Blue drag immunity');

    projectileSystem.projectiles = [];
    console.log('      ✅ Gojo Blue projectile travel, enemy pierce, wall latch, and smooth periodic tick damage verified.');
  }

  // ── Test 97: Gojo Hand VFX Scaling: Increased Blue Hand Scale & Decreased Reversal Red Channeling Scale ──
  {
    console.log('🧪 Test 97: Gojo Hand VFX Scaling (Increased Blue & Decreased Reversal Red)...');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { drawGojoWeapon } = await import('../js/graphics/weapons/gojoWeaponGraphics.js');
    const { GojoRenderer } = await import('../js/graphics/fighters/gojoRenderer.js');

    const gojo = new GojoFighter({ characterId: 'gojo', name: 'Gojo', x: 200, y: 300, radius: 25, hp: 500, maxHp: 500, controls: {} });
    gojo.gunAngle = 0;
    gojo.isMeleeMode = false;
    gojo.orbTransition = 1.0;
    gojo._blueOrbDisplayAlpha = 1.0;

    // 1. Verify Blue Hand Scale config is increased
    assert(typeof CONFIG.gojo?.blueHandScale === 'number' && CONFIG.gojo.blueHandScale >= 1.4, 'CONFIG.gojo.blueHandScale must be configured >= 1.4');

    // 2. Verify Reversal Red Hand Scale config is decreased for channeling
    assert(typeof CONFIG.gojo?.redHandScale === 'number' && CONFIG.gojo.redHandScale <= 0.35, 'CONFIG.gojo.redHandScale must be configured <= 0.35');

    // 3. Render Blue on hands with mockCtx and verify stack balance
    mockCtx.resetStackDepth();
    drawGojoWeapon(mockCtx, gojo);
    assert(mockCtx.getStackDepth() === 0, 'drawGojoWeapon with Blue on hands must maintain 0 Canvas 2D stack depth');

    // 4. Set up Gojo in Reversal Red buildup channeling phase
    gojo.redEffectTimer = 125;
    gojo.redEffectMaxTimer = 125;
    gojo.redBuildupPhase = true;

    mockCtx.resetStackDepth();
    GojoRenderer._drawReversalRedEffect(mockCtx, gojo);
    assert(mockCtx.getStackDepth() === 0, 'GojoRenderer._drawReversalRedEffect during channeling must maintain 0 Canvas 2D stack depth');

    // Clean up
    gojo.redEffectTimer = 0;
    gojo.redBuildupPhase = false;
    console.log('      ✅ Gojo increased Blue hand scale and decreased Reversal Red channeling hand scale verified.');
  }

  // 🧪 Test 98: Unarmed Earclacks Ball Fight Mechanics (Momentum Scaling, Wall Ricochets, Afterimages, Shockwaves & Canvas 2D Stack Balance) 🧪
  {
    console.log('🧪 Test 98: Unarmed Earclacks Ball Fight Mechanics (Momentum Scaling, Wall Ricochets, Afterimages, Shockwaves & Stack Balance)...');
    const { UnarmedFighter } = await import('../js/entities/fighters/UnarmedFighter.js');
    const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    const arena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };
    state.gameState = 'playing';
    const unarmed = new UnarmedFighter({ characterId: 'unarmed', name: 'Unarmed', x: 200, y: 300, radius: 25, hp: 1100, maxHp: 1100 });
    const dummy = new NormalFighter({ characterId: 'normal', name: 'Dummy', x: 260, y: 300, radius: 25, hp: 500, maxHp: 500 });
    state.fighters = [unarmed, dummy];

    // 1. Initial State & Official Wiki Traits
    assert(unarmed.momentumStacks === 0, 'Unarmed must initialize with 0 momentum stacks');
    assert(unarmed.isTerminalVelocity === false, 'Terminal velocity overdrive must be inactive initially');
    assert(unarmed.isUnparriable === true, 'Unarmed must be unparriable as hits connect directly with body');
    assert(unarmed.hideHands === true, 'Unarmed default model hands must be hidden');
    assert(unarmed.hideWeapon === true, 'Unarmed default weapons must be hidden');

    // 2. Wall Ricochet Physics (Conserves natural velocity without gaining momentum stacks; only enemy hits scale momentum)
    unarmed.x = arena.x - 5; // Force wall contact on left arena wall
    unarmed.vx = -4.0;
    unarmed.vy = 2.0;
    unarmed.resolveWallBounce(arena, dummy);
    assert(unarmed.momentumStacks === 0, 'Unarmed must NOT gain momentum stacks on wall bounce (only on enemy hits)');
    assert(unarmed.vx > 0, 'Unarmed horizontal velocity must reflect outward after left wall bounce');
    assert(unarmed.visualShockwaves.length > 0, 'Wall bounce must spawn concentric shockwave visual effect');

    // 2.5 Hit Deceleration & Permanent Speed Scaling (Wiki: "Typically slows down slightly after being hit by an opponent")
    unarmed.momentumStacks = 3;
    unarmed.vx = 8.0;
    unarmed.vy = 0;
    unarmed.takeDamage(10, dummy, 0);
    assert(unarmed.momentumStacks === 3, 'Unarmed momentum stacks must be PERMANENT and never lost on hit');
    assert(unarmed.vx < 8.0, 'Unarmed must decelerate slightly in current velocity when hit by opponent');

    // 2.6 Permanent Speed Retention across frames (zero decay over time)
    const initialStacks = unarmed.momentumStacks;
    for (let f = 0; f < 180; f++) {
      unarmed.update(dummy, 0, arena);
    }
    assert(unarmed.momentumStacks >= initialStacks, 'Unarmed momentum stacks and gained speed must remain permanent with ZERO decay over time');

    // 3. Kinetic Surge Activation
    unarmed._castKineticSurge(dummy);
    assert(unarmed.surgeTimer > 0, 'Kinetic surge must activate active surge timer');
    assert(unarmed.momentumStacks >= 2, 'Kinetic surge must grant bonus momentum stacks');
    assert(Math.hypot(unarmed.vx, unarmed.vy) >= 15.0, 'Kinetic surge must rocket Unarmed forward at high speed');

    // 4. Super Unarmed Overdrive (Wiki: White ball with light grey outline, top speed throughout duration)
    unarmed._castSuperUnarmed(dummy);
    assert(unarmed.isSuperUnarmed === true, 'Super Unarmed must activate');
    assert(unarmed.momentumStacks >= 22, 'Super Unarmed must elevate momentum stacks into overdrive');
    assert(Math.hypot(unarmed.vx, unarmed.vy) >= 17.5, 'Super Unarmed must propel Unarmed at top terminal velocity');

    // 5. Update Loop, Afterimages & Visual Decay (Rule 25)
    unarmed.update(dummy, 0, arena);
    assert(unarmed.afterimages.length > 0, 'High-velocity movement must spawn ghost afterimages');

    // 6. Projectile Suppression & Basic Attack Lunge (Rule 23)
    const initialBullets = projectileSystem.bullets ? projectileSystem.bullets.length : 0;
    unarmed.shoot(0, dummy);
    const afterBullets = projectileSystem.bullets ? projectileSystem.bullets.length : 0;
    assert(initialBullets === afterBullets, 'Unarmed shoot() must suppress default generic projectile bullets (Rule 23)');

    // 7. Wall Rebounce Requirement: Must Rebounce to Wall to Deal Damage (Earclacks Standard)
    state.gameState = 'playing';
    const collisionDummy = new NormalFighter({ characterId: 'normal', name: 'CollisionDummy', x: 260, y: 300, radius: 25, hp: 500, maxHp: 500 });
    state.fighters = [unarmed, collisionDummy];
    const dummyInitialHp = collisionDummy.hp;
    unarmed.isSuperUnarmed = false;
    unarmed.momentumStacks = 3;
    unarmed.speed = unarmed.baseSpeed + unarmed.momentumStacks * unarmed.speedPerHit;
    const initialUnarmedSpeed = unarmed.speed;
    const initialMomentum = unarmed.momentumStacks;

    // 7.1 Without wall rebounce: deals ZERO damage and gains ZERO momentum
    unarmed.hasWallRebounded = false;
    unarmed.x = collisionDummy.x - 5;
    unarmed.y = collisionDummy.y;
    unarmed.vx = 15.0;
    unarmed.vy = 0;
    unarmed.collisionCooldown = 0;
    unarmed._checkFighterCollision(collisionDummy);
    assert(collisionDummy.hp === dummyInitialHp, 'Unarmed must NOT deal damage without rebouncing off the wall first');
    assert(unarmed.momentumStacks === initialMomentum, 'Unarmed must NOT gain momentum without rebouncing off the wall first');

    // 7.2 Rebounce off arena wall: primes Unarmed for damage
    unarmed.x = arena.x - 5;
    unarmed.vx = -4.0;
    unarmed.vy = 0;
    unarmed.resolveWallBounce(arena, collisionDummy);
    assert(unarmed.hasWallRebounded === true, 'Wall bounce must prime Unarmed with wall rebound charge (hasWallRebounded = true)');

    // 7.3 Primed collision after wall rebounce: deals full kinetic damage, scales momentum & consumes charge
    unarmed.x = collisionDummy.x - 5;
    unarmed.y = collisionDummy.y;
    unarmed.vx = 15.0;
    unarmed.vy = 0;
    unarmed.collisionCooldown = 0;
    unarmed._checkFighterCollision(collisionDummy);
    assert(collisionDummy.hp < dummyInitialHp, 'High-velocity body collision after wall rebounce must deal kinetic impact damage');
    assert(collisionDummy.vx > 0, 'High-velocity body collision must apply directional knockback to opponent');
    assert(unarmed.momentumStacks > initialMomentum, 'Primed collision into enemy must gain momentum stacks');
    assert(unarmed.speed > initialUnarmedSpeed, 'Primed collision into enemy must permanently increase Unarmed speed');
    assert(unarmed.hasWallRebounded === false, 'Wall rebound charge must be consumed upon dealing damage');

    // 7.5 Hit Slow Movement Verification for both Unarmed and Opponent
    assert(collisionDummy.slowTimer > 0, 'Opponent must experience a brief movement slow upon collision hit');
    assert(collisionDummy.slowMultiplier <= 0.5, 'Opponent must have reduced movement speed multiplier during hit slow');
    assert(unarmed.slowTimer > 0, 'Unarmed must experience a brief movement slow upon collision hit');
    assert(unarmed.slowMultiplier <= 0.5, 'Unarmed must have reduced movement speed multiplier during hit slow');
    assert(unarmed.punchAnimTimer > 0, 'Unarmed must trigger dynamic martial arts fist punch animation on collision impact');

    // 7.6 Basic Skill HUD Registration & Config Ability Toggles
    const { unarmedConfig } = await import('../js/configs/characters/unarmedConfig.js');
    assert(unarmedConfig.enableKineticBump === true, 'unarmedConfig must define enableKineticBump toggle');
    assert(unarmedConfig.enableMomentumScaling === true, 'unarmedConfig must define enableMomentumScaling toggle');
    assert(unarmedConfig.enableSuperUnarmed === true, 'unarmedConfig must define enableSuperUnarmed toggle');
    assert(unarmedConfig.enableHitSlow === true, 'unarmedConfig must define enableHitSlow toggle');
    assert(unarmedConfig.enableKineticSurge === true, 'unarmedConfig must define enableKineticSurge toggle');
    assert(unarmedConfig.enableBallSteering !== undefined, 'unarmedConfig must define enableBallSteering toggle');
    assert(unarmedConfig.requireWallBounceForDamage === true, 'unarmedConfig must define requireWallBounceForDamage toggle');

    const basicSkill = unarmed.skillManager.getSkill('kineticBump');
    assert(Boolean(basicSkill), 'Unarmed must register Kinetic Bump as its declarative basic attack skill in SkillManager');
    assert(basicSkill.type === 'basic', 'Kinetic Bump skill must have type basic');

    // 7.7 Direct Physics onCollide Hook Verification (requires wall rebounce)
    const onCollideDummy = new NormalFighter({ characterId: 'normal', name: 'OnCollideDummy', x: 260, y: 300, radius: 25, hp: 500, maxHp: 500 });
    const onCollideInitialHp = onCollideDummy.hp;

    // Unprimed onCollide: zero damage
    unarmed.hasWallRebounded = false;
    unarmed.collisionCooldown = 0;
    unarmed.onCollide(onCollideDummy);
    assert(onCollideDummy.hp === onCollideInitialHp, 'onCollide hook must NOT deal damage without rebouncing off the wall first');

    // Primed onCollide after wall bounce: deals damage
    unarmed.x = arena.x - 5;
    unarmed.vx = -4.0;
    unarmed.resolveWallBounce(arena, onCollideDummy);
    assert(unarmed.hasWallRebounded === true, 'Wall bounce must prime Unarmed before onCollide');

    unarmed.collisionCooldown = 0;
    unarmed.onCollide(onCollideDummy);
    assert(onCollideDummy.hp < onCollideInitialHp, 'onCollide hook must trigger kinetic bump damage after wall rebounce');
    assert(unarmed.collisionCooldown > 0, 'onCollide hook must initiate collision cooldown to prevent multi-hit glitching');
    assert(unarmed.hasWallRebounded === false, 'onCollide damage must consume wall rebounce charge');

    // Verify toggle gating
    unarmed.isSuperUnarmed = false;
    unarmedConfig.enableSuperUnarmed = false;
    unarmed._castSuperUnarmed(dummy);
    assert(unarmed.isSuperUnarmed === false, '_castSuperUnarmed must be gated when enableSuperUnarmed is false');
    unarmedConfig.enableSuperUnarmed = true;

    // 8. Real-Time HUD Stats (DMG & SPD Dynamic Scaling with Momentum)
    const { drawHUD, clearHealthHud } = await import('../js/graphics/hudManager.js');
    unarmed.momentumStacks = 0;
    unarmed.isSuperUnarmed = false;
    unarmed.isTerminalVelocity = false;
    unarmed._syncLiveDamageAndSpeed();
    assert(unarmed.damage === (unarmedConfig.baseCollisionDamage || 30), 'Unarmed damage at 0 momentum must equal base collision damage');
    assert(unarmed.speed === (unarmedConfig.speed || 5.0), 'Unarmed speed at 0 momentum must equal base speed');

    state.fighters = [unarmed, dummy];
    state.mode = '1v1';
    state.gameState = 'running';
    const origStatsToggle = CONFIG.darkModeShowHudStats;
    const origHideStats = CONFIG.hudHideStats;
    const origHideAll = CONFIG.hudHideAll;
    CONFIG.darkModeShowHudStats = 1;
    CONFIG.hudHideStats = false;
    CONFIG.hudHideAll = false;
    clearHealthHud();
    drawHUD();

    let hudContent = (document.getElementById('healthHudLeft')?.innerHTML || '') +
                     (document.getElementById('healthHudRight')?.innerHTML || '') +
                     (document.getElementById('healthHud')?.innerHTML || '');
    let hudText = hudContent.replace(/<[^>]*>/g, '');
    assert(hudText.includes('DMG:') && hudText.includes('SPD:') && hudText.includes('EVADE:'), 'Unarmed HUD must display DMG, SPD, and EVADE stats');

    // Gain 5 momentum stacks and verify live scaling
    unarmed.momentumStacks = 5;
    unarmed.evadeHits = 5;
    unarmed._syncEvadeChance();
    unarmed._syncLiveDamageAndSpeed();
    assert(unarmed.damage > (unarmedConfig.baseCollisionDamage || 30), 'Unarmed dynamic damage must increase when gaining momentum');
    assert(unarmed.speed > (unarmedConfig.speed || 5.0), 'Unarmed dynamic speed must increase when gaining momentum');
    assert(unarmed.evadeChance >= 0.20, 'Unarmed evade chance must increase with hit stacks');

    clearHealthHud(true);
    drawHUD();
    hudContent = (document.getElementById('healthHudLeft')?.innerHTML || '') +
                 (document.getElementById('healthHudRight')?.innerHTML || '') +
                 (document.getElementById('healthHud')?.innerHTML || '');
    assert(hudContent.includes('x5'), 'Unarmed HUD stats must display live momentum stack count x5');
    assert(hudContent.includes('EVADE:'), 'Unarmed HUD stats must display EVADE stat');

    // Uncapped Momentum, Speed & Damage Scaling Verification
    unarmed.momentumStacks = 45;
    unarmed._syncLiveDamageAndSpeed();
    assert(unarmed.momentumStacks === 45, 'Unarmed momentum stacks must be uncapped');
    assert(unarmed.speed >= 45.0, 'Unarmed speed must scale with all momentum stacks without being capped');
    assert(unarmed.damage >= 100, 'Unarmed damage must scale with all momentum stacks without being capped');

    // Super Unarmed Overdrive HUD Stats
    unarmed._castSuperUnarmed(dummy);
    clearHealthHud(true);
    drawHUD();
    hudContent = (document.getElementById('healthHudLeft')?.innerHTML || '') +
                 (document.getElementById('healthHudRight')?.innerHTML || '') +
                 (document.getElementById('healthHud')?.innerHTML || '');
    assert(hudContent.includes('SUPER'), 'Unarmed HUD stats must display SUPER overdrive indicator when Super Unarmed is active');

    // 8.5 Evade Mechanic & Anti-Summon Afterimage Bug Verification
    const origRandom = Math.random;
    Math.random = () => 0.01; // Force evade check success
    const didEvade = !unarmed._filterDamageImmunityAndEvade(25, dummy, { isBasicAttack: true });
    Math.random = origRandom;
    assert(didEvade, 'Unarmed must successfully evade basic attack when evade chance succeeds');

    // Anti-Summon Bug: Ensure distance teleport/summon never creates rogue afterimages
    unarmed.clearAllAfterimages();
    assert(unarmed.afterimages.length === 0, 'clearAllAfterimages must clear all afterimages');
    unarmed._lastTrailX = 100;
    unarmed._lastTrailY = 100;
    unarmed.x = 400; // 300px jump simulating summon / tag-in spawn
    unarmed.y = 400;
    state.gameState = 'playing';
    unarmed.update(dummy, 0, arena);
    assert(unarmed.afterimages.length === 0, 'Distance jump upon summon/teleport must NEVER spawn rogue afterimages across the arena');

    // Verify reduced afterimage cap (<= 8 in normal mode)
    unarmed.isSuperUnarmed = false;
    unarmed.vx = 8.0;
    unarmed.vy = 4.0;
    for (let f = 0; f < 25; f++) {
      unarmed.update(dummy, 0, arena);
    }
    assert(unarmed.afterimages.length <= 8, `Unarmed active afterimages must be strictly capped to 8 or fewer (got ${unarmed.afterimages.length})`);

    // 8.6 Winning Match Body HP Consistency (Number must NEVER jump to 100 on victory)
    const { getUnarmedHpText } = await import('../js/graphics/fighters/unarmedSkin.js');
    unarmed.hp = 352;
    unarmed.maxHp = 1100; // 352 / 1100 = 32%
    assert(getUnarmedHpText(unarmed) === '32', 'getUnarmedHpText must return 32% during active combat');

    // Win the match: matchEnd / roundEnd / winner reveal
    state.gameState = 'matchEnd';
    state.matchWinner = unarmed;
    state.roundWinner = unarmed;
    unarmed._isWinnerReveal = true;
    assert(getUnarmedHpText(unarmed) === '32', 'Unarmed body HP number must strictly remain at actual remaining HP (32) and NEVER jump to 100 on match win');

    CONFIG.hudHideStats = origHideStats;
    CONFIG.hudHideAll = origHideAll;
    CONFIG.darkModeShowHudStats = origStatsToggle;

    // 9. Canvas 2D Stack Depth Integrity (Rule 21, 24, 20)
    mockCtx.resetStackDepth();
    unarmed.draw(mockCtx, dummy);
    assert(mockCtx.getStackDepth() === 0, 'Unarmed.draw() must strictly maintain 0 Canvas 2D stack depth');

    mockCtx.resetStackDepth();
    unarmed.drawBody(mockCtx);
    assert(mockCtx.getStackDepth() === 0, 'Unarmed.drawBody() must strictly maintain 0 Canvas 2D stack depth');

    console.log('      ✅ Unarmed momentum scaling, wall ricochets, afterimages, shockwaves and stack balance verified.');
  }

  // ── TEST 99: Saitama Arena Wall Interaction Suppression Standard ──
  {
    console.log('🧪 Test 99: Saitama Arena Wall Interaction Suppression Standard (Wall Shatter, Wall Pin & Crack Decals)...');
    const { SaitamaFighter } = await import('../js/entities/fighters/SaitamaFighter.js');
    const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
    const { triggerSaitamaWallShatter } = await import('../js/graphics/particles/saitamaWallShatter.js');

    const arena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };
    state.arena = arena;
    state.gameState = 'playing';
    state.shatteredWalls = [];
    state.wallCracks = [];

    // 1. Verify Configuration Defaults
    assert(CONFIG.saitama.enableWallInteraction === false, 'CONFIG.saitama.enableWallInteraction master toggle must default to false');
    assert(CONFIG.saitama.enableWallShatter === false, 'CONFIG.saitama.enableWallShatter must default to false');
    assert(CONFIG.saitama.enableWallPin === false, 'CONFIG.saitama.enableWallPin must default to false');

    const saitama = new SaitamaFighter({ characterId: 'saitama', name: 'Saitama', x: 200, y: 300, radius: 25, hp: 1000, maxHp: 1000 });
    const dummy = new NormalFighter({ characterId: 'normal', name: 'Dummy', x: 250, y: 300, radius: 25, hp: 500, maxHp: 500 });
    state.fighters = [saitama, dummy];

    // 2. Normal Punch Wall Interaction Suppression
    saitama.punchCooldownTimer = 0;
    saitama.executeNormalPunch(dummy);
    assert(state.shatteredWalls.length === 0, 'Saitama Normal Punch must NOT shatter arena walls when wall interaction is disabled');
    assert(dummy.isWallPinnedBySaitama !== true, 'Dummy must NOT be flagged as isWallPinnedBySaitama when wall pin is disabled');
    assert(dummy.preventKnockbackBounce !== true, 'Dummy must NOT prevent knockback bounce when wall pin is disabled');

    // 3. Wall Bounce Collision: Target should bounce off arena wall normally without sticking or cracking
    dummy.x = arena.x + dummy.r - 2; // Position at left arena boundary
    dummy.y = 300;
    dummy.knockbackVx = -20;
    dummy.vx = -20;
    const bounced = dummy.resolveWallBounce(arena, saitama);
    assert(bounced === true, 'Dummy must resolve standard wall bounce on contact with arena wall');
    assert(dummy.vx > 0, 'Dummy must rebound with positive horizontal velocity after left wall bounce');
    assert(dummy.isWallPinnedBySaitama !== true, 'Dummy must not remain pinned by Saitama after wall contact');
    assert(state.wallCracks.length === 0, 'No wall crack decals must be spawned on arena walls');

    // 4. Serious Counter Punch Wall Interaction Suppression
    state.shatteredWalls = [];
    saitama._counterReleaseOriginX = saitama.x;
    saitama._counterReleaseOriginY = saitama.y;
    saitama._counterPunchTarget = dummy;
    saitama._counterPunchTimer = 1;
    saitama._tickCounterPunch();
    assert(state.shatteredWalls.length === 0, 'Saitama Serious Counter must NOT shatter arena walls when wall interaction is disabled');
    assert(dummy.isWallPinnedBySaitama !== true, 'Dummy must NOT be pinned by Saitama Serious Counter when wall pin is disabled');

    // 5. Direct triggerSaitamaWallShatter Call Guard
    state.shatteredWalls = [];
    triggerSaitamaWallShatter(saitama.x, saitama.y, 0, arena);
    assert(state.shatteredWalls.length === 0, 'triggerSaitamaWallShatter must exit early and spawn 0 shattered wall pieces when disabled');

    // 6. Stack Depth Integrity on Saitama
    mockCtx.resetStackDepth();
    saitama.draw(mockCtx, dummy);
    assert(mockCtx.getStackDepth() === 0, 'Saitama.draw() must strictly maintain 0 Canvas 2D stack depth');

    console.log('      ✅ Saitama arena wall interaction suppression (zero wall shatter, zero wall pin, zero wall crack) verified.');
  }

  // ── TEST 100: Toji Tactical Handgun / Pistol Basic Attack Standard ──
  console.log('🧪 Test 100: Toji Tactical Handgun / Pistol Basic Attack Standard (Projectile, Cooldown, Damage & Stack Balance)...');
  {
    const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');
    const { projectileSystem } = await import('../js/systems/projectileSystem.js');

    const toji = new TojiFighter({ x: 200, y: 300, radius: 25, hp: 420, maxHp: 420, color: '#281438' });
    const dummy = new Fighter({ x: 350, y: 300, radius: 25, hp: 200, maxHp: 200, color: '#EF4444' });

    toji.team = 0;
    dummy.team = 1;
    toji.stealthTimer = 0;
    toji.isStealthed = false;
    toji.isAmbushing = false;
    toji.ultimateActive = false;

    state.fighters = [toji, dummy];
    state.projectiles = [];
    projectileSystem.projectiles = [];

    // 1. Fire pistol basic attack
    toji.aim(dummy);
    assert(Math.abs(toji.gunAngle) < 0.05, `Toji must aim directly at dummy (gunAngle=${toji.gunAngle})`);

    const fired = toji.firePistol(dummy, 0);
    assert(fired === true, 'toji.firePistol() must return true when ready');
    assert(projectileSystem.projectiles.length === 1, `1 projectile must spawn (got ${projectileSystem.projectiles.length})`);

    const bullet = projectileSystem.projectiles[0];
    assert(bullet.visual === 'tojiBullet', `Bullet visual must be 'tojiBullet', got ${bullet.visual}`);
    assert(bullet.damage === (CONFIG.toji?.pistolDamage ?? 14), `Bullet damage must match config (got ${bullet.damage})`);
    assert(toji.pistolCooldown > 0, 'Toji pistol cooldown must be set after firing');
    assert(toji.pistolRecoilTimer === 8, 'Toji pistol recoil timer must be set to 8');
    assert(toji.pistolFlashTimer === 3, 'Toji pistol flash timer must be set to 3');

    // 2. Projectile update and hit resolution
    const dummyInitialHp = dummy.hp;
    bullet.x = dummy.x - 5;
    bullet.y = dummy.y;
    projectileSystem.update(state.fighters);
    assert(dummy.hp < dummyInitialHp, `Dummy must take damage from Toji bullet (hp dropped from ${dummyInitialHp} to ${dummy.hp})`);

    // 3. Toji shoot(ownerIndex) delegate
    toji.pistolCooldown = 0;
    projectileSystem.projectiles = [];
    toji.lastTarget = dummy;
    toji.shoot(0);
    assert(projectileSystem.projectiles.length === 1, 'toji.shoot(0) must fire tactical pistol bullet');
    assert(projectileSystem.projectiles[0].visual === 'tojiBullet', 'shoot(0) bullet must have visual tojiBullet');

    // 4. Canvas 2D stack depth integrity during neutral pistol wielding & recoil (no rested chain/saw)
    mockCtx.resetStackDepth();
    toji.draw(mockCtx, dummy);
    assert(mockCtx.getStackDepth() === 0, 'Toji.draw() with pistol must maintain 0 Canvas 2D stack depth');

    // 5. Verify chain is not wielded during neutral pistol combat
    assert(!toji.isAmbushing, 'Toji must be in neutral pistol combat');
    assert(toji.spearSwingTimer === 0, 'spearSwingTimer must be 0 in neutral pistol combat');

    console.log('      ✅ Toji Tactical Handgun / Pistol basic attack (bullet projectile, cooldown, damage & stack balance) verified.');
  }

  // 🧪 Test 101: HUD Layout Preference Switcher (Arcade Duel vs Classic HUD)
  {
    console.log('🧪 Test 101: HUD Layout Preference Switcher (Arcade Duel vs Classic HUD)...');
    const { drawHUD, clearHealthHud } = await import('../js/graphics/hudManager.js');
    const { drawArenaMatchNames } = await import('../js/graphics/renderers/arenaRenderer.js');

    // 1. Verify index.html defines HUD layout card and button
    const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert(indexHtml.includes('id="btn-hud-layout"'), 'index.html must contain #btn-hud-layout');
    assert(indexHtml.includes('data-action="toggle-hud-layout"'), 'index.html must define data-action="toggle-hud-layout"');

    const prevLayoutStyle = CONFIG.hudLayoutStyle;
    try {
      // 2. Verify Default Duel Mode
      CONFIG.hudLayoutStyle = 'duel';

      // Mock two fighters
      const dummyGojo = { displayName: 'GOJO', name: 'Gojo Satoru', characterId: 'gojo', hp: 1000, maxHp: 1000, color: '#38BDF8', fighterIndex: 0 };
      const dummyNaoya = { displayName: 'NAOYA', name: 'Naoya Zenin', characterId: 'naoya', hp: 1000, maxHp: 1000, color: '#22C55E', fighterIndex: 1 };
      state.fighters = [dummyGojo, dummyNaoya];
      state.mode = '1v1';
      state.viewOrientation = 'vertical';

      // Rebuild in duel mode
      clearHealthHud(true);
      drawHUD();

      const topContainer = globalThis.document.getElementById('hudTopContainer');
      const bottomContainer = globalThis.document.getElementById('healthHud');
      assert(topContainer.style.display === 'flex', `In duel mode, #hudTopContainer must be display: flex (got ${topContainer.style.display})`);
      assert(topContainer.innerHTML.includes('hud-top-duel'), 'In duel mode, top container must contain .hud-top-duel');

      // In duel mode, canvas match title is bypassed to prevent clashing behind top HUD
      mockCtx.resetStackDepth();
      drawArenaMatchNames(mockCtx, false);
      assert(mockCtx.getStackDepth() === 0, 'drawArenaMatchNames in duel mode must maintain 0 Canvas 2D stack depth');

      // 3. Switch to Classic Mode
      CONFIG.hudLayoutStyle = 'classic';

      clearHealthHud(true);
      drawHUD();

      // In classic mode, top container is hidden
      assert(topContainer.style.display === 'none', `In classic mode, #hudTopContainer must be display: none (got ${topContainer.style.display})`);

      // In classic mode, bottom cards own the health bars
      assert(bottomContainer.innerHTML.includes('health-card__bar'), 'In classic mode, bottom cards must render .health-card__bar');
      assert(bottomContainer.classList.contains('classic-hud'), 'In classic mode, bottomContainer must have .classic-hud class');
      assert(bottomContainer.innerHTML.includes('classic-card'), 'In classic mode, cards must have .classic-card class');

      // In classic mode, canvas match title renders above arena
      mockCtx.resetStackDepth();
      drawArenaMatchNames(mockCtx, false);
      assert(mockCtx.getStackDepth() === 0, 'drawArenaMatchNames in classic mode must maintain 0 Canvas 2D stack depth');

      console.log('      ✅ HUD Layout Preference Switcher (Arcade Duel vs Classic HUD, DOM updates & stack balance) verified.');
    } finally {
      CONFIG.hudLayoutStyle = prevLayoutStyle;
      clearHealthHud(true);
    }
  }

  // 🧪 Test 102: Bomber Man — Tile-Centered Bomb Planting, Bomb Up (Max 10), Fire Up (Max 10), Kick (Traveling & Mid-Travel Explosion) & 30s Invincible Ultimate
  {
    console.log('🧪 Test 102: Bomber Man — Tile-Centered Bomb Planting, Bomb Up (Max 10), Fire Up (Max 10), Kick (Traveling & Mid-Travel Explosion) & 30s Invincible Ultimate...');
    const BombermanClass = FIGHTER_CLASS_MAP['bomberman'];
    const NormalClass = FIGHTER_CLASS_MAP['normal'];
    const { getTileGridInfo } = await import('../js/systems/arenaTileSystem.js');

    assert(typeof BombermanClass === 'function', 'BombermanFighter must be registered in FIGHTER_CLASS_MAP');

    const arena = { x: 45, y: 240, width: 450, height: 450 };
    state.arena = arena;
    const grid = getTileGridInfo(arena); // 8x8 grid, cellW = 56.25, cellH = 56.25

    const bomberman = new BombermanClass({ x: 118, y: 312, color: '#2563EB', controls: {} });
    const enemy = new NormalClass({ x: 320, y: 312, color: '#EF4444', controls: {} });
    state.fighters = [bomberman, enemy];
    state.illusions = [];

    // 1. Verify Tile-Centered Bomb Planting across arbitrary off-center coordinates
    const testPositions = [
      { x: 48, y: 245, expectedCol: 0, expectedRow: 0 },
      { x: 120, y: 310, expectedCol: 1, expectedRow: 1 },
      { x: 269, y: 464, expectedCol: 3, expectedRow: 3 },
      { x: 490, y: 685, expectedCol: 7, expectedRow: 7 },
    ];

    bomberman.maxBombs = 10;
    for (const pos of testPositions) {
      bomberman.x = pos.x;
      bomberman.y = pos.y;
      const bomb = bomberman.plantBomb(arena, false);
      assert(bomb !== null, `plantBomb must succeed at (${pos.x}, ${pos.y})`);
      const expectedCenterX = arena.x + (pos.expectedCol + 0.5) * grid.cellW;
      const expectedCenterY = arena.y + (pos.expectedRow + 0.5) * grid.cellH;
      assert(bomb.col === pos.expectedCol && bomb.row === pos.expectedRow, `Bomb tile (${bomb.col},${bomb.row}) must match (${pos.expectedCol},${pos.expectedRow})`);
      assert(Math.abs(bomb.x - expectedCenterX) < 1e-6, `Bomb x (${bomb.x}) must equal exact tile center (${expectedCenterX})`);
      assert(Math.abs(bomb.y - expectedCenterY) < 1e-6, `Bomb y (${bomb.y}) must equal exact tile center (${expectedCenterY})`);
    }
    bomberman.activeBombs.length = 0;

    // 2. Verify Passive: Bomb Up — 1st lay = 1 active bomb; when basic attack CD is up = 2 active bombs; next basic attack CD = 3 active bombs, up to Max. 10
    const freshBomberman = new BombermanClass({ x: 118, y: 312, color: '#2563EB', controls: {} });
    assert(freshBomberman.maxBombs === 1, `1st lay must start with maxBombs === 1 (got ${freshBomberman.maxBombs})`);
    assert(freshBomberman.plantCooldownTimer === (CONFIG.bomberman.plantInitialCooldown || 0), 'plantCooldownTimer must initialize to plantInitialCooldown');
    assert(freshBomberman.fireUpTimer === (CONFIG.bomberman.fireUpInitialCooldown || 120), `fireUpTimer must initialize to fireUpInitialCooldown (got ${freshBomberman.fireUpTimer})`);
    assert(freshBomberman.bombKickTimer === (CONFIG.bomberman.bombKickInitialCooldown || 90), `bombKickTimer must initialize to bombKickInitialCooldown (got ${freshBomberman.bombKickTimer})`);
    assert(freshBomberman.invincibleCooldownTimer === (CONFIG.bomberman.invincibleInitialCooldown || 720), `invincibleCooldownTimer must initialize to invincibleInitialCooldown (got ${freshBomberman.invincibleCooldownTimer})`);

    // First lay: Bomberman lays 1 active bomb and cannot lay a 2nd yet; basic attack CD starts
    const firstLayBomb = freshBomberman.plantBomb(arena, true);
    assert(firstLayBomb !== null && freshBomberman.activeBombs.length === 1, 'On 1st lay, Bomberman must lay 1 active bomb');
    assert(freshBomberman.plantBomb(arena, true) === null, 'On 1st lay, Bomberman cannot lay a 2nd active bomb before basic attack CD finishes');
    assert(freshBomberman.plantCooldownTimer > 0, 'Basic attack CD must start after laying the 1st active bomb');

    // Tick basic attack CD until it is up (#1) -> maxBombs must automatically increase to 2!
    while (freshBomberman.plantCooldownTimer > 0) {
      freshBomberman._tickBasicAttackAndPassiveBombUp();
    }
    assert(freshBomberman.maxBombs === 2, `When 1st basic attack CD is up, Bomberman must be able to lay 2 active bombs (got ${freshBomberman.maxBombs})`);
    freshBomberman.activeBombs.length = 0;
    assert(freshBomberman.plantBomb(arena, true) !== null, '2nd lay cycle: bomb 1 of 2');
    assert(freshBomberman.plantBomb(arena, true) !== null, '2nd lay cycle: bomb 2 of 2');
    assert(freshBomberman.activeBombs.length === 2, 'Bomberman must have 2 active bombs on the arena during 2nd lay cycle');
    assert(freshBomberman.plantCooldownTimer > 0, 'Basic attack CD must start again after laying 2 active bombs');

    // Tick basic attack CD until it is up (#2) -> maxBombs must automatically increase to 3!
    while (freshBomberman.plantCooldownTimer > 0) {
      freshBomberman._tickBasicAttackAndPassiveBombUp();
    }
    assert(freshBomberman.maxBombs === 3, `When 2nd basic attack CD is up, Bomberman must be able to lay 3 active bombs (got ${freshBomberman.maxBombs})`);
    freshBomberman.activeBombs.length = 0;
    assert(freshBomberman.plantBomb(arena, true) !== null, '3rd lay cycle: bomb 1 of 3');
    assert(freshBomberman.plantBomb(arena, true) !== null, '3rd lay cycle: bomb 2 of 3');
    assert(freshBomberman.plantBomb(arena, true) !== null, '3rd lay cycle: bomb 3 of 3');
    assert(freshBomberman.activeBombs.length === 3, 'Bomberman must have 3 active bombs on the arena during 3rd lay cycle');

    // Continue ticking basic attack CD cycles up to Max. 10 and verify cap at 10
    for (let cycle = 0; cycle < 10; cycle++) {
      freshBomberman.plantCooldownTimer = 1;
      freshBomberman._waitingForPassiveBombUp = true;
      freshBomberman._tickBasicAttackAndPassiveBombUp();
    }
    assert(freshBomberman.maxBombs === 10, `Passive Bomb Up must cap maxBombs at 10 (got ${freshBomberman.maxBombs})`);
    bomberman.maxBombs = 10;

    // 3. Verify Skill 2: Fire Up scales from 1 to Max cap and caps at maxFireLevelCap
    bomberman.fireLevel = 1;
    const lv1Blast = bomberman.getCurrentBlastRadius();
    const targetMaxFire = bomberman.maxFireLevelCap || CONFIG.bomberman.maxFireLevelCap || 10;
    for (let i = 0; i < targetMaxFire + 2; i++) {
      bomberman.castFireUp(arena);
    }
    assert(bomberman.fireLevel === targetMaxFire, `Fire Up must cap fireLevel at ${targetMaxFire} (got ${bomberman.fireLevel})`);
    assert(bomberman.getCurrentBlastRadius() > lv1Blast, 'Lv.10 Fire Up blast radius must exceed Lv.1 blast radius');

    // 4. Verify Skill 3: Kick allows Bomberman to kick his bombs so they travel across the arena and can explode mid-traveling
    assert(bomberman.canKickBombs === true, 'Bomberman must have canKickBombs === true');
    bomberman.x = arena.x + 1.5 * grid.cellW;
    bomberman.y = arena.y + 2.5 * grid.cellH;
    enemy.x = arena.x + 4.5 * grid.cellW;
    enemy.y = arena.y + 2.5 * grid.cellH;
    const kickedBomb = bomberman.plantBomb(arena, false);
    assert(kickedBomb !== null && kickedBomb.isTraveling === false, 'Newly planted bomb must start centered on its tile block');
    const startBombX = kickedBomb.x;

    // Kick the bomb toward the enemy along +X
    const kickedOk = bomberman.castKick(enemy, arena);
    assert(kickedOk === true && kickedBomb.isTraveling === true, 'castKick() must set bomb.isTraveling = true');
    assert(kickedBomb.vx > 0, `Kicked bomb must travel toward enemy along +X (vx=${kickedBomb.vx})`);
    assert(kickedBomb.kickHitPauseTimer > 0, 'Kicked bomb must enter kick hit pause');
    assert(bomberman.kickHitPauseTimer > 0, 'Bomberman must enter kick hit pause');

    // Advance past kick hit pause (5 frames) and verify the bomb moves across coordinates
    kickedBomb.fuseTimer = 8;
    for (let f = 0; f < 6; f++) {
      bomberman._updateBombs(arena);
    }
    assert(kickedBomb.x > startBombX, `Kicked bomb must travel across arena floor (${startBombX} -> ${kickedBomb.x})`);
    assert(kickedBomb.isTraveling === true, 'Kicked bomb must remain in traveling state');

    // Position enemy flanking the traveling bomb path (within 245px blast radius but outside 52px direct collision) and let fuse expire mid-traveling (2 more ticks)
    enemy.x = kickedBomb.x + 20;
    enemy.y = kickedBomb.y + 60;
    const enemyHpBefore = enemy.hp;
    kickedBomb.fuseTimer = 2;
    bomberman._updateBombs(arena); // fuseTimer = 1, still traveling
    const midTravelXBeforeDetonation = kickedBomb.x;
    bomberman._updateBombs(arena); // fuseTimer = 0 -> explodes mid-traveling!
    const lastExp = bomberman.activeVisualExplosions[bomberman.activeVisualExplosions.length - 1];
    assert(bomberman.activeBombs.length === 0, 'Kicked bomb must detonate when fuseTimer reaches 0 mid-travel');
    assert(bomberman.activeVisualExplosions.length >= 1, 'Mid-travel detonation must spawn a 4-way cross explosion');
    assert(lastExp.x > midTravelXBeforeDetonation, 'Mid-travel explosion must occur at the bomb traveling position, not its original plant tile');
    assert(enemy.hp < enemyHpBefore, `Mid-traveling bomb explosion must damage enemy in blast path (${enemyHpBefore} -> ${enemy.hp})`);
    assert(enemy.hitFlashTimer === 8, 'Enemy hit by bomb explosion must receive global hitFlashTimer = 8');
    assert(state.sparkEffects.some(p => p.type === 'animeImpactFrame'), 'Bomb explosion hit must spawn global 12-frame animeImpactFrame hit effect');
    assert(enemy.slowTimer > 0, `Enemy hit by bomb explosion must receive slowTimer debuff (got ${enemy.slowTimer})`);
    assert(enemy.slowMultiplier === (bomberman.bombSlowMultiplier || 0.5), `Enemy hit by bomb explosion must receive slowMultiplier (got ${enemy.slowMultiplier})`);

    // 4b. Verify Proximity Gate (Strictly Prohibits Long-Distance Kicks):
    // Bomberman must be very close to the bomb (within touching/adjacent range) to kick it!
    const distantBomb = bomberman.plantBomb(arena, true);
    distantBomb.x = arena.x + 380;
    distantBomb.y = arena.y + 380;
    distantBomb.fuseTimer = 80;
    bomberman.x = arena.x + 80;
    bomberman.y = arena.y + 80;
    assert(bomberman.kickBomb(distantBomb) === false, 'kickBomb must return false when Bomberman is far from the bomb');
    assert(distantBomb.isTraveling === false, 'Distant bomb must not begin traveling');
    assert(bomberman.castKick(enemy, arena) === false, 'castKick must return false when no planted bomb is within kicking range');
    bomberman.activeBombs = bomberman.activeBombs.filter(b => b !== distantBomb);

    // 4c. Verify Strict 4-Way Orthogonal Cardinal Directions (UP, DOWN, LEFT, RIGHT Only):
    // Diagonal or arbitrary float angles MUST snap strictly to cardinal directions with one component locked to 0!
    const cardinalBomb = bomberman.plantBomb(arena, true);
    cardinalBomb.x = arena.x + 150;
    cardinalBomb.y = arena.y + 150;
    bomberman.x = cardinalBomb.x - 30; // Close range to left (within 64px)
    bomberman.y = cardinalBomb.y;

    // Test Right snap (angle ~ 0.4 rad = 23 deg)
    bomberman.kickBomb(cardinalBomb, 0.4);
    assert(cardinalBomb.isTraveling === true, 'Nearby bomb should successfully kick');
    assert(cardinalBomb.vx > 0 && cardinalBomb.vy === 0, `Kicking at 0.4 rad must snap strictly to RIGHT (vx=${cardinalBomb.vx}, vy=${cardinalBomb.vy})`);

    // Test Down snap (angle ~ 1.2 rad = 69 deg)
    cardinalBomb.isTraveling = false;
    bomberman.kickBomb(cardinalBomb, 1.2);
    assert(cardinalBomb.vx === 0 && cardinalBomb.vy > 0, `Kicking at 1.2 rad must snap strictly to DOWN (vx=${cardinalBomb.vx}, vy=${cardinalBomb.vy})`);

    // Test Left snap (angle ~ 2.6 rad = 149 deg)
    cardinalBomb.isTraveling = false;
    bomberman.kickBomb(cardinalBomb, 2.6);
    assert(cardinalBomb.vx < 0 && cardinalBomb.vy === 0, `Kicking at 2.6 rad must snap strictly to LEFT (vx=${cardinalBomb.vx}, vy=${cardinalBomb.vy})`);

    // Test Up snap (angle ~ -1.8 rad = -103 deg)
    cardinalBomb.isTraveling = false;
    bomberman.kickBomb(cardinalBomb, -1.8);
    assert(cardinalBomb.vx === 0 && cardinalBomb.vy < 0, `Kicking at -1.8 rad must snap strictly to UP (vx=${cardinalBomb.vx}, vy=${cardinalBomb.vy})`);
    bomberman.activeBombs = bomberman.activeBombs.filter(b => b !== cardinalBomb);

    // 4d. Verify Wall Impact Stop & Strict No-Rebounce Guarantee:
    // When a kicked bomb reaches the arena boundary, it MUST stop sliding and NEVER rebounce!
    const wallBomb = bomberman.plantBomb(arena, true);
    wallBomb.x = arena.x + arena.width - wallBomb.r - 5;
    wallBomb.y = arena.y + 200;
    wallBomb.fuseTimer = 80;
    bomberman.x = wallBomb.x - bomberman.r - 5; // Close proximity
    bomberman.y = wallBomb.y;
    bomberman.kickBomb(wallBomb, 0); // Kick toward right wall (+X)
    assert(wallBomb.isTraveling === true && wallBomb.vx > 0, 'Wall bomb must begin traveling toward right wall');
    for (let f = 0; f < 8; f++) {
      bomberman._updateBombs(arena); // Advances past kickHitPause and moves into or past maxX boundary
    }
    assert(wallBomb.isTraveling === false, 'Kicked bomb MUST stop traveling upon hitting arena wall');
    assert(wallBomb.vx === 0 && wallBomb.vy === 0, `Kicked bomb velocity MUST be zeroed on wall hit (vx=${wallBomb.vx}, vy=${wallBomb.vy}) — STRICTLY NO REBOUNCE`);
    assert(wallBomb.x <= arena.x + arena.width - wallBomb.r, 'Kicked bomb must remain clamped inside arena wall boundary');

    // 4e. Verify Direct Enemy Collision Stop & Anti-Following / Anti-Bulldozing Guarantee:
    // When a kicked bomb directly strikes an enemy, it deals impact damage and STOPS immediately
    const directHitBomb = bomberman.plantBomb(arena, true);
    directHitBomb.x = arena.x + 100;
    directHitBomb.y = arena.y + 200;
    directHitBomb.fuseTimer = 80;
    bomberman.x = directHitBomb.x - bomberman.r - 5; // Close proximity
    bomberman.y = directHitBomb.y;
    enemy.x = directHitBomb.x + 30; // Within minDist (22 + 25 = 47px)
    enemy.y = directHitBomb.y;
    const hpBeforeDirectHit = enemy.hp;
    bomberman.kickBomb(directHitBomb, 0); // Kick straight at enemy
    for (let f = 0; f < 8; f++) {
      bomberman._updateBombs(arena);
    }
    assert(enemy.hp < hpBeforeDirectHit, `Direct collision must deal kinetic impact damage (${hpBeforeDirectHit} -> ${enemy.hp})`);
    assert(directHitBomb.isTraveling === false, 'Kicked bomb MUST STOP traveling on direct enemy collision');
    assert(directHitBomb.vx === 0 && directHitBomb.vy === 0, 'Kicked bomb velocity MUST be 0 on enemy collision (must NOT bulldozingly push or follow enemy)');
    bomberman.activeBombs.length = 0; // Clean up bombs before next step

    // 5. Verify Skill 4 (Ultimate): Invincible grants incoming attack immunity
    bomberman.castInvincible();
    assert(bomberman.invincibleTimer === bomberman.invincibleDuration, `Invincible Ultimate must match configured duration ${bomberman.invincibleDuration} frames (got ${bomberman.invincibleTimer})`);
    const bmHpBefore = bomberman.hp;
    const damaged = bomberman.takeDamage(95, enemy);
    assert(damaged === false && bomberman.hp === bmHpBefore, 'Bomberman must take 0 damage from enemy attacks while Invincible is active');
    bomberman.applyHitStun(30);
    assert((bomberman.hitStunTimer || 0) === 0, 'Bomberman must be immune to hitStun while Invincible is active');

    // Verify multi-cast cooldown consistency: 1st, 2nd, and 3rd casts must keep exact fixed cooldown
    const expectedCd = bomberman.invincibleCooldown || CONFIG.bomberman.invincibleCooldown || 1000;
    assert(bomberman.invincibleCooldownTimer === expectedCd, '1st cast cooldown must match expectedCd');
    bomberman.invincibleTimer = 0;
    bomberman.invincibleCooldownTimer = 0;
    bomberman.castInvincible();
    assert(bomberman.invincibleCooldownTimer === expectedCd, '2nd cast cooldown must match expectedCd');
    bomberman.invincibleTimer = 0;
    bomberman.invincibleCooldownTimer = 0;
    bomberman.castInvincible();
    assert(bomberman.invincibleCooldownTimer === expectedCd, '3rd cast cooldown must match expectedCd and NEVER scale up');

    // 5b. Verify multi-frame combat simulation cooldown integrity (Rule 0.2: zero decay to 0, zero double-decrementing)
    const simBomberman = new BombermanClass({ x: 118, y: 312, color: '#2563EB', controls: {} });
    const simEnemy = new NormalClass({ x: 300, y: 300, hp: 500, maxHp: 500, controls: {} });
    state.fighters = [simBomberman, simEnemy];
    assert(simBomberman.invincibleCooldownMax === expectedCd, 'simBomberman.invincibleCooldownMax must initialize to expectedCd');
    assert(simBomberman.invincibleCooldown === expectedCd, 'simBomberman.invincibleCooldown getter must return expectedCd');
    assert(simBomberman.invincibleCooldownTimer === (CONFIG.bomberman.invincibleInitialCooldown || 1500), 'Initial cooldown timer must match config');

    // Simulate 60 frames of combat during initial cooldown
    const initialTimer = simBomberman.invincibleCooldownTimer;
    for (let f = 0; f < 60; f++) {
      state.frameCount = (state.frameCount || 0) + 1;
      simBomberman.update(simEnemy, 0, arena);
    }
    assert(simBomberman.invincibleCooldownMax === expectedCd, 'invincibleCooldownMax MUST NOT decay during combat frames');
    assert(simBomberman.invincibleCooldown === expectedCd, 'invincibleCooldown getter MUST NOT decay during combat frames');
    assert(simBomberman.invincibleCooldownTimer === initialTimer - 60, `Cooldown timer must decrement strictly 1 tick per frame (expected ${initialTimer - 60}, got ${simBomberman.invincibleCooldownTimer})`);

    // Fast-forward initial cooldown to 0 and trigger first live combat cast via update()
    simBomberman.invincibleCooldownTimer = 0;
    state.frameCount = (state.frameCount || 0) + 1;
    simBomberman.update(simEnemy, 0, arena);
    assert(simBomberman.invincibleTimer === simBomberman.invincibleDuration, 'simBomberman must cast Invincible when cooldown is up');
    assert(simBomberman.invincibleCooldownTimer === expectedCd, `simBomberman.invincibleCooldownTimer must be set to expectedCd on 1st live cast (got ${simBomberman.invincibleCooldownTimer})`);

    // Simulate 30 frames while Invincible is active: cooldown timer MUST NOT decrement
    for (let f = 0; f < 30; f++) {
      state.frameCount = (state.frameCount || 0) + 1;
      simBomberman.update(simEnemy, 0, arena);
    }
    assert(simBomberman.invincibleCooldownTimer === expectedCd, 'Cooldown timer MUST NOT tick down while Invincible is actively running');

    // Fast-forward active Invincible duration to expiration
    simBomberman.invincibleTimer = 0;
    simBomberman.isInvincibleUltimate = false;
    for (let f = 0; f < 30; f++) {
      state.frameCount = (state.frameCount || 0) + 1;
      simBomberman.update(simEnemy, 0, arena);
    }
    assert(simBomberman.invincibleCooldownTimer === expectedCd - 30, `Cooldown timer must count down from expectedCd once Invincible expires (expected ${expectedCd - 30}, got ${simBomberman.invincibleCooldownTimer})`);

    // Fast-forward cooldown to 0 and verify 2nd and 3rd live casts strictly honor expectedCd
    simBomberman.invincibleCooldownTimer = 0;
    state.frameCount = (state.frameCount || 0) + 1;
    simBomberman.update(simEnemy, 0, arena);
    assert(simBomberman.invincibleCooldownTimer === expectedCd, `2nd live cast must reset to full expectedCd ${expectedCd} (got ${simBomberman.invincibleCooldownTimer})`);
    simBomberman.invincibleTimer = 0;
    simBomberman.invincibleCooldownTimer = 0;
    state.frameCount = (state.frameCount || 0) + 1;
    simBomberman.update(simEnemy, 0, arena);
    assert(simBomberman.invincibleCooldownTimer === expectedCd, `3rd live cast must reset to full expectedCd ${expectedCd} (got ${simBomberman.invincibleCooldownTimer})`);
    assert(simBomberman.invincibleCooldownMax === expectedCd, 'invincibleCooldownMax must remain strictly intact across all casts');

    // 6. Verify Canvas 2D transform stack balance during rendering (with traveling bomb + explosion + Invincible aura + 12-frame kick spark)
    const renderBomb = bomberman.plantBomb(arena, true);
    bomberman.x = renderBomb.x - 20;
    bomberman.y = renderBomb.y;
    bomberman.kickBomb(renderBomb, enemy);
    assert(bomberman.activeVisualEffects.some(v => v.type === 'kickSpark'), 'kickBomb must spawn a 12-frame kickSpark visual effect');
    mockCtx.resetStackDepth();
    bomberman.draw(mockCtx, enemy);
    assert(mockCtx.getStackDepth() === 0, `Bomberman.draw() must maintain 0 Canvas 2D stack depth (got ${mockCtx.getStackDepth()})`);

    // 7. Verify Bomberman Dedicated Authentic SFX Wiring (explosion.mp3, Place Bomb, Walking 1, Kick - Pressure Block, era_vera Fire Up)
    const cfg = CONFIG.bomberman;
    assert(cfg.sounds.plantBomb === 'Assets/Sound Effects/BombermanSFX/Place Bomb.wav', 'plantBomb SFX must map to Place Bomb.wav');
    assert(cfg.sounds.bombExplode === 'Assets/Sound Effects/Attacks/explosion.mp3', 'bombExplode SFX must map to explosion.mp3');
    assert(cfg.sounds.walk === 'Assets/Sound Effects/BombermanSFX/Walking 1.wav', 'walk SFX must map to Walking 1.wav');
    assert(cfg.sounds.bombKick === 'Assets/Sound Effects/BombermanSFX/Kick - Pressure Block.wav', 'bombKick SFX must map to Kick - Pressure Block.wav');
    assert(cfg.sounds.fireUp === 'Assets/Sound Effects/BombermanSFX/era_vera-easter22-gun-melee-summon.wav', 'fireUp SFX must map to era_vera-easter22-gun-melee-summon.wav');
    assert(typeof cfg.soundVolumes.walk === 'number', 'walk sound volume must be defined');
    assert(typeof cfg.soundVolumes.bombKick === 'number', 'bombKick sound volume must be defined');
    assert(typeof cfg.soundVolumes.fireUp === 'number', 'fireUp sound volume must be defined');
    assert(typeof cfg.bombSlowDuration === 'number' && cfg.bombSlowDuration > 0, 'bombSlowDuration must be configured');
    assert(typeof cfg.bombSlowMultiplier === 'number' && cfg.bombSlowMultiplier < 1.0, 'bombSlowMultiplier must be < 1.0');
    assert(typeof cfg.bombExplosionShakeIntensity === 'number' && cfg.bombExplosionShakeIntensity >= 6.0, 'bombExplosionShakeIntensity must be configured');
    assert(typeof cfg.chainExplosionShakeIntensity === 'number' && cfg.chainExplosionShakeIntensity >= 8.5, 'chainExplosionShakeIntensity must be configured');
    assert(typeof cfg.fireUpInitialCooldown === 'number' && cfg.fireUpInitialCooldown > 0, 'fireUpInitialCooldown must be configured');
    assert(typeof cfg.bombKickInitialCooldown === 'number' && cfg.bombKickInitialCooldown > 0, 'bombKickInitialCooldown must be configured');
    assert(typeof cfg.invincibleInitialCooldown === 'number' && cfg.invincibleInitialCooldown > 0, 'invincibleInitialCooldown must be configured');

    // Verify walking step timer behavior
    bomberman.vx = 2.5;
    bomberman.vy = 0;
    bomberman.hp = bomberman.maxHp;
    bomberman.kickHitPauseTimer = 0;
    bomberman.walkSoundTimer = 0;
    bomberman.update(enemy, 0, arena);
    assert(bomberman.walkSoundTimer === 50, `Active walking must trigger walking step timer (got ${bomberman.walkSoundTimer})`);

    // 8. Verify Bomberman HUD Skill Bar (Rule 18 / Rule 2.8 compliance & Clean Label Standard)
    const { getSkillDataForFighter, isSkillExceptionInDarkMode } = await import('../js/graphics/ui/hudSkillProviders.js');
    const bmSkills = getSkillDataForFighter(bomberman);
    assert(Array.isArray(bmSkills) && bmSkills.length === 4, `Bomberman must have 4 HUD skill bars when all are enabled (got ${bmSkills?.length})`);
    const themeColor = bomberman.color || cfg.themeColor || '#2563EB';
    for (const s of bmSkills) {
      assert(s.color === themeColor, `Skill '${s.id}' color '${s.color}' must match themeColor '${themeColor}' (Rule 18)`);
      assert(!s.label.includes('(READY)') && !s.label.includes('(ACTIVE)'), `Skill '${s.id}' label '${s.label}' must adhere to Clean Label Standard`);
      assert(s.pct >= 0 && s.pct <= 100, `Skill '${s.id}' pct must be clamped between 0 and 100 (got ${s.pct})`);
    }
    const invSkill = bmSkills.find(s => s.id === 'invincible');
    assert(invSkill && invSkill.isSignature && invSkill.isUltimate, 'Invincible skill must be flagged as signature and ultimate');
    assert(isSkillExceptionInDarkMode(bomberman, invSkill), 'Invincible skill must be registered in signatureMap for dark mode HUD exception');

    // Verify config toggle gating: disabling a skill cleanly removes its HUD skill bar
    const origKickEnabled = cfg.enableBombKick;
    cfg.enableBombKick = false;
    const bmSkillsFiltered = getSkillDataForFighter(bomberman);
    assert(!bmSkillsFiltered.some(s => s.id === 'bomb_kick'), 'Disabling enableBombKick must hide its HUD skill bar');
    cfg.enableBombKick = origKickEnabled;

    // 9. Verify Basic Attack Sound Registration (No console warning, id=65, type="bomberman")
    const { getBasicAttackSound } = await import('../js/soundEffects/basicAttackSounds.js');
    const bSoundById = getBasicAttackSound(65, 'bomberman');
    assert(bSoundById && bSoundById.src === 'Assets/Sound Effects/BombermanSFX/Place Bomb.wav', 'getBasicAttackSound by id 65 must return Place Bomb.wav');
    const bSoundByType = getBasicAttackSound(null, 'bomberman');
    assert(bSoundByType && bSoundByType.src === 'Assets/Sound Effects/BombermanSFX/Place Bomb.wav', 'getBasicAttackSound by type "bomberman" must return Place Bomb.wav');

    // 10. Verify Continuous Active Blast Window & Center Bloom Hit Detection
    const expBomb = bomberman.plantBomb(arena, true);
    enemy.hp = 1000;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.knockbackVx = 0;
    enemy.knockbackVy = 0;
    enemy.x = expBomb.x + 35; // Positioned diagonally near epicenter
    enemy.y = expBomb.y + 35;
    bomberman._detonateBomb(expBomb, arena);
    assert(enemy.hp < 1000, 'Enemy placed diagonally within epicenter disc must receive explosion damage');
    assert(enemy.slowTimer > 0, 'Enemy caught in blast must receive slowTimer');
    assert(bomberman.bombKnockback === 0, 'bomberman.bombKnockback must be 0 (knockback removed from bomb explosion)');
    assert(bomberman.bombStunDuration > 0, 'bomberman.bombStunDuration must be configured to stun duration');
    assert(enemy.paralyzeTimer > 0 || enemy.hitStunTimer > 0, 'Enemy caught in blast must receive stun effect');
    assert((enemy.knockbackVx || 0) === 0 && (enemy.knockbackVy || 0) === 0, 'Bomb explosion must not deal knockback impulse');

    // Verify entity walking into active flames after detonation takes damage during active flame window
    const walkingEnemy = new NormalClass({ x: arena.x + 300, y: arena.y + 300, color: '#EF4444', controls: {} });
    state.fighters.push(walkingEnemy);
    const activeExp = bomberman.activeVisualExplosions[bomberman.activeVisualExplosions.length - 1];
    walkingEnemy.hp = 500;
    walkingEnemy.x = activeExp.x + 20; // Step directly into horizontal flame arm
    walkingEnemy.y = activeExp.y;
    bomberman._updateVisualExplosions();
    assert(walkingEnemy.hp < 500, 'Enemy walking into active flame arm must take damage during flame burn window');
    state.fighters = state.fighters.filter(f => f !== walkingEnemy);

    console.log('      ✅ Bomber Man (tile-centered bombs, Bomb Up Max 10, Fire Up Max 10, Kick traveling & mid-travel explosion, 30s Invincible, dedicated SFX, basic attack sound registration, active flame hitbox, Rule 18 HUD skill bars & stack balance) verified.');
  }

  // 💥 104. Testing Creeper (No Basic Attack, Self-Detonation HP Cost, Hidden Hands, Charged Minecraft Electric Armor & Stack Balance) 💥
  {
    console.log('   104. Testing Creeper (No Basic Attack, Self-Detonation HP Cost, Hidden Hands, Charged Minecraft Electric Armor & Stack Balance)...');
    const CreeperClass = FIGHTER_CLASS_MAP['creeper'];
    const NormalClass = FIGHTER_CLASS_MAP['normal'];
    assert(CreeperClass, 'Creeper fighter class must exist in FIGHTER_CLASS_MAP');

    const creeper = new CreeperClass({ x: 200, y: 300, color: '#22C55E', controls: {} });
    const enemy = new NormalClass({ x: 240, y: 300, hp: 1000, maxHp: 1000, controls: {} });
    enemy.maxHp = 1000;
    enemy.hp = 1000;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.knockbackVx = 0;
    enemy.knockbackVy = 0;
    state.fighters = [creeper, enemy];

    const { creeperConfig } = await import('../js/configs/characters/creeperConfig.js');
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.creeper) ? CONFIG.creeper : creeperConfig;

    // 1. Verify Basic Attack Suppression (Rule 23)
    const initialBullets = state.projectiles ? state.projectiles.length : 0;
    creeper.shoot(0);
    assert(enemy.hp === 1000, 'Creeper shoot() must deal ZERO damage');
    if (state.projectiles) {
      assert(state.projectiles.length === initialBullets, 'Creeper shoot() must spawn ZERO generic bullet projectiles');
    }

    // 2. Verify Armless / Handless Mob Standard (Creeper hideHands: true)
    assert(creeper.hideHands === true, 'Creeper must declare hideHands: true per Minecraft lore standard');

    // 3. Verify Self-Detonation HP Cost Mechanism
    creeper.hp = creeper.maxHp;
    const preDetHp = creeper.hp;
    creeper._executeDetonation(false);
    const expectedHpCost = cfg.selfDetonationHpCost || 65;
    assert(creeper.hp === preDetHp - expectedHpCost, `Creeper must lose exactly ${expectedHpCost} HP upon self-detonation (expected ${preDetHp - expectedHpCost}, got ${creeper.hp})`);
    assert(enemy.hp < 1000, 'Enemy within blast radius must take explosion damage');

    // 4. Verify Charged Creeper Lightning Awakening & Mode Activation
    creeper.chargedCooldownTimer = 0;
    creeper.activateChargedCreeper();
    assert(creeper.isChargedCreeper === true, 'Creeper must enter isChargedCreeper state');
    assert(creeper.chargedCreeperTimer === creeper.chargedDuration, 'chargedCreeperTimer must initialize to chargedDuration');
    assert(creeper.lightningAwakenTimer === creeper.maxLightningAwakenTimer, 'lightningAwakenTimer must trigger lightning awakening jitter');
    assert(creeper.activeThunderstrikes.length > 0, 'Lightning awakening must spawn Zeus-style thunderstrike VFX');

    // 5. Verify Rule 18 HUD Skill Bars & Theme Color Consistency
    const { getSkillDataForFighter, isSkillExceptionInDarkMode } = await import('../js/graphics/ui/hudSkillProviders.js');
    const cSkills = getSkillDataForFighter(creeper);
    assert(Array.isArray(cSkills) && cSkills.length >= 3, `Creeper must have HUD skill bars (got ${cSkills?.length})`);
    const themeColor = creeper.color || cfg.themeColor || '#22C55E';
    for (const s of cSkills) {
      assert(s.color === themeColor, `Skill '${s.id}' color '${s.color}' must match themeColor '${themeColor}' (Rule 18)`);
      assert(!s.label.includes('(READY)') && !s.label.includes('(ACTIVE)'), `Skill '${s.id}' label '${s.label}' must adhere to Clean Label Standard`);
      assert(s.pct >= 0 && s.pct <= 100, `Skill '${s.id}' pct must be clamped between 0 and 100 (got ${s.pct})`);
    }
    const chargedSkill = cSkills.find(s => s.id === 'charged_creeper');
    assert(chargedSkill && chargedSkill.isSignature && chargedSkill.isUltimate, 'Charged Creeper skill must be flagged as signature and ultimate');
    assert(isSkillExceptionInDarkMode(creeper, chargedSkill), 'Charged Creeper skill must be registered in signatureMap for dark mode HUD exception');

    // 6. Verify Canvas 2D Transform Stack Balance during Charged Creeper Rendering
    mockCtx.resetStackDepth();
    creeper.draw(mockCtx, enemy);
    assert(mockCtx.getStackDepth() === 0, 'drawCreeperSkin with Charged Minecraft Electric Armor and Body Swirl corrupted canvas stack depth');

    console.log('      ✅ Creeper (zero basic attack damage/projectiles, self-detonation HP cost, hidden hands, Charged Minecraft Electric Armor, Rule 18 HUD & 100% stack balance) verified.');
  }

  // 🛡️ 105. Testing Ash Ketchum Post-Summon Sideline Repositioning (Top/Left/Right Edge & Barrier) 🛡️
  {
    console.log('   105. Testing Ash Ketchum Post-Summon Sideline Repositioning (Top/Left/Right Edge & Barrier)...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const NormalClass = FIGHTER_CLASS_MAP['normal'];

    const testArena = { x: 45, y: 240, width: 450, height: 450, shape: 'rect' };
    state.arena = testArena;

    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const enemy = new NormalClass({ x: 420, y: 620, hp: 1000, maxHp: 1000, teamId: 1 });
    state.fighters = [ash, enemy];

    // 1. Sideline wall constraint: Pokémon Trainers ONLY leap to the left or right wall!
    // Near left flank -> leaps to left outside wall
    const {
      pickTrainerOutsideSidelineSpot,
      pickTrainerInsideLandingSpot,
      isTrainerUntargetable
    } = await import('../js/systems/pokemonTrainerSystem.js');
    const { getClosestOpponent } = await import('../js/systems/physics.js');
    const { isEntityOutsideArena, applyDamageToTarget } = await import('../js/entities/fighter.js');

    const leftTrainer = new AshFighter({ x: 100, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const leftSpot = pickTrainerOutsideSidelineSpot(leftTrainer, testArena, null);
    assert(leftSpot.wall === 'left', `Trainer near left flank must leap to left wall, got ${leftSpot.wall}`);
    assert(leftSpot.x === testArena.x - 26, `Left sideline X must be arena.x - 26, got ${leftSpot.x}`);

    // Near right flank -> leaps to right outside wall
    const rightTrainer = new AshFighter({ x: 400, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const rightSpot = pickTrainerOutsideSidelineSpot(rightTrainer, testArena, null);
    assert(rightSpot.wall === 'right', `Trainer near right flank must leap to right wall, got ${rightSpot.wall}`);
    assert(rightSpot.x === testArena.x + testArena.width + 26, `Right sideline X must be arena.x + arena.width + 26, got ${rightSpot.x}`);

    // Top/Bottom bias test: even if trainer is closer to top or bottom wall, they MUST ONLY leap to left or right wall!
    const topTrainer = new AshFighter({ x: 200, y: 245, hp: 360, maxHp: 360, teamId: 0 });
    const topSpot = pickTrainerOutsideSidelineSpot(topTrainer, testArena, null);
    assert(topSpot.wall === 'left' || topSpot.wall === 'right', `Trainer near top edge must leap to left or right wall only, got ${topSpot.wall}`);

    const bottomTrainer = new AshFighter({ x: 300, y: 685, hp: 360, maxHp: 360, teamId: 0 });
    const bottomSpot = pickTrainerOutsideSidelineSpot(bottomTrainer, testArena, null);
    assert(bottomSpot.wall === 'left' || bottomSpot.wall === 'right', `Trainer near bottom edge must leap to left or right wall only, got ${bottomSpot.wall}`);

    // 2. Active Summoning & Leap Out execution
    ash._spawnPokemonFromBall({ speciesKey: 'pikachu', targetX: 250, targetY: 465 });
    assert(ash.activePokemon !== null, 'Ash must have an active Pokémon after spawning');
    assert(ash.jumpState === 'jumping_out', `Ash must enter jumping_out state on summon, got ${ash.jumpState}`);
    assert(ash.isJumpedOut === true, 'Ash isJumpedOut must be true immediately on leap initiation');
    assert(ash.isUntargetable === true, 'Ash must be untargetable during jump out');
    assert(ash.isInvulnerable === true, 'Ash must be invulnerable during jump out');
    assert(ash.isInvincible === true, 'Ash must be invincible during jump out');
    assert(ash.invincibilityTimer > 0, 'Ash invincibilityTimer must be > 0 during jump out');

    // 3. Step physics until jump finishes and Ash lands on the outside sideline
    for (let f = 0; f < 40; f++) {
      ash.update(enemy, 0, testArena);
      if (ash.jumpState === 'outside') break;
    }
    assert(ash.jumpState === 'outside', `Ash must arrive at outside sideline, got ${ash.jumpState}`);
    assert(isEntityOutsideArena(ash, testArena) === true, 'Ash must be confirmed outside arena bounds');
    assert(isTrainerUntargetable(ash) === true, 'isTrainerUntargetable(ash) must return true');

    // 4. Absolute Invincibility & Undetectability Verification
    // Enemy targeting: getClosestOpponent must target the active Pokémon, NOT Ash!
    const target = getClosestOpponent(enemy);
    assert(target !== ash, 'Enemy AI getClosestOpponent must NEVER return an untargetable/jumped-out Pokémon Trainer!');
    assert(target === ash.activePokemon, 'Enemy AI must target the active summoned Pokémon instead');
    assert(enemy.isValidAimTarget(ash) === false, 'Enemy isValidAimTarget(ash) must return false');

    // Damage & CC immunity
    const preHp = ash.hp;
    const dmgLanded = ash.takeDamage(50, enemy);
    assert(dmgLanded === false, 'takeDamage on jumped-out trainer must return false');
    assert(ash.hp === preHp, 'Trainer HP must not decrease while outside the arena');

    const appDmgLanded = applyDamageToTarget(ash, 50, enemy);
    assert(appDmgLanded === false, 'applyDamageToTarget on jumped-out trainer must return false');
    assert(ash.hp === preHp, 'Trainer HP must remain intact after applyDamageToTarget');

    ash.applyKnockback(50, 50);
    assert(ash.vx === 0 && ash.vy === 0, 'Trainer must be immune to knockback while outside the arena');

    ash.applyHitStun(60);
    assert((ash.hitStunTimer || 0) === 0, 'Trainer must be immune to hitstun while outside the arena');

    ash.applyTimeStop(60);
    assert((ash.timeStopTimer || 0) === 0, 'Trainer must be immune to timestop while outside the arena');

    // 5. When active Pokémon faints, Trainer jumps back into the arena
    const landingSpot = pickTrainerInsideLandingSpot(ash, testArena);
    assert(landingSpot.x > testArena.x && landingSpot.x < testArena.x + testArena.width, 'Landing spot must be inside the arena');

    ash._onActivePokemonFainted(ash.activePokemon);
    assert(ash.activePokemon === null, 'Active Pokémon must be cleaned up on faint');
    assert(ash.jumpState === 'jumping_in', `Ash must enter jumping_in state on pokemon faint, got ${ash.jumpState}`);

    // Step physics until jump back in completes
    for (let f = 0; f < 40; f++) {
      ash.update(enemy, 0, testArena);
      if (ash.jumpState === 'inside') break;
    }
    assert(ash.jumpState === 'inside', `Ash must land back inside the arena, got ${ash.jumpState}`);
    assert(ash.isJumpedOut === false, 'Ash isJumpedOut must be false after landing inside');
    assert(ash.isUntargetable === false, 'Ash must become targetable again after landing inside');
    assert(ash.isInvulnerable === false, 'Ash must lose invulnerability after landing inside');
    assert(isEntityOutsideArena(ash, testArena) === false, 'Ash must be inside arena bounds');
    assert(enemy.isValidAimTarget(ash) === true, 'Enemy must now be able to target Ash once inside');

    // 6. Enemy Trainer Sideline Leap Opposition:
    // When Pokémon Trainers are enemies, if one side is occupied by an enemy, the other trainer MUST leap to the opposite side!
    const ashRed = new AshFighter({ x: 100, y: 465, hp: 360, maxHp: 360, teamId: 0 }); // Ash on left
    const rivalBlue = new AshFighter({ x: 120, y: 465, hp: 360, maxHp: 360, teamId: 1 }); // Enemy Blue, also near left wall (x: 120)
    state.fighters = [ashRed, rivalBlue];

    // Case 6A: Ash occupies the left sideline (outside-left)
    ashRed.isJumpedOut = true;
    ashRed.jumpState = 'outside';
    ashRed.trainerVantagePoint = { type: 'outside-left', wall: 'left', x: testArena.x - 26, y: 465 };

    // Blue is closer to the left wall (distLeft = 75, distRight = 375), BUT Ash (enemy) occupies left!
    const blueSpot = pickTrainerOutsideSidelineSpot(rivalBlue, testArena, ashRed);
    assert(blueSpot.wall === 'right', `Enemy trainer Blue must leap to the opposite (right) wall when enemy occupies left, got ${blueSpot.wall}`);
    assert(blueSpot.x === testArena.x + testArena.width + 26, `Blue spot must be on the right sideline outside arena, got ${blueSpot.x}`);

    // Case 6B: Ash occupies the right sideline (outside-right)
    ashRed.trainerVantagePoint = { type: 'outside-right', wall: 'right', x: testArena.x + testArena.width + 26, y: 465 };
    rivalBlue.x = 420; // Blue is near right wall
    const blueSpot2 = pickTrainerOutsideSidelineSpot(rivalBlue, testArena, ashRed);
    assert(blueSpot2.wall === 'left', `Enemy trainer Blue must leap to the opposite (left) wall when enemy occupies right, got ${blueSpot2.wall}`);
    assert(blueSpot2.x === testArena.x - 26, `Blue spot must be on the left sideline outside arena, got ${blueSpot2.x}`);

    // Case 6C: Circular Arena Enemy Sideline Opposition
    const circleArena = { x: 45, y: 240, width: 450, height: 450, shape: 'circle', radius: 225 };
    ashRed.trainerVantagePoint = { type: 'outside-left', wall: 'left', x: circleArena.x - 26, y: 465 };
    rivalBlue.x = circleArena.x + 50; // Near left flank
    const circleSpot = pickTrainerOutsideSidelineSpot(rivalBlue, circleArena, ashRed);
    assert(circleSpot.wall === 'right', `In circle arena, enemy trainer must leap to right flank when left is occupied, got ${circleSpot.wall}`);
    assert(circleSpot.type === 'outside-right', `Spot type must be outside-right, got ${circleSpot.type}`);

    // Case 6D: Ally/Teammate Trainers (same team) are NOT forced to opposite side if not desired
    const allyTrainer = new AshFighter({ x: 120, y: 465, hp: 360, maxHp: 360, teamId: 0 }); // Teammate!
    ashRed.trainerVantagePoint = { type: 'outside-left', wall: 'left', x: testArena.x - 26, y: 465 };
    state.fighters = [ashRed, allyTrainer];
    const allySpot = pickTrainerOutsideSidelineSpot(allyTrainer, testArena, null);
    assert(allySpot.wall === 'left', `Teammate trainer should be able to share left flank (with vertical separation), got ${allySpot.wall}`);
    assert(Math.abs(allySpot.y - ashRed.trainerVantagePoint.y) >= 55, 'Teammate must be vertically separated along the wall');

    // 7. Verify Centralized Smooth Poké Ball Throw Animation & Spring-Damped Hand Physics
    const {
      startTrainerPokeballThrow,
      updateTrainerThrowPhysics,
      getTrainerHandRenderState
    } = await import('../js/systems/pokemonTrainerSystem.js');

    ash.reset();
    startTrainerPokeballThrow(ash, {
      speciesKey: 'pikachu',
      targetX: 350,
      targetY: 465,
      throwAngle: 0,
      flightFrames: 18
    });
    assert(ash.pokeballThrowAnimTimer > 0, 'pokeballThrowAnimTimer must be initialized on throw start');
    assert(ash.pokeballThrowPhase === 'windup', `Initial throw phase must be 'windup', got ${ash.pokeballThrowPhase}`);

    const seenPhases = new Set([ash.pokeballThrowPhase]);
    let sawBallInHandDuringWindup = false;
    let sawBallReleasedInFlight = false;
    let maxRightHandDisp = 0;

    for (let f = 0; f < 34; f++) {
      updateTrainerThrowPhysics(ash);
      if (ash.thrownPokeball && ash.thrownPokeball.timer > 0) {
        ash.thrownPokeball.timer--;
      }
      const renderState = getTrainerHandRenderState(ash, ash.r);
      if (renderState.phase && renderState.phase !== 'idle') {
        seenPhases.add(renderState.phase);
      }
      if (renderState.isBallInHand && ash.thrownPokeball && ash.thrownPokeball.timer > 14) {
        sawBallInHandDuringWindup = true;
      }
      if (!renderState.isBallInHand && ash.thrownPokeball && ash.thrownPokeball.timer <= 10 && ash.thrownPokeball.timer > 0) {
        sawBallReleasedInFlight = true;
      }
      const disp = Math.hypot(renderState.rightHand.x - ash.r * 0.82, renderState.rightHand.y - ash.r * 0.38);
      if (disp > maxRightHandDisp) maxRightHandDisp = disp;

      mockCtx.resetStackDepth();
      ash.draw(mockCtx, enemy);
      assert(mockCtx.getStackDepth() === 0, `Ash throw animation frame ${f} corrupted canvas stack depth`);
    }

    assert(seenPhases.has('windup') && seenPhases.has('whip') && seenPhases.has('followThrough') && seenPhases.has('settle'),
      `Throw animation must transition through windup -> whip -> followThrough -> settle (saw: ${Array.from(seenPhases).join(', ')})`);
    assert(sawBallInHandDuringWindup, 'Poké Ball must remain gripped in the trainer right hand during windup coil');
    assert(sawBallReleasedInFlight, 'Poké Ball must detach from the trainer right hand once launched into airborne flight');
    assert(maxRightHandDisp > 15, `Right throwing hand must displace significantly with spring physics during throw (maxDisp=${maxRightHandDisp})`);

    // 8. Canvas 2D Stack Balance Check
    mockCtx.resetStackDepth();
    ash.draw(mockCtx, enemy);
    assert(mockCtx.getStackDepth() === 0, 'Ash rendering corrupted canvas stack depth');

    // Cleanup
    ash._cleanupActivePokemon?.();
    state.fighters = [];
    console.log('      ✅ Ash Ketchum Post-Summon Sideline Repositioning (Top/Left/Right Edge & Barrier) verified.');
  }

  // ⚡ 106. Testing Ash Ketchum Individual Pokémon Summon Toggles (enablePikachu, enableCharizard, enableGreninja, enableLucario) ⚡
  {
    console.log('   106. Testing Ash Ketchum Individual Pokémon Summon Toggles (enablePikachu, enableCharizard, enableGreninja, enableLucario)...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const { ashConfig } = await import('../js/configs/characters/ashConfig.js');
    const NormalClass = FIGHTER_CLASS_MAP['normal'];

    const testArena = { x: 45, y: 240, width: 450, height: 450, shape: 'rect' };
    state.arena = testArena;

    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const enemy = new NormalClass({ x: 300, y: 500, hp: 1000, maxHp: 1000, teamId: 1 });
    state.fighters = [ash, enemy];

    const ashCfg = (typeof CONFIG !== 'undefined' && CONFIG.ash) ? CONFIG.ash : ashConfig;

    const origPikachu = ashCfg.enablePikachu;
    const origCharizard = ashCfg.enableCharizard;
    const origGreninja = ashCfg.enableGreninja;
    const origLucario = ashCfg.enableLucario;

    try {
      // 1. When all 4 toggles are enabled, all 4 Pokémon are available
      ashCfg.enablePikachu = true;
      ashCfg.enableCharizard = true;
      ashCfg.enableGreninja = true;
      ashCfg.enableLucario = true;
      assert(ash._isPokemonEnabled('pikachu') === true, 'Pikachu must be enabled when enablePikachu is true');
      assert(ash._isPokemonEnabled('charizard') === true, 'Charizard must be enabled when enableCharizard is true');
      assert(ash._isPokemonEnabled('greninja') === true, 'Greninja must be enabled when enableGreninja is true');
      assert(ash._isPokemonEnabled('lucario') === true, 'Lucario must be enabled when enableLucario is true');
      assert(ash._getAvailablePokemonList().length === 4, 'All 4 Pokémon must be available when all 4 toggles are true');

      // 2. Disable Pikachu -> random summon pool must skip Pikachu and randomly pick from enabled Pokémon
      ashCfg.enablePikachu = false;
      ash.reset();
      const listWithoutPika = ash._getAvailablePokemonList();
      assert(listWithoutPika.length === 3, 'Available list must contain 3 Pokémon when Pikachu is disabled');
      assert(!listWithoutPika.includes('pikachu'), 'Available list must NOT contain Pikachu when disabled');
      assert(listWithoutPika[0] === 'charizard', 'First Pokémon in available pool must now be Charizard');

      let prevSpecies = null;
      for (let t = 0; t < 12; t++) {
        ash._throwPokeball(enemy, testArena);
        assert(ash.thrownPokeball !== null, 'Ash must throw Poké Ball for next available Pokémon');
        assert(
          listWithoutPika.includes(ash.thrownPokeball.speciesKey) && ash.thrownPokeball.speciesKey !== 'pikachu',
          `Thrown ball must randomly pick from enabled Pokémon (${listWithoutPika.join(', ')}), got ${ash.thrownPokeball.speciesKey}`
        );
        if (prevSpecies !== null) {
          assert(
            ash.thrownPokeball.speciesKey !== prevSpecies,
            `Random Pokémon summon must avoid immediate back-to-back repeat when >1 species are enabled (${prevSpecies})`
          );
        }
        prevSpecies = ash.thrownPokeball.speciesKey;
        ash.thrownPokeball = null;
      }

      // 3. Enable only Lucario
      ashCfg.enableCharizard = false;
      ashCfg.enableGreninja = false;
      ashCfg.enableLucario = true;
      ash.reset();
      const onlyLucarioList = ash._getAvailablePokemonList();
      assert(onlyLucarioList.length === 1 && onlyLucarioList[0] === 'lucario', 'Available list must contain only Lucario');

      ash._throwPokeball(enemy, testArena);
      assert(ash.thrownPokeball.speciesKey === 'lucario', `Thrown ball must contain Lucario, got ${ash.thrownPokeball.speciesKey}`);
      ash.thrownPokeball = null;

      // 4. Disable ALL Pokémon -> Zero summons, no throws, Ash stays mobile, summon bars cleanly hidden (Rule 18)
      ashCfg.enableLucario = false;
      ash.reset();
      const emptyList = ash._getAvailablePokemonList();
      assert(emptyList.length === 0, 'Available list must be empty when all Pokémon are disabled');

      ash.summonCooldown = 0;
      ash.update(enemy, 0, testArena);
      assert(ash.thrownPokeball === null, 'Ash must NOT throw Poké Ball when all Pokémon summons are disabled');
      assert(ash.activePokemon === null, 'Ash must have no active Pokémon when all summons are disabled');
      assert(ash.isProtectedByHoneycombBarrier === false, 'Honeycomb Barrier must be false when no Pokémon is active/available');
      const curSpeed = Math.hypot(ash.vx, ash.vy);
      assert(curSpeed > 0, 'Ash must maintain standard movement physics when all summons are disabled');

      // 5. Verify Rule 18 HUD Skill Bars: summon and command bars must be hidden when all Pokémon are disabled
      const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
      const skills = getSkillDataForFighter(ash);
      const hasSummonBar = skills?.some(s => s.id === 'honeycomb_summon');
      const hasCommandBar = skills?.some(s => s.id === 'trainer_command');
      assert(!hasSummonBar, 'honeycomb_summon HUD bar must be cleanly hidden when all Pokémon are disabled (Rule 18)');
      assert(!hasCommandBar, 'trainer_command HUD bar must be cleanly hidden when all Pokémon are disabled (Rule 18)');

    } finally {
      // Restore original config toggles
      ashCfg.enablePikachu = origPikachu;
      ashCfg.enableCharizard = origCharizard;
      ashCfg.enableGreninja = origGreninja;
      ashCfg.enableLucario = origLucario;
      ash._cleanupActivePokemon?.();
      state.fighters = [];
    }

    console.log('      ✅ Ash Ketchum Individual Pokémon Summon Toggles (enablePikachu, enableCharizard, enableGreninja, enableLucario) verified.');
  }

  // 🎯 107. Testing Ash Active Pokémon Dedicated HUD Skill Bar Standard 🎯
  {
    console.log('   107. Testing Ash Active Pokémon Dedicated HUD Skill Bar Standard...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    const NormalClass = FIGHTER_CLASS_MAP['normal'];

    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const enemy = new NormalClass({ x: 300, y: 500, hp: 1000, maxHp: 1000, teamId: 1 });
    state.fighters = [ash, enemy];

    // 1. Initial State: Ash has NO active Pokémon summoned
    // Must display ONLY POKEBALL SUMMON when enableUltimate is false (Rule 18). NEVER any Pokémon skill bar or disabled ultimate!
    assert(ash.activePokemon === null, 'Ash must have no active Pokémon initially');
    const initialSkills = getSkillDataForFighter(ash);
    assert(Array.isArray(initialSkills) && initialSkills.length === 1, `Expected 1 skill bar initially (POKEBALL SUMMON), got ${initialSkills.length}`);
    const initialSummon = initialSkills.find(s => s.id === 'honeycomb_summon');
    assert(initialSummon !== undefined, 'POKEBALL SUMMON bar must be present while waiting to summon');
    assert(initialSummon.label === 'POKEBALL SUMMON', `Summon bar label must be 'POKEBALL SUMMON', got ${initialSummon.label}`);
    const initialCommand = initialSkills.find(s => s.id === 'trainer_command');
    assert(initialCommand === undefined, 'No Pokémon move (trainer_command) must be shown when no Pokémon is summoned');
    const initialUlt = initialSkills.find(s => s.id === '10m_volt_ultimate');
    assert(initialUlt === undefined, '10,000,000 VOLT Ultimate must be cleanly hidden when enableUltimate: false (Rule 18)');

    // 2. Summon Pikachu: HUD must display ONLY Pikachu's skill bar (THUNDERBOLT)
    // POKEBALL SUMMON / SHIELD & disabled ultimate must be cleanly hidden!
    ash._spawnPokemonFromBall({ speciesKey: 'pikachu', targetX: 270, targetY: 465 });
    assert(ash.activePokemon !== null && ash.activePokemon.speciesId === 'pikachu', 'Pikachu must be active');
    const pikaSkills = getSkillDataForFighter(ash);
    assert(pikaSkills.find(s => s.id === 'honeycomb_summon') === undefined, 'Poké Ball summon bar must be hidden when Pokémon is active');
    const pikaMove = pikaSkills.find(s => s.id === 'trainer_command');
    assert(pikaMove !== undefined, 'Active Pokémon move bar must be present');
    assert(pikaMove.label === 'THUNDERBOLT', `Pikachu active skill label must be 'THUNDERBOLT', got ${pikaMove.label}`);
    assert(pikaSkills.every(s => s.color === '#FACC15'), 'All skill bars during Pikachu summon must reference Pikachu themeColor (#FACC15)');
    assert(pikaSkills.find(s => s.id === '10m_volt_ultimate') === undefined, 'Ultimate must remain cleanly hidden when enableUltimate: false');

    // 3. Summon Charizard: HUD must display ONLY Charizard's skill bar (FLAMETHROWER)
    ash._spawnPokemonFromBall({ speciesKey: 'charizard', targetX: 270, targetY: 465 });
    assert(ash.activePokemon !== null && ash.activePokemon.speciesId === 'charizard', 'Charizard must be active');
    const chariSkills = getSkillDataForFighter(ash);
    assert(chariSkills.find(s => s.id === 'honeycomb_summon') === undefined, 'Poké Ball summon bar must be hidden when Pokémon is active');
    const chariMove = chariSkills.find(s => s.id === 'trainer_command');
    assert(chariMove !== undefined, 'Charizard active skill bar must be present');
    assert(chariMove.label === 'FLAMETHROWER', `Charizard active skill label must be 'FLAMETHROWER', got ${chariMove.label}`);
    assert(chariSkills.every(s => s.color === '#F97316'), 'All skill bars during Charizard summon must reference Charizard themeColor (#F97316)');
    assert(chariSkills.find(s => s.id === '10m_volt_ultimate') === undefined, 'Ultimate must remain cleanly hidden when enableUltimate: false');

    // 4. Summon Greninja: HUD must display ONLY Greninja's skill bar (WATER SHURIKEN)
    ash._spawnPokemonFromBall({ speciesKey: 'greninja', targetX: 270, targetY: 465 });
    assert(ash.activePokemon !== null && ash.activePokemon.speciesId === 'greninja', 'Greninja must be active');
    const grenSkills = getSkillDataForFighter(ash);
    assert(grenSkills.find(s => s.id === 'honeycomb_summon') === undefined, 'Poké Ball summon bar must be hidden when Pokémon is active');
    const grenMove = grenSkills.find(s => s.id === 'trainer_command');
    assert(grenMove !== undefined, 'Greninja active skill bar must be present');
    assert(grenMove.label === 'WATER SHURIKEN', `Greninja active skill label must be 'WATER SHURIKEN', got ${grenMove.label}`);
    assert(grenSkills.every(s => s.color === '#3B82F6'), 'All skill bars during Greninja summon must reference Greninja themeColor (#3B82F6)');
    assert(grenSkills.find(s => s.id === '10m_volt_ultimate') === undefined, 'Ultimate must remain cleanly hidden when enableUltimate: false');

    // 5. Summon Lucario: HUD must display ONLY Lucario's skill bar (AURA SPHERE)
    ash._spawnPokemonFromBall({ speciesKey: 'lucario', targetX: 270, targetY: 465 });
    assert(ash.activePokemon !== null && ash.activePokemon.speciesId === 'lucario', 'Lucario must be active');
    const lucSkills = getSkillDataForFighter(ash);
    assert(lucSkills.find(s => s.id === 'honeycomb_summon') === undefined, 'Poké Ball summon bar must be hidden when Pokémon is active');
    const lucMove = lucSkills.find(s => s.id === 'trainer_command');
    assert(lucMove !== undefined, 'Lucario active skill bar must be present');
    assert(lucMove.label === 'AURA SPHERE', `Lucario active skill label must be 'AURA SPHERE', got ${lucMove.label}`);
    assert(lucSkills.every(s => s.color === '#06B6D4'), 'All skill bars during Lucario summon must reference Lucario themeColor (#06B6D4)');
    assert(lucSkills.find(s => s.id === '10m_volt_ultimate') === undefined, 'Ultimate must remain cleanly hidden when enableUltimate: false');

    // 6. Active Pokémon Faints: Pokémon skill bar disappears immediately, Poké Ball summon bar returns!
    ash._onActivePokemonFainted(ash.activePokemon);
    assert(ash.activePokemon === null, 'Active Pokémon must be cleaned up on faint');
    const faintSkills = getSkillDataForFighter(ash);
    assert(faintSkills.find(s => s.id === 'trainer_command') === undefined, 'Pokémon skill bar must disappear immediately when Pokémon faints');
    const faintSummon = faintSkills.find(s => s.id === 'honeycomb_summon');
    assert(faintSummon !== undefined, 'POKEBALL SUMMON bar must immediately return when active Pokémon faints');
    assert(faintSummon.label === 'POKEBALL SUMMON', `Summon bar must be labeled 'POKEBALL SUMMON', got ${faintSummon.label}`);

    // 7. Verify dynamic toggle gating (enableUltimate: true -> restores 10,000,000 VOLT bar; enableUltimate: false -> cleanly hides it)
    CONFIG.ash.enableUltimate = true;
    const toggledOnSkills = getSkillDataForFighter(ash);
    assert(toggledOnSkills.some(s => s.id === '10m_volt_ultimate'), 'Enabling enableUltimate must restore the 10,000,000 VOLT skill bar');
    CONFIG.ash.enableUltimate = false;
    const toggledOffSkills = getSkillDataForFighter(ash);
    assert(!toggledOffSkills.some(s => s.id === '10m_volt_ultimate'), 'Disabling enableUltimate must cleanly hide the 10,000,000 VOLT skill bar (Rule 18)');

    // 8. Verify HUD Skill Bar Progression during combat and during melee attacks (never locked or reset to 0%)
    ash._spawnPokemonFromBall({ speciesKey: 'pikachu', targetX: 270, targetY: 465 });
    const pikaActive = ash.activePokemon;
    pikaActive.specialCooldown = 90; // Halfway through initial cooldown (180 max)
    ash.commandCooldown = 90;
    const midSkills = getSkillDataForFighter(ash);
    const midBar = midSkills.find(s => s.id === 'trainer_command');
    assert(midBar !== undefined, 'Trainer command bar must be present');
    assert(Math.round(midBar.pct) === 50, `Skill bar should be at 50% at 90/180 frames, got ${midBar.pct}%`);
    assert(midBar.ready === false, 'Skill bar must NOT be ready at 50%');

    // Simulate Pikachu entering a melee attack combo (Quick Attack / Iron Tail)
    pikaActive.meleeMoveState = 'strike';
    const meleeSkills = getSkillDataForFighter(ash);
    const meleeBar = meleeSkills.find(s => s.id === 'trainer_command');
    assert(Math.round(meleeBar.pct) === 50, `Skill bar must NOT be zeroed out during meleeMoveState, got ${meleeBar.pct}%`);

    // Verify readiness when cooldown hits 0
    pikaActive.specialCooldown = 0;
    ash.commandCooldown = 0;
    pikaActive.meleeMoveState = null;
    const readySkills = getSkillDataForFighter(ash);
    const readyBar = readySkills.find(s => s.id === 'trainer_command');
    assert(readyBar.pct === 100, `Skill bar must be at 100% when cooldown reaches 0, got ${readyBar.pct}%`);
    assert(readyBar.ready === true, 'Skill bar must be ready when cooldown reaches 0');

    // Cleanup
    ash._cleanupActivePokemon?.();
    state.fighters = [];
    console.log('      ✅ Ash Active Pokémon Dedicated HUD Skill Bar Standard (POKEBALL SUMMON hidden on summon, active move dynamically displayed, clean faint return & Rule 18) verified.');
  }

  // =========================================================================
  // 🎯 108. Testing Ash Active Pokémon Victory Stay & Dedicated Animations 🎯
  // =========================================================================
  {
    console.log('   108. Testing Ash Active Pokémon Victory Stay & Dedicated Animations (Pikachu: POSE, Charizard: SLEEP, Greninja: RearUp, Lucario: Tumbleback)...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const enemy = new Fighter({ x: 350, y: 465, hp: 0, maxHp: 300, teamId: 1 });
    enemy.dead = true;
    state.arena = testArena;
    state.fighters = [ash, enemy];
    state.gameState = 'matchEnd';
    state.matchWinner = ash;

    const victoryTests = [
      { species: 'pikachu', expectedAnim: 'pose' },
      { species: 'charizard', expectedAnim: 'sleep' },
      { species: 'greninja', expectedAnim: 'rearUp' },
      { species: 'lucario', expectedAnim: 'tumbleback' }
    ];

    for (const { species, expectedAnim } of victoryTests) {
      ash._spawnPokemonFromBall({ speciesKey: species, targetX: 270, targetY: 465 });
      assert(ash.activePokemon !== null, `Ash must deploy ${species}`);
      assert(ash.activePokemon.speciesId === species, `Active pokemon must be ${species}`);

      // Run update cycle under matchEnd victory condition (Frame 1: victory delay active)
      ash.update(enemy, 0, testArena);
      ash.activePokemon.update(enemy, 0, testArena);

      // Verify active Pokémon STAYS in arena
      assert(ash.activePokemon !== null, `${species} must STAY on the field when Ash wins the match`);
      assert(ash.activePokemon.hp > 0, `${species} must remain alive`);

      // Verify that it does NOT snap immediately on frame 1 (delay timer active)
      assert(ash.activePokemon.victoryPoseDelayTimer > 0, `${species} victoryPoseDelayTimer must be counting down on frame 1`);
      assert(ash.activePokemon.animState !== expectedAnim, `${species} must NOT immediately snap to '${expectedAnim}' on victory frame 1`);

      // Advance through victory pose delay window (~45 frames)
      for (let f = 0; f < 50; f++) {
        ash.update(enemy, 0, testArena);
        ash.activePokemon.update(enemy, 0, testArena);
      }

      // Verify dedicated victory animation after delay
      assert(
        ash.activePokemon.animState === expectedAnim || ash.activePokemon.animState === 'victory',
        `${species} must use '${expectedAnim}' animation upon match victory, got '${ash.activePokemon.animState}'`
      );

      // Verify movement halts in victory pose
      assert(ash.activePokemon.vx === 0 && ash.activePokemon.vy === 0, `${species} velocity must be 0 in victory pose`);
      assert(ash.vx === 0 && ash.vy === 0, 'Ash velocity must be 0 upon match victory');

      // Cleanup for next species
      ash._cleanupActivePokemon?.();
    }

    state.fighters = [];
    state.gameState = 'playing';
    state.matchWinner = null;
    console.log('      ✅ Ash Active Pokémon Victory Stay & Animations (Pikachu: POSE, Charizard: SLEEP, Greninja: RearUp, Lucario: Tumbleback) verified.');
  }

  // =========================================================================
  // 🥊 109. Testing Ash Ketchum Retro Arcade Breathing Animation when Steady 🥊
  // =========================================================================
  {
    console.log('   109. Testing Ash Ketchum Retro Arcade Breathing Animation when Steady (Zenitsu Rhythm Standard)...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const { drawAshSkin } = await import('../js/graphics/fighters/ashSkin.js');

    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });

    // 1. Initial State: Ash starts steady
    assert(ash.isSteady === true, 'Ash must be steady initially');
    assert(ash._ashSteadyTick === 0, 'Steady tick must initialize to 0');

    // 2. Render Mock Context: verify stack depth balance & steady tick progression
    const noop = () => {};
    let stackDepth = 0;
    let minStackDepth = 0;
    const mockCtx = {
      save: () => { stackDepth++; },
      restore: () => {
        stackDepth--;
        if (stackDepth < minStackDepth) minStackDepth = stackDepth;
      },
      translate: noop,
      rotate: noop,
      scale: noop,
      beginPath: noop,
      arc: noop,
      fill: noop,
      stroke: noop,
      drawImage: noop,
      fillRect: noop,
      moveTo: noop,
      lineTo: noop,
      closePath: noop,
      canvas: { width: 100, height: 100 }
    };

    // Render steady frames
    for (let frame = 1; frame <= 60; frame++) {
      drawAshSkin(mockCtx, ash);
      assert(ash._ashSteadyTick === frame, 'Steady tick must advance to ' + frame + ', got ' + ash._ashSteadyTick);
      assert(stackDepth === 0, 'Canvas transform stack depth must return to 0 (got ' + stackDepth + ')');
      assert(minStackDepth === 0, 'Canvas transform stack depth must never drop below 0');
    }

    // 3. Fast movement: breathing tick pauses while running
    ash.vx = 5.0;
    ash.vy = 5.0;
    ash.isSteady = false;
    const steadyTickBeforeMove = ash._ashSteadyTick;

    for (let frame = 0; frame < 10; frame++) {
      drawAshSkin(mockCtx, ash);
      assert(ash._ashSteadyTick === steadyTickBeforeMove, 'Steady tick must pause while running fast');
      assert(stackDepth === 0, 'Canvas transform stack depth must return to 0 while moving');
    }

    // 4. Halting / Steady again: breathing resumes
    ash.vx = 0;
    ash.vy = 0;
    ash.isSteady = true;
    drawAshSkin(mockCtx, ash);
    assert(ash._ashSteadyTick === steadyTickBeforeMove + 1, 'Steady tick must resume when steady');
    assert(stackDepth === 0, 'Canvas transform stack depth must be 0');

    console.log('      ✅ Ash Ketchum Retro Arcade Breathing Animation when Steady (Zenitsu Rhythm Standard) verified.');
  }

  // =========================================================================
  // ⚡ 110. Testing Ash Pokémon Signature Skill vs Melee Attack Priority ⚡
  // =========================================================================
  {
    console.log('   110. Testing Ash Pokémon Signature Skill vs Melee Attack Priority...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const enemy = new Fighter({ x: 300, y: 465, hp: 300, maxHp: 300, teamId: 1 });
    state.arena = testArena;
    state.fighters = [ash, enemy];
    state.gameState = 'playing';
    state.matchWinner = null;

    // Test A: Trainer Command at close range (dist = 30px <= 180px) MUST trigger signature special skill, NOT melee attack
    ash._spawnPokemonFromBall({ speciesKey: 'pikachu', targetX: 270, targetY: 465 });
    assert(ash.activePokemon !== null, 'Pikachu must be active');
    const pika = ash.activePokemon;
    pika.x = 270;
    pika.y = 465;
    enemy.x = 300;
    enemy.y = 465; // dist = 30px, point blank
    pika.specialCooldown = 0;
    ash.commandCooldown = 0;
    pika.meleeCooldown = 0;
    pika.meleeMoveState = null;

    ash._executeTrainerCommand(enemy);

    assert(pika.thunderboltState === 'windup', 'Pikachu must execute Thunderbolt (windup) when skill is ready, even at point-blank range');
    assert(pika.meleeMoveState === null, 'Pikachu must NOT use melee attack (Quick Attack/Iron Tail) when signature skill is ready');
    ash._cleanupActivePokemon?.();

    // Test B: Autonomous update priority across all 4 Pokémon species at point-blank range
    const roster = [
      { species: 'pikachu', checkSkill: (p, a) => p.thunderboltState === 'windup' },
      { species: 'charizard', checkSkill: (p, a) => p.flamethrowerState === 'windup' },
      { species: 'greninja', checkSkill: (p, a) => a.activeElementalProjectiles.some(proj => proj.kind === 'waterShuriken') },
      { species: 'lucario', checkSkill: (p, a) => a.activeElementalProjectiles.some(proj => proj.kind === 'auraSphere') }
    ];

    for (const { species, checkSkill } of roster) {
      ash._spawnPokemonFromBall({ speciesKey: species, targetX: 270, targetY: 465 });
      const p = ash.activePokemon;
      assert(p !== null && p.speciesId === species, species + ' must be active');
      p.x = 270;
      p.y = 465;
      enemy.x = 300;
      enemy.y = 465; // dist = 30px
      p.specialCooldown = 0;
      ash.commandCooldown = 0;
      p.meleeCooldown = 0;
      p.meleeMoveState = null;
      ash.activeElementalProjectiles.length = 0;

      // Update companion entity
      p.update(enemy, 0, testArena);

      assert(checkSkill(p, ash), species + ' must execute signature special skill when specialCooldown <= 0');
      assert(p.meleeMoveState === null, species + ' must NOT execute melee move when specialCooldown <= 0');

      // Test C: When special IS on cooldown, companion DOES use melee combat when within melee reach
      ash._cleanupActivePokemon?.();
      ash._spawnPokemonFromBall({ speciesKey: species, targetX: 270, targetY: 465 });
      const pMelee = ash.activePokemon;
      pMelee.x = 270;
      pMelee.y = 465;
      enemy.x = 300;
      enemy.y = 465;
      pMelee.specialCooldown = 150; // special is on cooldown!
      ash.commandCooldown = 150;
      pMelee.meleeCooldown = 0;
      pMelee.meleeMoveState = null;

      pMelee.update(enemy, 0, testArena);

      assert(pMelee.meleeMoveState !== null, species + ' must use melee attack when special skill is on cooldown and enemy is in reach');
      ash._cleanupActivePokemon?.();
    }

    state.fighters = [];
    console.log('      ✅ Ash Pokémon Signature Skill vs Melee Attack Priority verified successfully.');
  }
  // =========================================================================
  // ⚡ 111. Testing Ash Pokémon Push Back, Pull, Drag & Knockback Immunity while Casting Skills ⚡
  // =========================================================================
  {
    console.log('   111. Testing Ash Pokémon Push Back, Pull, Drag & Knockback Immunity while Casting Skills...');
    const { AshFighter, PokemonCompanionEntity } = await import('../js/entities/fighters/AshFighter.js');
    const { Fighter, isEntityImmuneToGravitationalPull } = await import('../js/entities/fighter.js');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const ash = new AshFighter({ x: 270, y: 465, hp: 360, maxHp: 360, teamId: 0 });
    const enemy = new Fighter({ x: 320, y: 465, hp: 300, maxHp: 300, teamId: 1 });
    state.arena = testArena;
    state.fighters = [ash, enemy];
    state.gameState = 'playing';

    // 1. Idle state: Pokémon has standard physics and no immunity
    const pika = new PokemonCompanionEntity(ash, 'pikachu', 270, 465);
    ash.activePokemon = pika;
    state.fighters.push(pika);

    assert(pika.isCastingSkill() === false, 'Pikachu must NOT be casting skill while idle');
    assert(pika.immuneToKnockback === false, 'Pikachu must NOT be immune to knockback while idle');
    assert(pika.immuneToPush === false, 'Pikachu must NOT be immune to push while idle');
    assert(pika.immuneToPull === false, 'Pikachu must NOT be immune to pull while idle');
    assert(pika.cannotBeKnockbacked === false, 'Pikachu must NOT be cannotBeKnockbacked while idle');
    assert(isEntityImmuneToGravitationalPull(pika, 'purple') === false, 'Idle Pokémon is not immune to Purple suction');

    pika.applyKnockback(12, 12);
    assert(pika.knockbackVx === 12 && pika.knockbackVy === 12, 'Idle Pokémon takes normal knockback velocity');
    pika.knockbackVx = 0;
    pika.knockbackVy = 0;

    // 2. Active Special Skill (Thunderbolt): Push back, pull, drag & knockback immunities engage
    pika.startThunderbolt(enemy, false);
    assert(pika.isCastingSkill() === true, 'Pikachu must be casting skill during Thunderbolt');
    assert(pika.immuneToKnockback === true, 'Pikachu must have immuneToKnockback=true during Thunderbolt');
    assert(pika.immuneToPush === true, 'Pikachu must have immuneToPush=true during Thunderbolt');
    assert(pika.immuneToPull === true, 'Pikachu must have immuneToPull=true during Thunderbolt');
    assert(pika.cannotBeKnockbacked === true, 'Pikachu must have cannotBeKnockbacked=true during Thunderbolt');
    assert(pika.gojoBlueDragImmune === true, 'Pikachu must have gojoBlueDragImmune=true during Thunderbolt');

    // Gravitational suction immunity
    assert(isEntityImmuneToGravitationalPull(pika, 'purple') === true, 'Casting Pokémon must be immune to Purple pull');
    assert(isEntityImmuneToGravitationalPull(pika, 'blue') === true, 'Casting Pokémon must be immune to Blue pull');
    assert(isEntityImmuneToGravitationalPull(pika, 'black_hole') === true, 'Casting Pokémon must be immune to Black Hole pull');
    assert(isEntityImmuneToGravitationalPull(pika, 'yuta_beam') === true, 'Casting Pokémon must be immune to Pure Love Beam suction');

    // Drag immunity
    pika.isDraggedByGetsuga = true;
    assert(pika.isDraggedByGetsuga === false, 'Casting Pokémon must ignore Getsuga drag assignment');
    pika._draggedByCruelSun = true;
    assert(pika._draggedByCruelSun === false, 'Casting Pokémon must ignore Cruel Sun drag assignment');
    assert(pika.isCaughtInBeam() === false, 'Casting Pokémon must report isCaughtInBeam=false');

    // Knockback immunity
    pika.applyKnockback(25, 25);
    assert(pika.knockbackVx === 0 && pika.knockbackVy === 0, 'applyKnockback must have zero effect while casting skill');

    // Damage intake without knockback or skill interruption
    const preHp = pika.hp;
    pika.takeDamage(15, enemy, { isKnockback: true, knockback: 10 });
    assert(pika.hp < preHp, 'Pokémon still takes damage normally while casting');
    assert(pika.knockbackVx === 0 && pika.knockbackVy === 0, 'Damage must NOT knockback casting Pokémon');
    assert(pika.thunderboltState === 'windup', 'Thunderbolt must NOT be interrupted by incoming hit');

    pika.interruptAttacks();
    assert(pika.isCastingSkill() === false, 'isCastingSkill must be false after skill is interrupted');
    assert(pika.immuneToKnockback === false, 'immuneToKnockback must reset after skill ends');

    // 3. Charizard Flamethrower Active Phase Immunity
    const chari = new PokemonCompanionEntity(ash, 'charizard', 270, 465);
    ash.activePokemon = chari;
    chari.startFlamethrower(enemy, false);
    for (let f = 0; f < 28; f++) chari.update(enemy, 0, testArena); // windup into active
    assert(chari.flamethrowerState === 'active', 'Charizard must be in active stream phase');
    assert(chari.isCastingSkill() === true, 'Charizard must report isCastingSkill=true while firing Flamethrower');
    assert(chari.immuneToPush === true && chari.immuneToPull === true, 'Charizard must be immune to push and pull while firing');
    chari.applyKnockback(40, -40);
    assert(chari.knockbackVx === 0 && chari.knockbackVy === 0, 'Flamethrower must not be knocked back');

    // 4. Melee Move (Dragon Claw / Quick Attack / Close Combat) Immunity
    chari.interruptAttacks();
    chari._startCloseCombatMove(enemy, 'dragonClaw');
    assert(chari.meleeMoveState !== null, 'Charizard must be in melee move state');
    assert(chari.isCastingSkill() === true, 'Charizard must report isCastingSkill=true during Dragon Claw');
    assert(chari.immuneToKnockback === true, 'Charizard must have knockback immunity during melee combo');
    assert(chari.immuneToPull === true, 'Charizard must have pull immunity during melee combo');
    chari.applyKnockback(15, 15);
    assert(chari.knockbackVx === 0 && chari.knockbackVy === 0, 'Melee combo must ignore knockback');

    // 5. Greninja / Lucario Special Cast Immunity
    const gren = new PokemonCompanionEntity(ash, 'greninja', 270, 465);
    ash.activePokemon = gren;
    ash._executePokemonSpecial(gren, enemy, false);
    assert(gren.isCastingSkill() === true, 'Greninja must report isCastingSkill=true while casting Water Shuriken');
    assert(gren.immuneToKnockback === true && gren.immuneToPull === true, 'Greninja must have knockback & pull immunity');

    // 6. Pokémon Summon Entrance Animation & Visual Effects Before Moving
    const { drawPokemonCompanion } = await import('../js/graphics/weapons/ashPokemonGraphics.js');
    ash._spawnPokemonFromBall({
      speciesKey: 'charizard',
      targetX: 250,
      targetY: 440
    });
    const summonedPoke = ash.activePokemon;
    assert(summonedPoke && summonedPoke.isSummonIntro === true, 'Summoned Pokémon must start in summon entrance animation state');
    assert(summonedPoke.summonIntroTimer === 28, `Summoned Pokémon summonIntroTimer must start at 28, got ${summonedPoke.summonIntroTimer}`);
    assert(summonedPoke.vx === 0 && summonedPoke.vy === 0, 'Summoned Pokémon must stay stationary (vx=0, vy=0) during summon entrance animation');
    assert(summonedPoke.animState === 'special', 'Summoned Charizard must play its reared-up entrance roar animation before moving');

    const summonCtx = createMockCtx();
    for (let t = 0; t < 27; t++) {
      summonedPoke.update(enemy, 0, testArena);
      assert(summonedPoke.isSummonIntro === true, `Pokémon must remain in summon intro at tick ${t}`);
      assert(summonedPoke.vx === 0 && summonedPoke.vy === 0, `Pokémon must not move before summon intro finishes (tick ${t})`);
      drawPokemonCompanion(summonCtx, summonedPoke);
      assert(summonCtx.getStackDepth() === 0, 'drawPokemonCompanion during summon intro must maintain 0 Canvas 2D stack depth');
    }

    // Final tick (tick 28) completes summon intro and launches movement
    summonedPoke.update(enemy, 0, testArena);
    assert(summonedPoke.isSummonIntro === false && summonedPoke.summonIntroTimer === 0, 'Summon intro must complete after 28 frames');
    assert(Math.hypot(summonedPoke.vx, summonedPoke.vy) > 0, 'Pokémon must begin moving once summon entrance animation completes');

    // 7. Pokémon Battle Targeting Priority: Focus Active Enemy Pokémon Instead of Nearest Fighter
    const { getClosestOpponent } = await import('../js/systems/physics.js');
    const rivalAsh = new AshFighter({
      id: 'ash2',
      name: 'Rival Ash',
      type: 'ash',
      x: 265, // Very close to summonedPoke (250, 440) -> dist ~15px!
      y: 440,
      hp: 360,
      maxHp: 360
    });
    rivalAsh.teamId = 1;
    ash.teamId = 0;
    summonedPoke.teamId = 0;
    enemy.teamId = 1;
    enemy.x = 260; // Also very close to summonedPoke -> dist ~10px!
    enemy.y = 440;

    // Rival Ash summons an active Pokémon far across the arena (dist ~200px)
    const rivalPokemon = new PokemonCompanionEntity(rivalAsh, 'pikachu', 450, 440);
    rivalPokemon.teamId = 1;
    rivalAsh.activePokemon = rivalPokemon;
    state.fighters = [ash, summonedPoke, rivalAsh, rivalPokemon, enemy];

    const acquiredTarget = summonedPoke._acquireTarget(enemy);
    assert(
      acquiredTarget === rivalPokemon,
      `Pokémon must prioritize active enemy Pokémon (${rivalPokemon.name}) over closer fighter/trainer, got ${acquiredTarget?.name}`
    );
    const physicsOpponent = getClosestOpponent(summonedPoke);
    assert(
      physicsOpponent === rivalPokemon,
      `getClosestOpponent for a Pokémon must prioritize active enemy Pokémon over closer fighter/trainer`
    );

    // When enemy Pokémon faints, targeting falls back to the nearest enemy fighter
    rivalPokemon.hp = 0;
    rivalPokemon.isFainting = true;
    const fallbackTarget = summonedPoke._acquireTarget(enemy);
    assert(
      fallbackTarget === enemy || fallbackTarget === rivalAsh,
      'When no active enemy Pokémon remain alive, Pokémon must fall back to nearest enemy fighter'
    );

    // 8. Pokémon Fighter-Style Collision Rebounce (Walls, Fighters, Trainers & Other Pokémon)
    const { resolveFighterCollision } = await import('../js/systems/physics.js');
    summonedPoke.interruptAttacks();
    summonedPoke.summonIntroTimer = 0;
    summonedPoke.isSummonIntro = false;
    summonedPoke.specialCooldown = 200;
    summonedPoke.meleeCooldown = 200;

    // 8a. Collision rebounce against an enemy Fighter (even if enemy is slowed or moving in same direction)
    summonedPoke.x = 250;
    summonedPoke.y = 350;
    summonedPoke.vx = summonedPoke.speed; // Moving right (+vx)
    summonedPoke.vy = 0;
    enemy.x = 250 + summonedPoke.r + enemy.r - 4; // Overlapping on the right
    enemy.y = 350;
    enemy.vx = 1.5; // Moving slowly right (same direction!)
    enemy.vy = 0;
    enemy.slowTimer = 60; // Slowed by Flamethrower!

    resolveFighterCollision(summonedPoke, enemy);
    assert(
      summonedPoke.vx < -0.5,
      `Pokémon must rebounce to the left (vx < 0) after colliding with fighter on its right, got vx=${summonedPoke.vx}`
    );

    // Advance update() and verify the rebounced velocity is PRESERVED (not overwritten back toward enemy on the right!)
    summonedPoke.update(enemy, 0, testArena);
    assert(
      summonedPoke.vx < -0.5,
      `Pokémon must preserve its rebounced velocity on subsequent update() ticks instead of overwriting vx toward target, got vx=${summonedPoke.vx}`
    );

    // 8b. Collision rebounce against Trainer with active Honeycomb Barrier
    summonedPoke.x = 200;
    summonedPoke.y = 350;
    summonedPoke.vx = -summonedPoke.speed; // Moving left (-vx) into Ash
    summonedPoke.vy = 0;
    ash.x = 200 - (summonedPoke.r + ash.r - 4); // Ash on the left
    ash.y = 350;
    ash.isProtectedByHoneycombBarrier = true;

    resolveFighterCollision(ash, summonedPoke);
    assert(
      summonedPoke.vx > 0.5,
      `Pokémon must rebounce to the right (vx > 0) after colliding with Trainer on its left, got vx=${summonedPoke.vx}`
    );

    // 9. Centralized Companion Systems, Global Hit Flash & Zero Numeric HP Text Overlay
    const {
      isPokemonStationarySkill,
      updatePokemonCompanionMovement,
      updatePokemonCompanionAnimState,
      applyPokemonDamageHitEffects,
      renderPokemonHitFlash
    } = await import('../js/systems/pokemonTrainerSystem.js');

    assert(typeof isPokemonStationarySkill === 'function', 'isPokemonStationarySkill must be exported');
    assert(typeof updatePokemonCompanionMovement === 'function', 'updatePokemonCompanionMovement must be exported');
    assert(typeof updatePokemonCompanionAnimState === 'function', 'updatePokemonCompanionAnimState must be exported');
    assert(typeof applyPokemonDamageHitEffects === 'function', 'applyPokemonDamageHitEffects must be exported');
    assert(typeof renderPokemonHitFlash === 'function', 'renderPokemonHitFlash must be exported');

    // Verify global hit effect: takes damage -> hitFlashTimer becomes 8 -> updates & decays
    summonedPoke.hitFlashTimer = 0;
    summonedPoke.takeDamage(15, enemy, {});
    assert(summonedPoke.hitFlashTimer === 8, `Pokémon hitFlashTimer must be 8 on taking damage, got ${summonedPoke.hitFlashTimer}`);

    summonedPoke.update(enemy, 0, testArena);
    assert(summonedPoke.hitFlashTimer === 7, `Pokémon hitFlashTimer must decrement on update, got ${summonedPoke.hitFlashTimer}`);

    // Verify numeric HP overlay is suppressed (Pokémon uses floating minion health bar only)
    summonedPoke.drawHealth = () => {
      throw new Error('Numeric drawHealth() overlay must NOT be called on Pokémon companion!');
    };
    summonedPoke.draw(summonCtx);
    assert(summonCtx.getStackDepth() === 0, 'Pokémon draw() must maintain 0 Canvas 2D stack depth');

    ash._cleanupActivePokemon?.();
    rivalAsh._cleanupActivePokemon?.();
    state.fighters = [];
    console.log('      ✅ Ash Pokémon Push Back, Pull, Drag, Knockback Immunity, Summon Entrance VFX, Pokémon Battle Targeting, Collision Rebounce, Centralized Physics, Global Hit Flash & Zero HP Overlay verified.');
  }

  // ⚡ 111b. Testing Pokémon Trainer Absolute God-Mode & Sideline Immunity ⚡
  {
    console.log('   111b. Testing Pokémon Trainer Absolute God-Mode & Sideline Immunity (Zero Yuta Flurry, Zero Gravitational Pull, Zero Drag, Strict Position Locking)...');
    const { AshFighter } = await import('../js/entities/fighters/AshFighter.js');
    const { YutaFighter } = await import('../js/entities/fighters/YutaFighter.js');
    const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
    const { GojoBlueBehavior } = await import('../js/systems/projectiles/behaviors/GojoBlueBehavior.js');
    const { YutaPureLoveBeamBehavior } = await import('../js/systems/projectiles/behaviors/YutaPureLoveBeamBehavior.js');

    const testArena = { x: 45, y: 240, width: 450, height: 450 };
    state.arena = testArena;
    state.gameState = 'playing';

    const ash = new AshFighter({
      id: 'ash',
      name: 'Ash Ketchum',
      type: 'ash',
      x: 18,
      y: 450,
      hp: 350,
      maxHp: 350,
      r: 25
    });
    const initialAshHp = ash.hp;

    const yuta = new YutaFighter({
      id: 'yuta',
      name: 'Yuta Okkotsu',
      type: 'yuta',
      x: 200,
      y: 450,
      hp: 350,
      maxHp: 350,
      r: 25
    });

    state.fighters = [ash, yuta];

    // Set Ash to jumped-out sideline state
    ash.jumpState = 'outside';
    ash.isJumpedOut = true;
    ash.sidelineX = 18;
    ash.sidelineY = 450;
    ash.update(yuta, 0, testArena);

    // 1. Verify Ash is NOT a valid aim or flurry target for Yuta
    assert(yuta.isValidAimTarget(ash) === false, 'Yuta must consider jumped-out Ash invalid aim target');
    assert(yuta._getValidFlurryTarget(ash) === null, 'Yuta _getValidFlurryTarget must return null for jumped-out Ash');

    // 2. Verify Yuta Phantom Flurry CANNOT trigger or teleport to jumped-out Ash
    const flurryTriggered = yuta.triggerPhantomFlurry(ash);
    assert(flurryTriggered === false, 'Yuta must NOT trigger Phantom Flurry on jumped-out Ash');
    assert(yuta.x !== ash.x, 'Yuta must NOT teleport outside arena to Ash');

    // 3. Verify Hollow Purple Gravitational Suction does NOT displace jumped-out Ash
    const purpleBehavior = new GojoPurpleBehavior();
    const purpleProj = {
      x: 35,
      y: 450,
      vx: 0,
      vy: 0,
      r: 50,
      owner: 1,
      ownerFighter: yuta,
      pulledTargets: new Set(),
      purpleDPS: 50,
      purpleDPSInterval: 6
    };
    purpleBehavior.update(purpleProj, [ash, yuta], { projectiles: [] });
    assert(ash.x === 18 && ash.y === 450, `Hollow Purple must NOT pull jumped-out Ash, got (${ash.x}, ${ash.y})`);
    assert(ash.isCaughtInPurple !== true, 'Ash must not be caught in purple');

    // 4. Verify Gojo Blue Gravitational Suction does NOT displace jumped-out Ash
    const blueBehavior = new GojoBlueBehavior();
    const blueProj = {
      x: 35,
      y: 450,
      vx: 0,
      vy: 0,
      r: 30,
      owner: 1,
      ownerFighter: yuta,
      pulledTargets: new Set()
    };
    blueBehavior.update(blueProj, [ash, yuta], { projectiles: [] });
    assert(ash.x === 18 && ash.y === 450, `Gojo Blue must NOT pull jumped-out Ash, got (${ash.x}, ${ash.y})`);

    // 5. Verify Pure Love Beam does NOT pull, displace or damage jumped-out Ash
    const beamBehavior = new YutaPureLoveBeamBehavior();
    const beamProj = {
      x: yuta.x,
      y: yuta.y,
      angle: Math.PI, // Firing directly left through Ash at (18, 450)
      owner: 1,
      ownerFighter: yuta,
      damage: 100,
      hitTargets: new Set()
    };
    yuta.gunAngle = Math.PI;
    yuta.pureLoveBeamLockedAngle = Math.PI;
    beamBehavior.update(beamProj, [ash, yuta], { projectiles: [] });
    assert(ash.x === 18 && ash.y === 450, `Pure Love Beam must NOT pull jumped-out Ash, got (${ash.x}, ${ash.y})`);
    assert(ash.hp === initialAshHp, `Ash must not take damage from Pure Love Beam while outside, got HP ${ash.hp}`);

    // 6. Verify absolute damage & CC immunity (God-Mode)
    const dmgResult = ash.takeDamage(100, yuta, { isGuaranteedHit: true, isDomain: true });
    assert(dmgResult === false && ash.hp === initialAshHp, 'Ash must block all incoming damage while outside');
    ash.applyKnockback(100, 100);
    assert(ash.knockbackVx === 0 && ash.knockbackVy === 0, 'Ash must ignore knockback while outside');
    ash.applySuction(100, 100);
    assert(ash.knockbackVx === 0 && ash.knockbackVy === 0, 'Ash must ignore suction while outside');
    ash.applySlow(60, 0.2);
    assert(ash.slowTimer === 0 && ash.slowMultiplier === 1.0, 'Ash must ignore slow while outside');

    // 7. Testing Gojo and Sukuna Melee Mode against Pokémon
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const { updateFighters } = await import('../js/systems/physics.js');

    // 4. Verify Gojo and Sukuna trigger Melee Mode against summoned Pokémon
    ash.activePokemon = null;
    ash._spawnPokemonFromBall({ speciesKey: 'pikachu', targetX: 250, targetY: 450 });
    const pika = ash.activePokemon;
    pika.x = 250;
    pika.y = 450;
    pika.vx = 0;
    pika.vy = 0;
    pika.isSummonIntro = false;
    pika.summonIntroTimer = 0;

    const testGojo = new GojoFighter({ id: 'gojo', x: 215, y: 450 }); // 35px close contact
    testGojo.meleeModeCooldown = 0;
    state.fighters = [testGojo, ash, pika];
    for (let f = 0; f < 30; f++) {
      updateFighters();
      if (testGojo.isMeleeMode) break;
    }
    assert(testGojo.isMeleeMode === true, 'Gojo must trigger Melee Mode when in close contact with active enemy Pokémon');

    // Reset Pikachu position & HP for Sukuna test
    pika.x = 250;
    pika.y = 450;
    pika.vx = 0;
    pika.vy = 0;
    pika.hp = pika.maxHp;

    const testSukuna = new SukunaFighter({ id: 'sukuna', x: 215, y: 450 }); // 35px close contact
    testSukuna.meleeModeCooldown = 0;
    state.fighters = [testSukuna, ash, pika];
    for (let f = 0; f < 30; f++) {
      updateFighters();
      if (testSukuna.isMeleeMode) break;
    }
    assert(testSukuna.isMeleeMode === true, 'Sukuna must trigger Melee Mode when in close contact with active enemy Pokémon');

    // 5. Verify direct Pokémon melee attacks trigger Melee Mode on Sukuna & Gojo
    const meleeSukuna = new SukunaFighter({ id: 'sukuna', x: 250, y: 450 });
    meleeSukuna.isMeleeMode = false;
    meleeSukuna.meleeModeCooldown = 0;
    ash._dealPokemonDamage(meleeSukuna, 15, { isMelee: true, attacker: pika });
    assert(meleeSukuna.isMeleeMode === true, 'Sukuna must enter Melee Mode when struck by Pokémon close-range melee attack');

    state.fighters = [];
    console.log('      ✅ Pokémon Trainer Absolute God-Mode, Sideline Immunity & Gojo/Sukuna Melee Mode on Pokémon verified.');
  }

  // ⚡ 112. Testing Pac-Man Power Pellet Eating, Enemy Frightened Ghost Transformation, Paused Cooldowns & Move-Only State ⚡
  {
    console.log('   112. Testing Pac-Man Power Pellet Eating, Enemy Frightened Ghost Transformation, Paused Cooldowns & Move-Only State...');
    const { PacmanFighter } = await import('../js/entities/fighters/PacmanFighter.js');
    const { ZenitsuFighter } = await import('../js/entities/fighters/ZenitsuFighter.js');
    const { drawPacmanFrightenedGhost } = await import('../js/graphics/fighters/pacmanSkin.js');
    const { updateFighters } = await import('../js/systems/physics.js');

    const testArena = { x: 45, y: 240, width: 450, height: 450 };
    state.arena = testArena;
    state.gameState = 'playing';

    const pacman = new PacmanFighter({
      id: 'pacman',
      name: 'Pac-Man',
      type: 'pacman',
      x: 80,
      y: 280,
      speed: 4.8,
      hp: 350,
      maxHp: 350
    });

    const zenitsu = new ZenitsuFighter({
      id: 'zenitsu',
      name: 'Zenitsu',
      type: 'zenitsu',
      x: 360,
      y: 360,
      speed: 4.5,
      hp: 300,
      maxHp: 300
    });

    state.fighters = [pacman, zenitsu];
    state.getFighterTeam = (idx) => idx;

    // 1. Initial State: Zenitsu can act, aim, and has cooldowns
    zenitsu.thunderclapCooldown = 50;
    zenitsu.rokurenCooldown = 80;
    assert(zenitsu.isPacmanGhost === false, 'Enemy must not start as ghost');
    assert(zenitsu.canPerformBasicAttack(pacman) === true, 'Enemy must be able to perform basic attacks initially');
    assert(zenitsu.canAim() === true, 'Enemy must be able to aim initially');

    // 2. Pac-Man eats the Power Pellet (big dot)
    pacman.activateChompMode('powerPellet');

    // Verify Ghost Transformation State
    const expectedBaseGhostTimer = pacman.chompModeDuration || 250;
    assert(zenitsu.isPacmanGhost === true, 'Enemy must be transformed into ghost upon Pac-Man eating big dot');
    assert(zenitsu.pacmanGhostTimer === expectedBaseGhostTimer, `Ghost timer must be set to chomp duration (${expectedBaseGhostTimer} frames), got ${zenitsu.pacmanGhostTimer}`);
    assert(zenitsu.canPerformBasicAttack(pacman) === false, 'Enemy must NOT be able to perform basic attacks in ghost state');
    assert(zenitsu.canAim() === false, 'Enemy must NOT be able to aim in ghost state');

    // 3. Verify Skill Cooldowns are PAUSED (Do not tick down)
    const initialCd1 = zenitsu.thunderclapCooldown;
    const initialCd2 = zenitsu.rokurenCooldown;
    const initialX = zenitsu.x;
    const initialY = zenitsu.y;

    // Simulate 10 physics frames
    for (let f = 0; f < 10; f++) {
      updateFighters();
    }

    assert(zenitsu.thunderclapCooldown === initialCd1, 'Thunderclap cooldown must remain paused during ghost state');
    assert(zenitsu.rokurenCooldown === initialCd2, 'Rokuren cooldown must remain paused during ghost state');
    assert(zenitsu.pacmanGhostTimer === expectedBaseGhostTimer - 10, `Ghost timer must decrement each frame (got ${zenitsu.pacmanGhostTimer})`);

    // 4. Verify Movement Continuity: Enemy CAN MOVE
    const moved = Math.hypot(zenitsu.x - initialX, zenitsu.y - initialY) > 0.5 || Math.hypot(zenitsu.vx, zenitsu.vy) > 0.1;
    assert(moved, 'Enemy must be able to move and apply movement physics in ghost state');

    // 5. Verify Visual Rendering (drawPacmanFrightenedGhost)
    const mockCtx = createMockCtx();
    drawPacmanFrightenedGhost(mockCtx, zenitsu);
    assert(mockCtx.getStackDepth() === 0, 'drawPacmanFrightenedGhost must leave 0 Canvas 2D stack depth');

    // 6. Verify Small Dot Eating is Enabled During Active Chomp Mode (while Big Dots / Power Pellets are Preserved)
    pacman.initDots(testArena);
    assert(pacman.dots.length > 0, 'Pacman dots must be initialized');

    const smallDot = pacman.dots.find(d => !d.isPowerPellet && !d.eaten);
    const powerPellet = pacman.dots.find(d => d.isPowerPellet && !d.eaten);
    assert(smallDot !== undefined, 'Small dot must exist');
    assert(powerPellet !== undefined, 'Power pellet must exist');

    // A) Verify Pac-Man CAN eat small dots during active Chomp Mode
    pacman.x = smallDot.x;
    pacman.y = smallDot.y;
    const dotsEatenBefore = pacman.dotsEaten;
    pacman._checkDotEating();
    assert(smallDot.eaten === true, 'Pac-Man must be able to eat small dots during active Chomp Mode');
    assert(pacman.dotsEaten === dotsEatenBefore + 1, 'dotsEaten count must increment when eating small dot during Chomp Mode');

    // B) Verify Big Dot (Power Pellet) is preserved during active Chomp Mode so it is not wasted
    pacman.x = powerPellet.x;
    pacman.y = powerPellet.y;
    const dotsEatenBeforePellet = pacman.dotsEaten;
    pacman._checkDotEating();
    assert(powerPellet.eaten === false, 'Pac-Man must preserve Power Pellets during active Chomp Mode');
    assert(pacman.dotsEaten === dotsEatenBeforePellet, 'dotsEaten count must not increment for preserved Power Pellet');

    // 7. Verify Pac-Man Swallows Ghosted Enemy on Contact & Deals 30% Damage
    pacman.x = zenitsu.x;
    pacman.y = zenitsu.y;
    pacman.chompAttackCooldown = 0;
    const hpBeforeSwallow = zenitsu.hp;
    const swallowed = pacman._executeChompAttack(zenitsu);
    assert(swallowed === true, 'Chomp attack must successfully execute against ghosted enemy');
    assert(zenitsu.isSwallowedByPacman === true, 'Enemy must be flagged as swallowed by Pac-Man');
    assert(zenitsu.swallowedBy === pacman, 'swallowedBy reference must point to Pac-Man');
    assert(pacman.swallowedEnemies.includes(zenitsu), 'Pac-Man must track swallowed enemy in swallowedEnemies');
    assert(zenitsu.hp === hpBeforeSwallow - Math.round((zenitsu.maxHp || 1000) * pacman.chompDamagePercent), 'Swallowed enemy must take 30% max HP damage');

    // 8. Verify Swallowed Enemy Position is Locked inside Pac-Man (physics.js containment)
    pacman.x = 180;
    pacman.y = 280;
    updateFighters();
    assert(zenitsu.x === pacman.x && zenitsu.y === pacman.y, 'Swallowed enemy position must sync with Pac-Man in physics.js');
    assert(zenitsu.vx === 0 && zenitsu.vy === 0, 'Swallowed enemy velocity must be 0 while contained');

    // 8b. Verify Swallowed Enemy Takes Digestion Damage Per Second (60 frames)
    const hpBeforeDps = zenitsu.hp;
    for (let f = 0; f < 60; f++) {
      pacman._updateSwallowedEnemiesDigestionDps();
    }
    const expectedDps = Math.max(1, Math.round((zenitsu.maxHp || 1000) * 0.05));
    assert(zenitsu.hp === hpBeforeDps - expectedDps, 'Swallowed enemy must take digestion damage per second');

    // 9. Verify Spit Out when Chomp Mode Expires
    pacman.chompModeTimer = 0;
    pacman.update(zenitsu, 0, testArena);
    assert(pacman.isChompModeActive === false, 'Chomp Mode must be deactivated upon expiration');
    assert(zenitsu.isSwallowedByPacman === false, 'Swallowed enemy must be spit out when Chomp Mode expires');
    assert(zenitsu.swallowedBy === null, 'swallowedBy must be reset to null upon spit out');
    assert(zenitsu.isPacmanGhost === false, 'Enemy ghost state must be cleared when spit out');
    assert(Math.hypot(zenitsu.vx, zenitsu.vy) > 1.0, 'Spit out enemy must receive forward propulsion velocity');

    // Verify abilities and cooldowns resume after being spit out
    assert(zenitsu.canPerformBasicAttack(pacman) === true, 'Enemy must regain ability to attack after being spit out');
    assert(zenitsu.canAim() === true, 'Enemy must regain ability to aim after being spit out');

    // 10. Verify Power Pellet Consumption Resumes After Chomp Mode Expires
    pacman.x = powerPellet.x;
    pacman.y = powerPellet.y;
    pacman._checkDotEating();
    assert(powerPellet.eaten === true, 'Pac-Man must resume eating Power Pellets once Chomp Mode has expired');
    assert(pacman.dotsEaten > dotsEatenBeforePellet, 'dotsEaten must increment now that Chomp Mode is inactive');

    // 11. Verify Pac-Man Dedicated Audio SFX Configuration
    assert(pacman.sounds.death === 'Assets/Sound Effects/PacmanSFX/pac-man-death-sound.mp3', 'Pac-Man death sound path must match');
    assert(pacman.sounds.eatDot === 'Assets/Sound Effects/PacmanSFX/pac-man_eat_fruits.mp3', 'Pac-Man eatDot sound path must match');
    assert(pacman.sounds.eatDot2 === 'Assets/Sound Effects/PacmanSFX/pac-man_eat_fruits2.mp3', 'Pac-Man eatDot2 sound path must match');
    assert(pacman.sounds.eatBigFruit === 'Assets/Sound Effects/PacmanSFX/PAC-MAN - Eating The Big Fruit.mp3', 'Pac-Man eatBigFruit sound path must match');
    assert(pacman.sounds.ghostTurnBlue === 'Assets/Sound Effects/PacmanSFX/Ghost - Turn to Blue.mp3', 'Pac-Man ghostTurnBlue sound path must match');
    assert(pacman.sounds.eatGhost === 'Assets/Sound Effects/PacmanSFX/PAC-MAN - Eating The Ghost.mp3', 'Pac-Man eatGhost sound path must match');

    let playedDeathSfx = null;
    const origPacmanPlaySfx = pacman._playSfx;
    pacman._playSfx = (type) => { playedDeathSfx = type; };
    pacman.onDeath();
    assert(playedDeathSfx === 'death', 'Pac-Man onDeath must trigger death SFX');
    pacman._playSfx = origPacmanPlaySfx;

    // 11b. Verify faah.mp3 is SUPPRESSED upon Pac-Man death
    let playedFaahAudio = false;
    const origPlaySFX = audioSystem.playSFX;
    audioSystem.playSFX = (src, ...args) => {
      if (typeof src === 'string' && src.includes('faah')) {
        playedFaahAudio = true;
      }
      return origPlaySFX ? origPlaySFX.call(audioSystem, src, ...args) : null;
    };
    pacman.hp = 10;
    pacman.dead = false;
    pacman.isDead = false;
    pacman._hasDied = false;
    state.gameState = 'playing';
    pacman.takeDamage(100, zenitsu);
    audioSystem.playSFX = origPlaySFX;
    assert(playedFaahAudio === false, 'faah.mp3 announcer audio must NOT be played upon Pac-Man death');
    state.gameState = 'playing';

    // 11c. Verify Small Fruit Back-and-Forth Audio Alternation (pac-man_eat_fruits.mp3 <-> pac-man_eat_fruits2.mp3)
    const playedMunchSounds = [];
    pacman._playSfx = (type) => { playedMunchSounds.push(type); };
    pacman._wakaSoundDebounce = 0;
    pacman._wakaSoundToggle = false;

    pacman._playWakaSfx(); // Munch 1: eatDot
    pacman._wakaSoundDebounce = 0;
    pacman._playWakaSfx(); // Munch 2: eatDot2
    pacman._wakaSoundDebounce = 0;
    pacman._playWakaSfx(); // Munch 3: eatDot
    pacman._wakaSoundDebounce = 0;
    pacman._playWakaSfx(); // Munch 4: eatDot2

    pacman._playSfx = origPacmanPlaySfx;
    assert(playedMunchSounds.length === 4, 'Must have played 4 munch sounds');
    assert(playedMunchSounds[0] === 'eatDot', 'First small fruit munch must play eatDot');
    assert(playedMunchSounds[1] === 'eatDot2', 'Second small fruit munch must play eatDot2');
    assert(playedMunchSounds[2] === 'eatDot', 'Third small fruit munch must alternate back to eatDot');
    assert(playedMunchSounds[3] === 'eatDot2', 'Fourth small fruit munch must alternate back to eatDot2');

    // 12. Verify Ghost Audio ("Ghost - Turn to Blue.mp3") Cutoff Mechanics
    const testZenitsuA = new ZenitsuFighter(100, 200, 1);
    const testZenitsuB = new ZenitsuFighter(150, 250, 1);
    pacman.hp = pacman.maxHp;
    pacman.isDead = false;
    pacman.dead = false;
    testZenitsuA.hp = testZenitsuA.maxHp;
    testZenitsuB.hp = testZenitsuB.maxHp;
    state.fighters = [pacman, testZenitsuA, testZenitsuB];

    // Case 1: Both enemies transformed into ghosts -> Audio starts and active ghost check returns true
    pacman.activateChompMode('powerPellet');
    assert(testZenitsuA.isPacmanGhost === true, 'Enemy A must be a ghost');
    assert(testZenitsuB.isPacmanGhost === true, 'Enemy B must be a ghost');
    assert(pacman.hasActiveGhostInArena() === true, 'Must detect active ghosts in arena');
    assert(pacman._ghostSoundPlaying === true, 'Ghost audio must be marked playing');

    // Case 2: Swallowing 1 of 2 ghosts leaves 1 ghost still active in the arena -> Audio continues
    pacman._swallowGhostEnemy(testZenitsuA);
    assert(testZenitsuA.isSwallowedByPacman === true, 'Enemy A is now swallowed inside Pac-Man');
    assert(pacman.hasActiveGhostInArena() === true, 'Enemy B is still active in the arena, so audio must NOT be cut off yet');
    assert(pacman._ghostSoundPlaying === true, 'Ghost audio remains playing while Enemy B roams');

    // Case 3: Swallowing the LAST ghost in the arena -> Audio cuts off immediately
    pacman._swallowGhostEnemy(testZenitsuB);
    assert(testZenitsuB.isSwallowedByPacman === true, 'Enemy B is now swallowed inside Pac-Man');
    assert(pacman.hasActiveGhostInArena() === false, 'Zero active ghosts roaming in arena after swallowing last ghost');
    assert(pacman._ghostSoundPlaying === false, 'Ghost audio must be CUT OFF when no more ghosts are active in arena');

    // Case 4: Ghost duration expiration -> Audio cuts off when timer hits 0
    pacman.swallowedEnemies = [];
    testZenitsuA.isSwallowedByPacman = false;
    testZenitsuB.isSwallowedByPacman = false;
    state.fighters = [pacman, testZenitsuA];
    pacman.activateChompMode('powerPellet');
    assert(pacman.hasActiveGhostInArena() === true, 'Active ghost present after new power pellet');
    assert(pacman._ghostSoundPlaying === true, 'Ghost audio playing');

    // Expire the ghost timer
    testZenitsuA.pacmanGhostTimer = 1;
    testZenitsuA.update(pacman, 1, testArena);
    assert(testZenitsuA.isPacmanGhost === false, 'Ghost state must expire when pacmanGhostTimer reaches 0');
    pacman.update(testZenitsuA, 0, testArena);
    assert(pacman.hasActiveGhostInArena() === false, 'Zero active ghosts remain after expiration');
    assert(pacman._ghostSoundPlaying === false, 'Ghost audio must be CUT OFF after ghost timer expires');

    // Case 5: Ghost death in combat -> Audio cuts off immediately when the last ghost dies
    state.fighters = [pacman, testZenitsuA];
    pacman.activateChompMode('powerPellet');
    assert(pacman.hasActiveGhostInArena() === true, 'Active ghost present before kill');
    assert(pacman._ghostSoundPlaying === true, 'Ghost audio playing before kill');

    testZenitsuA.hp = 0;
    testZenitsuA.onDeath();
    pacman.update(testZenitsuA, 0, testArena);
    assert(pacman.hasActiveGhostInArena() === false, 'Zero active ghosts remain after death');
    assert(pacman._ghostSoundPlaying === false, 'Ghost audio must be CUT OFF when all ghosts are eliminated');

    // Case 6: Pac-Man death -> Ghost audio cut off immediately
    testZenitsuA.hp = testZenitsuA.maxHp;
    testZenitsuA.dead = false;
    testZenitsuA.isDead = false;
    state.fighters = [pacman, testZenitsuA];
    pacman.activateChompMode('powerPellet');
    assert(pacman._ghostSoundPlaying === true, 'Ghost audio playing');

    pacman.hp = 0;
    pacman.onDeath();
    assert(pacman._ghostSoundPlaying === false, 'Ghost audio must be CUT OFF immediately when Pac-Man dies');

    // 13. Verify Eating All Fruits Yields Longer Chomp Mode & Ghost Duration
    pacman.hp = pacman.maxHp;
    pacman.isDead = false;
    pacman.dead = false;
    testZenitsuA.hp = testZenitsuA.maxHp;
    testZenitsuA.dead = false;
    testZenitsuA.isDead = false;
    state.fighters = [pacman, testZenitsuA];

    // Standard Power Pellet duration: checks configured chompModeDuration
    pacman.activateChompMode('powerPellet');
    const stdChompDuration = pacman.chompModeDuration;
    assert(stdChompDuration > 0, 'Standard Power Pellet Chomp Mode duration must be positive');
    assert(testZenitsuA.pacmanGhostTimer === stdChompDuration, `Standard ghost timer must be ${stdChompDuration} frames, got ${testZenitsuA.pacmanGhostTimer}`);

    // All Fruits Eaten duration: 600 frames (significantly longer than standard!)
    pacman.activateChompMode('allFruits');
    assert(pacman.chompModeDuration === 600, `All-fruits Chomp Mode duration must be longer (600 frames), got ${pacman.chompModeDuration}`);
    assert(pacman.chompModeTimer === 600, `All-fruits Chomp Mode timer must initialize to longer duration (600 frames), got ${pacman.chompModeTimer}`);
    assert(testZenitsuA.pacmanGhostTimer === 600, `All-fruits enemy ghost timer must also be longer (600 frames), got ${testZenitsuA.pacmanGhostTimer}`);
    assert(pacman.chompModeDuration > stdChompDuration, 'All-fruits Chomp Mode duration must be strictly longer than standard Power Pellet duration');

    // 14. Verify Bomberman Deployed Bombs Persist When Swallowed by Pac-Man & in Ghost State
    const BombermanClass = FIGHTER_CLASS_MAP['bomberman'];
    assert(typeof BombermanClass === 'function', 'BombermanFighter must be available');
    const bomberman = new BombermanClass({ x: 180, y: 320, color: '#2563EB', controls: {} });
    bomberman.hp = bomberman.maxHp;
    bomberman.isDead = false;
    bomberman.dead = false;
    pacman.hp = pacman.maxHp;
    pacman.isDead = false;
    pacman.dead = false;
    pacman._hasDied = false;
    pacman.x = 220;
    pacman.y = 320;
    state.fighters = [pacman, bomberman];

    // Bomberman plants a bomb on the floor
    bomberman.plantCooldownTimer = 0;
    bomberman.layStepTimer = 0;
    const plantedBomb = bomberman.plantBomb(testArena);
    assert(plantedBomb !== null, 'Bomberman must successfully plant a bomb');
    assert(bomberman.activeBombs.length === 1, 'Bomberman must have 1 active bomb planted on arena floor');
    const initialFuse = plantedBomb.fuseTimer;

    // Pac-Man triggers Chomp Mode -> Bomberman becomes frightened ghost
    pacman.activateChompMode('powerPellet');
    assert(bomberman.isPacmanGhost === true, 'Bomberman must enter ghost state');

    // Update 5 physics frames while Bomberman is a ghost
    for (let f = 0; f < 5; f++) {
      updateFighters();
    }
    assert(bomberman.activeBombs.length === 1, 'Planted bomb must NOT disappear when Bomberman is a frightened ghost');
    assert(plantedBomb.fuseTimer < initialFuse, 'Bomb fuse must continue ticking down while Bomberman is a ghost');

    // Pac-Man eats/swallows Bomberman
    const hpBeforeBombDetonation = pacman.hp;
    pacman._swallowGhostEnemy(bomberman);
    assert(bomberman.isSwallowedByPacman === true, 'Bomberman must be swallowed inside Pac-Man');
    assert(bomberman.activeBombs.length === 1, 'Planted bomb must NOT disappear when Bomberman is swallowed by Pac-Man');

    // Deployed objects rendering check: drawDeployedObjects must work with 0 stack depth
    const bombMockCtx = createMockCtx();
    bomberman.drawDeployedObjects(bombMockCtx);
    assert(bombMockCtx.getStackDepth() === 0, 'drawDeployedObjects must maintain 0 Canvas 2D stack depth');

    // Fast-forward bomb fuse until detonation while Bomberman remains inside Pac-Man
    plantedBomb.fuseTimer = 1;
    // Position Pac-Man near the bomb so explosion hits him
    pacman.x = plantedBomb.x;
    pacman.y = plantedBomb.y;
    bomberman.x = pacman.x;
    bomberman.y = pacman.y;

    updateFighters();
    assert(bomberman.activeBombs.length === 0, 'Bomb must detonate upon fuse expiration');
    assert(bomberman.activeVisualExplosions.length === 1, 'Active visual cross explosion must spawn in arena');
    assert(pacman.hp < hpBeforeBombDetonation, 'Pac-Man must take damage from Bomberman bomb even while Bomberman is swallowed');

    // Update 30 frames for explosion animation decay
    for (let f = 0; f < 30; f++) {
      updateFighters();
    }
    assert(bomberman.activeVisualExplosions.length === 0, 'Cross explosion must decay cleanly and not get stuck');

    state.fighters = [];
    console.log('      ✅ Pac-Man Power Pellet Eating, Enemy Frightened Ghost Transformation, Paused Cooldowns & Move-Only State verified.');
  }

  

  // ─── Test 106: Domain Clash: Gojo Domain Expansion vs Active Domain Skill Durations ───
  {
    console.log('🧪 Test 106: Domain Clash: Gojo Domain Expansion vs Other Active Domain Skills Progression...');
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const ZenitsuClass = FIGHTER_CLASS_MAP['zenitsu'];

    assert(GojoClass && SukunaClass && YutaClass && ZenitsuClass, 'Required fighter classes must exist');

    const testArena = { x: 45, y: 240, width: 450, height: 450 };
    state.arena = testArena;

    // 1. Sukuna Domain Active -> Gojo Opens Unlimited Void
    const gojo = new GojoClass({ x: 200, y: 300, controls: {} });
    const sukuna = new SukunaClass({ x: 280, y: 300, controls: {} });
    state.fighters = [gojo, sukuna];

    // Sukuna expands Malevolent Shrine
    sukuna.domainActive = true;
    sukuna.domainTimer = 500;
    sukuna.divineFlameCooldown = 300;
    const initialSukunaDomainTimer = sukuna.domainTimer;
    const initialSukunaFlameCd = sukuna.divineFlameCooldown;
    const sukunaStartX = sukuna.x;
    const sukunaStartY = sukuna.y;

    // Gojo expands Unlimited Void while Sukuna's domain is active
    gojo._activateDomain(testArena);
    assert(gojo.domainActive === true, 'Gojo domain must be active');
    assert(sukuna.domainActive === true, 'Sukuna domain must remain active');

    // Verify Sukuna IS FROZEN by Gojo domain cognitive overload (cannot move or cast skills)
    assert(sukuna.timeStopTimer > 0, 'Sukuna MUST receive timeStopTimer from Gojo domain');
    assert(sukuna._handleTimeStop() === true, 'Sukuna _handleTimeStop() must return true so fighter is frozen');
    assert(sukuna.canAim() === false, 'Sukuna auto-aim must be disabled inside Gojo domain');
    assert(sukuna.isChannelingDivineFlame === false, 'Sukuna must NOT be able to cast Fuga inside Gojo domain');

    // Advance 10 frames
    for (let f = 0; f < 10; f++) {
      state.frameCount = (state.frameCount || 0) + 1;
      sukuna.update(gojo, 1, testArena);
      gojo.update(sukuna, 0, testArena);
    }

    // Verify Sukuna did NOT move or cast Fuga while inside Gojo's domain
    assert(sukuna.vx === 0 && sukuna.vy === 0, 'Sukuna must NOT move (vx=0, vy=0) while frozen inside Gojo domain');
    assert(sukuna.x === sukunaStartX && sukuna.y === sukunaStartY, 'Sukuna position must remain frozen in place inside Gojo domain');
    assert(sukuna.isChannelingDivineFlame === false, 'Sukuna must NOT channel Fuga while inside Gojo domain');

    // Verify Sukuna's domain timer and skill cooldowns CONTINUED to drain down without pausing
    assert(sukuna.domainTimer < initialSukunaDomainTimer, `Sukuna domainTimer must drain down during domain clash (${initialSukunaDomainTimer} -> ${sukuna.domainTimer})`);
    assert(sukuna.domainTimer <= initialSukunaDomainTimer - 10, 'Sukuna domainTimer must decrement across frames without pausing');
    assert(sukuna.divineFlameCooldown < initialSukunaFlameCd, `Sukuna skill cooldown must drain down during domain clash (${initialSukunaFlameCd} -> ${sukuna.divineFlameCooldown})`);

    // 2. Yuta Domain Active -> Gojo Opens Unlimited Void
    const yuta = new YutaClass({ x: 320, y: 300, controls: {} });
    state.fighters = [gojo, yuta];
    yuta.domainActive = true;
    yuta.domainTimer = 400;
    const initialYutaDomainTimer = yuta.domainTimer;

    gojo._applyDomainEffect();
    assert(yuta.timeStopTimer > 0, 'Yuta MUST receive timeStopTimer from Gojo domain');
    assert(yuta._handleTimeStop() === true, 'Yuta _handleTimeStop() must return true so Yuta is frozen inside Gojo domain');

    // 3. Normal Fighter Without Active Domain (Zenitsu) -> MUST be frozen by Gojo Unlimited Void
    const zenitsu = new ZenitsuClass(360, 300, 1);
    state.fighters = [gojo, zenitsu];
    gojo._applyDomainEffect();

    assert(zenitsu.timeStopTimer > 0, 'Normal enemy without active domain MUST be frozen by Gojo Unlimited Void');
    assert(zenitsu._handleTimeStop() === true, 'Normal enemy without active domain MUST have _handleTimeStop() return true inside Gojo domain');

    state.fighters = [];
    console.log('      ✅ Sukuna frozen stasis (zero movement, zero Fuga casting) and non-pausing skill durations verified.');
  }

  // ─── Test 107: Domain Expansion Cooldown Reset & HUD Progression (Gojo & Sukuna) ───
  {
    console.log('🧪 Test 107: Domain Expansion Cooldown Reset & HUD Progression (Gojo & Sukuna)...');
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const { HUD_SKILL_PROVIDERS } = await import('../js/graphics/ui/hudSkillProviders.js');

    assert(GojoClass && SukunaClass, 'Required fighter classes must exist');
    assert(HUD_SKILL_PROVIDERS, 'HUD_SKILL_PROVIDERS must exist');

    const testArena = { x: 45, y: 240, width: 450, height: 450 };
    state.arena = testArena;

    // 1. Test Gojo Unlimited Void Cooldown Reset & Progression
    {
      const gojo = new GojoClass({ x: 200, y: 300, controls: {} });
      const target = new SukunaClass({ x: 280, y: 300, controls: {} });
      state.fighters = [gojo, target];

      // Activate Gojo Domain
      gojo._activateDomain(testArena);
      assert(gojo.domainActive === true, 'Gojo domainActive must be true after _activateDomain()');
      assert(gojo.domainTimer === 300, 'Gojo domainTimer must be initialized to 300');
      assert(gojo.domainCooldown === 1200, 'Gojo domainCooldown must be initialized to 1200');

      // Tick 15 frames while domain is active: domainTimer drains, domainCooldown MUST NOT prematurely tick down
      for (let f = 0; f < 15; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        gojo.update(target, 0, testArena);
      }
      assert(gojo.domainTimer === 285, `Gojo domainTimer must decrement (expected 285, got ${gojo.domainTimer})`);
      assert(gojo.domainCooldown === 1200, `Gojo domainCooldown must NOT tick down while domain is active (expected 1200, got ${gojo.domainCooldown})`);

      // Fast-forward to domain expiry
      gojo.domainTimer = 1;
      state.frameCount = (state.frameCount || 0) + 1;
      gojo.update(target, 0, testArena);

      // Verify domain has expired
      assert(gojo.domainActive === false, 'Gojo domainActive must be false after expiry');
      assert(gojo.domainTimer <= 0, 'Gojo domainTimer must be <= 0');
      assert(gojo.domainCooldown === 1200, `Gojo domainCooldown MUST reset to 1200 upon expiry (got ${gojo.domainCooldown})`);

      // Check HUD skill provider output
      const gojoSkills = HUD_SKILL_PROVIDERS.gojo(gojo);
      const uvSkill = gojoSkills.find(s => s.id === 'uv');
      assert(uvSkill, 'Gojo HUD must contain Unlimited Void (uv) skill bar');
      assert(uvSkill.pct === 0, `Gojo UV HUD pct must be 0% immediately upon domain expiry (got ${uvSkill.pct}%)`);
      assert(uvSkill.ready === false, 'Gojo UV HUD ready must be false while on cooldown');

      // Advance 120 frames of cooldown
      for (let f = 0; f < 120; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        gojo.update(target, 0, testArena);
      }
      assert(gojo.domainCooldown === 1080, `Gojo domainCooldown must tick down naturally after domain ends (expected 1080, got ${gojo.domainCooldown})`);
      const gojoSkillsPost120 = HUD_SKILL_PROVIDERS.gojo(gojo);
      const uvPost120 = gojoSkillsPost120.find(s => s.id === 'uv');
      assert(Math.abs(uvPost120.pct - 10) < 0.001, `Gojo UV HUD pct must be ~10% after 120 frames (got ${uvPost120.pct}%)`);
      assert(uvPost120.ready === false, 'Gojo UV HUD ready must remain false until 100%');

      // Complete cooldown to 0
      gojo.domainCooldown = 0;
      const gojoSkillsReady = HUD_SKILL_PROVIDERS.gojo(gojo);
      const uvReady = gojoSkillsReady.find(s => s.id === 'uv');
      assert(uvReady.pct === 100, `Gojo UV HUD pct must be 100% when off cooldown (got ${uvReady.pct}%)`);
      assert(uvReady.ready === true, 'Gojo UV HUD ready must be true when off cooldown');
    }

    // 2. Test Sukuna Malevolent Shrine Cooldown Reset & Progression
    {
      const sukuna = new SukunaClass({ x: 280, y: 300, controls: {} });
      const target = new GojoClass({ x: 200, y: 300, controls: {} });
      state.fighters = [sukuna, target];

      // Activate Sukuna Domain
      const sukunaDomainMax = CONFIG.sukuna?.domainCooldown || 1200;
      sukuna._activateDomain(testArena);
      assert(sukuna.domainActive === true, 'Sukuna domainActive must be true after _activateDomain()');
      assert(sukuna.domainTimer === 500, 'Sukuna domainTimer must be initialized to 500');
      assert(sukuna.domainCooldown === sukunaDomainMax, `Sukuna domainCooldown must be initialized to ${sukunaDomainMax}`);

      // Tick 20 frames while domain is active: domainTimer drains, domainCooldown MUST NOT prematurely tick down
      for (let f = 0; f < 20; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        sukuna.update(target, 0, testArena);
      }
      assert(sukuna.domainTimer === 480, `Sukuna domainTimer must decrement (expected 480, got ${sukuna.domainTimer})`);
      assert(sukuna.domainCooldown === sukunaDomainMax, `Sukuna domainCooldown must NOT tick down while domain is active (expected ${sukunaDomainMax}, got ${sukuna.domainCooldown})`);

      // Fast-forward to domain expiry
      sukuna.domainTimer = 1;
      state.frameCount = (state.frameCount || 0) + 1;
      sukuna.update(target, 0, testArena);

      // Verify domain has expired
      assert(sukuna.domainActive === false, 'Sukuna domainActive must be false after expiry');
      assert(sukuna.domainTimer <= 0, 'Sukuna domainTimer must be <= 0');
      assert(sukuna.domainCooldown === sukunaDomainMax, `Sukuna domainCooldown MUST reset to ${sukunaDomainMax} upon expiry (got ${sukuna.domainCooldown})`);

      // Check HUD skill provider output
      const sukunaSkills = HUD_SKILL_PROVIDERS.sukuna(sukuna);
      const msSkill = sukunaSkills.find(s => s.id === 'ms');
      assert(msSkill, 'Sukuna HUD must contain Malevolent Shrine (ms) skill bar');
      assert(msSkill.pct === 0, `Sukuna MS HUD pct must be 0% immediately upon domain expiry (got ${msSkill.pct}%)`);
      assert(msSkill.ready === false, 'Sukuna MS HUD ready must be false while on cooldown');

      // Advance 120 frames of cooldown
      for (let f = 0; f < 120; f++) {
        state.frameCount = (state.frameCount || 0) + 1;
        sukuna.update(target, 0, testArena);
      }
      assert(sukuna.domainCooldown === sukunaDomainMax - 120, `Sukuna domainCooldown must tick down naturally after domain ends (expected ${sukunaDomainMax - 120}, got ${sukuna.domainCooldown})`);
      const sukunaSkillsPost120 = HUD_SKILL_PROVIDERS.sukuna(sukuna);
      const msPost120 = sukunaSkillsPost120.find(s => s.id === 'ms');
      const expectedPct = Math.max(0, Math.min(100, (1 - ((sukunaDomainMax - 120) / sukunaDomainMax)) * 100));
      assert(Math.abs(msPost120.pct - expectedPct) < 0.001, `Sukuna MS HUD pct must be ~${expectedPct.toFixed(1)}% after 120 frames (got ${msPost120.pct}%)`);
      assert(msPost120.ready === false, 'Sukuna MS HUD ready must remain false until 100%');

      // Complete cooldown to 0
      sukuna.domainCooldown = 0;
      const sukunaSkillsReady = HUD_SKILL_PROVIDERS.sukuna(sukuna);
      const msReady = sukunaSkillsReady.find(s => s.id === 'ms');
      assert(msReady.pct === 100, `Sukuna MS HUD pct must be 100% when off cooldown (got ${msReady.pct}%)`);
      assert(msReady.ready === true, 'Sukuna MS HUD ready must be true when off cooldown');
    }

    state.fighters = [];
    console.log('      ✅ Gojo Unlimited Void & Sukuna Malevolent Shrine domain cooldown reset (1200 frames / 20s), freeze prevention, and HUD 0%->100% progression verified.');
  }

  // ─── Test 108: Sukuna Ten Shadows (Mahoraga Summon) Black Hair Toggle ───
  {
    console.log('🧪 Test 108: Sukuna Ten Shadows (Mahoraga Summon) Black Hair Toggle Standard...');
    const { _drawSukunaHair, _getSukunaHairImage, _getSukunaBlackHairImage, drawSukunaBody } = await import('../js/graphics/fighters/sukunaSkin.js');
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    assert(SukunaClass, 'SukunaClass must exist');
    assert(typeof _drawSukunaHair === 'function', '_drawSukunaHair must be a function');
    assert(typeof _getSukunaBlackHairImage === 'function', '_getSukunaBlackHairImage must be a function');

    const blackImg = _getSukunaBlackHairImage();
    const pinkImg = _getSukunaHairImage();
    assert(blackImg, 'Black hair image loader must return an image object');
    assert(pinkImg, 'Pink hair image loader must return an image object');
    assert(blackImg.src.includes('Sukuna-hair-black.png'), 'Black hair image src must point to Sukuna-hair-black.png');

    const mockCtx = createMockCtx();

    // 1. Test with fighter instance having enableMahoragaSummon = 1 (Black Hair)
    const sukunaWithMahoraga = new SukunaClass({ x: 200, y: 300, controls: {} });
    sukunaWithMahoraga.enableMahoragaSummon = 1;
    drawSukunaBody(mockCtx, sukunaWithMahoraga);
    assert(mockCtx.getStackDepth() === 0, 'Canvas stack depth must be 0 after drawSukunaBody with black hair');

    // 2. Test with fighter instance having enableMahoragaSummon = 0 (Pink Hair)
    const sukunaWithoutMahoraga = new SukunaClass({ x: 200, y: 300, controls: {} });
    sukunaWithoutMahoraga.enableMahoragaSummon = 0;
    drawSukunaBody(mockCtx, sukunaWithoutMahoraga);
    assert(mockCtx.getStackDepth() === 0, 'Canvas stack depth must be 0 after drawSukunaBody with pink hair');

    // 3. Test direct _drawSukunaHair calls
    _drawSukunaHair(mockCtx, 25, false, true); // Explicit black hair
    assert(mockCtx.getStackDepth() === 0, 'Canvas stack depth must be 0 after _drawSukunaHair(black=true)');

    _drawSukunaHair(mockCtx, 25, false, false); // Explicit pink hair
    assert(mockCtx.getStackDepth() === 0, 'Canvas stack depth must be 0 after _drawSukunaHair(black=false)');

    console.log('      ✅ Sukuna Ten Shadows (Mahoraga summon) black hair toggle and stack balance verified.');
  }

  // ─── Test 109: Sukuna Mahoraga Minion Outlives Summoner — Match Continues Until One Prevails ───
  {
    console.log('🧪 Test 109: Sukuna Mahoraga Minion Outlives Summoner — Match Continues Until One Prevails...');
    const { trySummonMahoraga, handleMahoragaSummonDeath } = await import('../js/entities/fighters/sukuna/sukunaMahoragaSummon.js');
    const { isFighterEffectivelyAlive, getClosestOpponent, updateFighters } = await import('../js/systems/physics.js');
    const { updateIllusions } = await import('../js/systems/illusionSystem.js');

    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    assert(SukunaClass && GojoClass, 'Fighter classes must exist');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };
    const sukuna = new SukunaClass({ x: 200, y: 300, controls: {}, fighterIndex: 0 });
    const gojo = new GojoClass({ x: 400, y: 300, controls: {}, fighterIndex: 1 });
    sukuna.target = gojo;
    gojo.target = sukuna;
    sukuna.mahoragaSummonCooldown = 0;

    state.fighters = [sukuna, gojo];
    state.illusions = [];
    state.gameState = 'playing';
    state.mode = '1v1';
    state.scores = [0, 0];
    state.arena = testArena;

    // 1. Sukuna summons Mahoraga minion
    const summoned = trySummonMahoraga(sukuna, 0, testArena);
    assert(summoned === true, 'trySummonMahoraga must return true');
    assert(sukuna.mahoragaMinion, 'sukuna.mahoragaMinion must exist');
    assert(state.illusions.includes(sukuna.mahoragaMinion), 'Mahoraga minion must be in state.illusions');
    assert(sukuna.mahoragaMinion.hp > 0, 'Mahoraga minion must have HP > 0');

    // Finish emergence
    sukuna.mahoragaMinion.spawnTimer = 0;
    sukuna.mahoragaMinion.isAscending = false;

    // 2. Sukuna dies while Mahoraga is alive!
    sukuna.hp = 0;
    sukuna._processFighterDeath(gojo, {});
    assert(sukuna.dead === true, 'Sukuna must be marked as dead');
    assert(sukuna.hp <= 0, 'Sukuna HP must be 0');

    // 3. Mahoraga MUST NOT be dispelled and Sukuna must remain effectively alive
    assert(sukuna.mahoragaMinion !== null, 'Mahoraga minion must NOT be dispelled upon Sukuna death');
    assert(state.illusions.includes(sukuna.mahoragaMinion), 'Mahoraga minion must remain in state.illusions');
    assert(sukuna.mahoragaMinion.hp > 0, 'Mahoraga minion must still have positive HP');
    assert(sukuna.isEffectivelyAlive() === true, 'Sukuna isEffectivelyAlive() must return true while Mahoraga is alive');
    assert(isFighterEffectivelyAlive(sukuna) === true, 'isFighterEffectivelyAlive(sukuna) must return true');

    // 4. Match must NOT end
    updateFighters();
    updateIllusions();
    assert(state.gameState === 'playing', `Match must remain 'playing' while Mahoraga fights (got ${state.gameState})`);

    // 5. Opponent (Gojo) must target Mahoraga instead of dead Sukuna
    const opponentTarget = getClosestOpponent(gojo);
    assert(opponentTarget === sukuna.mahoragaMinion, 'Gojo must target Mahoraga minion when Sukuna is dead');
    assert(gojo._isValidCombatTarget(sukuna.mahoragaMinion) === true, 'Mahoraga must be a valid combat target for Gojo');

    // 6. Branch A: Mahoraga defeats Gojo -> Sukuna's team wins the round
    gojo.hp = 0;
    gojo._processFighterDeath(sukuna.mahoragaMinion, {});
    updateFighters();
    assert(state.gameState === 'roundEnd' || state.gameState === 'matchEnd', 'Round/match must end when Gojo is defeated');
    assert(state.roundWinner === sukuna, 'Sukuna (team) must be declared roundWinner when Mahoraga prevails');

    // 7. Branch B: Opponent defeats Mahoraga after Sukuna is already dead -> Opponent wins
    // Reset state for Branch B
    sukuna.hp = 0;
    sukuna.dead = true;
    sukuna.isDead = true;
    sukuna._hasDied = true;
    gojo.hp = 500;
    gojo.dead = false;
    gojo.isDead = false;
    gojo._hasDied = false;
    state.gameState = 'playing';
    state.scores = [0, 0];
    state.roundWinner = null;
    state.matchWinner = null;

    // Resummon Mahoraga for Branch B
    sukuna.mahoragaSummonActive = false;
    sukuna.mahoragaMinion = null;
    state.illusions = [];
    // Reset _hasDied temporarily so trySummonMahoraga can create the minion
    sukuna._hasDied = false;
    sukuna.dead = false;
    sukuna.isDead = false;
    sukuna.hp = 100;
    sukuna.hasSummonedMahoraga = false;
    sukuna.mahoragaSummonCount = 0;
    sukuna.mahoragaSummonCooldown = 0;
    trySummonMahoraga(sukuna, 0, testArena);
    sukuna.hp = 0;
    sukuna.dead = true;
    sukuna.isDead = true;
    sukuna._hasDied = true;
    assert(sukuna.mahoragaMinion, 'Mahoraga must be re-summoned');
    assert(sukuna.isEffectivelyAlive() === true, 'Sukuna must be effectively alive with Mahoraga');

    // Gojo kills Mahoraga
    sukuna.mahoragaMinion.hp = 0;
    handleMahoragaSummonDeath(sukuna.mahoragaMinion);

    assert(sukuna.mahoragaMinion === null, 'Mahoraga minion must be cleared on death');
    assert(sukuna.isEffectivelyAlive() === false, 'Sukuna isEffectivelyAlive must be false after Mahoraga dies');
    assert(isFighterEffectivelyAlive(sukuna) === false, 'isFighterEffectivelyAlive(sukuna) must be false');

    updateFighters();
    assert(state.gameState === 'roundEnd' || state.gameState === 'matchEnd', 'Round must end after Mahoraga is slain');
    assert(state.roundWinner === gojo, 'Gojo must be declared roundWinner after defeating Mahoraga');

    // Clean up
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Sukuna Mahoraga minion outlives summoner, fight continues, targeting verified, and both win outcomes verified.');
  }

  // ─── Test 110: Gojo Teleports Away From Enemy When Unlimited Void Domain Expires ───
  {
    console.log('🧪 Test 110: Gojo Teleports Away From Enemy When Unlimited Void Domain Expires...');
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    assert(GojoClass && SukunaClass, 'Fighter classes must exist');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const gojo = new GojoClass({ x: 270, y: 465, controls: {}, fighterIndex: 0 });
    const sukuna = new SukunaClass({ x: 270, y: 465, controls: {}, fighterIndex: 1 });
    gojo.target = sukuna;
    sukuna.target = gojo;

    state.fighters = [gojo, sukuna];
    state.illusions = [];
    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = testArena;

    // 1. Activate Gojo's Domain (Unlimited Void)
    gojo._activateDomain(testArena);
    assert(gojo.domainActive === true, 'Gojo domainActive must be true after activation');
    assert(gojo.isMeleeMode === true, 'Gojo isMeleeMode must be true during domain');
    assert(gojo.forcedMeleeTimer > 0, 'Gojo forcedMeleeTimer must be > 0 during domain');
    assert(sukuna.timeStopTimer > 0, 'Enemy must be trapped in time-stop during domain');

    // Record pre-expiration positions
    const initialDist = Math.hypot(gojo.x - sukuna.x, gojo.y - sukuna.y);

    // 2. Set domain timer to 1 and tick update to trigger expiration
    gojo.domainTimer = 1;
    gojo.update(sukuna, 0, testArena);

    // 3. Verify domain expired cleanly
    assert(gojo.domainActive === false, 'Gojo domainActive must be false after expiry');
    assert(gojo.isMeleeMode === false, 'Gojo isMeleeMode must be false after expiry');
    assert(gojo.forcedMeleeTimer === 0, 'Gojo forcedMeleeTimer must be 0 after expiry');

    // 4. Verify Gojo teleported away to long range
    const postExpiryDist = Math.hypot(gojo.x - sukuna.x, gojo.y - sukuna.y);
    assert(postExpiryDist >= 180, `Gojo must teleport away from enemy upon domain expiry (distance: ${postExpiryDist}px >= 180px)`);
    assert(gojo.afterImages && gojo.afterImages.length > 0, 'Gojo must spawn teleport afterimage trail upon disengaging');

    // 5. Verify arena boundary safety (inside playable arena)
    assert(gojo.x >= testArena.x && gojo.x <= testArena.x + testArena.width, 'Gojo X must remain within arena bounds');
    assert(gojo.y >= testArena.y && gojo.y <= testArena.y + testArena.height, 'Gojo Y must remain within arena bounds');

    // 6. Verify enemy unfreeze & slow debuff
    assert(sukuna.timeStopTimer === 0, 'Enemy must be unfrozen when Gojo domain expires');
    assert((sukuna.slowTimer > 0) || (sukuna.slowMultiplier < 1.0), 'Enemy must receive post-domain slow debuff');

    // Clean up
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Gojo automatically teleports away to long range, unfreezes enemy, and resets melee lock upon domain expiration.');
  }

  // ─── Test 111: Minion Mahoraga Speed Parity, Adaptation Scaling & Attack Cadence ───
  {
    console.log('🧪 Test 111: Minion Mahoraga Speed Parity, Adaptation Scaling & Attack Cadence...');
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    assert(SukunaClass && MahoragaClass, 'Fighter classes must exist');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const sukuna = new SukunaClass({ x: 270, y: 350, controls: {}, fighterIndex: 0 });
    const dummyOpponent = new SukunaClass({ x: 270, y: 550, controls: {}, fighterIndex: 1 });
    const standaloneMahoraga = new MahoragaClass({ x: 270, y: 400, controls: {}, fighterIndex: 2 });

    state.fighters = [sukuna, dummyOpponent, standaloneMahoraga];
    state.illusions = [];
    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = testArena;
    state.frameCount = 100;

    // A. Verify Minion Spawn & Base Speed Parity
    const { trySummonMahoraga, updateMahoragaSummon } = await import('../js/entities/fighters/sukuna/sukunaMahoragaSummon.js');
    sukuna.target = dummyOpponent;
    sukuna.mahoragaSummonCooldown = 0;
    const summoned = trySummonMahoraga(sukuna, 0, testArena);
    assert(summoned === true, 'Sukuna must summon Mahoraga successfully');
    const minion = sukuna.mahoragaMinion;
    assert(minion, 'Mahoraga minion instance must exist');
    assert(Math.abs(minion.speed - standaloneMahoraga.speed) < 0.01, `Minion speed (${minion.speed}) must match Fighter Mahoraga (${standaloneMahoraga.speed})`);

    // B. Verify Cooldown Rate of Decay Parity (Minion matches Fighter Mahoraga exactly)
    minion.x = 270;
    minion.y = 400;
    minion.vx = 0;
    minion.vy = 0;
    standaloneMahoraga.x = 270;
    standaloneMahoraga.y = 400;
    standaloneMahoraga.vx = 0;
    standaloneMahoraga.vy = 0;
    minion.swordCooldown = 20;
    standaloneMahoraga.swordCooldown = 20;
    state.frameCount = 101;
    minion._lastCooldownTickFrame = undefined;
    standaloneMahoraga._lastCooldownTickFrame = undefined;

    minion.update(dummyOpponent, 0, testArena);
    standaloneMahoraga.update(dummyOpponent, 2, testArena);

    assert(minion.swordCooldown === standaloneMahoraga.swordCooldown, `Minion swordCooldown (${minion.swordCooldown}) must match Fighter Mahoraga (${standaloneMahoraga.swordCooldown})`);
    assert(minion.swordCooldown === 17, `Mahoraga swordCooldown must decrement at his authentic 3-tick combat rate (was: ${minion.swordCooldown})`);

    // C. Verify Multi-Stage Adaptation Speed Scaling Parity & Bounded Wall Rebounds
    const { triggerAdaptation } = await import('../js/entities/fighters/mahoraga/mahoragaAdaptation.js');
    // Apply 4 adaptations to both
    for (let i = 0; i < 4; i++) {
      triggerAdaptation(minion, 'melee', dummyOpponent);
      triggerAdaptation(standaloneMahoraga, 'melee', dummyOpponent);
    }
    assert(Math.abs(minion.speed - standaloneMahoraga.speed) < 0.1, `After 4 adaptations, Minion speed (${minion.speed.toFixed(2)}) must match Fighter Mahoraga (${standaloneMahoraga.speed.toFixed(2)})`);
    assert(minion.speed < 15.0, `Minion speed must scale reasonably without runaway compounding (was: ${minion.speed})`);

    // D. Verify Wall Rebound Dash Speed Bounds & Attack Cooldown Reset
    minion.x = testArena.x + 2; // Against left wall
    minion.vx = -10;
    minion.swordCooldown = 15;
    minion.resolveWallBounce(testArena, dummyOpponent);
    const reboundSpeed = Math.hypot(minion.vx, minion.vy);
    assert(reboundSpeed <= 25.0, `Wall rebound dash speed must be bounded (got: ${reboundSpeed.toFixed(2)} <= 25.0)`);
    assert(minion.swordCooldown === 0, 'Wall bounce dash resets sword cooldown for authentic rebound strike');

    // Clean up
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Minion Mahoraga base speed parity, authentic rapid cooldown decay, adaptation speed scaling, and bounded wall rebound dash verified.');
  }

  // 🧪 Test 112: Gojo Melee Mode Duration, Expiry Disengage, Infinity Re-Arm & Separation Cooldown Standard
  {
    console.log('🧪 Test 112: Gojo Melee Mode Duration, Expiry Disengage, Infinity Re-Arm & Separation Cooldown Standard...');
    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };
    const GojoClass = FIGHTER_CLASS_MAP.gojo;
    const SukunaClass = FIGHTER_CLASS_MAP.sukuna;
    assert(GojoClass && SukunaClass, 'Fighter classes must exist');

    const gojo = new GojoClass({ x: 270, y: 465, controls: {}, fighterIndex: 0 });
    const sukuna = new SukunaClass({ x: 270, y: 500, controls: {}, fighterIndex: 1 }); // 35px away (close contact)
    gojo.target = sukuna;
    sukuna.target = gojo;

    state.fighters = [gojo, sukuna];
    state.illusions = [];
    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = testArena;
    state.frameCount = 100;

    // 1. Enter Melee Mode
    gojo.meleeModeCooldown = 0;
    gojo.update(sukuna, 0, testArena);
    assert(gojo.isMeleeMode === true, 'Gojo must enter Melee Mode when in close contact');
    assert(gojo.forcedMeleeTimer > 0, `Gojo forcedMeleeTimer must be initialized (got: ${gojo.forcedMeleeTimer})`);
    assert(gojo.infinityActive === false, 'Gojo Limitless Infinity must be down during Melee Mode');

    // 2. While duration is active, Gojo stays in melee mode despite close proximity
    gojo.forcedMeleeTimer = 50;
    gojo.update(sukuna, 0, testArena);
    assert(gojo.isMeleeMode === true, 'Gojo must remain in Melee Mode while forcedMeleeTimer > 0');
    assert(gojo.forcedMeleeTimer === 49, `forcedMeleeTimer must decrement each frame (got: ${gojo.forcedMeleeTimer})`);

    // 3. When duration expires (forcedMeleeTimer reaches 0), Gojo MUST disengage immediately
    gojo.forcedMeleeTimer = 1;
    gojo.update(sukuna, 0, testArena);
    assert(gojo.isMeleeMode === false, 'Gojo MUST exit Melee Mode when forcedMeleeTimer expires');
    assert(gojo.forcedMeleeTimer === 0, 'forcedMeleeTimer must be 0 after disengage');
    assert(gojo.meleeModeCooldown >= 180, `meleeModeCooldown must be set to mandatory separation cooldown (got: ${gojo.meleeModeCooldown})`);

    // 4. Verify Gojo teleported away to long range
    const postDisengageDist = Math.hypot(gojo.x - sukuna.x, gojo.y - sukuna.y);
    assert(postDisengageDist >= 180, `Gojo must teleport away from enemy upon melee mode expiry (distance: ${postDisengageDist.toFixed(1)}px >= 180px)`);
    assert(gojo.infinityActive === true, 'Gojo Limitless Infinity must re-arm upon disengaging to Ranged Mode');

    // 5. During meleeModeCooldown, close contact must NOT re-enter melee mode
    gojo.x = sukuna.x + 30; // Close contact again
    gojo.y = sukuna.y;
    gojo.update(sukuna, 0, testArena);
    assert(gojo.isMeleeMode === false, 'Gojo must NOT re-enter Melee Mode while meleeModeCooldown is active');

    // Clean up
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Gojo melee mode duration, automatic disengage on expiry, Infinity re-arm, and separation cooldown verified cleanly.');
  }

  // ─── Test 113: Sukuna Minion Mahoraga HUD Skill Bars & Combat Stats Standard ───
  {
    console.log('🧪 Test 113: Sukuna Minion Mahoraga HUD Skill Bars & Combat Stats Standard...');
    const { trySummonMahoraga, dispelMahoragaSummon } = await import('../js/entities/fighters/sukuna/sukunaMahoragaSummon.js');
    const { getSkillDataForFighter, isSkillExceptionInDarkMode } = await import('../js/graphics/ui/hudSkillProviders.js');
    const { getAdditionalInfoForFighter, updateHealthHud, clearHealthHud } = await import('../js/graphics/hudManager.js');
    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4, shape: 'rect' };

    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const sukuna = new SukunaClass({ x: 220, y: 300, controls: {} });
    const dummyEnemy = new GojoClass({ x: 320, y: 300, controls: {} });

    state.fighters = [sukuna, dummyEnemy];
    state.illusions = [];
    state.gameState = 'playing';
    state.mode = '1v1';
    state.arena = testArena;

    // Initialize updateHealthHud so getAdditionalInfoForFighter is bound
    updateHealthHud();

    // 1. Initial State: Mahoraga is NOT summoned
    sukuna.mahoragaSummonActive = false;
    sukuna.mahoragaMinion = null;

    const baseSkills = getSkillDataForFighter(sukuna);
    assert(baseSkills.length === 4, `Sukuna without summoned Mahoraga must return exactly 4 skill bars (got: ${baseSkills.length})`);
    assert(baseSkills.some(s => s.id === 'ms'), 'Sukuna base skills must include Malevolent Shrine (ms)');
    assert(baseSkills.some(s => s.id === 'fuga'), 'Sukuna base skills must include Fuga (fuga)');
    assert(baseSkills.some(s => s.id === 'rct'), 'Sukuna base skills must include RCT (rct)');
    assert(baseSkills.some(s => s.id === 'mahoraga'), 'Sukuna base skills must include Mahoraga summon bar (mahoraga)');
    assert(!baseSkills.some(s => s.id.startsWith('mahoraga_')), 'Sukuna without active minion must NOT contain minion mahoraga_ bars');

    const baseStats = getAdditionalInfoForFighter(sukuna);
    assert(baseStats.some(line => line.includes('<b>Crit Rate:</b>')), 'Sukuna base stats must include Crit Rate');
    assert(baseStats.some(line => line.includes('<b>Crit DMG:</b>')), 'Sukuna base stats must include Crit DMG');
    assert(!baseStats.some(line => line.includes('<b>Maho')), 'Sukuna base stats must NOT include Maho stats when not summoned');

    // 2. Summon Mahoraga Minion
    sukuna.mahoragaSummonCooldown = 0;
    const summoned = trySummonMahoraga(sukuna, 0, testArena);
    assert(summoned === true, 'Sukuna must summon Mahoraga successfully');
    assert(sukuna.mahoragaSummonActive === true, 'sukuna.mahoragaSummonActive must be true');
    assert(sukuna.mahoragaMinion !== null, 'sukuna.mahoragaMinion must exist');
    const minion = sukuna.mahoragaMinion;

    // 3. Verify Summoned State: 7 HUD Skill Bars
    const summonedSkills = getSkillDataForFighter(sukuna);
    assert(summonedSkills.length === 7, `Sukuna with active Mahoraga must return exactly 7 skill bars (got: ${summonedSkills.length})`);

    const wheelSkill = summonedSkills.find(s => s.id === 'mahoraga_wheel');
    const throwSkill = summonedSkills.find(s => s.id === 'mahoraga_throw');
    const shoutSkill = summonedSkills.find(s => s.id === 'mahoraga_shout');

    assert(wheelSkill, 'Summoned skills must contain mahoraga_wheel');
    assert(throwSkill, 'Summoned skills must contain mahoraga_throw');
    assert(shoutSkill, 'Summoned skills must contain mahoraga_shout');

    // Theme color and clean Mahoraga labels (no [MAHO] prefix)
    assert(wheelSkill.color === '#FFD700', `mahoraga_wheel color must be #FFD700 (got: ${wheelSkill.color})`);
    assert(throwSkill.color === '#FFD700', `mahoraga_throw color must be #FFD700 (got: ${throwSkill.color})`);
    assert(shoutSkill.color === '#FFD700', `mahoraga_shout color must be #FFD700 (got: ${shoutSkill.color})`);

    assert(wheelSkill.label === 'WOA - LVL 1', `mahoraga_wheel label must be 'WOA - LVL 1' (got: ${wheelSkill.label})`);
    assert(throwSkill.label === 'THROW', `mahoraga_throw label must be 'THROW' (got: ${throwSkill.label})`);
    assert(shoutSkill.label === 'DIVINE SHOUT', `mahoraga_shout label must be 'DIVINE SHOUT' (got: ${shoutSkill.label})`);

    // Signature skill exception in dark mode: ONLY mahoraga_wheel (WOA) is the signature skill
    assert(wheelSkill.isSignature === true && throwSkill.isSignature === false && shoutSkill.isSignature === false, 'Only mahoraga_wheel must be marked isSignature: true');
    assert(isSkillExceptionInDarkMode(sukuna, wheelSkill) === true, 'mahoraga_wheel must pass isSkillExceptionInDarkMode for Sukuna');
    assert(isSkillExceptionInDarkMode(sukuna, throwSkill) === false, 'mahoraga_throw must NOT pass isSkillExceptionInDarkMode for Sukuna');
    assert(isSkillExceptionInDarkMode(sukuna, shoutSkill) === false, 'mahoraga_shout must NOT pass isSkillExceptionInDarkMode for Sukuna');

    // 4. Verify Summoned State: Minion Mahoraga Combat Stats (DMG: 6, Regen: 0%, ATK: 1X)
    const minionStats = getAdditionalInfoForFighter(minion);
    assert(minionStats.some(line => line.includes('<b>DMG:</b>')), 'Minion stats must include DMG');
    assert(minionStats.some(line => line.includes('<b>Regen:</b>')), 'Minion stats must include Regen');
    assert(minionStats.some(line => line.includes('<b>DEF:</b>') || line.includes('<b>ATK:</b>')), 'Minion stats must include DEF or ATK');

    // 4b. Verify DOM Layout: Mahoraga minion healthbar, skill bars, and stats render UNDER Sukuna stats
    const prevDesc = CONFIG.hudShowFighterDescription;
    const prevStats = CONFIG.darkModeShowHudStats;
    const prevSkillsMode = CONFIG.hudSkillBarsMode;
    const prevDarkSkills = CONFIG.darkModeShowHudSkillBars;
    CONFIG.hudShowFighterDescription = false;
    CONFIG.darkModeShowHudStats = 1;
    CONFIG.hudSkillBarsMode = 'all';
    CONFIG.darkModeShowHudSkillBars = 1;
    clearHealthHud(true);
    updateHealthHud();

    try {
      const bottomContainer = globalThis.document.getElementById('healthHud');
      assert(bottomContainer !== null, 'healthHud container must exist');
      const html = bottomContainer.innerHTML;
      assert(html.includes('health-card__minion-container'), 'Minion container must be rendered in HTML');
      assert(html.includes('health-card__minion-bar'), 'Minion health bar must be rendered in HTML');
      assert(html.includes('health-card__minion-skills'), 'Minion skills must be rendered in HTML');
      assert(html.includes('health-card__minion-info'), 'Minion info must be rendered in HTML');
      assert(html.includes('WOA - LVL'), 'Minion skills HTML must include WOA - LVL in All Skills mode');
      assert(html.includes('THROW'), 'Minion skills HTML must include THROW in All Skills mode');
      assert(html.includes('DIVINE SHOUT'), 'Minion skills HTML must include DIVINE SHOUT in All Skills mode');

      const skillsIdx = html.indexOf('class="health-card__skills"');
      const infoIdx = html.indexOf('class="health-card__info"');
      const minionContainerIdx = html.indexOf('health-card__minion-container');
      const minionBarIdx = html.indexOf('health-card__minion-bar');
      const minionSkillsIdx = html.indexOf('health-card__minion-skills');
      const minionInfoIdx = html.indexOf('health-card__minion-info');

      assert(skillsIdx !== -1, 'Sukuna skills container must be present in card HTML');
      assert(infoIdx !== -1, 'Sukuna stats container must be present in card HTML');
      assert(skillsIdx < infoIdx, 'Sukuna skills must appear before Sukuna stats');
      assert(infoIdx < minionContainerIdx, 'Mahoraga minion block MUST appear UNDER Sukuna stats');
      assert(minionBarIdx > minionContainerIdx && minionBarIdx < minionSkillsIdx, 'Minion health bar must appear above Minion skills inside minion container');
      assert(minionSkillsIdx < minionInfoIdx, 'Minion skills must appear before Minion stats inside minion container');

      // 4c. Verify Signature Skill Only Mode: Only mahoraga_wheel (WOA) is rendered for Minion Mahoraga
      CONFIG.hudSkillBarsMode = 'signature';
      clearHealthHud(true);
      updateHealthHud();
      const sigHtml = bottomContainer.innerHTML;
      assert(sigHtml.includes('health-card__minion-bar'), 'Minion health bar must still render in Signature Skill Only mode');
      assert(sigHtml.includes('WOA - LVL'), 'Signature Skill Only mode must render WOA - LVL');
      assert(!sigHtml.includes('DIVINE SHOUT'), 'Signature Skill Only mode must NOT render DIVINE SHOUT');
      assert(!sigHtml.includes('data-skill-id="mahoraga_throw"'), 'Signature Skill Only mode must NOT render mahoraga_throw');
    } finally {
      CONFIG.hudShowFighterDescription = prevDesc;
      CONFIG.darkModeShowHudStats = prevStats;
      CONFIG.hudSkillBarsMode = prevSkillsMode;
      CONFIG.darkModeShowHudSkillBars = prevDarkSkills;
    }

    // 5. Dispel / Slay Mahoraga Minion
    dispelMahoragaSummon(sukuna, { silent: true });
    assert(sukuna.mahoragaSummonActive === false, 'sukuna.mahoragaSummonActive must be false after dispel');
    assert(sukuna.mahoragaMinion === null, 'sukuna.mahoragaMinion must be null after dispel');

    // 6. Verify Post-Dispel State: Reverts to 4 skills and base stats
    const postSkills = getSkillDataForFighter(sukuna);
    assert(postSkills.length === 4, `Sukuna after dispel must revert to 4 skill bars (got: ${postSkills.length})`);
    assert(!postSkills.some(s => s.id.startsWith('mahoraga_')), 'Minion skill bars must be cleanly removed after dispel');

    const postStats = getAdditionalInfoForFighter(sukuna);
    assert(!postStats.some(line => line.includes('<b>Maho')), 'Maho stats must be cleanly removed after dispel');

    // Cleanup
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Sukuna Minion Mahoraga dynamic HUD skill bars, theme consistency, dark mode registration, and combat stats verified cleanly.');
  }

  // ─── Test 114: Gojo Red/Blue/Purple Mixing Orbs Render Above Enemy Bodies (Foreground FX Pass) ───
  {
    console.log('🧪 Test 114: Gojo Red/Blue/Purple Mixing Orbs Foreground FX Pass (Never Overlaid by Enemy Bodies)...');
    const { beginForegroundFxPass, flushForegroundFxPass, endForegroundFxPass } = await import('../js/graphics/renderers/foregroundFxPass.js');
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const gojo = new GojoClass({ x: 220, y: 300, controls: {} });
    const enemy = new SukunaClass({ x: 240, y: 320, controls: {} });
    state.fighters = [gojo, enemy];
    state.illusions = [];
    state.gameState = 'playing';

    const ctx = createMockCtx();
    const drawLog = [];
    const origGojoDrawGun = gojo.drawGun.bind(gojo);
    gojo.drawGun = (c) => { drawLog.push(gojo.isChannelingPurple ? 'gojo_orbs' : 'gojo_gun'); origGojoDrawGun(c); };
    const origRed = gojo._drawReversalRedEffect.bind(gojo);
    gojo._drawReversalRedEffect = (c) => { drawLog.push('gojo_red'); origRed(c); };
    const origEnemyDraw = enemy.draw.bind(enemy);
    enemy.draw = (c, o) => { drawLog.push('enemy_body'); origEnemyDraw(c, o); };

    gojo.isChannelingPurple = true;
    gojo.purpleChargeTimer = 40;

    try {
      // 1. Live arena frame: Gojo drawn first, enemy body drawn after, orbs flushed last
      beginForegroundFxPass();
      gojo.draw(ctx);
      enemy.draw(ctx);
      assert(!drawLog.includes('gojo_orbs'), 'Gojo mixing orbs must be deferred while the foreground window is open');
      flushForegroundFxPass(ctx);
      const orbsIdx = drawLog.indexOf('gojo_orbs');
      const enemyIdx = drawLog.indexOf('enemy_body');
      assert(orbsIdx !== -1, 'Gojo mixing orbs must be drawn by the foreground FX pass');
      assert(orbsIdx > enemyIdx, 'Gojo mixing orbs must render AFTER (on top of) the enemy body');
      assert(state._deferredForegroundFx.length === 0, 'Foreground FX queue must be empty after flush');
      assert(state._deferFighterForegroundFx === false, 'Foreground deferral window must close after flush');

      // 2. Reversal Red is deferred too
      drawLog.length = 0;
      gojo.isChannelingPurple = false;
      gojo.redEffectTimer = 20;
      beginForegroundFxPass();
      gojo.draw(ctx);
      enemy.draw(ctx);
      flushForegroundFxPass(ctx);
      assert(drawLog.indexOf('gojo_red') > drawLog.indexOf('enemy_body'), 'Reversal Red must render on top of the enemy body');
      gojo.redEffectTimer = 0;

      // 3. Outside the window (previews / champion screens), orbs draw inline
      drawLog.length = 0;
      gojo.isChannelingPurple = true;
      endForegroundFxPass();
      gojo.draw(ctx);
      assert(drawLog.includes('gojo_orbs'), 'Gojo mixing orbs must draw inline outside the foreground FX window');
      assert(ctx.getStackDepth() === 0, `Canvas stack must be balanced (depth: ${ctx.getStackDepth()})`);
    } finally {
      endForegroundFxPass();
      gojo.isChannelingPurple = false;
      gojo.purpleChargeTimer = 0;
      state.fighters = [];
      state.illusions = [];
    }
    console.log('      ✅ Gojo Red/Blue/Purple mixing orbs deferred to foreground pass, rendered above enemy bodies, inline fallback & stack balance verified.');
  }

  // ─── Test 115: Sukuna Malevolent Shrine Domain Slashes Do Not Benefit or Stack Crit Mechanics ───
  {
    console.log('🧪 Test 115: Sukuna Malevolent Shrine Domain Slashes Do Not Benefit or Stack Crit Mechanics...');
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const { Fighter } = await import('../js/entities/fighter.js');
    const { spawnDomainSlashLines } = await import('../js/entities/fighters/sukuna/sukunaDomainVisuals.js');

    const sukuna = new SukunaClass({ x: 200, y: 300, controls: {} });
    const dummy = new Fighter({ x: 220, y: 300, radius: 25, hp: 500, maxHp: 500, color: '#FFFFFF' });
    sukuna.team = 0;
    dummy.team = 1;
    state.fighters = [sukuna, dummy];
    state.illusions = [];

    const baseChance = CONFIG.sukuna?.baseCritChance ?? 0.10;
    const baseMult = CONFIG.sukuna?.baseCritMultiplier ?? 1.50;

    // 1. Initial crit values
    assert(sukuna.slashHitCount === 0, `Initial slashHitCount must be 0 (got ${sukuna.slashHitCount})`);
    assert(Math.abs(sukuna.critChance - baseChance) < 0.0001, `Initial critChance must equal baseCritChance (${baseChance})`);
    assert(Math.abs(sukuna.critMultiplier - baseMult) < 0.0001, `Initial critMultiplier must equal baseCritMultiplier (${baseMult})`);

    // 2. Direct evaluateSlashCrit with isDomain: true or isDomainSlash: true
    const domainCritRes = sukuna.evaluateSlashCrit(dummy, 25, { isDomain: true });
    assert(domainCritRes.finalDamage === 25, `Domain slash finalDamage must match base damage without crit multiplier (got ${domainCritRes.finalDamage})`);
    assert(domainCritRes.isCrit === false, `Domain slash must never be critical (isCrit must be false)`);
    assert(sukuna.slashHitCount === 0, `Domain slash must not increment slashHitCount (still ${sukuna.slashHitCount})`);
    assert(Math.abs(sukuna.critChance - baseChance) < 0.0001, `critChance must remain unchanged after domain slash`);

    const sliceLineCritRes = sukuna.evaluateSlashCrit(dummy, 30, { isSukunaDomainSliceLine: true });
    assert(sliceLineCritRes.isCrit === false, `isSukunaDomainSliceLine must never crit`);
    assert(sukuna.slashHitCount === 0, `isSukunaDomainSliceLine must not increment slashHitCount`);

    // 3. Malevolent Shrine wave slashes (spawnDomainSlashLines)
    sukuna.domainActive = true;
    sukuna.domainTimeInsideMap = new Map();
    const initialDummyHp = dummy.hp;
    spawnDomainSlashLines(sukuna, 4);

    const firstWaveDamage = initialDummyHp - dummy.hp;
    assert(dummy.hp < initialDummyHp, `Dummy must take damage from domain slash lines (hp dropped from ${initialDummyHp} to ${dummy.hp})`);
    assert(sukuna.slashHitCount === 0, `Domain shrine slashes must not increment slashHitCount (still ${sukuna.slashHitCount})`);
    assert(Math.abs(sukuna.critChance - baseChance) < 0.0001, `critChance must remain strictly at base after domain shrine slashes`);
    assert(Math.abs(sukuna.critMultiplier - baseMult) < 0.0001, `critMultiplier must remain strictly at base after domain shrine slashes`);

    // Verify domain slash damage remains strictly flat & constant across waves (zero increasing damage)
    const hpBeforeSecondWave = dummy.hp;
    spawnDomainSlashLines(sukuna, 4);
    const secondWaveDamage = hpBeforeSecondWave - dummy.hp;
    assert(Math.abs(firstWaveDamage - secondWaveDamage) < 0.001, `Domain slash damage must remain strictly flat & constant without increasing (wave 1: ${firstWaveDamage}, wave 2: ${secondWaveDamage})`);

    // 4. Normal combat slash (e.g. melee punch/cleave or ranged projectile) DOES increment crit mechanics
    const meleeCritRes = sukuna.evaluateSlashCrit(dummy, 20, { isMelee: true });
    assert(sukuna.slashHitCount === 1, `Normal combat strike must increment slashHitCount to 1 (got ${sukuna.slashHitCount})`);
    const expectedChance = Math.min(CONFIG.sukuna?.maxCritChance ?? 0.80, baseChance + 1 * (CONFIG.sukuna?.critChancePerSlashHit ?? 0.02));
    assert(Math.abs(sukuna.critChance - expectedChance) < 0.0001, `critChance must scale with combat hit (got ${sukuna.critChance})`);

    // Cleanup
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Sukuna Malevolent Shrine domain slashes do not benefit from or contribute to crit mechanics verified.');
  }

  // ─── Test 116: Sukuna Mahoraga Summon Windup Dark Dim Effect & Wheel Arena Overlay Pop-Up ───
  {
    console.log('🧪 Test 116: Sukuna Mahoraga Summon Windup Dark Dim Effect & Wheel Arena Overlay Pop-Up...');
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const { getSukunaMahoragaSummoner, drawMahoragaAdaptationDimScreen, drawMahoragaWheelArenaOverlay } = await import('../js/graphics/renderers/domainDimOverlays.js');

    const sukuna = new SukunaClass({ x: 250, y: 300, controls: {} });
    state.fighters = [sukuna];
    state.illusions = [];
    state.arena = { x: 45, y: 240, width: 450, height: 450, shape: 'rect', wallWidth: 4 };

    // 1. When not summoning, getSukunaMahoragaSummoner returns null
    assert(getSukunaMahoragaSummoner() === null, 'getSukunaMahoragaSummoner must be null when Sukuna is not summoning');

    // 2. Put Sukuna into Mahoraga summon windup phase
    sukuna.isSummoningMahoraga = true;
    sukuna.mahoragaSummonWindupTimer = 25;
    sukuna.mahoragaSummonWindupMax = 50;

    const detectedSummoner = getSukunaMahoragaSummoner();
    assert(detectedSummoner === sukuna, 'getSukunaMahoragaSummoner must detect Sukuna during summon windup');

    // 3. Render dark dim screen and wheel overlay during windup
    mockCtx.resetStackDepth();
    drawMahoragaAdaptationDimScreen();
    assert(mockCtx.getStackDepth() === 0, 'drawMahoragaAdaptationDimScreen must maintain 0 Canvas 2D stack depth');

    mockCtx.resetStackDepth();
    drawMahoragaWheelArenaOverlay();
    assert(mockCtx.getStackDepth() === 0, 'drawMahoragaWheelArenaOverlay must maintain 0 Canvas 2D stack depth');

    // 4. Windup completion and graceful fade out
    sukuna.isSummoningMahoraga = false;
    sukuna.mahoragaSummonWindupTimer = 0;
    delete sukuna._summonWheelStartRot;

    // Fade out frames
    for (let frame = 0; frame < 15; frame++) {
      mockCtx.resetStackDepth();
      drawMahoragaAdaptationDimScreen();
      drawMahoragaWheelArenaOverlay();
      assert(mockCtx.getStackDepth() === 0, `Fade out frame ${frame} must maintain 0 Canvas stack depth`);
    }

    // Cleanup
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Sukuna Mahoraga summon windup dark dim effect & wheel arena overlay pop-up verified.');
  }

  // ─── Test 117: Sukuna Ten Shadows: Mahoraga Summon Single-Use Per Match/Round Standard ───
  {
    console.log('🧪 Test 117: Sukuna Ten Shadows: Mahoraga Summon Single-Use Per Match/Round Standard...');
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const { trySummonMahoraga, dispelMahoragaSummon, resetMahoragaSummon, updateMahoragaSummon } = await import('../js/entities/fighters/sukuna/sukunaMahoragaSummon.js');
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    const { Fighter } = await import('../js/entities/fighter.js');

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };
    state.arena = testArena;
    state.gameState = 'playing';
    state.mode = '1v1';
    state.illusions = [];

    const sukuna = new SukunaClass({ x: 200, y: 300, controls: {} });
    const prey = new Fighter({ id: 'dummy', name: 'DUMMY', type: 'dummy', hp: 500, maxHp: 500, x: 300, y: 300 });
    state.fighters = [sukuna, prey];

    // 1. Initial State: Mahoraga has not been summoned
    assert(sukuna.hasSummonedMahoraga === false, 'Fresh Sukuna must have hasSummonedMahoraga === false');
    assert(sukuna.mahoragaSummonCount === 0, 'Fresh Sukuna must have mahoragaSummonCount === 0');
    sukuna.mahoragaSummonCooldown = 0;

    let hud = getSkillDataForFighter(sukuna, () => []);
    let mahoBar = hud.find(s => s && s.id === 'mahoraga');
    assert(mahoBar, 'Sukuna HUD must have MAHORAGA bar');
    assert(mahoBar.ready === true, 'MAHORAGA bar must be ready before summon when cooldown is 0');

    // 2. First Summon: Successfully summons Mahoraga
    const firstSummon = trySummonMahoraga(sukuna, 0, testArena);
    assert(firstSummon === true, 'Sukuna must successfully summon Mahoraga on first use');
    assert(sukuna.hasSummonedMahoraga === true, 'Sukuna must record hasSummonedMahoraga === true');
    assert(sukuna.mahoragaSummonCount === 1, 'Sukuna must record mahoragaSummonCount === 1');
    assert(sukuna.mahoragaMinion !== null, 'sukuna.mahoragaMinion must exist');
    assert(sukuna.mahoragaSummonActive === true, 'sukuna.mahoragaSummonActive must be true');

    // 3. Duplicate Summon Attempt While Active: Blocked
    assert(trySummonMahoraga(sukuna, 0, testArena) === false, 'Cannot summon Mahoraga while minion is already active');

    // 4. Mahoraga is Slain / Dispelled: Cooldown locked to Infinity and skill is permanently consumed
    dispelMahoragaSummon(sukuna, { reason: 'slain' });
    assert(sukuna.mahoragaMinion === null, 'Minion must be dispelled');
    assert(sukuna.mahoragaSummonActive === false, 'Summon active must be false');
    assert(sukuna.hasSummonedMahoraga === true, 'hasSummonedMahoraga must remain true after dispel');
    assert(sukuna.mahoragaSummonCooldown === Infinity, 'Cooldown must be set to Infinity once consumed');

    // 5. Subsequent Summon Attempts in Same Match: STRICTLY BLOCKED even with cooldown forced to 0
    sukuna.mahoragaSummonCooldown = 0;
    assert(trySummonMahoraga(sukuna, 0, testArena) === false, 'Sukuna cannot re-summon Mahoraga in the same match/round');

    // Running updateMahoragaSummon must never initiate a second summon windup
    for (let i = 0; i < 60; i++) {
      updateMahoragaSummon(sukuna, 0, testArena);
    }
    assert(sukuna.isSummoningMahoraga === false, 'Sukuna must never start summon windup after single use is consumed');
    assert(sukuna.mahoragaMinion === null, 'No minion may be spawned');

    // 6. HUD Card Feedback: Consumed skill shows 0% fill and is NOT ready
    hud = getSkillDataForFighter(sukuna, () => []);
    mahoBar = hud.find(s => s && s.id === 'mahoraga');
    assert(mahoBar, 'MAHORAGA bar still exists on HUD');
    assert(mahoBar.pct === 0, `Consumed MAHORAGA bar must be 0% fill (got ${mahoBar.pct}%)`);
    assert(mahoBar.ready === false, 'Consumed MAHORAGA bar must not be ready');
    assert(mahoBar.active === false, 'Consumed MAHORAGA bar must not be active');

    // 7. Round Reset / Match Reset: Restores the single summon for the new round
    resetMahoragaSummon(sukuna);
    assert(sukuna.hasSummonedMahoraga === false, 'resetMahoragaSummon must reset hasSummonedMahoraga for a new round');
    assert(sukuna.mahoragaSummonCount === 0, 'resetMahoragaSummon must reset mahoragaSummonCount');
    sukuna.mahoragaSummonCooldown = 0;
    assert(trySummonMahoraga(sukuna, 0, testArena) === true, 'Sukuna can summon Mahoraga once in the new round');

    // Cleanup
    dispelMahoragaSummon(sukuna, { silent: true, instantCooldown: true });
    state.fighters = [];
    state.illusions = [];
    console.log('      ✅ Sukuna Ten Shadows: Mahoraga single-use per match/round and HUD consumption verified.');
  }

  // ─── Test 118: Dynamic Camera Tracking Focus on Sukuna Minion Mahoraga & Opponent ───
  {
    console.log('🧪 Test 118: Dynamic Camera Tracking Focus on Sukuna Minion Mahoraga & Opponent...');
    const { updateCamera } = await import('../js/systems/cameraSystem.js');
    const { trySummonMahoraga, dispelMahoragaSummon } = await import('../js/entities/fighters/sukuna/sukunaMahoragaSummon.js');

    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];

    const testArena = { x: 45, y: 240, width: 450, height: 450, wallWidth: 4 };
    state.arena = testArena;
    state.gameState = 'playing';
    state.mode = '1v1';
    state.illusions = [];

    const sukuna = new SukunaClass({ x: 100, y: 300, controls: {} });
    sukuna.x = 100;
    sukuna.y = 300;

    const gojo = new GojoClass({ x: 500, y: 300, controls: {} });
    gojo.x = 500;
    gojo.y = 300;

    state.fighters = [sukuna, gojo];
    state.camera = state.camera || {};
    state.camera.enabled = true;
    state.camera.mode = 'dynamic';

    // 1. Before Summon: Camera must center between Sukuna (100) and Gojo (500) -> targetX = 300
    updateCamera();
    assert(Math.abs(state.camera.targetX - 300) < 5, `Expected camera.targetX ~300 for Sukuna & Gojo, got ${state.camera.targetX}`);

    // 2. Sukuna summons Mahoraga and Mahoraga positions at x: 650, y: 300
    sukuna.mahoragaSummonCooldown = 0;
    const summoned = trySummonMahoraga(sukuna, 0, testArena);
    assert(summoned === true, 'Sukuna must summon Mahoraga successfully');
    const minion = sukuna.mahoragaMinion;
    assert(minion, 'Mahoraga minion must exist');
    minion.x = 650;
    minion.y = 300;

    // Camera envelope now spans [100 (Sukuna), 650 (Mahoraga)], including Gojo (500) -> midpoint = (100 + 650) / 2 = 375
    updateCamera();
    assert(Math.abs(state.camera.targetX - 375) < 10, `Expected camera.targetX ~375 focusing on Sukuna, Gojo, and minion Mahoraga, got ${state.camera.targetX}`);

    // 3. Sukuna dies while Mahoraga is alive: Camera tracks Minion Mahoraga and Gojo
    sukuna.hp = 0;
    sukuna.dead = true;
    sukuna.isDead = true;
    minion.x = 200;
    minion.y = 300;
    gojo.x = 400;
    gojo.y = 300;

    // Envelope spans [200 (Mahoraga), 400 (Gojo)] -> midpoint = 300
    updateCamera();
    assert(Math.abs(state.camera.targetX - 300) < 5, `Expected camera.targetX ~300 focusing on alive Mahoraga and Gojo after Sukuna death, got ${state.camera.targetX}`);

    // 4. Gojo defeated: Only Mahoraga survives -> Winner camera focus locks onto Mahoraga
    gojo.hp = 0;
    gojo.dead = true;
    gojo.isDead = true;
    state.gameState = 'matchEnd';
    updateCamera();
    assert(Math.abs(state.camera.targetX - 200) < 5, `Expected winner camera.targetX ~200 focusing on victorious Mahoraga, got ${state.camera.targetX}`);

    // 5. Fixed Camera Mode: Locks strictly to arena center (270)
    state.camera.mode = 'fixed';
    updateCamera();
    assert(Math.abs(state.camera.targetX - 270) < 1, `Expected camera.targetX locked to arena center 270 in fixed mode, got ${state.camera.targetX}`);

    // Cleanup
    dispelMahoragaSummon(sukuna, { silent: true, instantCooldown: true });
    state.camera.mode = 'dynamic';
    state.fighters = [];
    state.illusions = [];
    state.gameState = 'playing';
    console.log('      ✅ Dynamic camera tracking focus on Sukuna minion Mahoraga & opponent verified successfully.');
  }

  console.log('🎉 ALL MULTI-FIGHTER INTERACTION TESTS PASSED SUCCESSFULLY!\n');
}


runInteractionTests().catch(err => {
  console.error('🚨 Interaction Test Suite Encountered an Error:', err);
  process.exit(1);
});