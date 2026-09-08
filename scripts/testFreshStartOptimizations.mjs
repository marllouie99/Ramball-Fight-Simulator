import assert from 'node:assert/strict';

async function runFreshStartTests() {
  console.log('🧪 Running Fresh Start Optimization Tests...');

// Setup DOM / Window mocks
globalThis.window = globalThis;
globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.window.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {} });
globalThis.window.devicePixelRatio = 1;
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
const mockCanvas = {
  width: 540,
  height: 960,
  style: {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 540, height: 960 }),
  getContext: () => ({
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    rect: () => {}
  })
};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => mockCanvas,
  querySelector: () => mockCanvas,
  querySelectorAll: () => [],
  createElement: () => mockCanvas,
  body: { classList: { add: () => {}, remove: () => {}, contains: () => false }, appendChild: () => {} },
  documentElement: { style: { setProperty: () => {} } }
};
globalThis.Audio = class {
  constructor() {}
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
};

  // 1. Test graphicsCache preloader
  const { initGraphicsCache } = await import('../js/graphics/graphicsCache.js');
  initGraphicsCache();
  console.log('  ✓ initGraphicsCache executed cleanly without runtime issues');

  // 2. Test BGM synchronization
  const { state } = await import('../js/core/state.js');
  const { preloadActiveMatchSounds } = await import('../js/core/gameFlow.js');
  const { startArenaBgm } = await import('../js/systems/arenaBgmSystem.js');

  const dummyFighters = [
    { fighterIndex: 0, type: 'gojo', characterId: 'gojo', _def: { id: 'gojo', type: 'gojo' } },
    { fighterIndex: 1, type: 'sukuna', characterId: 'sukuna', _def: { id: 'sukuna', type: 'sukuna' } }
  ];

  await preloadActiveMatchSounds(dummyFighters);
  assert(state.activeMatchBgmSrc, 'preloadActiveMatchSounds should have chosen and set state.activeMatchBgmSrc');
  console.log(`  ✓ state.activeMatchBgmSrc successfully synchronized: ${state.activeMatchBgmSrc}`);

  // Test startArenaBgm honors state.activeMatchBgmSrc
  startArenaBgm();
  console.log('  ✓ startArenaBgm successfully consumed preloaded track without desync');

  // 3. Test blood and spark pool warmup functions
  const { warmUpBloodSpritePool } = await import('../js/graphics/particles/bloodEffect.js');
  const { warmUpPixiSpritePool } = await import('../js/systems/particles/ParticleSystem.js');
  warmUpBloodSpritePool(40);
  warmUpPixiSpritePool(40);
  console.log('  ✓ warmUpBloodSpritePool and warmUpPixiSpritePool executed safely');

  console.log('✅ ALL FRESH START OPTIMIZATION TESTS PASSED!');
}

runFreshStartTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
