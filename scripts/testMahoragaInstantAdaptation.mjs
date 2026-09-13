// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => { _stackDepth++; },
    restore: () => { _stackDepth--; },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
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

async function runTests() {
  console.log('🧪 Running Mahoraga Instant Adaptation Test Suite...');

  const { state } = await import('../js/core/state.js');
  const { CONFIG, FIGHTER_DEFS } = await import('../js/core/config.js');
  const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');

  const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
  const YutaClass = FIGHTER_CLASS_MAP['yuta'];
  const GojoClass = FIGHTER_CLASS_MAP['gojo'];
  const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];

  const mahoragaDef = FIGHTER_DEFS.find(d => d.type === 'mahoraga') || { type: 'mahoraga', name: 'Mahoraga' };
  const yutaDef = FIGHTER_DEFS.find(d => d.type === 'yuta') || { type: 'yuta', name: 'Yuta' };
  const gojoDef = FIGHTER_DEFS.find(d => d.type === 'gojo') || { type: 'gojo', name: 'Gojo' };
  const saitamaDef = FIGHTER_DEFS.find(d => d.type === 'saitama') || { type: 'saitama', name: 'Saitama' };

  // Setup mock arena & state
  state.arena = { x: 100, y: 100, width: 800, height: 600, radius: 400 };

  // ── Test 1: Pure Love Beam Instant Adaptation on Meeting Threshold ──
  console.log('1. Testing Pure Love Beam Instant Adaptation...');
  {
    const mahoraga = new MahoragaClass(mahoragaDef);
    const yuta = new YutaClass(yutaDef);
    state.fighters = [yuta, mahoraga];

    const threshold = mahoraga.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);

    // Deal small damage ticks below threshold
    mahoraga.takeDamage(threshold * 0.4, yuta, { isPureLoveBeam: true, isSkill: true });
    if (mahoraga.adaptedPureLoveBeam || mahoraga.adaptationPauseTimer > 0) {
      throw new Error('Mahoraga adapted prematurely before meeting fatalDamageThresholdPct!');
    }

    // Next tick pushes over threshold
    mahoraga.takeDamage(threshold * 0.7, yuta, { isPureLoveBeam: true, isSkill: true });
    if (!mahoraga.adaptedPureLoveBeam) {
      throw new Error('Mahoraga failed to adapt to Pure Love Beam immediately upon meeting threshold!');
    }
    if (mahoraga.adaptationPauseTimer <= 0) {
      throw new Error('Mahoraga wheel click pause timer was not activated on instant adaptation!');
    }
    if (mahoraga.caughtInPureLoveBeam) {
      throw new Error('Mahoraga remained caught in beam paralysis after adapting!');
    }
    console.log('   ✅ Pure Love Beam instant adaptation verified cleanly!');
  }

  // ── Test 2: Hollow Purple Instant Adaptation on Meeting Threshold ──
  console.log('2. Testing Hollow Purple Instant Adaptation...');
  {
    const mahoraga = new MahoragaClass(mahoragaDef);
    const gojo = new GojoClass(gojoDef);
    state.fighters = [gojo, mahoraga];

    const threshold = mahoraga.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);

    // Purple DPS tick pushes over threshold
    mahoraga.takeDamage(threshold * 1.1, gojo, {
      isSkill: true,
      isPurpleDPS: true,
      projectile: { isGojoPurple: true, skillShotId: 'purple' }
    });

    if (!mahoraga.gojoAdapted.purple && !mahoraga.adaptedSkills?.purple) {
      throw new Error('Mahoraga failed to adapt to Hollow Purple immediately upon meeting threshold!');
    }
    if (mahoraga.adaptationPauseTimer <= 0) {
      throw new Error('Mahoraga wheel click pause timer was not activated for Hollow Purple!');
    }
    console.log('   ✅ Hollow Purple instant adaptation verified cleanly!');
  }

  // ── Test 3: Saitama Counter Instant Adaptation on Meeting Threshold ──
  console.log('3. Testing Saitama Serious Counter Instant Adaptation...');
  {
    const mahoraga = new MahoragaClass(mahoragaDef);
    const saitama = new SaitamaClass(saitamaDef);
    state.fighters = [saitama, mahoraga];

    const threshold = mahoraga.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);

    // Saitama counter punch pushes over threshold
    mahoraga.takeDamage(threshold * 1.1, saitama, {
      isSkill: true,
      isSaitamaCounter: true,
      isCounter: true
    });

    if (!mahoraga.adaptedSaitamaCounter) {
      throw new Error('Mahoraga failed to adapt to Serious Counter immediately upon meeting threshold!');
    }
    if (mahoraga.adaptationPauseTimer <= 0) {
      throw new Error('Mahoraga wheel click pause timer was not activated for Serious Counter!');
    }
    console.log('   ✅ Serious Counter instant adaptation verified cleanly!');
  }

  // ── Test 4: Reversal Red Instant Adaptation on Meeting Threshold ──
  console.log('4. Testing Reversal Red Instant Adaptation...');
  {
    const mahoraga = new MahoragaClass(mahoragaDef);
    const gojo = new GojoClass(gojoDef);
    state.fighters = [gojo, mahoraga];

    const threshold = mahoraga.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct ?? 0.15);

    // Red blast pushes over threshold
    mahoraga.takeDamage(threshold * 1.1, gojo, {
      isSkill: true,
      isRed: true,
      skillShotId: 'red'
    });

    if (!mahoraga.gojoAdapted.red && !mahoraga.adaptedSkills?.red) {
      throw new Error('Mahoraga failed to adapt to Reversal Red immediately upon meeting threshold!');
    }
    if (mahoraga.adaptationPauseTimer <= 0) {
      throw new Error('Mahoraga wheel click pause timer was not activated for Reversal Red!');
    }
    console.log('   ✅ Reversal Red instant adaptation verified cleanly!');
  }

  console.log('🎉 ALL MAHORAGA INSTANT ADAPTATION TESTS PASSED CLEANLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
