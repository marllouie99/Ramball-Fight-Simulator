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
    scale: noop,
    rotate: noop,
    translate: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    drawImage: noop,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
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
    return { style: {}, classList: { add: () => {}, remove: () => {} }, textContent: '', innerHTML: '' };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    return { style: {}, classList: { add: () => {}, remove: () => {} } };
  },
  body: { style: {} }
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.Audio = class {
  constructor() {
    this.play = () => Promise.resolve();
    this.pause = () => {};
    this.cloneNode = () => new globalThis.Audio();
  }
};

async function main() {
  const { state } = await import('../js/core/state.js');
  const { GAME_MODES } = await import('../js/core/modeConfig.js');
  const { Fighter } = await import('../js/entities/fighter.js');
  const { RubyFighter } = await import('../js/entities/fighters/RubyFighter.js');
  const { BlackHoleBehavior } = await import('../js/systems/projectiles/behaviors/BlackHoleBehavior.js');
  const { GojoBlueBehavior } = await import('../js/systems/projectiles/behaviors/GojoBlueBehavior.js');
  const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
  const { GetsugaBehavior } = await import('../js/systems/projectiles/behaviors/GetsugaBehavior.js');

  console.log('🧲 [Team Pulling Mechanics Test Suite] Starting verification...');

  state.canvas = mockCanvas;
  state.ctx = mockCtx;
  state.arena = { x: 0, y: 0, width: 540, height: 960 };
  state.projectiles = [];
  state.illusions = [];
  state.fighters = [];
  state.gameState = 'playing';

  let errors = 0;

  const blackHoleBehavior = new BlackHoleBehavior();
  const gojoBlueBehavior = new GojoBlueBehavior();
  const gojoPurpleBehavior = new GojoPurpleBehavior();
  const getsugaBehavior = new GetsugaBehavior();

  const mockSystem = {
    get projectiles() { return state.projectiles || []; },
    checkProjectileHits: () => false,
    isProjectileExpired: () => false,
    unfreezeCronosProjectiles: () => {}
  };

  // Helper to set team mode
  const setupTeamMatch = (mode) => {
    state.mode = mode;
    state.projectiles = [];
    state.illusions = [];
    
    // Team 1: p0, p1 (Teammates)
    // Team 2: p2, p3 (Enemies)
    const p0 = new Fighter({ startX: 200, startY: 200, radius: 25, type: 'default', color: '#00F' });
    const p1 = new Fighter({ startX: 220, startY: 200, radius: 25, type: 'default', color: '#00F' });
    const p2 = new Fighter({ startX: 300, startY: 200, radius: 25, type: 'default', color: '#F00' });
    const p3 = new Fighter({ startX: 320, startY: 200, radius: 25, type: 'default', color: '#F00' });
    
    p0.team = 1;
    p1.team = 1;
    p2.team = 2;
    p3.team = 2;
    
    state.fighters = [p0, p1, p2, p3];

    state.getFighterTeam = (idx) => {
      if (idx === 0 || idx === 1) return 1;
      if (idx === 2 || idx === 3) return 2;
      return null;
    };

    return { p0, p1, p2, p3 };
  };

  const teamModes = [
    GAME_MODES.TWO_VS_TWO,
    GAME_MODES.STAND_OFF_1V2,
    GAME_MODES.TACTICAL_2V2,
    GAME_MODES.TACTICAL_4V4,
    '2v2',
    '1v2 Stand Off',
    'Tactical 2v2'
  ];

  for (const mode of teamModes) {
    console.log(`\nTesting mode: "${mode}"`);

    // ── 1. Black Hole Pull Test ──
    {
      const { p0, p1, p2 } = setupTeamMatch(mode);
      p0.x = 250; p0.y = 250;
      p1.x = 240; p1.y = 250; // Teammate near black hole center (dist = 10 < effectiveRadius = 125)
      p2.x = 260; p2.y = 250; // Enemy near black hole center (dist = 10 < effectiveRadius = 125)

      const blackHoleProj = {
        x: 250,
        y: 250,
        r: 100,
        active: true,
        transformed: true,
        isBlackHole: true,
        owner: 0,
        ownerIndex: 0,
        ownerFighter: p0,
        gravityRadius: 300,
        gravityForce: 15,
        damage: 5,
        tickTimer: 0
      };
      state.projectiles = [blackHoleProj];

      p1.vx = 0; p1.vy = 0;
      p2.vx = 0; p2.vy = 0;

      blackHoleBehavior.update(blackHoleProj, state.fighters, mockSystem, state.ctx);

      if (p1.vx !== 0 || p1.vy !== 0) {
        console.error(`❌ [Black Hole]: Teammate p1 was accelerated/pulled in mode ${mode}: vx=${p1.vx}, vy=${p1.vy}`);
        errors++;
      }
      if (p2.vx === 0 && p2.vy === 0) {
        console.error(`❌ [Black Hole]: Enemy p2 was NOT pulled in mode ${mode}`);
        errors++;
      }
    }

    // ── 2. Gojo Lapse Blue Pull Test ──
    {
      const { p0, p1, p2 } = setupTeamMatch(mode);
      p0.x = 250; p0.y = 250;
      p1.x = 240; p1.y = 250; // Teammate
      p2.x = 260; p2.y = 250; // Enemy

      const blueProj = {
        x: 250,
        y: 250,
        r: 80,
        active: true,
        isGojoBlue: true,
        owner: 0,
        ownerIndex: 0,
        ownerFighter: p0,
        damage: 10,
        pullRadius: 200,
        life: 100,
        maxLife: 100
      };
      state.projectiles = [blueProj];

      p1.vx = 0; p1.vy = 0;
      p2.vx = 0; p2.vy = 0;

      gojoBlueBehavior.update(blueProj, state.fighters, mockSystem);

      if (p1.x !== 240 || p1.y !== 250) {
        console.error(`❌ [Gojo Lapse Blue]: Teammate p1 was accelerated/pulled in mode ${mode}: x=${p1.x}, y=${p1.y}`);
        errors++;
      }
      if (p2.x === 260 && p2.y === 250) {
        console.error(`❌ [Gojo Lapse Blue]: Enemy p2 was NOT pulled in mode ${mode}`);
        errors++;
      }
    }

    // ── 3. Gojo Hollow Purple Gravitational Vortex Test ──
    {
      const { p0, p1, p2 } = setupTeamMatch(mode);
      p0.x = 250; p0.y = 250;
      p1.x = 240; p1.y = 250; // Teammate
      p2.x = 260; p2.y = 250; // Enemy

      const purpleProj = {
        x: 250,
        y: 250,
        r: 120,
        active: true,
        isGojoPurple: true,
        phase: 1, // Gravitational vortex phase
        owner: 0,
        ownerIndex: 0,
        ownerFighter: p0,
        damage: 15,
        life: 200,
        maxLife: 200
      };
      state.projectiles = [purpleProj];

      gojoPurpleBehavior.update(purpleProj, state.fighters, mockSystem);

      if (p1.x !== 240 || p1.y !== 250) {
        console.error(`❌ [Gojo Hollow Purple]: Teammate p1 was moved/pulled in mode ${mode}: x=${p1.x}, y=${p1.y}`);
        errors++;
      }
      if (p2.x === 260 && p2.y === 250) {
        console.error(`❌ [Gojo Hollow Purple]: Enemy p2 was NOT pulled in mode ${mode}`);
        errors++;
      }
    }

    // ── 4. Ruby Scythe Hook & Pull Test ──
    {
      const { p0, p1, p2 } = setupTeamMatch(mode);
      const ruby = new RubyFighter({ startX: 100, startY: 100, radius: 25, type: 'ruby', color: '#E11D48' });
      ruby.team = 1;
      state.fighters[0] = ruby;

      // Teammate p1 is very close to Ruby (distance 50)
      p1.x = 150; p1.y = 100;
      // Enemy p2 is at distance 100
      p2.x = 200; p2.y = 100;

      // When Ruby attempts active pull hook targeting on teammate
      ruby.activePullCooldown = 0;
      ruby._tryActivePull(p1);
      if (ruby.primaryHookTarget === p1 || ruby.activePullActive) {
        console.error(`❌ [Ruby Hook]: Ruby started hook targeting against teammate p1 in mode ${mode}`);
        errors++;
      }

      // When Ruby attempts active pull hook targeting on enemy
      ruby.activePullCooldown = 0;
      ruby.activePullActive = false;
      ruby.primaryHookTarget = null;
      ruby._tryActivePull(p2);
      if (ruby.primaryHookTarget !== p2 || !ruby.activePullActive) {
        console.error(`❌ [Ruby Hook]: Ruby failed to start hook against enemy p2 in mode ${mode}`);
        errors++;
      }
    }

    // ── 5. Getsuga Tensho Wave Drag Teammate Release Test ──
    {
      const { p0, p1, p2 } = setupTeamMatch(mode);
      const getsugaProj = {
        x: 200,
        y: 200,
        vx: 8,
        vy: 0,
        r: 60,
        active: true,
        isGetsuga: true,
        attackerFighter: p0,
        owner: 0,
        ownerIndex: 0,
        draggedTargets: new Map([
          [p1, 20],
          [p2, 20]
        ])
      };
      state.projectiles = [getsugaProj];

      getsugaBehavior.update(getsugaProj, state.fighters, mockSystem);

      const p1StillDragged = getsugaProj.draggedTargets.has(p1);
      const p2StillDragged = getsugaProj.draggedTargets.has(p2);

      if (p1StillDragged) {
        console.error(`❌ [Getsuga Tensho]: Teammate p1 remained dragged by Getsuga wave in mode ${mode}`);
        errors++;
      }
      if (!p2StillDragged) {
        console.error(`❌ [Getsuga Tensho]: Enemy p2 was NOT kept in wave drag in mode ${mode}`);
        errors++;
      }
    }
  }

  console.log('\n───────────────────────────────────────────────────────');
  if (errors === 0) {
    console.log('✅ ALL PULL MECHANIC TEAM-MODE TESTS PASSED! (0 errors)');
    process.exit(0);
  } else {
    console.error(`🚨 ${errors} pull mechanic team-mode errors found!`);
    process.exit(1);
  }
}

main();
