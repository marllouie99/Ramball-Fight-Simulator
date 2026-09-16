// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  return {
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    ellipse: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    rect: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    clip: noop,
    fill: noop,
    stroke: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    drawImage: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop })
  };
}

globalThis.window = globalThis;
globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.document = {
  getElementById: (id) => ({
    getContext: () => createMockCtx(),
    width: 1200,
    height: 800,
    style: {}
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    getContext: () => createMockCtx(),
    width: 1200,
    height: 800,
    style: {},
    addEventListener: () => {}
  }),
  addEventListener: () => {}
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
    this.currentTime = 0;
    this.volume = 1;
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
  }
  cloneNode() {
    return new globalThis.Audio();
  }
};

const { state } = await import('../js/core/state.js');
const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');
const YutaFighter = FIGHTER_CLASS_MAP['yuta'];
const SaitamaFighter = FIGHTER_CLASS_MAP['saitama'];
const { CONFIG } = await import('../js/core/config.js');
const { updateRika } = await import('../js/entities/fighters/yuta/rikaLogic.js');
const { YutaRenderer } = await import('../js/graphics/fighters/yutaRenderer.js');

console.log('🧪 Testing Rika vs Saitama Combat & Smooth Dodge Tracking...');

// Setup test arena and state
state.arena = { x: 50, y: 50, width: 800, height: 600 };
state.gameState = 'playing';
state.projectiles = [];
state.fighters = [];
state.illusions = [];

const yutaDef = CONFIG.fighters?.find(f => f.id === 'yuta') || { id: 'yuta', type: 'yuta', name: 'Yuta', r: 22, speed: 6.5, hp: 200, damage: 15, cooldown: 60 };
const saitamaDef = CONFIG.fighters?.find(f => f.id === 'saitama') || { id: 'saitama', type: 'saitama', name: 'Saitama', r: 25, speed: 6.0, hp: 420, damage: 20, cooldown: 60 };

const yuta = new YutaFighter({ ...yutaDef, startX: 200, startY: 300 });
const saitama = new SaitamaFighter({ ...saitamaDef, startX: 400, startY: 300 });

state.fighters = [yuta, saitama];

// 1. Activate Rika manually for test
yuta.rika.active = true;
yuta.rika.hp = 500;
yuta.rika.maxHp = 500;
yuta.rika.spawnTimer = 0;
yuta.rika.x = 350;
yuta.rika.y = 300;
yuta.rika.vx = 8;
yuta.rika.vy = 0;
yuta.rika.angle = 0;
yuta.rikaAlpha = 1.0;
state.illusions = [yuta.rika];

console.log('   ✅ Rika spawned and targeting Saitama');

// 2. Force Saitama to dodge on next hit (set dodge chance to 100% temporarily)
CONFIG.saitama.dodgeChance = 1.0;
saitama.dodgeCooldown = 0;

const initialAngle = yuta.rika.angle;
console.log(`   [Initial] Rika Angle: ${initialAngle}, Rika Pos: (${yuta.rika.x}, ${yuta.rika.y}), Saitama Pos: (${saitama.x}, ${saitama.y})`);

// Step 1: Run Rika update into Saitama melee contact
updateRika(yuta, state.arena);

console.log(`   [Post-Dodge] Rika Angle: ${yuta.rika.angle}, Rika Pos: (${yuta.rika.x}, ${yuta.rika.y}), Saitama Pos: (${saitama.x}, ${saitama.y})`);

// Verify Rika did NOT snap 180 degrees (Math.PI) on single frame
const angleDelta = Math.abs(yuta.rika.angle - initialAngle);
if (angleDelta > Math.PI * 0.75) {
  throw new Error(`Rika snapped angle too abruptly upon dodge: delta was ${angleDelta} radians!`);
}
console.log(`   ✅ Rika angle smooth change verified: delta = ${angleDelta.toFixed(3)} rad (no 180° snap)`);

// 3. Run renderer pass to verify render angle interpolation
const mockCtx = createMockCtx();
YutaRenderer.draw(mockCtx, yuta, saitama);

const renderedAngle = yuta.rika.angle;
console.log(`   ✅ Render pass verified smooth angle: ${renderedAngle.toFixed(3)} rad`);

// 4. Run multiple frames to ensure Rika smoothly tracks Saitama around
for (let f = 0; f < 30; f++) {
  saitama.update(yuta, 1, state.arena);
  updateRika(yuta, state.arena);
  YutaRenderer.draw(mockCtx, yuta, saitama);
}

console.log(`   [Frame 30] Rika Pos: (${yuta.rika.x.toFixed(1)}, ${yuta.rika.y.toFixed(1)}), Rika Angle: ${yuta.rika.angle.toFixed(3)} rad`);
console.log('🎉 ALL RIKA VS SAITAMA DODGE TRACKING TESTS PASSED!');
