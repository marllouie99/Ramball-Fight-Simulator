function createMockCtx() {
  const noop = () => {};
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
    fillRect: noop,
    strokeRect: noop,
    drawImage: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    measureText: () => ({ width: 10 }),
    canvas: { width: 800, height: 600 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;
mockCanvas.querySelector = () => mockCanvas;
mockCanvas.querySelectorAll = () => [];
mockCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => mockCanvas,
  querySelectorAll: () => [],
  querySelector: () => mockCanvas,
  createElement: () => ({
    width: 100,
    height: 100,
    style: {},
    getContext: () => mockCtx
  }),
  body: {
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    style: {}
  },
  documentElement: { style: {} }
};

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

globalThis.AudioContext = class {
  createGain() { return { gain: { value: 1, setValueAtTime: () => {} }, connect: () => {} }; }
  createBufferSource() { return { start: () => {}, stop: () => {}, connect: () => {} }; }
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

const { state } = await import('../js/core/state.js');
const { CONFIG } = await import('../js/core/config.js');
const { MahoragaFighter } = await import('../js/entities/fighters/MahoragaFighter.js');
const { applyRCTHeal } = await import('../js/entities/fighters/mahoraga/mahoragaAdaptation.js');

console.log('🧪 Testing Mahoraga RCT Healing with rctHealPercent: 1.00...');

state.arena = { x: 0, y: 0, width: 800, height: 600, radius: 400, shape: 'circle' };
state.fighters = [];

// Ensure config has rctHealPercent: 1.00
CONFIG.mahoraga.rctHealPercent = 1.00;
CONFIG.mahoraga.fatalDamageThresholdPct = 0.15; // 15% threshold

const mahoraga = new MahoragaFighter({ id: 'mahoraga', name: 'Mahoraga', x: 400, y: 300, r: 30, maxHp: 1000, hp: 1000 });
mahoraga.maxHp = 1000;
state.fighters.push(mahoraga);

// 1. Direct applyRCTHeal Test
console.log('1. Testing direct applyRCTHeal at 200/1000 HP...');
mahoraga.hp = 200;
applyRCTHeal(mahoraga);
console.log(`   HP after applyRCTHeal: ${mahoraga.hp}/${mahoraga.maxHp}`);
if (mahoraga.hp !== 1000) {
  throw new Error(`Expected 1000 HP, got ${mahoraga.hp}`);
}
console.log('   ✅ Direct applyRCTHeal restored 100% full health.');

// 2. Damage-Triggered Adaptation Test
console.log('2. Testing damage-triggered adaptation with incoming attack...');
mahoraga.hp = 300;
mahoraga.fatalAdaptCooldown = 0;
mahoraga.totalAccumDamage = 0;

// Enemy hits for 200 damage (exceeds 15% threshold of 150)
const enemy = { x: 450, y: 300, r: 25, hp: 500, maxHp: 500, characterId: 'normal' };
mahoraga.takeDamage(200, enemy, { isMelee: true });

console.log(`   HP after taking 200 damage (triggered adaptation): ${mahoraga.hp}/${mahoraga.maxHp}`);
if (mahoraga.hp !== 1000) {
  throw new Error(`Expected 1000 HP (full heal on adaptation), got ${mahoraga.hp}`);
}
console.log('   ✅ Triggered adaptation fully healed Mahoraga to 1000/1000 HP.');

// 3. Fatal Damage Adaptation Survival Test
console.log('3. Testing fatal damage adaptation survival...');
state.gameState = 'playing';
state.roundWinner = null;
state.fighters = [mahoraga, enemy];
mahoraga.hp = 50;
mahoraga.fatalAdaptCooldown = 0;
mahoraga.totalAccumDamage = 0;

// Fatal hit of 500 damage
mahoraga.takeDamage(500, enemy, { isMelee: true });
console.log(`   HP after fatal hit + adaptation: ${mahoraga.hp}/${mahoraga.maxHp}, isDead=${mahoraga.isDead}, gameState=${state.gameState}, roundWinner=${state.roundWinner}`);
if (mahoraga.hp !== 1000 || mahoraga.isDead) {
  throw new Error(`Expected alive at 1000 HP, got hp=${mahoraga.hp}, isDead=${mahoraga.isDead}`);
}
if (state.gameState !== 'playing') {
  throw new Error(`Expected gameState to remain 'playing', got '${state.gameState}' (enemy was prematurely declared winner!)`);
}
if (state.roundWinner !== null) {
  throw new Error(`Expected roundWinner to be null, got ${state.roundWinner?.name || state.roundWinner}`);
}
console.log('   ✅ Mahoraga survived fatal hit, game continued in playing state without declaring enemy win.');

console.log('🎉 ALL MAHORAGA RCT HEAL TESTS PASSED CLEANLY!');
