// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: noop,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    canvas: { width: 540, height: 960 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;
mockCanvas.parentNode = {
  insertBefore: () => {},
  appendChild: () => {},
  removeChild: () => {}
};

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
    const el = {
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      textContent: '',
      innerHTML: '',
      addEventListener: () => {},
      appendChild: () => ({}),
      removeChild: () => ({}),
      parentNode: { insertBefore: () => {}, appendChild: () => {}, removeChild: () => {} },
      children: [],
      querySelector: () => null,
      querySelectorAll: () => []
    };
    el.firstElementChild = el;
    return el;
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    const el = {
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      textContent: '',
      innerHTML: '',
      addEventListener: () => {},
      appendChild: () => ({}),
      removeChild: () => ({}),
      parentNode: { insertBefore: () => {}, appendChild: () => {}, removeChild: () => {} },
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
    this.onload = null;
    this.src = '';
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
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.requestAnimationFrame = () => {};
globalThis.cancelAnimationFrame = () => {};

async function runTests() {
  const { state } = await import('../js/core/state.js');
  const { CONFIG } = await import('../js/core/config.js');
  const { IchigoFighter } = await import('../js/entities/fighters/IchigoFighter.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
  const { performMeleeCleave } = await import('../js/entities/fighters/ichigo/ichigoCombat.js');
  const { GetsugaBehavior } = await import('../js/systems/projectiles/behaviors/GetsugaBehavior.js');

  console.log("--- Starting Ichigo Hollow Lifesteal Tests ---");
  let passed = 0;
  let failed = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // Setup arena
  state.arena = { x: 0, y: 0, width: 540, height: 960 };
  state.projectiles = [];
  state.illusions = [];
  state.getFighterTeam = (idx) => idx;

  // TEST 1: Ichigo in Hollow Mask hits Gojo with active Infinity (Getsuga projectile from distance)
  {
    console.log("\nTest 1: Ichigo Hollow Mask Getsuga projectile vs Gojo with active Infinity at range");
    const ichigo = new IchigoFighter({ id: 'ichigo', name: 'Ichigo', color: '#000000', x: 270, y: 150 });
    const gojo = new GojoFighter({ id: 'gojo', name: 'Gojo', color: '#00ffff', x: 270, y: 380 });
    state.fighters = [ichigo, gojo];

    ichigo.hollowMaskActive = true;
    ichigo.skin = 'hollow';
    ichigo.maxHp = 240;
    ichigo.hp = 100;

    gojo.infinityActive = true;
    gojo.infinityCooldown = 0;
    gojo.isMeleeMode = false;
    const initialGojoHp = gojo.hp;
    const initialIchigoHp = ichigo.hp;

    // Create a Getsuga projectile heading towards Gojo
    const p = {
      x: 270,
      y: 370,
      vx: 0,
      vy: 2,
      r: 15,
      damage: 10,
      isGetsuga: true,
      behaviorType: 'getsuga',
      getsugaForm: 'hollow',
      owner: 0,
      life: 60,
      maxLife: 60,
      trail: [],
      afterImages: []
    };
    state.projectiles = [p];

    const behavior = new GetsugaBehavior();
    behavior.update(p, state.fighters, {});

    assert(gojo.hp === initialGojoHp, `Gojo took 0 damage from frozen Getsuga (hp: ${gojo.hp}/${initialGojoHp})`);
    assert(ichigo.hp === initialIchigoHp, `Ichigo received 0 lifesteal heal (hp: ${ichigo.hp}/${initialIchigoHp})`);
  }

  // TEST 2: Ichigo in Hollow Mask hits target that completely evades (0 damage dealt)
  {
    console.log("\nTest 2: Ichigo Hollow Mask basic melee swing vs evading target (0 damage dealt)");
    const ichigo = new IchigoFighter({ id: 'ichigo', name: 'Ichigo', color: '#000000', x: 270, y: 350 });
    const dummy = new NormalFighter({ id: 'normal', name: 'Dummy', color: '#ff0000', x: 270, y: 390 });
    dummy.evadeBuffTimer = 100;
    dummy.evadeChance = 1.0;
    state.fighters = [ichigo, dummy];

    ichigo.hollowMaskActive = true;
    ichigo.skin = 'hollow';
    ichigo.maxHp = 240;
    ichigo.hp = 100;

    const initialDummyHp = dummy.hp;
    const initialIchigoHp = ichigo.hp;

    // Perform melee swing
    ichigo.gunAngle = Math.PI / 2; // Facing down towards dummy
    performMeleeCleave(ichigo, dummy);

    assert(dummy.hp === initialDummyHp, `Evading dummy took 0 damage (${dummy.hp} === ${initialDummyHp})`);
    assert(ichigo.hp === initialIchigoHp, `Ichigo received 0 lifesteal heal on missed attack (${ichigo.hp} === ${initialIchigoHp})`);
  }

  // TEST 3: Ichigo in Hollow Mask hits vulnerable target (NormalFighter)
  {
    console.log("\nTest 3: Ichigo Hollow Mask basic melee swing vs vulnerable target");
    const ichigo = new IchigoFighter({ id: 'ichigo', name: 'Ichigo', color: '#000000', x: 270, y: 350 });
    const dummy = new NormalFighter({ id: 'normal', name: 'Dummy', color: '#ff0000', x: 270, y: 390 });
    state.fighters = [ichigo, dummy];

    ichigo.hollowMaskActive = true;
    ichigo.skin = 'hollow';
    ichigo.maxHp = 240;
    ichigo.hp = 100;

    const initialDummyHp = dummy.hp;
    const initialIchigoHp = ichigo.hp;

    // Perform melee swing
    ichigo.gunAngle = Math.PI / 2; // Facing down towards dummy
    performMeleeCleave(ichigo, dummy);

    assert(dummy.hp < initialDummyHp, `Dummy took damage (${dummy.hp} < ${initialDummyHp})`);
    assert(ichigo.hp > initialIchigoHp, `Ichigo gained lifesteal HP (${ichigo.hp} > ${initialIchigoHp})`);
  }

  // TEST 4: Ichigo with Hollow Mask INACTIVE hits vulnerable target
  {
    console.log("\nTest 4: Ichigo normal form (no Hollow mask) basic melee swing vs vulnerable target");
    const ichigo = new IchigoFighter({ id: 'ichigo', name: 'Ichigo', color: '#000000', x: 270, y: 350 });
    const dummy = new NormalFighter({ id: 'normal', name: 'Dummy', color: '#ff0000', x: 270, y: 390 });
    state.fighters = [ichigo, dummy];

    ichigo.hollowMaskActive = false;
    ichigo.hollowMaskTimer = 0;
    ichigo.skin = 'default';
    ichigo.maxHp = 240;
    ichigo.hp = 100;

    const initialDummyHp = dummy.hp;
    const initialIchigoHp = ichigo.hp;

    // Perform melee swing
    ichigo.gunAngle = Math.PI / 2;
    performMeleeCleave(ichigo, dummy);

    assert(dummy.hp < initialDummyHp, `Dummy took damage (${dummy.hp} < ${initialDummyHp})`);
    assert(ichigo.hp === initialIchigoHp, `Ichigo gained 0 lifesteal without Hollow mask (${ichigo.hp} === ${initialIchigoHp})`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
