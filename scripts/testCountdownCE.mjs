// Browser mock environment
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;
  const calls = [];

  return {
    save: () => { _stackDepth++; calls.push('save'); },
    restore: () => { _stackDepth--; calls.push('restore'); },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    getCalls: () => calls,
    clearCalls: () => { calls.length = 0; },
    beginPath: () => calls.push('beginPath'),
    closePath: () => calls.push('closePath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    quadraticCurveTo: () => calls.push('quadraticCurveTo'),
    bezierCurveTo: noop,
    arc: () => calls.push('arc'),
    arcTo: noop,
    ellipse: () => calls.push('ellipse'),
    rect: () => calls.push('rect'),
    roundRect: noop,
    setLineDash: noop,
    getLineDash: () => [],
    fillRect: () => calls.push('fillRect'),
    strokeRect: noop,
    clearRect: () => calls.push('clearRect'),
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    clip: () => calls.push('clip'),
    scale: () => calls.push('scale'),
    rotate: () => calls.push('rotate'),
    translate: () => calls.push('translate'),
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: () => calls.push('drawImage'),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1.0,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    canvas: { width: 540, height: 960 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;

globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => {
    if (id === 'arena') return mockCanvas;
    return { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    return { style: {}, classList: { add: () => {}, remove: () => {} } };
  },
  body: { style: {} }
};
globalThis.Image = class {
  constructor() {
    this.width = 100;
    this.height = 100;
    this.complete = true;
    this.naturalWidth = 100;
    this.naturalHeight = 100;
  }
};

const { state } = await import('../js/core/state.js');
const { GojoRenderer } = await import('../js/graphics/fighters/gojoRenderer.js');
const { SukunaRenderer } = await import('../js/graphics/fighters/sukunaRenderer.js');
const { YutaRenderer } = await import('../js/graphics/fighters/yutaRenderer.js');
const { drawTodoCursedEnergyAura } = await import('../js/graphics/fighters/todoSkin.js');
const { drawNanamiCursedEnergyAura } = await import('../js/graphics/fighters/nanamiSkin.js');
const { drawMahitoCursedEnergyAura } = await import('../js/graphics/fighters/mahitoSkin.js');
const { drawNobaraCursedEnergyAura } = await import('../js/graphics/fighters/nobaraSkin.js');
const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
const { NanamiFighter } = await import('../js/entities/fighters/NanamiFighter.js');
const { MahitoFighter } = await import('../js/entities/fighters/MahitoFighter.js');
const { YutaFighter } = await import('../js/entities/fighters/YutaFighter.js');
const { YujiFighter } = await import('../js/entities/fighters/YujiFighter.js');
const { TodoFighter } = await import('../js/entities/fighters/TodoFighter.js');
const { startCountdown } = await import('../js/core/gameFlow.js');

const fighter = {
  x: 100, y: 100, r: 25,
  combatAuraOpacity: 1.0,
  cursedEnergyAlpha: 1.0,
  isChannelingDomainExpansion: true,
  isTakadaUltActive: false,
  isOvertimeActive: true,
  isBlitzing: true,
  hp: 100, maxHp: 100
};

// 1. Verify countdown state suppresses direct CE functions
state.gameState = 'countdown';

mockCtx.clearCalls();
GojoRenderer._drawJJKCursedEnergyAura(mockCtx, fighter, 'blue');
if (mockCtx.getCalls().length > 0) throw new Error('Gojo CE aura rendered during countdown!');

mockCtx.clearCalls();
SukunaRenderer._drawSukunaCursedEnergyAura(mockCtx, fighter, 'red');
if (mockCtx.getCalls().length > 0) throw new Error('Sukuna CE aura rendered during countdown!');

mockCtx.clearCalls();
YutaRenderer._drawYutaCursedEnergyAura(mockCtx, fighter);
if (mockCtx.getCalls().length > 0) throw new Error('Yuta CE aura rendered during countdown!');

mockCtx.clearCalls();
drawTodoCursedEnergyAura(mockCtx, fighter);
if (mockCtx.getCalls().length > 0) throw new Error('Todo CE aura rendered during countdown!');

mockCtx.clearCalls();
drawNanamiCursedEnergyAura(mockCtx, fighter);
if (mockCtx.getCalls().length > 0) throw new Error('Nanami CE aura rendered during countdown!');

mockCtx.clearCalls();
drawMahitoCursedEnergyAura(mockCtx, fighter);
if (mockCtx.getCalls().length > 0) throw new Error('Mahito CE aura rendered during countdown!');

mockCtx.clearCalls();
drawNobaraCursedEnergyAura(mockCtx, fighter);
if (mockCtx.getCalls().length > 0) throw new Error('Nobara CE aura rendered during countdown!');

// 2. Test full fighter instances during startCountdown and countdown update loop
const sukuna = new SukunaFighter({ type: 'sukuna', id: 'sukuna', name: 'Sukuna', maxHp: 500, color: '#8B0000', r: 25 });
const gojo = new GojoFighter({ type: 'gojo', id: 'gojo', name: 'Gojo', maxHp: 500, color: '#00D4CC', r: 25 });
const nanami = new NanamiFighter({ type: 'nanami', id: 'nanami', name: 'Nanami', maxHp: 500, color: '#DAA520', r: 25 });
const mahito = new MahitoFighter({ type: 'mahito', id: 'mahito', name: 'Mahito', maxHp: 500, color: '#8A2BE2', r: 25 });
const yuta = new YutaFighter({ type: 'yuta', id: 'yuta', name: 'Yuta', maxHp: 500, color: '#FF1493', r: 25 });
const yuji = new YujiFighter({ type: 'yuji', id: 'yuji', name: 'Yuji', maxHp: 500, color: '#FF4500', r: 25 });
const todo = new TodoFighter({ type: 'todo', id: 'todo', name: 'Todo', maxHp: 500, color: '#00BFFF', r: 25 });

state.fighters = [sukuna, gojo, nanami, mahito, yuta, yuji, todo];
startCountdown();

for (const f of state.fighters) {
  if (f.combatAuraOpacity > 0) throw new Error(`${f.characterId || f.name} combatAuraOpacity > 0 after startCountdown!`);
  if (f.cursedEnergyAlpha > 0) throw new Error(`${f.characterId || f.name} cursedEnergyAlpha > 0 after startCountdown!`);
}

// Update fighters for 30 frames in countdown
const arena = { width: 540, height: 960, r: 250 };
for (let frame = 0; frame < 30; frame++) {
  sukuna.update(gojo, 0, arena);
  gojo.update(sukuna, 1, arena);
  nanami.update(sukuna, 2, arena);
  mahito.update(sukuna, 3, arena);
  yuta.update(sukuna, 4, arena);
  yuji.update(sukuna, 5, arena);
  todo.update(sukuna, 6, arena);
}

for (const f of state.fighters) {
  if (f.combatAuraOpacity > 0) throw new Error(`${f.characterId || f.name} combatAuraOpacity grew during countdown update: ${f.combatAuraOpacity}!`);
}

// Verify calling _drawSukunaCursedEnergyAura on Sukuna directly does nothing during countdown
mockCtx.clearCalls();
sukuna._drawSukunaCursedEnergyAura(mockCtx, 'red');
if (mockCtx.getCalls().length > 0) throw new Error('sukuna._drawSukunaCursedEnergyAura rendered calls during countdown!');

mockCtx.clearCalls();
sukuna._drawHandCursedEnergy(mockCtx);
// Should not draw cursed energy aura behind hand
if (mockCtx.getCalls().includes('quadraticCurveTo')) throw new Error('sukuna hand CE flame rendered during countdown!');

console.log('✅ All JJK Cursed Energy suppression during countdown tests PASSED!');
