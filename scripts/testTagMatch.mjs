// Automated Tag Match (3v3 Relay) Simulation Test Suite

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
    rect: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    setTransform: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: noop,
  };
}

globalThis.Audio = class {
  constructor() {
    this.play = () => Promise.resolve();
    this.pause = () => {};
    this.volume = 1;
    this.currentTime = 0;
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
    this.cloneNode = () => new globalThis.Audio();
  }
};

globalThis.window = {
  innerWidth: 520,
  innerHeight: 920,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
const mockCanvas = {
  width: 520,
  height: 920,
  getContext: () => createMockCtx(),
  style: {},
};

globalThis.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 520,
        height: 920,
        getContext: () => createMockCtx(),
        style: {},
      };
    }
    return {
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false,
      },
      appendChild: () => {},
      removeChild: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      setAttribute: () => {},
      getAttribute: () => null,
    };
  },
  getElementById: (id) => mockCanvas,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: {
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
  },
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.performance = { now: () => Date.now() };

async function runTagMatchTests() {
  console.log('🥋 [Tag Match Test Suite] Starting 3v3 Relay mode tests...');

  const { state } = await import('../js/core/state.js');
  const { GAME_MODES, MODE_SETTINGS } = await import('../js/core/modeConfig.js');
  const { reinitFighters, spawnTagInFighter } = await import('../js/core/gameFlow.js');

  state.canvas = document.createElement('canvas');
  state.ctx = state.canvas.getContext('2d');
  state.topLevelUiCanvas = document.createElement('canvas');
  state.topLevelUiCtx = state.topLevelUiCanvas.getContext('2d');
  state.mode = GAME_MODES.TAG_MATCH;

  // Test 1: Mode Configuration
  console.log('   1. Checking Mode Configuration...');
  if (!MODE_SETTINGS[GAME_MODES.TAG_MATCH]) {
    throw new Error('MODE_SETTINGS[TAG_MATCH] is not defined!');
  }
  if (MODE_SETTINGS[GAME_MODES.TAG_MATCH].rounds !== 1) {
    throw new Error(`Expected rounds = 1 for TAG_MATCH, got ${MODE_SETTINGS[GAME_MODES.TAG_MATCH].rounds}`);
  }
  console.log('      ✅ Mode config verified.');

  // Test 2: Roster & Initialization
  console.log('   2. Testing Tag Match Initialization & Roster Setup...');
  state.p1Index = 0; // Red 1
  state.p3Index = 2; // Red 2
  state.p5Index = 4; // Red 3
  state.p2Index = 1; // Blue 1
  state.p4Index = 3; // Blue 2
  state.p6Index = 5; // Blue 3

  state.gameState = 'playing';
  reinitFighters(true);

  if (!state.tagMatch) {
    throw new Error('state.tagMatch was not initialized!');
  }
  if (state.tagMatch.team0Roster.length !== 3 || state.tagMatch.team1Roster.length !== 3) {
    throw new Error(`Rosters not properly sized: team0=${state.tagMatch.team0Roster.length}, team1=${state.tagMatch.team1Roster.length}`);
  }
  if (state.fighters.length !== 2) {
    throw new Error(`Expected exactly 2 active fighters in Tag Match arena, found ${state.fighters.length}`);
  }
  if (state.getFighterTeam(0) !== 0 || state.getFighterTeam(1) !== 1) {
    throw new Error(`Team assignment mismatch: team(0)=${state.getFighterTeam(0)}, team(1)=${state.getFighterTeam(1)}`);
  }
  console.log('      ✅ Roster & initial active fighters verified.');

  // Test 3: Tag-In on First Elimination
  console.log('   3. Testing First Fighter Elimination & Tag-In...');
  const redFighter1 = state.fighters[0];
  redFighter1.hp = 0;
  redFighter1.dead = true;
  redFighter1.checkRoundOrMatchEnd();

  if (state.tagMatch.team0ActiveSlot !== 1) {
    throw new Error(`Expected team0ActiveSlot = 1, got ${state.tagMatch.team0ActiveSlot}`);
  }
  if (state.tagMatch.team0Eliminations !== 1) {
    throw new Error(`Expected team0Eliminations = 1, got ${state.tagMatch.team0Eliminations}`);
  }
  if (state.fighters.length !== 2) {
    throw new Error(`Expected exactly 2 active fighters after tag-in, found ${state.fighters.length}`);
  }
  const redFighter2 = state.fighters[0];
  if (redFighter2 === redFighter1) {
    throw new Error('Fighter 0 was not replaced with new tag-in instance!');
  }
  if (redFighter2.hp <= 0 || redFighter2.dead) {
    throw new Error('New tag-in fighter is not alive/healthy!');
  }
  if (redFighter2.invulnerableTimer <= 0) {
    throw new Error('New tag-in fighter should have invulnerability frames active!');
  }
  if (state.gameState !== 'playing') {
    throw new Error(`Game state should remain 'playing' after tag-in, but is '${state.gameState}'`);
  }
  console.log('      ✅ First Tag-In successfully spawned and active.');

  // Test 4: Second Elimination & Tag-In
  console.log('   4. Testing Second Fighter Elimination & Tag-In...');
  redFighter2.hp = 0;
  redFighter2.dead = true;
  redFighter2.checkRoundOrMatchEnd();

  if (state.tagMatch.team0ActiveSlot !== 2) {
    throw new Error(`Expected team0ActiveSlot = 2, got ${state.tagMatch.team0ActiveSlot}`);
  }
  if (state.tagMatch.team0Eliminations !== 2) {
    throw new Error(`Expected team0Eliminations = 2, got ${state.tagMatch.team0Eliminations}`);
  }
  const redFighter3 = state.fighters[0];
  if (redFighter3 === redFighter2) {
    throw new Error('Fighter 0 was not replaced with third tag-in instance!');
  }
  if (state.gameState !== 'playing') {
    throw new Error(`Game state should remain 'playing' after second tag-in, but is '${state.gameState}'`);
  }
  console.log('      ✅ Second Tag-In successfully spawned and active.');

  // Test 5: Final Elimination & Match End Win Condition
  console.log('   5. Testing Final Elimination & Match End...');
  redFighter3.hp = 0;
  redFighter3.dead = true;
  redFighter3.checkRoundOrMatchEnd();

  if (state.gameState !== 'matchEnd') {
    throw new Error(`Expected gameState = 'matchEnd' after 3 eliminations, got '${state.gameState}'`);
  }
  if (state.winningTeam !== 1) {
    throw new Error(`Expected winningTeam = 1 (Blue Team), got ${state.winningTeam}`);
  }
  if (!state.matchWinner) {
    throw new Error('state.matchWinner was not set on matchEnd!');
  }
  console.log('      ✅ Match End and Blue Team victory verified cleanly.');

  console.log('───────────────────────────────────────────────────────');
  console.log('🎉 ALL TAG MATCH (3v3 RELAY) TESTS PASSED SUCCESSFULLY!');
}

runTagMatchTests().catch(err => {
  console.error('❌ Tag Match Test Failed:', err);
  process.exit(1);
});
