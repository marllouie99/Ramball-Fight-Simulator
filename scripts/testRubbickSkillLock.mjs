function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => { _stackDepth++; },
    restore: () => { _stackDepth--; },
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
  removeItem: () => {},
  clear: () => {}
};

async function runTest() {
  const { CONFIG } = await import('../js/core/config.js');
  const { state, registerProjectileSystem } = await import('../js/core/state.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { RubbickFighter } = await import('../js/entities/fighters/RubbickFighter.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');
  registerProjectileSystem(projectileSystem);

  state.arena = { x: 50, y: 50, width: 440, height: 860, shape: 'circle', radius: 220, cx: 270, cy: 480 };
  state.canvas = { width: 540, height: 960 };

  const gojo = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00E5FF' });
  const rubbick = new RubbickFighter({ startX: 300, startY: 300, type: 'rubbick', color: '#00FF64' });
  state.fighters = [gojo, rubbick];

  // Test 1: Rubbick steals Hollow Purple
  rubbick.stolenType = 'gojo';
  rubbick.stolenTimer = 600;
  rubbick.stolenSkillCooldown = 0;
  rubbick.stolenWindUpTimer = 0;
  rubbick._hasFiredStolenSkillTrick = false;

  console.log('--- TEST 1: Right after stealing Gojo skill ---');
  rubbick.update(gojo, 1, state.arena);
  console.log('stolenType after 1 tick:', rubbick.stolenType);
  console.log('stolenWindUpTimer:', rubbick.stolenWindUpTimer);

  // Fast forward wind-up
  while (rubbick.stolenWindUpTimer > 0) {
    rubbick.update(gojo, 1, state.arena);
  }
  // Next frame should fire
  rubbick.update(gojo, 1, state.arena);

  console.log('--- TEST 2: Right after firing Hollow Purple ---');
  console.log('activePurpleProjectile:', Boolean(rubbick.activePurpleProjectile));
  console.log('hasActivePurpleProjectile():', rubbick.hasActivePurpleProjectile());
  console.log('hasActiveSkillInArena():', rubbick.hasActiveSkillInArena());
  console.log('canCastSpellSteal():', rubbick.canCastSpellSteal());
  console.log('canCastTelekinesis():', rubbick.canCastTelekinesis());
  console.log('canCastStolenSkill():', rubbick.canCastStolenSkill());

  // Simulate 30 frames of Hollow Purple flying
  let canCastAnySkillDuringFlight = false;
  for (let f = 1; f <= 30; f++) {
    rubbick.telekinesisCooldown = 0; // Force CD ready
    rubbick.spellStealCooldown = 0;   // Force CD ready
    rubbick.update(gojo, 1, state.arena);
    projectileSystem.update(state.fighters);

    if (rubbick.canCastSpellSteal() || rubbick.canCastTelekinesis() || rubbick.canCastStolenSkill()) {
      canCastAnySkillDuringFlight = true;
      console.log(`Frame ${f}: Skill cast was NOT blocked! canCastSpellSteal=${rubbick.canCastSpellSteal()}, canCastTK=${rubbick.canCastTelekinesis()}`);
    }
  }

  console.log('canCastAnySkillDuringFlight (should be false):', canCastAnySkillDuringFlight);

  console.log('--- TEST 3: After Hollow Purple detonates / expires ---');
  // Detonate / expire the projectile
  if (rubbick.activePurpleProjectile) {
    rubbick.activePurpleProjectile._hasExploded = true;
    rubbick.activePurpleProjectile.life = 0;
  }
  // Fast forward 1 frame
  rubbick.update(gojo, 1, state.arena);
  console.log('tkTimer:', rubbick.tkTimer, 'tkTarget:', Boolean(rubbick.tkTarget));
  console.log('stolenWindUpTimer:', rubbick.stolenWindUpTimer);
  console.log('hasActivePurpleProjectile():', rubbick.hasActivePurpleProjectile());
  console.log('hasActiveSkillInArena():', rubbick.hasActiveSkillInArena());
  console.log('stolenType (should be null):', rubbick.stolenType);
  rubbick.telekinesisCooldown = 0;
  rubbick.spellStealCooldown = 0;
  console.log('canCastSpellSteal():', rubbick.canCastSpellSteal());
  console.log('canCastTelekinesis():', rubbick.canCastTelekinesis());
}

runTest();
