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
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    drawImage: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
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
const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');
const { projectileSystem } = await import('../js/systems/projectileSystem.js');

const YutaFighter = FIGHTER_CLASS_MAP['yuta'];
const NormalFighter = FIGHTER_CLASS_MAP['normal'];

console.log('🧪 Testing Yuta Pure Love Beam Movement Lifecycle...');

state.arena = { x: 0, y: 0, width: 1000, height: 800, radius: 500, shape: 'circle' };
state.gameState = 'playing';
state.mode = '1v1';
state.getFighterTeam = (idx) => idx;

function createFighters() {
  const yuta = new YutaFighter({ id: 'yuta', name: 'Yuta', x: 500, y: 400, r: 25, maxHp: 500, hp: 500 });
  const enemy = new NormalFighter({ id: 'normal', name: 'Normal', x: 700, y: 400, r: 25, maxHp: 500, hp: 500 });
  state.fighters = [yuta, enemy];
  state.illusions = [];
  return { yuta, enemy };
}

const { yuta, enemy } = createFighters();

// Trigger Pure Love Beam
yuta.maxHp = 500;
yuta.hp = 100; // <= 60% threshold
yuta.rika.active = true;
yuta.rika.hp = yuta.rika.maxHp;
yuta.pureLoveBeamCooldownTimer = 0;

console.log('1. Stepping through Pure Love Beam retreat slide & emergence & charge...');
for (let frame = 0; frame < 300; frame++) {
  if (yuta.hp > 250) yuta.hp = 100;
  yuta.update(enemy, 0, state.arena);
  if (yuta.isFiringPureLoveBeam) {
    console.log(`   Beam fired at frame ${frame}`);
    break;
  }
}

if (!yuta.isFiringPureLoveBeam) {
  throw new Error(`Yuta failed to fire Pure Love Beam: slide=${yuta.beamRetreatSlideTimer}, emerge=${yuta.rikaEmergingForBeamTimer}, charge=${yuta.pureLoveBeamChargeTimer}, hpRatio=${yuta.hp/yuta.maxHp}`);
}

console.log('2. Stepping through active beam firing...');
let beamFiredFrames = 0;
while (yuta.isFiringPureLoveBeam && beamFiredFrames < 400) {
  yuta.update(enemy, 0, state.arena);
  beamFiredFrames++;
}
console.log(`   Beam completed after ${beamFiredFrames} frames. Breather timer: ${yuta.pureLoveBeamBreatherTimer}`);

console.log('3. Stepping through post-beam breather recovery...');
let breatherFrames = 0;
while (yuta.pureLoveBeamBreatherTimer > 0 && breatherFrames < 100) {
  yuta.update(enemy, 0, state.arena);
  breatherFrames++;
}
console.log(`   Breather completed after ${breatherFrames} frames.`);

console.log('4. Checking Yuta movement in frames AFTER breather...');
let positions = [];
for (let frame = 0; frame < 30; frame++) {
  const oldX = yuta.x;
  const oldY = yuta.y;
  const speed = Math.hypot(yuta.vx, yuta.vy);
  yuta.update(enemy, 0, state.arena);
  const distMoved = Math.hypot(yuta.x - oldX, yuta.y - oldY);
  positions.push({ frame, x: yuta.x, y: yuta.y, vx: yuta.vx, vy: yuta.vy, speed, distMoved });
}

console.log('   Post-beam frame movement stats (first 5 frames):');
positions.slice(0, 5).forEach(p => console.log(`   Frame ${p.frame}: x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, vx=${p.vx.toFixed(2)}, vy=${p.vy.toFixed(2)}, distMoved=${p.distMoved.toFixed(2)}`));

const totalDistMoved = positions.reduce((sum, p) => sum + p.distMoved, 0);
console.log(`   Total distance moved in 30 frames: ${totalDistMoved.toFixed(2)}px`);

// 5. Test edge case: Enemy killed by beam
console.log('\n5. Testing Edge Case: Enemy dies during beam...');
const { yuta: yuta2, enemy: enemy2 } = createFighters();
yuta2.maxHp = 500;
yuta2.hp = 100;
yuta2.rika.active = true;
yuta2.rika.hp = yuta2.rika.maxHp;
yuta2.pureLoveBeamCooldownTimer = 0;

for (let frame = 0; frame < 300; frame++) {
  if (yuta2.hp > 250) yuta2.hp = 100;
  yuta2.update(enemy2, 0, state.arena);
  if (yuta2.isFiringPureLoveBeam) break;
}
// Kill enemy mid-beam
enemy2.hp = 0;
enemy2.isDead = true;

while (yuta2.isFiringPureLoveBeam) {
  yuta2.update(enemy2, 0, state.arena);
}
while (yuta2.pureLoveBeamBreatherTimer > 0) {
  yuta2.update(enemy2, 0, state.arena);
}
let deadEnemyMoves = 0;
for (let frame = 0; frame < 30; frame++) {
  const oldX = yuta2.x;
  const oldY = yuta2.y;
  yuta2.update(enemy2, 0, state.arena);
  deadEnemyMoves += Math.hypot(yuta2.x - oldX, yuta2.y - oldY);
}
console.log(`   Distance moved when enemy is dead: ${deadEnemyMoves.toFixed(2)}px`);

// 6. Test edge case: Interruption during breather
console.log('\n6. Testing Edge Case: Interruption during breather...');
const { yuta: yuta3, enemy: enemy3 } = createFighters();
yuta3.maxHp = 500;
yuta3.hp = 100;
yuta3.pureLoveBeamBreatherTimer = 30; // caught in breather
yuta3.interruptAttacks(); // e.g. from stun / stasis
let interruptedMoves = 0;
for (let frame = 0; frame < 30; frame++) {
  const oldX = yuta3.x;
  const oldY = yuta3.y;
  yuta3.update(enemy3, 0, state.arena);
  interruptedMoves += Math.hypot(yuta3.x - oldX, yuta3.y - oldY);
}
console.log(`   Distance moved after breather interrupt: ${interruptedMoves.toFixed(2)}px`);
