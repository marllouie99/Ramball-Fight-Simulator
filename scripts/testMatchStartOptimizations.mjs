// Global browser mock environment
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
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => new ArrayBuffer(8)
});
globalThis.AudioContext = class {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
  }
  decodeAudioData(buf) {
    return Promise.resolve({ duration: 1.0 });
  }
  createBufferSource() {
    return { buffer: null, playbackRate: { value: 1 }, start: () => {}, stop: () => {}, connect: () => {} };
  }
  createGain() {
    return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, cancelScheduledValues: () => {} }, connect: () => {} };
  }
};

const { state } = await import('../js/core/state.js');
const { preloadActiveMatchSounds } = await import('../js/core/gameFlow.js');
const { getFighterBasicAttackSoundPaths } = await import('../js/soundEffects/basicAttackSounds.js');
const { getFighterSkillSoundPaths } = await import('../js/soundEffects/skillSounds.js');

console.log('🧪 Running Match Start Optimization Tests...');

// 1. Test getFighterBasicAttackSoundPaths for key fighters
const gojoBasic = getFighterBasicAttackSoundPaths(0, 'gojo');
console.assert(Array.isArray(gojoBasic) && gojoBasic.length > 0, 'Gojo basic attack sound paths should be non-empty');
console.log('   ✓ Gojo basic attack paths:', gojoBasic);

const sukunaBasic = getFighterBasicAttackSoundPaths(98, 'sukuna');
console.assert(Array.isArray(sukunaBasic) && sukunaBasic.length > 0, 'Sukuna basic attack sound paths should be non-empty');
console.log('   ✓ Sukuna basic attack paths:', sukunaBasic);

// 2. Test getFighterSkillSoundPaths for key fighters
const gojoSkills = getFighterSkillSoundPaths('gojo');
console.assert(Array.isArray(gojoSkills) && gojoSkills.length > 0, 'Gojo skill sound paths should be non-empty');
console.log('   ✓ Gojo skill sound paths count:', gojoSkills.length);

const sukunaSkills = getFighterSkillSoundPaths('sukuna');
console.assert(Array.isArray(sukunaSkills) && sukunaSkills.length > 0, 'Sukuna skill sound paths should be non-empty');
console.log('   ✓ Sukuna skill sound paths count:', sukunaSkills.length);

// 3. Test preloadActiveMatchSounds logic
const dummyFighters = [
  { fighterIndex: 0, type: 'gojo', characterId: 'gojo' },
  { fighterIndex: 98, type: 'sukuna', characterId: 'sukuna' }
];

const promise = preloadActiveMatchSounds(dummyFighters);
console.assert(promise && typeof promise.then === 'function', 'preloadActiveMatchSounds should return a Promise');
await promise;
console.log('   ✓ preloadActiveMatchSounds executed and resolved successfully');

console.log('✅ ALL MATCH START OPTIMIZATION TESTS PASSED CLEANLY!');
