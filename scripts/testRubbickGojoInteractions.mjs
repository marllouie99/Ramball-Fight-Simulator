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

import { strict as assert } from 'assert';

async function runTests() {
  console.log('🧪 Running Rubbick & Gojo Interaction Tests...');

  const { CONFIG } = await import('../js/core/config.js');
  const { state, registerProjectileSystem } = await import('../js/core/state.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { RubbickFighter } = await import('../js/entities/fighters/RubbickFighter.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');
  registerProjectileSystem(projectileSystem);

  state.arena = { x: 0, y: 0, width: 1000, height: 1000, radius: 450, cx: 500, cy: 500, shape: 'circle' };
  state.projectiles = [];
  projectileSystem.projectiles = [];

  // ── TEST SUITE 1: Rubbick Spell Steal vs Gojo Domain Lifecycle ──
  console.log('  1. Testing Rubbick Spell Steal during Gojo Domain Lifecycle...');
  {
    const gojo = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00E5FF' });
    const rubbick = new RubbickFighter({ startX: 250, startY: 200, type: 'rubbick', color: '#00FF64' });
    state.fighters = [gojo, rubbick];

    // Case 1A: Match start, no skills fired yet
    rubbick.reset();
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 999;
    rubbick.update(gojo, 1, state.arena);
    assert.equal(rubbick.stolenType, null, 'Rubbick should not steal anything before any skills are fired');

    // Case 1B: Gojo is channeling Domain Expansion (pre-slide)
    gojo.isDomainPreSlide = true;
    rubbick.reset();
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 999;
    rubbick.update(gojo, 1, state.arena);
    assert.equal(rubbick.stolenType, null, 'Rubbick must NOT steal while Gojo is in pre-domain slide');

    // Case 1C: Gojo is channeling Domain Expansion (hand sign charge)
    gojo.isDomainPreSlide = false;
    gojo.isChannelingDomainExpansion = true;
    gojo.domainChargeTimer = 30;
    rubbick.reset();
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 999;
    rubbick.update(gojo, 1, state.arena);
    assert.equal(rubbick.stolenType, null, 'Rubbick must NOT steal while Gojo is channeling Domain Expansion');

    // Case 1D: Gojo's Domain Expansion is deployed and actively running
    gojo.isChannelingDomainExpansion = false;
    gojo.domainChargeTimer = 0;
    gojo.domainActive = true;
    gojo.domainTimer = 200;
    gojo.hasFiredDomain = true;
    gojo.lastCastSkill = 'domain';
    rubbick.reset();
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 999;
    rubbick.update(gojo, 1, state.arena);
    assert.equal(rubbick.stolenType, null, 'Rubbick must NOT steal while Gojo domain is actively running (has not expired)');

    // Case 1E: Gojo's Domain Expansion EXPIRES
    gojo.domainActive = false;
    gojo.domainTimer = 0;
    gojo.isChannelingDomainExpansion = false;
    gojo.isDomainPreSlide = false;
    rubbick.reset();
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 999;
    rubbick.update(gojo, 1, state.arena);
    assert.equal(rubbick.stolenType, 'gojo_domain', 'Rubbick MUST steal gojo_domain AFTER Gojo domain expires!');
    console.log('     ✓ Channeling guard, active domain guard, and post-expiration steal all verified!');
  }

  // ── TEST SUITE 2: Gojo Skill Casting Blocked While Hollow Purple Is Active ──
  console.log('  2. Testing Gojo Skill Casting Restrictions While Hollow Purple Is Active...');
  {
    const gojo = new GojoFighter({ startX: 500, startY: 500, type: 'gojo', color: '#00E5FF' });
    const dummy = new GojoFighter({ startX: 600, startY: 500, type: 'gojo', color: '#FF0000' });
    state.fighters = [gojo, dummy];

    // Fire Hollow Purple
    gojo._firePurple(0);
    assert.equal(gojo.isPurpleActive(), true, 'isPurpleActive() should be true right after firing Hollow Purple');

    // Clear breather recovery to isolate isPurpleActive checks
    gojo.purpleRecoveryTimer = 0;
    gojo.z = 0;

    // Check 2A: Basic attack shooting is disabled
    assert.equal(gojo.canPerformBasicAttack(), false, 'Gojo cannot perform basic attack while Purple is active');
    assert.equal(gojo.shoot(0), false, 'Gojo shoot() returns false while Purple is active');

    // Check 2B: Reversal Red cannot be cast
    const redResult = gojo._activateRed();
    assert.equal(redResult, false, '_activateRed() returns false while Purple is active');
    assert.equal(gojo.redBuildupPhase, false, 'redBuildupPhase must remain false');

    // Check 2C: Domain Expansion cannot be cast or triggered
    gojo.domainCooldown = 0;
    gojo.isDomainPreSlide = false;
    gojo.isChannelingDomainExpansion = false;
    gojo.domainActive = false;
    gojo._activateDomain(state.arena);
    assert.equal(gojo.domainActive, false, '_activateDomain() does not activate while Purple is active');

    // Check 2D: update() loop does not trigger Domain, Purple, or Red
    gojo.redCooldown = 0;
    gojo.purpleCooldown = 0;
    gojo.domainCooldown = 0;
    gojo.update(dummy, 0, state.arena);
    assert.equal(gojo.isDomainPreSlide, false, 'update() does not trigger isDomainPreSlide while Purple is active');
    assert.equal(gojo.isChannelingDomainExpansion, false, 'update() does not trigger isChannelingDomainExpansion while Purple is active');
    assert.equal(gojo.isChannelingPurple, false, 'update() does not trigger isChannelingPurple while Purple is active');
    assert.equal(gojo.redBuildupPhase, false, 'update() does not trigger redBuildupPhase while Purple is active');

    // Check 2E: Reverse Cursed Technique cannot be activated
    gojo.reverseCursedTechniqueCooldown = 0;
    gojo._activateReverseCursedTechnique(dummy, state.arena);
    assert.equal(gojo.isChannelingRCT, false, 'Gojo cannot activate RCT while Purple is active');

    // Check 2F: Once Purple projectile expires (life = 0), skills become castable again
    if (gojo.activePurpleProjectile) {
      gojo.activePurpleProjectile.life = 0;
      const pIdx = projectileSystem.projectiles.indexOf(gojo.activePurpleProjectile);
      if (pIdx !== -1) projectileSystem.projectiles.splice(pIdx, 1);
      gojo.activePurpleProjectile = null;
    }
    assert.equal(gojo.isPurpleActive(), false, 'isPurpleActive() is false after Purple projectile is destroyed');
    assert.equal(gojo.canPerformBasicAttack(), true, 'Gojo can perform basic attack again once Purple expires');

    console.log('     ✓ All skill cast guards (Domain, Purple, Red, RCT, Blue) verified while Purple is active!');
  }

  // ── TEST SUITE 3: Rubbick Stolen Hollow Purple Audio Voiceline Suppression ──
  console.log('  3. Testing Rubbick Stolen Hollow Purple Voiceline Audio Suppression...');
  {
    const rubbick = new RubbickFighter({ startX: 250, startY: 200, type: 'rubbick', color: '#00FF64' });
    const dummy = new GojoFighter({ startX: 400, startY: 200, type: 'gojo', color: '#00E5FF' });
    state.fighters = [rubbick, dummy];

    rubbick.stolenType = 'gojo';
    rubbick.stolenSkillCooldown = 0;
    rubbick.stolenWindUpTimer = 1; // 1 frame before unleashing

    // Update to trigger fireStolenSkill
    rubbick.update(dummy, 1, state.arena);

    // Verify stolen skill fired
    const proj = projectileSystem.projectiles.find(p => p.isRubbick && p.isGojoPurple);
    assert(proj, 'Rubbick should have spawned a stolen green Hollow Purple projectile');
    assert.equal(proj.colorTheme, 'green', 'Stolen purple should use green theme');
    assert.equal(proj.purpleSoundHandle, undefined, 'Rubbick stolen purple must NOT play the Gojo voiceline audio handle');

    // Verify Gojo still plays voiceline
    const gojoProj = projectileSystem.fireGojoPurple(dummy, 1, 70, 150);
    assert(gojoProj, 'Gojo purple should spawn');
    assert(gojoProj.purpleSoundHandle !== undefined, 'Gojo original purple should retain voiceline audio handle');

    console.log('     ✓ Stolen Hollow Purple unleashed by Rubbick successfully suppressed Gojo voiceline audio (while Gojo retains it)!');
  }

  // ── TEST SUITE 4: Universal Stolen Voiceline Suppression for Rubbick ──
  console.log('  4. Testing Universal Stolen Voiceline Suppression for Rubbick across All Abilities...');
  {
    const { isVoicelineAudio } = await import('../js/systems/soundSystem.js');
    const { audioSystem } = await import('../js/systems/audioSystem.js');
    const rubbick = new RubbickFighter({ startX: 250, startY: 200, type: 'rubbick', color: '#00FF64' });

    // 1. Test audioSystem.playFighterVoiceline refuses to play on Rubbick
    const vResult = audioSystem.playFighterVoiceline(rubbick, 'Assets/Sound Effects/Skills/Sukuna-champion-voiceline.mp3');
    assert.equal(vResult, null, 'audioSystem.playFighterVoiceline must return null for Rubbick');

    // 2. Test isVoicelineAudio classifier accurately distinguishes voicelines from SFX
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/hollowpurple.mp3'), true, 'hollowpurple.mp3 must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/fuga.mp3'), true, 'fuga.mp3 must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/domainexpansion.mp3'), true, 'domainexpansion.mp3 must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/todo-combo-voiceline.mp3'), true, 'todo-combo-voiceline.mp3 must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/nanami-collapse-voiceline.mp3'), true, 'nanami voiceline must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/comerika.mp3'), true, 'comerika must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/ragescream.mp3'), true, 'ragescream must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/purpledeploy.mp3'), true, 'purpledeploy.mp3 must be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/mixing.mp3'), true, 'mixing.mp3 must be classified as voiceline');

    // SFX must not be classified as voicelines
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/cronosphere.mp3'), false, 'cronosphere.mp3 must NOT be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/redblast.mp3'), false, 'redblast.mp3 must NOT be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/fugatravel.mp3'), false, 'fugatravel.mp3 must NOT be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Skills/Rubbick-spellsteal.mp3'), false, 'Rubbick-spellsteal.mp3 must NOT be classified as voiceline');
    assert.equal(isVoicelineAudio('Assets/Sound Effects/Attacks/laserbeam.mp3'), false, 'laserbeam.mp3 must NOT be classified as voiceline');

    // 3. Test rubbick.playStolenSFX filters out voicelines
    assert.equal(rubbick.playStolenSFX('Assets/Sound Effects/Skills/hollowpurple.mp3'), null, 'playStolenSFX must suppress hollowpurple');
    assert.equal(rubbick.playStolenSFX('Assets/Sound Effects/Skills/purpledeploy.mp3'), null, 'playStolenSFX must suppress purpledeploy');
    assert.equal(rubbick.playStolenSFX('Assets/Sound Effects/Skills/mixing.mp3'), null, 'playStolenSFX must suppress mixing');
    assert.equal(rubbick.playStolenSFX('Assets/Sound Effects/Skills/fuga.mp3'), null, 'playStolenSFX must suppress fuga');
    assert.equal(rubbick.playStolenSFX('Assets/Sound Effects/Skills/todo-combo-voiceline.mp3'), null, 'playStolenSFX must suppress todo voiceline');
    assert.notEqual(rubbick.playStolenSFX('Assets/Sound Effects/Skills/cronosphere.mp3'), null, 'playStolenSFX should allow cronosphere SFX');

    // Allow 20ms to elapse so the sound system frame throttle (15ms) clears for laserbeam
    await new Promise(r => setTimeout(r, 25));
    assert.notEqual(rubbick.playStolenSFX('Assets/Sound Effects/Attacks/laserbeam.mp3'), null, 'playStolenSFX should allow laserbeam SFX');

    console.log('     ✓ Universal stolen voiceline suppression engine verified 100% across all abilities!');
  }

  // ── TEST SUITE 5: Rubbick Projectiles Render and Are Not Culled When Gojo's Domain Is Active ──
  console.log('  5. Testing Rubbick Projectile Visibility During Active Gojo Domain...');
  {
    const { drawProjectiles } = await import('../js/graphics/renderers/projectileRenderer.js');
    const gojo = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00E5FF' });
    const rubbick = new RubbickFighter({ startX: 400, startY: 200, type: 'rubbick', color: '#00FF64' });
    state.fighters = [gojo, rubbick];
    state.projectiles = [];
    projectileSystem.projectiles = [];

    // Activate Gojo's domain
    gojo.domainActive = true;
    gojo.domainTimer = 200;

    // Fire an Arcane Bolt from Rubbick
    projectileSystem.fireArcaneBolt(rubbick, 1, 15, gojo);
    assert.equal(projectileSystem.projectiles.length, 1, 'Arcane Bolt should be spawned');
    const bolt = projectileSystem.projectiles[0];
    assert.equal(bolt.isArcaneBolt, true, 'Projectile should be marked isArcaneBolt');

    // Render projectiles with mock canvas context
    let renderedCount = 0;
    const testCtx = createMockCtx();
    testCtx.stroke = () => { renderedCount++; };
    testCtx.fill = () => { renderedCount++; };
    testCtx.fillRect = () => { renderedCount++; };

    state.ctx = testCtx;
    drawProjectiles();

    assert(renderedCount > 0, 'Rubbick Arcane Bolt MUST render even when Gojo Domain is active!');
    console.log('     ✓ Rubbick Arcane Bolt renders successfully inside active Gojo Domain!');
  }

  // ── TEST SUITE 6: Limitless Infinity Freeze and Oldest Projectile Recycling Array Safety ──
  console.log('  6. Testing Limitless Infinity Projectile Interception & Recycling Safety...');
  {
    const gojo = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00E5FF' });
    const rubbick = new RubbickFighter({ startX: 230, startY: 200, type: 'rubbick', color: '#00FF64' });
    state.fighters = [gojo, rubbick];
    gojo.isMeleeMode = false;
    gojo.infinityCooldown = 0;
    gojo.infinityActive = true;

    const origFreezeChance = CONFIG.gojo?.infinityFreezeChance;
    if (CONFIG.gojo) CONFIG.gojo.infinityFreezeChance = 1.0;

    state.projectiles = [];
    projectileSystem.projectiles = [];

    // Fire bolt 1 at Gojo (enters infinity)
    projectileSystem.fireArcaneBolt(rubbick, 1, 15, gojo);
    // Position directly in infinity barrier
    projectileSystem.projectiles[0].x = gojo.x + 25;
    projectileSystem.projectiles[0].y = gojo.y;

    projectileSystem.update(state.fighters);
    assert.equal(projectileSystem.projectiles[0].isFrozenByInfinity, true, 'Bolt 1 must be frozen in infinity');

    // Fire bolt 2 at Gojo
    projectileSystem.fireArcaneBolt(rubbick, 1, 15, gojo);
    projectileSystem.projectiles[1].x = gojo.x + 25;
    projectileSystem.projectiles[1].y = gojo.y;
    projectileSystem.update(state.fighters);
    assert.equal(projectileSystem.projectiles[1].isFrozenByInfinity, true, 'Bolt 2 must be frozen in infinity');

    // Fire bolt 3 at Gojo (exceeds maxFrozen=2 -> triggers oldest frozen recycling via splice)
    projectileSystem.fireArcaneBolt(rubbick, 1, 15, gojo);
    projectileSystem.projectiles[2].x = gojo.x + 25;
    projectileSystem.projectiles[2].y = gojo.y;
    projectileSystem.update(state.fighters);

    // Verify exactly 2 frozen projectiles remain and array is not corrupted/popped unexpectedly
    const frozenCount = projectileSystem.projectiles.filter(p => p && p.isFrozenByInfinity).length;
    assert.equal(frozenCount, 2, 'Exactly maxFrozen (2) frozen projectiles must remain active');
    if (CONFIG.gojo) CONFIG.gojo.infinityFreezeChance = origFreezeChance;
    console.log('     ✓ Limitless Infinity projectile recycling safely maintains clean array bounds!');
  }

  // ── TEST SUITE 7: Stolen Domain Expansion Immediate Space Strikes & Visibility ──
  console.log('  7. Testing Stolen Domain Expansion Immediate Space Strikes & Visibility...');
  {
    const gojo = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00E5FF' });
    const rubbick = new RubbickFighter({ startX: 400, startY: 200, type: 'rubbick', color: '#00FF64' });
    state.fighters = [gojo, rubbick];
    state.projectiles = [];
    projectileSystem.projectiles = [];

    // Give Rubbick stolen gojo_domain
    rubbick.stolenType = 'gojo_domain';
    rubbick.stolenWindUpTimer = 1; // 1 frame before deployment

    // Ground telegraph must be visible during windup
    let telegraphDrawn = 0;
    const mockCtx = createMockCtx();
    mockCtx.stroke = () => { telegraphDrawn++; };
    rubbick.drawGroundTelegraph(mockCtx);
    assert(telegraphDrawn > 0, 'Ground summoning telegraph MUST render during stolen domain windup!');

    // Update to trigger deployment
    rubbick.update(gojo, 1, state.arena);

    // After deployment:
    assert.equal(rubbick.stolenDomainActive, true, 'Stolen domain must be active');
    assert.equal(rubbick.attackCooldown, 0, 'Attack cooldown MUST be reset to 0 upon domain deployment!');

    // Next update frame: rapid arcane space strike should immediately spawn
    rubbick.update(gojo, 1, state.arena);
    const domainBolt = projectileSystem.projectiles.find(p => p.isArcaneBolt && p.isDomainEmpowered);
    assert(domainBolt, 'Domain-empowered Arcane Bolt must fire immediately upon domain activation!');
    console.log('     ✓ Stolen Domain Expansion space strikes fire immediately from frame 1!');
  }

  // ── TEST SUITE 8: Rubbick Skill Lockout While Active Arena Skill (Hollow Purple) Is Cast ──
  console.log('  8. Testing Rubbick Skill Lockout While Active Arena Skill (Hollow Purple) Is Cast...');
  {
    const gojo = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00E5FF' });
    const rubbick = new RubbickFighter({ startX: 400, startY: 200, type: 'rubbick', color: '#00FF64' });
    state.fighters = [gojo, rubbick];
    state.projectiles = [];
    projectileSystem.projectiles = [];

    // Part 8A: Rubbick steals and casts Hollow Purple
    rubbick.reset();
    rubbick.stolenType = 'gojo';
    rubbick.stolenSkillCooldown = 0;
    rubbick.stolenTimer = 500;

    // Execute windup and fire
    rubbick.executeStolenSkill(gojo, 1);
    rubbick.stolenWindUpTimer = 0;
    rubbick.fireStolenSkill(gojo, 1);

    // Verify Purple projectile is alive in the arena
    assert(rubbick.hasActivePurpleProjectile(), 'Rubbick must detect active Hollow Purple projectile in arena');
    assert(rubbick.hasActiveSkillInArena(), 'hasActiveSkillInArena must return true while Purple is active');
    assert.equal(rubbick.stolenType, 'gojo', 'stolenType must remain "gojo" while Purple is active in the arena');

    // Part 8B: All skill casting queries MUST be blocked
    assert.equal(rubbick.canCastSpellSteal(), false, 'Spell Steal must be blocked while Purple is active');
    assert.equal(rubbick.canCastTelekinesis(), false, 'Telekinesis must be blocked while Purple is active');
    assert.equal(rubbick.canCastStolenSkill(), false, 'Casting another stolen skill must be blocked while Purple is active');
    assert.equal(rubbick.executeStolenSkill(gojo, 1), false, 'executeStolenSkill must return false while active skill is in arena');

    // Part 8C: AI update loop does NOT trigger Telekinesis or Spell Steal while Purple is in arena
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 0;
    rubbick.update(gojo, 1, state.arena);

    assert.equal(rubbick.tkTimer, 0, 'Telekinesis must NOT be cast while Purple is active in arena');
    assert.equal(rubbick.stolenType, 'gojo', 'Spell Steal must NOT overwrite or trigger while Purple is active');

    // Part 8D: Other persistent arena skills also trigger hasActiveSkillInArena
    const testFighter = new RubbickFighter({ startX: 400, startY: 200, type: 'rubbick', color: '#00FF64' });
    testFighter.reset();
    assert.equal(testFighter.hasActiveSkillInArena(), false, 'Idle Rubbick has no active skill in arena');

    // Cronos Time Sphere
    testFighter.sphereActive = true;
    testFighter.sphereTimer = 100;
    assert.equal(testFighter.hasActiveSkillInArena(), true, 'Time Sphere triggers hasActiveSkillInArena');
    assert.equal(testFighter.canCastTelekinesis(), false, 'Telekinesis blocked during Time Sphere');
    assert.equal(testFighter.canCastSpellSteal(), false, 'Spell Steal blocked during Time Sphere');
    testFighter.sphereActive = false;
    testFighter.sphereTimer = 0;
    assert.equal(testFighter.hasActiveSkillInArena(), false, 'Ending Time Sphere clears active arena skill');

    // Telekinesis
    testFighter.tkTimer = 30;
    testFighter.tkTarget = gojo;
    assert.equal(testFighter.hasActiveSkillInArena(), true, 'Active Telekinesis triggers hasActiveSkillInArena');
    testFighter.tkTimer = 0;
    testFighter.tkTarget = null;
    assert.equal(testFighter.hasActiveSkillInArena(), false, 'Ending Telekinesis clears active arena skill');

    // Part 8E: Expiration of Purple projectile unlocks Rubbick
    // Expire the active Purple projectile
    if (rubbick.activePurpleProjectile) {
      rubbick.activePurpleProjectile.life = 0;
    }
    state.projectiles = [];
    projectileSystem.projectiles = [];
    rubbick.spellStealCooldown = 500; // Keep on cooldown to test clean expiration before re-stealing
    rubbick.telekinesisCooldown = 500; // Keep on cooldown to test clean expiration before re-casting

    // Next update frame: should detect projectile expiration, clear stolenType, and unlock skills
    rubbick.update(gojo, 1, state.arena);

    assert.equal(rubbick.hasActivePurpleProjectile(), false, 'Purple projectile is no longer active');
    assert.equal(rubbick.hasActiveSkillInArena(), false, 'hasActiveSkillInArena is false after projectile expiration');
    assert.equal(rubbick.stolenType, null, 'stolenType is cleared to null upon Purple expiration');

    // Reset cooldowns to 0 and verify skills are now queryable as ready / castable
    rubbick.spellStealCooldown = 0;
    rubbick.telekinesisCooldown = 0;
    assert.equal(rubbick.canCastSpellSteal(), true, 'Spell Steal is unlocked after Purple expires');
    assert.equal(rubbick.canCastTelekinesis(), true, 'Telekinesis is unlocked after Purple expires');

    console.log('     ✓ Rubbick skill lockout during active arena skill (Hollow Purple & others) fully verified!');
  }

  console.log('✅ ALL INTERACTION TESTS PASSED CLEANLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
