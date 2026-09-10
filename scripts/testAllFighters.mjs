// Comprehensive Automated Fighter Runtime, Simulation & Canvas Stack Integrity Test Suite

// Setup global browser mock environment before loading game modules
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;

  return {
    save: () => {
      _stackDepth++;
    },
    restore: () => {
      _stackDepth--;
      if (_stackDepth < 0) {
        throw new Error(`[CANVAS STACK CORRUPTION] ctx.restore() called when stackDepth is ${_stackDepth} (extra restore call)`);
      }
    },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arc: noop,
    arcTo: noop,
    ellipse: noop,
    rect: noop,
    roundRect: noop,
    setLineDash: noop,
    getLineDash: () => [],
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 50 }),
    drawImage: noop,
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
  removeItem: () => {}
};

function assertCanvasStackBalance(locationTag) {
  const depth = mockCtx.getStackDepth();
  if (depth !== 0) {
    mockCtx.resetStackDepth();
    throw new Error(`[CANVAS TRANSFORM STACK CORRUPTION] Unbalanced stack depth = ${depth} after ${locationTag}`);
  }
}

async function main() {
  const { CONFIG, FIGHTER_DEFS, TACTICAL_FIGHTER_DEFS } = await import('../js/core/config.js');
  const { FIGHTER_CLASS_MAP } = await import('../js/entities/factories/fighterFactory.js');
  const { state } = await import('../js/core/state.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');
  const { drawGetsugaSlash } = await import('../js/graphics/weapons/ichigoWeaponGraphics.js');
  const { drawTodoTakadaIdolScreenOverlay } = await import('../js/graphics/renderers/effectsRenderer.js');
  const { spawnBlackFlash, updateBlackFlashEffects, drawBlackFlashEffects, clearBlackFlashEffects } = await import('../js/graphics/particles/blackFlashEffect.js');
  const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
  const { drawWeaponPreview, drawWeaponMenu } = await import('../js/graphics/ui/WeaponIndexScreen.js');
  const { drawSelectScreen } = await import('../js/graphics/ui/CharacterSelectScreen.js');
  const { drawTitleScreen } = await import('../js/graphics/ui/MainMenuScreen.js');
  const { drawIndexScreen } = await import('../js/graphics/ui/FighterIndexScreen.js');
  const { drawRubbickDomainDimScreen, drawBankaiImpactDimScreen } = await import('../js/graphics/renderers/arenaRenderer.js');
  const { drawCjBaguvixDimScreen } = await import('../js/graphics/renderers/environmentalRenderer.js');
  const { drawFighters } = await import('../js/graphics/renderers/EntityRenderer.js');
  const { audioSystem } = await import('../js/systems/audioSystem.js');

  console.log('🥋 [Fighter Runtime Test Suite] Testing all fighters across simulation states & Canvas 2D stack balance...');

  state.canvas = mockCanvas;
  state.ctx = mockCtx;
  state.arena = { x: 0, y: 0, width: 540, height: 960 };
  state.fighters = [];
  state.gameState = 'playing';
  state.pixiLayers = {
    projectiles: { addChild: () => {} },
    environment: { addChild: () => {} }
  };

  let totalTested = 0;
  let errors = 0;

  const allDefs = [...FIGHTER_DEFS, ...(TACTICAL_FIGHTER_DEFS || [])];

  for (const def of allDefs) {
    const fType = def.type || def.characterId || def.id;
    const FighterClass = FIGHTER_CLASS_MAP[fType];
    if (!FighterClass) continue;

    try {
      const fighter = new FighterClass({
        ...def,
        startX: 270,
        startY: 480,
        startVx: 0,
        startVy: 0
      });

      const dummyOpponent = new FighterClass({ ...def, startX: 200, startY: 200 });
      state.fighters = [fighter, dummyOpponent];
      totalTested++;

      // 1. Base update & draw
      mockCtx.resetStackDepth();
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' base draw`);

      // 2. Melee & shooting animation states
      mockCtx.resetStackDepth();
      fighter.isSlashing = true;
      fighter.slashSwingTimer = 15;
      fighter.slashSwingMaxTimer = 22;
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' melee slash state`);
      fighter.isSlashing = false;
      fighter.slashSwingTimer = 0;

      // 3. Parry / block states
      mockCtx.resetStackDepth();
      fighter.blockPoseTimer = 10;
      fighter.parryHitAnimTimer = 8;
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' block/parry state`);
      fighter.blockPoseTimer = 0;
      fighter.parryHitAnimTimer = 0;

      // 4. Stun / Infinity Freeze / TimeStop states
      mockCtx.resetStackDepth();
      fighter.isFrozenByInfinity = true;
      fighter.timeStopTimer = 20;
      fighter.update(dummyOpponent, 0, state.arena);
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' stun/timestop state`);
      fighter.isFrozenByInfinity = false;
      fighter.timeStopTimer = 0;

      // 4.5. Movement Velocity Recovery & Watchdog Verification
      if (typeof fighter.isStationarySkillActive !== 'function') {
        throw new Error(`Fighter '${fType}' missing isStationarySkillActive method!`);
      }
      if (typeof fighter.resumeMovement !== 'function') {
        throw new Error(`Fighter '${fType}' missing resumeMovement method!`);
      }
      // Test direct resumeMovement handoff
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.resumeMovement(dummyOpponent);
      const resumedSpeed = Math.hypot(fighter.vx, fighter.vy);
      if (resumedSpeed < 0.1) {
        throw new Error(`Fighter '${fType}' resumeMovement failed to produce initial velocity: got speed ${resumedSpeed}`);
      }

      // Test stall watchdog recovery from zero velocity when not stationary
      fighter.vx = 0;
      fighter.vy = 0;
      fighter._stationaryStallFrames = 0;
      // Allow up to 16 frames to trigger movement recovery or stall watchdog
      for (let f = 0; f < 16; f++) {
        fighter.update(dummyOpponent, 0, state.arena);
      }
      const stallRecoveredSpeed = Math.hypot(fighter.vx, fighter.vy);
      if (!fighter.isStationarySkillActive() && stallRecoveredSpeed < 0.05) {
        throw new Error(`Fighter '${fType}' failed movement stall watchdog recovery (still at 0 velocity after 16 frames)! Details: speed=${fighter.speed}, baseSpeed=${fighter.baseSpeed}, isStationary=${fighter.isStationarySkillActive()}, hp=${fighter.hp}, dummyHp=${dummyOpponent.hp}, stallFrames=${fighter._stationaryStallFrames}`);
      }

      // 5. Special Transformations, Forms & Skill Channeling
      if (fType === 'ichigo') {
        mockCtx.resetStackDepth();
        fighter.isChannelingGetsuga = true;
        fighter.getsugaChargeTimer = 15;
        fighter.getsugaChargeMaxTimer = 30;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Shikai Getsuga charge`);

        mockCtx.resetStackDepth();
        fighter.bankaiActive = true;
        fighter.hollowMaskActive = false;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Bankai`);

        mockCtx.resetStackDepth();
        fighter.hollowMaskActive = true;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Bankai + Hollow Mask`);

        // Test Hollow Mask awakening and channeling immobility
        fighter.reset();
        fighter.bankaiActive = true;
        fighter.bankaiTimer = 800;
        fighter.x = 200;
        fighter.y = 200;
        fighter.vx = 0;
        fighter.vy = 0;
        fighter.hp = 25; // Trigger <= 70% HP Hollow Awakening (after Bankai)
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.hollowMaskActive || fighter.hollowMaskFormationTimer <= 0) {
          throw new Error(`Ichigo did not activate Hollow Mask formation upon <= 70% HP in Bankai`);
        }
        const posX = fighter.x;
        const posY = fighter.y;
        for (let t = 0; t < 20; t++) {
          fighter.update(dummyOpponent, 0, state.arena);
          if (fighter.x !== posX || fighter.y !== posY || fighter.vx !== 0 || fighter.vy !== 0) {
            throw new Error(`Ichigo moved during Hollow Mask formation at tick ${t}: (${fighter.x}, ${fighter.y})`);
          }
        }

        // Test Hollow Mask piece-by-piece formation drawing balance across all stages
        for (const prog of [0.05, 0.15, 0.35, 0.55, 0.75, 0.85, 0.95, 1.00]) {
          mockCtx.resetStackDepth();
          fighter.hollowMaskActive = true;
          fighter.hollowMaskFormationTimer = Math.round((1 - prog) * 325);
          fighter.hollowMaskFormationMax = 325;
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Ichigo Hollow formation at prog ${prog}`);
        }

        // Test Getsuga recovery frames in Shikai form
        fighter.reset();
        fighter.isChannelingGetsuga = false;
        fighter.bankaiActive = false;
        fighter.hollowMaskActive = false;
        fighter.getsugaRecoveryTimer = 24;
        fighter.vx = -3.5;
        fighter.vy = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.getsugaRecoveryTimer !== 23) {
          throw new Error(`Getsuga recovery timer failed to decrement properly in Shikai`);
        }
        // Ensure AI steering did not overwrite decelerating recoil velocity during recovery
        if (Math.abs(fighter.vx) > 3.5) {
          throw new Error(`Ichigo moved with external velocity during Shikai Getsuga recovery`);
        }

        // Test Getsuga recovery frames in Bankai form
        fighter.reset();
        fighter.bankaiActive = true;
        fighter.getsugaRecoveryTimer = 20;
        fighter.vx = -3.5;
        fighter.vy = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.getsugaRecoveryTimer !== 19) {
          throw new Error(`Getsuga recovery timer failed to decrement properly in Bankai`);
        }
        if (Math.abs(fighter.vx) > 3.5) {
          throw new Error(`Ichigo moved with external velocity during Bankai Getsuga recovery`);
        }

        // Test Champion Screen reveal pose for Bankai + Mask form
        mockCtx.resetStackDepth();
        fighter.reset();
        fighter._isWinnerReveal = true;
        fighter.bankaiActive = true;
        fighter.hollowMaskActive = true;
        fighter.skin = 'bankai_mask';
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Ichigo Bankai + Mask Winner Reveal`);

        // Test custom bankaiFinalGetsugaRadius and bankaiFinalGetsugaSpeed
        mockCtx.resetStackDepth();
        const prevRad = CONFIG.ichigo.bankaiFinalGetsugaRadius;
        const prevSpd = CONFIG.ichigo.bankaiFinalGetsugaSpeed;
        CONFIG.ichigo.bankaiFinalGetsugaRadius = 140;
        CONFIG.ichigo.bankaiFinalGetsugaSpeed = 12;
        const finalProj = projectileSystem.fireGetsugaTensho(fighter, 0, 180, 12, 'final_bankai');
        if (finalProj.r !== 140) {
          throw new Error(`Expected projectile radius 140 but got ${finalProj.r}`);
        }
        if (Math.round(Math.hypot(finalProj.vx, finalProj.vy)) !== 12) {
          throw new Error(`Expected projectile speed 12 but got ${Math.hypot(finalProj.vx, finalProj.vy)}`);
        }
        drawGetsugaSlash(mockCtx, finalProj, true);
        assertCanvasStackBalance(`Custom scaled Final Getsuga slash`);
        CONFIG.ichigo.bankaiFinalGetsugaRadius = prevRad;
        CONFIG.ichigo.bankaiFinalGetsugaSpeed = prevSpd;
        if (projectileSystem.projectiles.includes(finalProj)) {
          const idx = projectileSystem.projectiles.indexOf(finalProj);
          projectileSystem.projectiles.splice(idx, 1);
        }

        // Test enableFlashStep and enableFlurryAttack config toggles
        const origFlashStep = CONFIG.ichigo.enableFlashStep;
        const origFlurry = CONFIG.ichigo.enableFlurryAttack;

        fighter.reset();
        fighter.bankaiActive = false;
        fighter.hollowMaskActive = false;
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;

        // 1. Test with Flash Step ON, Flurry Attack OFF (Flash Step to enemy with single strike, then backstep into Getsuga)
        CONFIG.ichigo.enableFlashStep = true;
        CONFIG.ichigo.enableFlurryAttack = false;
        fighter.performShunpoGetsugaCombo(dummyOpponent);
        if (!fighter.isShunpoDashing || !fighter.shunpoComboActive) {
          throw new Error(`Ichigo failed to initiate Flash Step when enableFlurryAttack is false!`);
        }
        if (fighter.shunpoMaxSteps !== 1) {
          throw new Error(`Ichigo maxSteps is ${fighter.shunpoMaxSteps} instead of 1 when enableFlurryAttack is false!`);
        }

        // Advance through Flash Step arrival, strike, disengage, and transition to Getsuga Tensho
        for (let f = 0; f < 30; f++) {
          fighter.update(dummyOpponent, 0, state.arena);
          if (fighter.isChannelingGetsuga) break;
        }
        if (!fighter.isChannelingGetsuga && fighter.getsugaRecoveryTimer <= 0) {
          throw new Error(`Ichigo failed to unleash Getsuga Tensho after single Flash Step strike!`);
        }

        // 2. Test with Flash Step OFF (Standalone Getsuga without teleporting)
        fighter.reset();
        CONFIG.ichigo.enableFlashStep = false;
        CONFIG.ichigo.enableFlurryAttack = false;
        fighter.x = 200;
        fighter.y = 200;
        fighter.shunpoCooldown = 0;
        fighter.getsugaCooldown = 0;
        fighter.performShunpoGetsugaCombo(dummyOpponent);
        if (fighter.isShunpoDashing || fighter.shunpoComboActive) {
          throw new Error(`Ichigo dashed when enableFlashStep is false!`);
        }
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.isChannelingGetsuga || fighter.isShunpoDashing) {
          throw new Error(`Ichigo failed to fire standalone Getsuga Tensho when enableFlashStep is false!`);
        }

        // 3. Test with Flash Step ON, Flurry Attack ON (Full Flurry Multi-Strike Combo)
        CONFIG.ichigo.enableFlashStep = true;
        CONFIG.ichigo.enableFlurryAttack = true;
        fighter.reset();
        fighter.shunpoCooldown = 0;
        fighter.getsugaCooldown = 0;
        fighter.x = 200;
        fighter.y = 200;
        fighter.performShunpoGetsugaCombo(dummyOpponent);
        if (!fighter.shunpoComboActive || fighter.shunpoComboStep !== 1 || fighter.shunpoMaxSteps <= 1) {
          throw new Error(`Ichigo failed to initiate multi-strike flurry combo when enableFlurryAttack is true!`);
        }

        // Restore user's actual configured settings
        CONFIG.ichigo.enableFlashStep = origFlashStep;
        CONFIG.ichigo.enableFlurryAttack = origFlurry;

        fighter.reset();
        fighter.isChannelingGetsuga = false;
        fighter.bankaiActive = false;
        fighter.hollowMaskActive = false;
        fighter._isWinnerReveal = false;
        fighter.getsugaRecoveryTimer = 0;
        fighter.hollowMaskFormationTimer = 0;
        fighter.hollowBurstTimer = 0;
        fighter.activeGetsugaProjectile = null;
      }
      if (fType === 'mahoraga') {
        mockCtx.resetStackDepth();
        fighter.wheelClickTimer = 15;
        fighter.gammaRayRainbowTimer = 100;
        fighter.gammaRayRainbowMax = 180;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Mahoraga gamma ray state`);

        // Test CC tenacity and interruptAttacks under stun & freeze with various adaptation states
        fighter.isFrozenByInfinity = true;
        fighter.timeStopTimer = 20;
        fighter.adapted = { melee: true, ranged: false, skill: false };
        fighter.adaptationStage = { melee: 3, ranged: 1, skill: 0 };
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.interruptAttacks(true);
        fighter.interruptAttacks(false);
        fighter.isFrozenByInfinity = false;
        fighter.timeStopTimer = 0;
      }
      if (fType === 'mahito') {
        mockCtx.resetStackDepth();
        fighter.reset();
        fighter.hp = 100;
        fighter.maxHp = 230;

        // 1. Outside domain: no domain lifesteal
        fighter.domainActive = false;
        fighter.onDamageDealt(dummyOpponent, null, 0, 40);
        if (fighter.hp !== 100) {
          throw new Error(`Mahito gained lifesteal outside of Domain Expansion! Expected HP 100, got ${fighter.hp}`);
        }

        // 2. Inside domain: domain lifesteal recovers HP from damage dealt
        fighter.domainActive = true;
        const lifestealPct = (CONFIG.mahito?.domainExpansion?.lifestealPercent !== undefined) ? CONFIG.mahito.domainExpansion.lifestealPercent : 0.50;
        const expectedHp = 100 + (40 * lifestealPct);
        fighter.onDamageDealt(dummyOpponent, null, 0, 40);
        if (fighter.hp !== expectedHp) {
          throw new Error(`Mahito failed to gain domain lifesteal! Expected HP ${expectedHp}, got ${fighter.hp}`);
        }

        fighter.reset();
        fighter.domainActive = false;
      }
      if (fType === 'sukuna') {
        mockCtx.resetStackDepth();
        fighter.isHeianEra = true;
        fighter.isFourArms = true;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Sukuna Heian 4-arms form`);
      }
      if (fType === 'ichigo') {
        mockCtx.resetStackDepth();
        // Test: When about to unleash normal Getsuga Tensho, skills that are UP must wait
        fighter.bankaiActive = true;
        fighter.bankaiUsed = true;
        fighter.bankaiTimer = 150; // In final threshold where final getsuga would trigger
        fighter.fireGetsuga(dummyOpponent, false);

        if (!fighter.isAboutToUnleashNormalGetsuga()) {
          throw new Error("Ichigo should be in isAboutToUnleashNormalGetsuga state while channeling normal Getsuga!");
        }

        // Test 1: activateHollowMask must NOT interrupt normal Getsuga
        fighter.activateHollowMask();
        if (fighter.hollowMaskActive) {
          throw new Error("Hollow Mask activated and interrupted normal Getsuga while charging!");
        }

        // Test 2: activateBankai must NOT interrupt normal Getsuga
        fighter.activateBankai();
        if (fighter.isChannelingBankai) {
          throw new Error("Bankai activated and interrupted normal Getsuga while charging!");
        }

        // Test 3: critical damage must NOT trigger Hollow Mask while normal Getsuga is charging
        fighter.takeDamage(100, dummyOpponent);
        if (fighter.hollowMaskActive) {
          throw new Error("Hollow Mask activated on damage and interrupted normal Getsuga while charging!");
        }

        // Test 4: update loop must defer Bankai Finale until normal Getsuga finishes charging
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.isFinalMassiveGetsuga) {
          throw new Error("Bankai Finale triggered and interrupted normal Getsuga before it unleashed!");
        }

        // Test 5: Charge to completion and verify it unleashes
        let released = false;
        const origRelease = fighter._releaseGetsuga;
        fighter._releaseGetsuga = function() {
          released = true;
          return origRelease.apply(this, arguments);
        };
        while (fighter.getsugaChargeTimer > 0) {
          fighter.update(dummyOpponent, 0, state.arena);
        }
        if (!released) {
          throw new Error("Normal Getsuga failed to unleash!");
        }
        fighter._releaseGetsuga = origRelease;

        // Test 6: Bankai transformation afterimage suppression & distance snap prevention
        state.gameState = 'playing';
        dummyOpponent.hp = 100;
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        // Seed some lingering afterimages at distant coordinates
        fighter.afterImages.push({ x: 50, y: 50, r: 25, timer: 16, maxTimer: 16 });
        fighter.hp = fighter.maxHp * 0.85; // Satisfies Bankai threshold (<= 0.90) without triggering Hollow Mask (<= 0.70)
        fighter.hollowMaskUsed = true; // Prevent Hollow Mask awakening during Bankai afterimage tests
        dummyOpponent.x = 50;
        dummyOpponent.y = 50;
        dummyOpponent.vx = 0;
        dummyOpponent.vy = 0;
        fighter.activateBankai();

        if (fighter.afterImages.length !== 0) {
          throw new Error(`Bankai activation did not immediately clear lingering afterimages! Count: ${fighter.afterImages.length}`);
        }
        if (fighter._lastBankaiTrailX !== fighter.x || fighter._lastBankaiTrailY !== fighter.y) {
          throw new Error(`Bankai activation did not re-anchor trail origins! Got (${fighter._lastBankaiTrailX}, ${fighter._lastBankaiTrailY}) expected (${fighter.x}, ${fighter.y})`);
        }

        // Test 7: During channeling and burst, afterimages must remain empty and suppressed in draw
        fighter.afterImages.push({ x: 500, y: 500, r: 25, timer: 16, maxTimer: 16 });
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, dummyOpponent);
        assertCanvasStackBalance("Ichigo Bankai Channeling draw");

        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.afterImages.length !== 0) {
          throw new Error("Afterimages were not flushed during Bankai channeling update!");
        }

        // Fast forward through channeling to burst
        while (fighter.isChannelingBankai) {
          fighter.update(dummyOpponent, 0, state.arena);
        }
        if (fighter.bankaiBurstTimer <= 0) {
          throw new Error("Bankai burst timer should be active right after channeling completes!");
        }
        if (fighter.afterImages.length !== 0) {
          throw new Error("Afterimages were not flushed on Bankai burst start!");
        }

        // Fast forward through burst
        while (fighter.bankaiBurstTimer > 0) {
          fighter.update(dummyOpponent, 0, state.arena);
        }
        if (fighter.afterImages.length !== 0) {
          throw new Error("Afterimages should remain empty right as Bankai burst finishes!");
        }

        // Test 8: Large displacement (teleport / snap > 60px) must NOT interpolate afterimages across distance
        state.gameState = 'playing';
        dummyOpponent.hp = 100;
        fighter.bankaiActive = true;
        fighter.bankaiTimer = 600;
        fighter.bankaiFinalGetsugaTriggered = true;
        fighter.x = 350;
        fighter.y = 350;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.afterImages.length !== 0) {
          throw new Error(`Large displacement (>60px) during Bankai spawned distant afterimages instead of re-anchoring! Count: ${fighter.afterImages.length}`);
        }
        if (fighter._lastBankaiTrailX !== 350 || fighter._lastBankaiTrailY !== 350) {
          throw new Error(`Trail origin was not re-anchored on large displacement! Got (${fighter._lastBankaiTrailX}, ${fighter._lastBankaiTrailY}), expected (350, 350)`);
        }

        // Test 9: Verify bankaiGetsugaVoice chance is valid number if defined
        if (CONFIG.ichigo?.soundChances?.bankaiGetsugaVoice !== undefined && typeof CONFIG.ichigo?.soundChances?.bankaiGetsugaVoice !== 'number') {
          throw new Error(`bankaiGetsugaVoice soundChance should be a valid number`);
        }

        // Test 10: Verify Ichigo skill data includes both bankai and hollow
        const ichigoSkills = getSkillDataForFighter(fighter);
        const hasBankaiSkill = ichigoSkills.some(s => s.id === 'bankai');
        const hasHollowSkill = ichigoSkills.some(s => s.id === 'hollow');
        if (!hasBankaiSkill || !hasHollowSkill) {
          throw new Error("Ichigo skills must include both 'bankai' and 'hollow'!");
        }

        // Test 11: Ichigo attack actions are strictly gated while Getsuga Tensho wave is active
        fighter.reset();
        fighter.isChannelingGetsuga = false;
        fighter.getsugaRecoveryTimer = 0;
        fighter.swordCooldown = 0;
        fighter.shunpoCooldown = 0;

        // Fire a test getsuga wave
        const activeGetsuga = projectileSystem.fireGetsugaTensho(fighter, 0, 10, 10, 'shikai');
        if (!fighter.isGetsugaActive()) {
          throw new Error("isGetsugaActive() should return true while Getsuga wave is in projectileSystem!");
        }

        if (fighter.canPerformBasicAttack()) {
          throw new Error("canPerformBasicAttack() must return false while Getsuga wave is active!");
        }

        // shoot() must return false
        const shootRes = fighter.shoot(0);
        if (shootRes) {
          throw new Error("shoot() must not execute while Getsuga wave is active!");
        }

        // performMeleeCleave() must not trigger swing
        fighter.slashSwingTimer = 0;
        fighter.performMeleeCleave(dummyOpponent);
        if (fighter.slashSwingTimer > 0) {
          throw new Error("performMeleeCleave() must not execute while Getsuga wave is active!");
        }

        // performShunpoGetsugaCombo() must be gated by shunpoCooldown
        fighter.shunpoCooldown = 100;
        fighter.performShunpoGetsugaCombo(dummyOpponent);
        if (fighter.shunpoComboActive || fighter.isShunpoDashing) {
          throw new Error("performShunpoGetsugaCombo() must not execute while shunpoCooldown > 0!");
        }
        fighter.shunpoCooldown = 0;

        // fireGetsuga() (non-combo) must not trigger
        fighter.fireGetsuga(dummyOpponent, false);
        if (fighter.isChannelingGetsuga) {
          throw new Error("fireGetsuga() must not execute while Getsuga wave is active!");
        }

        // fireFinalMassiveGetsuga() must not trigger
        fighter.fireFinalMassiveGetsuga(dummyOpponent);
        if (fighter.isChannelingGetsuga || fighter.isFinalMassiveGetsuga) {
          throw new Error("fireFinalMassiveGetsuga() must not execute while Getsuga wave is active!");
        }

        // Clean up test projectile
        if (projectileSystem.projectiles.includes(activeGetsuga)) {
          const idx = projectileSystem.projectiles.indexOf(activeGetsuga);
          projectileSystem.projectiles.splice(idx, 1);
        }
        fighter.activeGetsugaProjectile = null;

        if (fighter.isGetsugaActive()) {
          throw new Error("isGetsugaActive() should return false after projectile removal!");
        }
        if (!fighter.canPerformBasicAttack()) {
          throw new Error("canPerformBasicAttack() should return true after Getsuga wave is gone!");
        }

        // Test 12: Hollow Mask overlay rendering with camera tracking enabled (Dynamic Mode & Fixed Mode)
        mockCtx.resetStackDepth();
        fighter.reset();
        fighter.hollowMaskActive = true;
        fighter.hollowMaskFormationTimer = 100;
        fighter.hollowMaskFormationMax = 325;

        // Test with Dynamic Camera Tracking mode enabled (zoomed and panned)
        state.camera = {
          enabled: true,
          mode: 'dynamic',
          x: state.arena.x + state.arena.width / 2 + 30,
          y: state.arena.y + state.arena.height / 2 - 20,
          zoom: 1.12,
          shakeX: 0,
          shakeY: 0
        };
        drawBankaiImpactDimScreen();
        assertCanvasStackBalance("Hollow Mask Overlay with Dynamic Camera Tracking");

        // Test with Fixed Camera mode
        state.camera.mode = 'fixed';
        state.camera.zoom = 1.0;
        drawBankaiImpactDimScreen();
        assertCanvasStackBalance("Hollow Mask Overlay with Fixed Camera Mode");

        fighter.reset();
        fighter.hollowMaskFormationTimer = 0;
      }

      if (fType === 'mahoraga') {
        console.log("   Testing Mahoraga Getsuga Tensho wave drag dash/teleport disable...");

        // 1. When isDraggedByGetsuga is true (unadapted)
        fighter.isDraggedByGetsuga = true;
        fighter.adaptationDashTimer = 10;
        fighter.adaptationDashTarget = dummyOpponent;
        fighter.isBlitzActive = true;
        fighter.blitzHitsLeft = 5;
        fighter.neutralStanceTimer = 100;
        fighter.wallBounceCount = 2;

        fighter.update(dummyOpponent, 0, state.arena);

        if (fighter.adaptationDashTimer !== 0) {
          throw new Error("Mahoraga adaptationDashTimer was not cancelled while isDraggedByGetsuga is true!");
        }
        if (fighter.isBlitzActive) {
          throw new Error("Mahoraga isBlitzActive was not disabled while isDraggedByGetsuga is true!");
        }
        if (fighter.neutralStanceTimer !== 0) {
          throw new Error("Mahoraga neutralStanceTimer was not reset while isDraggedByGetsuga is true!");
        }
        if (fighter.wallBounceCount !== 0) {
          throw new Error("Mahoraga wallBounceCount was not 0 while isDraggedByGetsuga is true!");
        }

        // 2. resolveWallBounce while isDraggedByGetsuga is true
        fighter.x = state.arena.x; // at left wall
        fighter.vx = -10;
        fighter.wallBounceCount = 1;
        fighter.resolveWallBounce(state.arena, dummyOpponent);
        if (fighter.wallBounceCount !== 0 || fighter.isBlitzActive) {
          throw new Error("Mahoraga wall bounce accumulated bounces or triggered blitz while isDraggedByGetsuga is true!");
        }

        // 3. When adapted to Getsuga Tensho (adaptedGetsuga = true)
        fighter.adaptedGetsuga = true;
        fighter.isDraggedByGetsuga = true;
        fighter.adaptationDashTimer = 8;
        fighter.isBlitzActive = true;

        fighter.update(dummyOpponent, 0, state.arena);

        if (fighter.adaptationDashTimer !== 0) {
          throw new Error("Mahoraga adaptationDashTimer was not cancelled for adapted Mahoraga during Getsuga drag!");
        }
        if (fighter.isBlitzActive) {
          throw new Error("Mahoraga isBlitzActive was not disabled for adapted Mahoraga during Getsuga drag!");
        }

        // Reset flags for subsequent tests
        fighter.isDraggedByGetsuga = false;
        fighter.adaptedGetsuga = false;
        fighter.x = 200;
        fighter.y = 200;
      }

      // Todo-specific Pixel Art Skin & Boogie Woogie Animations Test
      if (fType === 'todo') {
        // 1. Idle Pixel Art Model
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo idle pixel art model");

        // 2. Brawler Punch Animation
        mockCtx.resetStackDepth();
        fighter.punchAnimTimer = 10;
        fighter.punchActiveMaxTime = 14;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo brawler punch animation");
        fighter.punchAnimTimer = 0;

        // 3. Boogie Woogie Clap Animation (Windup & Impact Collision Flash)
        mockCtx.resetStackDepth();
        fighter.clapWindupTimer = 4;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Boogie Woogie clap windup");

        mockCtx.resetStackDepth();
        fighter.clapWindupTimer = 0;
        fighter.clapAnimTimer = 10;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Boogie Woogie clap impact flash");
        fighter.clapAnimTimer = 0;

        // 4. Takada-chan Idol Ultimate Aura & Smart Boundary Clamping
        mockCtx.resetStackDepth();
        fighter.isTakadaUltActive = true;
        // Test at center
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Takada-chan idol ultimate aura (center)");
        
        // Test near top arena wall
        fighter.x = 250;
        fighter.y = (state.arena?.y || 0) + 5;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Takada-chan idol banner top clamping");

        // Test near left arena wall
        fighter.x = (state.arena?.x || 0) + 5;
        fighter.y = 250;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Takada-chan idol banner left clamping");

        // Test near right arena wall
        fighter.x = (state.arena?.x || 0) + (state.arena?.width || 500) - 5;
        fighter.y = 250;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Takada-chan idol banner right clamping");

        // Test floating pixel hearts & stars screen overlay during channeling & ultimate
        state.fighters = [fighter, dummyOpponent];
        fighter.isTakadaChanneling = true;
        fighter.isTakadaUltActive = false;
        mockCtx.resetStackDepth();
        drawTodoTakadaIdolScreenOverlay();
        assertCanvasStackBalance("Todo Takada idol screen overlay (channeling)");

        fighter.isTakadaChanneling = false;
        fighter.isTakadaUltActive = true;
        mockCtx.resetStackDepth();
        drawTodoTakadaIdolScreenOverlay();
        assertCanvasStackBalance("Todo Takada idol screen overlay (ultimate)");

        // Test low performance mode
        state.performanceMode = true;
        mockCtx.resetStackDepth();
        drawTodoTakadaIdolScreenOverlay();
        assertCanvasStackBalance("Todo Takada idol screen overlay (low perf)");
        state.performanceMode = false;

        fighter.isTakadaUltActive = false;
        fighter.isTakadaChanneling = false;
        fighter.x = 200;
        fighter.y = 200;

        // 5. Black Flash Zone State
        mockCtx.resetStackDepth();
        fighter.justSwappedTimer = 30;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo Black Flash zone state");
        fighter.justSwappedTimer = 0;

        // 6. Cursed Rocks Drawing
        mockCtx.resetStackDepth();
        fighter.cursedRocks = [{ x: 300, y: 250, radius: 12, hasTriggeredTeleport: false }];
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo cursed rocks drawing");
        fighter.cursedRocks = [];

        // 7. Winner Reveal Podium Mode
        mockCtx.resetStackDepth();
        fighter._isWinnerReveal = true;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Todo winner reveal podium display");
        fighter._isWinnerReveal = false;

        // 8. High-Performance Black Flash Particle Spawning & Drawing Test
        clearBlackFlashEffects();
        spawnBlackFlash(250, 300);
        spawnBlackFlash(255, 305);
        mockCtx.resetStackDepth();
        drawBlackFlashEffects(mockCtx);
        assertCanvasStackBalance("Black Flash drawing pass 1");

        for (let frame = 0; frame < 15; frame++) {
          updateBlackFlashEffects(false);
          mockCtx.resetStackDepth();
          drawBlackFlashEffects(mockCtx);
          assertCanvasStackBalance(`Black Flash drawing frame ${frame}`);
        }
        clearBlackFlashEffects();
      }

      // Rubbick-specific Stolen Unlimited Void Test
      if (fType === 'rubbick') {
        const GojoClass = FIGHTER_CLASS_MAP['gojo'];
        const mockGojo = new GojoClass(allDefs.find(d => d.type === 'gojo') || { type: 'gojo' });
        mockGojo.x = 250;
        mockGojo.y = 200;
        mockGojo.hp = 400;

        // 1a. Verify Rubbick CANNOT steal while Gojo is channeling Domain Expansion
        mockGojo.isChannelingDomainExpansion = true;
        mockGojo.domainActive = false;
        mockGojo.hasFiredDomain = false;
        fighter.reset();
        fighter.x = 250;
        fighter.y = 300;
        fighter.stolenType = null;
        fighter.spellStealCooldown = 0;
        fighter.telekinesisCooldown = 999;
        fighter.update(mockGojo, 1, state.arena);
        if (fighter.stolenType !== null) {
          throw new Error(`Rubbick should NOT steal domain while Gojo is channeling: got '${fighter.stolenType}'`);
        }

        // 1b. Verify Rubbick CANNOT steal while Gojo's domain is active (has not expired yet)
        mockGojo.isChannelingDomainExpansion = false;
        mockGojo.domainActive = true;
        mockGojo.hasFiredDomain = true;
        mockGojo.lastCastSkill = 'domain';
        fighter.stolenType = null;
        fighter.spellStealCooldown = 0;
        fighter.telekinesisCooldown = 999;
        fighter.update(mockGojo, 1, state.arena);
        if (fighter.stolenType !== null) {
          throw new Error(`Rubbick should NOT steal domain while Gojo's domain is active: got '${fighter.stolenType}'`);
        }

        // 1c. Verify Rubbick CAN steal Unlimited Void AFTER Gojo's domain expires
        mockGojo.domainActive = false;
        mockGojo.isChannelingDomainExpansion = false;
        mockGojo.hasFiredDomain = true;
        mockGojo.lastCastSkill = 'domain';
        fighter.reset();
        fighter.x = 250;
        fighter.y = 300;
        fighter.stolenType = null;
        fighter.spellStealCooldown = 0;
        fighter.update(mockGojo, 1, state.arena);

        if (fighter.stolenType !== 'gojo_domain') {
          throw new Error(`Rubbick failed to steal Unlimited Void after domain expired: expected 'gojo_domain', got '${fighter.stolenType}'`);
        }
        if (fighter.stolenColor !== '#00FF64') {
          throw new Error(`Rubbick stolenColor is not emerald green (#00FF64), got '${fighter.stolenColor}'`);
        }
        if (fighter.stolenSkillCooldown <= 0) {
          throw new Error(`Expected stolenSkillCooldown > 0 delay after stealing skill, got ${fighter.stolenSkillCooldown}`);
        }

        // 2. Execute Stolen Skill Wind-Up (clearing initial delay to trigger cast)
        fighter.stolenSkillCooldown = 0;
        fighter.executeStolenSkill(mockGojo, 1);
        if (fighter.stolenWindUpTimer <= 0) {
          throw new Error("Rubbick did not enter stolenWindUpTimer on casting stolen Unlimited Void!");
        }

        // Test ground telegraph during windup
        mockCtx.resetStackDepth();
        fighter.drawGroundTelegraph(mockCtx);
        assertCanvasStackBalance("Rubbick drawGroundTelegraph during stolen domain windup");

        // 3. Complete wind-up to activate domain
        fighter.stolenWindUpTimer = 1;
        fighter.update(mockGojo, 1, state.arena);

        if (!fighter.stolenDomainActive) {
          throw new Error("Rubbick stolenDomainActive is not true after wind-up completed!");
        }

        // Test active domain ground telegraph, skin, and weapon drawing
        mockCtx.resetStackDepth();
        fighter.drawGroundTelegraph(mockCtx);
        assertCanvasStackBalance("Rubbick drawGroundTelegraph during active stolen domain");

        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Rubbick draw during active stolen domain");

        mockCtx.resetStackDepth();
        fighter.drawGun(mockCtx);
        assertCanvasStackBalance("Rubbick drawGun during active stolen domain");

        // 4. Update during active domain
        state.fighters = [mockGojo, fighter];
        mockGojo.domainActive = false; // Gojo's own domain is not active
        fighter.update(mockGojo, 1, state.arena);
        if (mockGojo.timeStopTimer <= 0) {
          throw new Error("Mock Gojo was not time-stopped inside Rubbick's stolen domain!");
        }
        if (mockGojo.infinityActive) {
          throw new Error("Mock Gojo's infinityActive was not disabled inside Rubbick's stolen domain!");
        }

        // Test Gojo's own update inside Rubbick's stolen domain
        mockGojo.update(fighter, 0, state.arena);
        if (mockGojo.infinityActive) {
          throw new Error("Mock Gojo's update() re-enabled infinityActive while inside Rubbick's stolen domain!");
        }
        if (mockGojo.infinityFadeOpacity !== 0) {
          throw new Error(`Mock Gojo's infinityFadeOpacity should be 0, got ${mockGojo.infinityFadeOpacity}`);
        }

        // Test Gojo taking damage inside Rubbick's stolen domain (should NOT trigger Infinity block)
        const gojoHpBefore = mockGojo.hp;
        mockGojo.takeDamage(20, fighter, { isMelee: true });
        if (mockGojo.hp >= gojoHpBefore) {
          throw new Error("Mock Gojo did not take damage inside Rubbick's stolen domain (blocked by Infinity)!");
        }

        // 5. Complete domain
        fighter.stolenDomainTimer = 1;
        fighter.update(mockGojo, 1, state.arena);
        if (fighter.stolenDomainActive) {
          throw new Error("Rubbick stolenDomainActive did not clear after timer expired!");
        }

        // Verify Gojo infinity recovers after domain ends and cooldown finishes
        mockGojo.timeStopTimer = 0;
        mockGojo.hitStunTimer = 0;
        mockGojo.paralyzeTimer = 0;
        mockGojo.isCaughtInTelekinesis = false;
        mockGojo.forcedMeleeTimer = 0;
        mockGojo.isMeleeMode = false;
        for (let cd = 0; cd < 40; cd++) {
          mockGojo.update(fighter, 0, state.arena);
        }
        if (!mockGojo.infinityActive) {
          throw new Error("Mock Gojo's infinityActive did not recover after Rubbick stolen domain expired!");
        }

        // Reset Rubbick state
        fighter.stolenType = null;
        fighter.stolenTimer = 0;

        // 6. Test Rubbick inside enemy Gojo's active domain (suppress active visuals)
        mockGojo.domainActive = true;
        state.fighters = [fighter, mockGojo];
        fighter.timeStopTimer = 15;

        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Rubbick draw while inside enemy Gojo domain");

        mockCtx.resetStackDepth();
        fighter.drawGroundTelegraph(mockCtx);
        assertCanvasStackBalance("Rubbick drawGroundTelegraph while inside enemy Gojo domain");

        mockCtx.resetStackDepth();
        fighter.drawGun(mockCtx);
        assertCanvasStackBalance("Rubbick drawGun while inside enemy Gojo domain");

        mockGojo.domainActive = false;
        fighter.timeStopTimer = 0;

        // 7. Verify Rubbick stolen domain background & emerald green dim screen rendering
        fighter.stolenDomainActive = true;
        mockCtx.resetStackDepth();
        fighter.drawDomainBackground(mockCtx);
        assertCanvasStackBalance("Rubbick drawDomainBackground");

        mockCtx.resetStackDepth();
        drawRubbickDomainDimScreen();
        assertCanvasStackBalance("Rubbick drawRubbickDomainDimScreen");
        fighter.stolenDomainActive = false;

        // 8. Test Rubbick Telekinesis vs Gojo's Limitless Infinity barrier
        mockGojo.domainActive = false;
        mockGojo.isMeleeMode = false;
        mockGojo.infinityActive = true;
        mockGojo.infinityCooldown = 0;
        mockGojo.hp = 400;
        mockGojo.x = 250;
        mockGojo.y = 200;

        fighter.reset();
        fighter.x = 250;
        fighter.y = 350;
        fighter.telekinesisCooldown = 0;
        state.fighters = [fighter, mockGojo];

        // Trigger telekinesis on Gojo
        fighter.update(mockGojo, 0, state.arena);
        if (!fighter.tkTimer || fighter.tkTarget !== mockGojo) {
          throw new Error("Rubbick failed to lift Gojo with Telekinesis!");
        }

        // Simulate collision with Gojo's infinity barrier during Telekinesis
        mockGojo.triggerInfinityBlock(fighter.x, fighter.y, fighter);

        if (!fighter.tkTimer || !fighter.tkTarget) {
          throw new Error("Rubbick canceled Telekinesis when colliding with Gojo's Infinity barrier!");
        }

        // Run Gojo update during Telekinesis - verify Infinity collision check does not cancel Rubbick's Telekinesis
        mockGojo.update(fighter, 1, state.arena);
        if (!fighter.tkTimer || !fighter.tkTarget) {
          throw new Error("Gojo's update canceled Rubbick's Telekinesis!");
        }

        // Clean up
        fighter.interruptAttacks(true);
      }

      // Makima-specific Skill 1: Chains of Domination & Pixel Art Aesthetics Test
      if (fType === 'makima') {
        console.log("   Testing Makima Chains of Domination & Subjugation Stasis...");

        // 1. Idle Pixel Art Model & Finger-Gun
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima idle pixel art model");

        // 2. Finger-Gun "Bang!" Recoil Animation
        mockCtx.resetStackDepth();
        fighter.slashSwingTimer = 12;
        fighter.slashSwingMaxTimer = 16;
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima Finger-Gun recoil animation");
        fighter.slashSwingTimer = 0;

        // 3. Skill 1: Chains of Domination Cast & Interlocking Links
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        state.fighters = [fighter, dummyOpponent];

        fighter._castChainsOfDomination(dummyOpponent);
        if (!fighter.isChainingActive || fighter.chainedTargets.length === 0) {
          throw new Error("Makima failed to activate Chains of Domination on cast!");
        }
        if (!fighter.isThrowingChain || fighter.chainThrowAnimTimer <= 0) {
          throw new Error("Makima failed to activate isThrowingChain animation state on cast!");
        }

        // Draw during all frames of chain throw animation (frames 22 down to 0) while moving
        while (fighter.chainThrowAnimTimer > 0) {
          fighter.x += 4;
          fighter.y += 2;
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima chain throw animation frame ${fighter.chainThrowAnimTimer}`);

          // Verify chained enemy draws cleanly with body-wrapping chains overlay
          mockCtx.resetStackDepth();
          dummyOpponent.draw(mockCtx, null);
          assertCanvasStackBalance(`Chained enemy draw frame ${fighter.chainThrowAnimTimer}`);

          fighter.update(dummyOpponent, 0, state.arena);
        }

        if (fighter.isThrowingChain) {
          throw new Error("Makima isThrowingChain remained true after chainThrowAnimTimer expired!");
        }

        // Fast-forward across all frames of active chaining and verify draw stack balance & aim tracking
        fighter.y = 250; // Move Makima so enemy must rotate aim
        while (fighter.chainTimer > 0) {
          fighter.update(dummyOpponent, 0, state.arena);
          const expectedAim = Math.atan2(fighter.y - dummyOpponent.y, fighter.x - dummyOpponent.x);
          const angleDiff = Math.abs(dummyOpponent.gunAngle - expectedAim);
          if (angleDiff > 0.05 && dummyOpponent.gunAngle === undefined) {
            throw new Error(`Chained enemy failed to rotate aim towards Makima! gunAngle: ${dummyOpponent.gunAngle}, expected: ${expectedAim}`);
          }
          if (dummyOpponent._timeStopFrozenAngle !== undefined || dummyOpponent._timeStopFrozenGunAngle !== undefined) {
            throw new Error("Chained enemy has locked _timeStopFrozenAngle / _timeStopFrozenGunAngle!");
          }

          // Verify HUD skill bar drains properly during active chain duration
          const hudSkills = getSkillDataForFighter(fighter);
          const chainSkill = hudSkills.find(s => s.id === 'chains');
          if (!chainSkill) {
            throw new Error("Makima Chains of Domination skill missing from HUD data!");
          }
          const expectedPct = (fighter.chainTimer / (fighter.chainMaxTimer || 240)) * 100;
          if (Math.abs(chainSkill.pct - expectedPct) > 1.0) {
            throw new Error(`Makima Chains skill bar did not drain properly! Expected ${expectedPct}%, got ${chainSkill.pct}%`);
          }

          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima Chains of Domination frame ${fighter.chainTimer}`);

          mockCtx.resetStackDepth();
          dummyOpponent.draw(mockCtx, null);
          assertCanvasStackBalance(`Chained enemy draw during active tether frame ${fighter.chainTimer}`);

          // Test top-layer rendering order: Makima above enemy (Makima sorted first)
          fighter.y = 100;
          dummyOpponent.y = 300;
          mockCtx.resetStackDepth();
          drawFighters();
          assertCanvasStackBalance("drawFighters with Makima above chained enemy");

          // Test top-layer rendering order: Makima below enemy (Enemy sorted first)
          fighter.y = 300;
          dummyOpponent.y = 100;
          mockCtx.resetStackDepth();
          drawFighters();
          assertCanvasStackBalance("drawFighters with Makima below chained enemy");
        }

        if (fighter.isChainingActive) {
          throw new Error("Makima Chains of Domination remained active after timer expired!");
        }

        // 3.5. Skill 1 Missable Chains Test (Aiming Away / Off-Target)
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 400; // Enemy is to the right
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.isChainedByMakima = false;
        state.fighters = [fighter, dummyOpponent];

        // Aim Makima upwards (Math.PI / 2) away from enemy at right (0 rad)
        fighter.gunAngle = -Math.PI / 2;
        fighter.angle = -Math.PI / 2;

        fighter._castChainsOfDomination(dummyOpponent);

        if (fighter.isChainingActive) {
          throw new Error("Makima Chains of Domination should NOT activate when thrown off-target!");
        }
        if (fighter.chainedTargets.length !== 0) {
          throw new Error(`Makima chained ${fighter.chainedTargets.length} targets on a miss!`);
        }
        if (!fighter.activeMissedChains || fighter.activeMissedChains.length === 0) {
          throw new Error("Makima activeMissedChains was not populated on missed chain throw!");
        }
        if (dummyOpponent.isChainedByMakima) {
          throw new Error("Enemy was marked as chained on a missed chain throw!");
        }

        // Test drawing and frame progression of missed chain
        while (fighter.activeMissedChains.length > 0) {
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima missed chain draw life ${fighter.activeMissedChains[0].life}`);
          fighter.update(dummyOpponent, 0, state.arena);
        }

        // 3.5.1 Test Custom chainsThrowSpeed and chainsLaunchFrames Adjustments
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        state.fighters = [fighter, dummyOpponent];

        const origChainsSpeed = CONFIG.makima.chainsThrowSpeed;
        const origLaunchFrames = CONFIG.makima.chainsLaunchFrames;
        const origChainsRange = CONFIG.makima.chainsRange;

        CONFIG.makima.chainsRange = 300;

        // A. Test fast throw speed (e.g. chainsThrowSpeed = 60px/frame => 5 launch frames for 300px range)
        CONFIG.makima.chainsThrowSpeed = 60.0;
        CONFIG.makima.chainsLaunchFrames = 5;
        fighter.reset();
        fighter._castChainsOfDomination(dummyOpponent);
        if (fighter.chainsLaunchFrames !== 5) {
          throw new Error(`Expected chainsLaunchFrames to be 5, got ${fighter.chainsLaunchFrames}`);
        }
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima fast chains throw draw");

        // B. Test slow throw speed (e.g. chainsThrowSpeed = 15px/frame => 20 launch frames for 300px range)
        fighter.reset();
        CONFIG.makima.chainsThrowSpeed = 15.0;
        CONFIG.makima.chainsLaunchFrames = 20;
        fighter._castChainsOfDomination(dummyOpponent);
        if (fighter.chainsLaunchFrames !== 20) {
          throw new Error(`Expected chainsLaunchFrames to be 20, got ${fighter.chainsLaunchFrames}`);
        }
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima slow chains throw draw");

        // C. Test slow throw speed scale (chainsThrowSpeed = 0.10 => 10% speed => 67 launch frames for 300px range)
        fighter.reset();
        CONFIG.makima.chainsThrowSpeed = 0.10;
        CONFIG.makima.chainsLaunchFrames = 9; // Should NOT override chainsThrowSpeed
        fighter._castChainsOfDomination(dummyOpponent);
        if (fighter.chainsLaunchFrames !== 67) {
          throw new Error(`Expected chainsLaunchFrames to be 67 for chainsThrowSpeed = 0.10, got ${fighter.chainsLaunchFrames}`);
        }
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima 0.10 scale slow chains throw draw");

        // Restore original configs
        CONFIG.makima.chainsThrowSpeed = origChainsSpeed;
        CONFIG.makima.chainsLaunchFrames = origLaunchFrames;
        CONFIG.makima.chainsRange = origChainsRange;
        fighter.reset();

        // 3.5.2 Test Missable Chain Auto-Aim Rotation Disabling & Windup Telegraph
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350; // Opponent directly to the right (angle 0)
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.isChainedByMakima = false;
        state.fighters = [fighter, dummyOpponent];

        // Start facing directly right at opponent
        fighter.gunAngle = 0;
        fighter.angle = 0;

        // Enter chain preparation windup state ("about to throw chain")
        fighter._prepareChainsOfDomination(dummyOpponent);

        if (!fighter.isPreparingChain || !fighter.isAboutToThrowChain || fighter.chainWindupTimer <= 0) {
          throw new Error("Makima failed to enter isPreparingChain state on _prepareChainsOfDomination!");
        }
        if (!fighter.canAim()) {
          throw new Error("Makima canAim() should return true during isPreparingChain windup to track enemy!");
        }
        if (fighter.vx !== 0 || fighter.vy !== 0) {
          throw new Error("Makima movement should stop immediately upon preparing chain!");
        }

        // Enemy moves diagonally during windup (to (350, 230))
        dummyOpponent.y = 230;

        // Aiming at enemy while preparing chain rotates aim towards enemy
        const initialAngle = fighter.gunAngle;
        fighter.aim(dummyOpponent);
        const expectedAngle = Math.atan2(dummyOpponent.y - fighter.y, dummyOpponent.x - fighter.x);
        if (fighter.gunAngle <= initialAngle) {
          throw new Error(`Makima aim failed to rotate towards enemy during windup! gunAngle: ${fighter.gunAngle}`);
        }

        // Advance frames through the windup while drawing and updating
        while (fighter.chainWindupTimer > 0) {
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima chain windup frame ${fighter.chainWindupTimer}`);

          if (!fighter.isStationarySkillActive()) {
            throw new Error("Expected isStationarySkillActive() to return true during chain windup");
          }
          if (fighter.vx !== 0 || fighter.vy !== 0) {
            throw new Error(`Expected Makima movement to be stopped during chain windup, got vx=${fighter.vx}, vy=${fighter.vy}`);
          }

          const prevAngle = fighter.gunAngle;
          fighter.update(dummyOpponent, 0, state.arena);

          // Verify aim angle rotates towards the enemy each frame of windup
          if (fighter.isPreparingChain && fighter.gunAngle < prevAngle) {
            throw new Error(`Makima gunAngle moved away from enemy during chain windup!`);
          }
        }

        // Windup has completed and chain has released: verify isThrowingChain is active and canAim is locked during throw
        if (!fighter.isThrowingChain || fighter.chainThrowAnimTimer <= 0) {
          throw new Error("Makima failed to transition from windup to isThrowingChain state!");
        }
        if (fighter.canAim()) {
          throw new Error("Makima canAim() should return false during isThrowingChain!");
        }

        // Because Makima tracked the enemy throughout windup, the chain successfully hits and chains the enemy!
        if (!fighter.isChainingActive || !dummyOpponent.isChainedByMakima) {
          throw new Error("Chain failed to latch onto tracked enemy on throw!");
        }

        // Advance through throw animation frames to completion (verifying movement is stopped)
        while (fighter.chainThrowAnimTimer > 0) {
          if (!fighter.isStationarySkillActive()) {
            throw new Error("Expected isStationarySkillActive() to return true during chain throw animation");
          }
          if (fighter.vx !== 0 || fighter.vy !== 0) {
            throw new Error(`Expected Makima movement to be stopped during chain throw, got vx=${fighter.vx}, vy=${fighter.vy}`);
          }
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima throw post-windup frame ${fighter.chainThrowAnimTimer}`);
          fighter.update(dummyOpponent, 0, state.arena);
        }

        if (fighter.isThrowingChain) {
          throw new Error("Makima isThrowingChain remained active after throw animation completed!");
        }
        if (!fighter.canAim()) {
          throw new Error("Makima canAim() should recover to true after chain throw completes!");
        }

        // 3.5.3 Test Chain Base Attachment While Makima Moves (No Cutoff / Detachment)
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 900;
        dummyOpponent.y = 900;
        dummyOpponent.hp = 100;
        state.fighters = [fighter, dummyOpponent];

        fighter.gunAngle = 0;
        fighter.angle = 0;
        fighter._castChainsOfDomination(dummyOpponent);

        if (!fighter.activeMissedChains || fighter.activeMissedChains.length === 0) {
          throw new Error("Expected activeMissedChains on distant target throw!");
        }

        const initialOriginX = fighter.activeMissedChains[0].startX;
        const initialOriginY = fighter.activeMissedChains[0].startY;

        // Move Makima significantly while the chain is being thrown
        for (let frame = 0; frame < 5; frame++) {
          fighter.x += 15;
          fighter.y += 10;
          fighter.update(dummyOpponent, 0, state.arena);
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima moving while throwing chain frame ${frame}`);
        }

        if (fighter.activeMissedChains.length > 0) {
          const movedOriginX = fighter.activeMissedChains[0].startX;
          const movedOriginY = fighter.activeMissedChains[0].startY;
          if (movedOriginX === initialOriginX || movedOriginY === initialOriginY) {
            throw new Error(`Chain origin did not move with Makima! Expected origin to follow body, got initial (${initialOriginX}, ${initialOriginY}) vs moved (${movedOriginX}, ${movedOriginY})`);
          }
          // Verify origin is dynamically attached near Makima's other hand (back hand)
          const distToMakima = Math.hypot(movedOriginX - fighter.x, movedOriginY - fighter.y);
          if (distToMakima < 5 || distToMakima > 50) {
            throw new Error(`Chain origin is not attached to Makima's hand/body! Distance: ${distToMakima}`);
          }
        }

        // 3.5.4 Test Knockback on Chained Target & Chain Break Distance Snapping
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 80;
        fighter.y = 200;
        dummyOpponent.x = 220;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.isChainedByMakima = false;
        dummyOpponent.chainsCooldown = 999;
        dummyOpponent.angelCooldown = 999;
        dummyOpponent.shrineCooldown = 999;
        dummyOpponent.bangCooldown = 999;
        state.fighters = [fighter, dummyOpponent];

        fighter._castChainsOfDomination(dummyOpponent);
        if (!fighter.isChainingActive || !dummyOpponent.isChainedByMakima) {
          throw new Error("Failed to latch Chains of Domination onto enemy for knockback test!");
        }

        // Fire "Bang!" directly at the chained enemy
        fighter.gunAngle = 0;
        fighter.angle = 0;
        fighter._castBangAttack(dummyOpponent);

        if (dummyOpponent.knockbackVx === undefined || Math.abs(dummyOpponent.knockbackVx) < 10) {
          throw new Error(`Chained enemy did NOT receive knockback from "Bang!" attack! Got knockbackVx=${dummyOpponent.knockbackVx}`);
        }

        // Step simulation frames as enemy gets propelled backward and breaks the chain
        let chainBroke = false;
        for (let frame = 0; frame < 30; frame++) {
          fighter.update(dummyOpponent, 0, state.arena);
          dummyOpponent.update(fighter, 1, state.arena);

          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima chain break draw frame ${frame}`);

          if (!fighter.isChainingActive && !dummyOpponent.isChainedByMakima) {
            chainBroke = true;
            break;
          }
        }

        if (!chainBroke) {
          throw new Error("Chains of Domination did not snap/break when enemy was knocked back beyond break distance!");
        }
        if (dummyOpponent.isChainedByMakima) {
          throw new Error("Enemy remained marked as isChainedByMakima after chain was broken!");
        }

        // 3.5.5 Test Chain Voiceline Suppression on Miss vs Play on Hit
        const origPlayFighterVoiceline = audioSystem.playFighterVoiceline;
        const origPlaySFX = audioSystem.playSFX;
        const origSoundChance = CONFIG.makima?.soundChances?.chainVoiceline;
        if (CONFIG.makima && CONFIG.makima.soundChances) {
          CONFIG.makima.soundChances.chainVoiceline = 1.0;
        }
        let playedChainVoiceline = false;

        audioSystem.playFighterVoiceline = (entity, soundPath, volume) => {
          if (soundPath && soundPath.includes('makima-chain-voiceline')) {
            playedChainVoiceline = true;
          }
        };
        audioSystem.playSFX = (soundPath, volume) => {
          if (soundPath && soundPath.includes('makima-chain-voiceline')) {
            playedChainVoiceline = true;
          }
        };

        // Test Miss: enemy is out of range
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 900;
        dummyOpponent.y = 900;
        state.fighters = [fighter, dummyOpponent];
        playedChainVoiceline = false;

        fighter._castChainsOfDomination(dummyOpponent);
        if (playedChainVoiceline) {
          throw new Error("Makima played a chain voiceline even though the chain missed / did not hit any enemy!");
        }
        if (fighter.chainedTargets.length !== 0) {
          throw new Error("Expected zero chainedTargets on distant miss!");
        }

        // Test Hit: enemy is in range and along throw angle
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 300;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.isChainedByMakima = false;
        state.fighters = [fighter, dummyOpponent];
        playedChainVoiceline = false;

        fighter.gunAngle = 0;
        fighter.angle = 0;
        fighter.chainLockedAimAngle = 0;
        fighter._castChainsOfDomination(dummyOpponent);
        if (fighter.chainedTargets.length === 0) {
          throw new Error("Expected chainedTargets to contain enemy on direct hit!");
        }
        if (!playedChainVoiceline) {
          throw new Error("Makima did NOT play a chain voiceline when the enemy was successfully hit and chained!");
        }

        // Restore audioSystem functions and sound chance
        audioSystem.playFighterVoiceline = origPlayFighterVoiceline;
        audioSystem.playSFX = origPlaySFX;
        if (CONFIG.makima && CONFIG.makima.soundChances) {
          CONFIG.makima.soundChances.chainVoiceline = origSoundChance;
        }

        // 3.6. Skill 2: Angel's Armory (1000-Year Spear) Summoning & Channeling Test
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        state.fighters = [fighter, dummyOpponent];

        fighter._castAngelArmory(dummyOpponent);
        if (!fighter.isSummoningSpear || fighter.spearTimer <= 0) {
          throw new Error("Makima failed to start 1000-Year Spear summoning channel!");
        }

        const initialChannelAngle = fighter.spearLaunchAngle;
        while (fighter.isSummoningSpear) {
          // Verify aim is locked during channel (NO live tracking snap)
          if (fighter.gunAngle !== initialChannelAngle) {
            throw new Error(`Makima auto-aim snapped during 1000-Year Spear channel: got ${fighter.gunAngle}, expected ${initialChannelAngle}`);
          }
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance(`Makima 1000-Year Spear channel frame ${fighter.spearTimer}`);
          fighter.update(dummyOpponent, 0, state.arena);
        }

        if (fighter.activeSpears.length === 0) {
          throw new Error("1000-Year Spear was not launched after channel completed!");
        }

        // Fast forward spear flight and holy explosion detonation
        while (fighter.activeSpears.length > 0 || fighter.activeHolyExplosions.length > 0) {
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx, null);
          assertCanvasStackBalance("Makima 1000-Year Spear flight/explosion draw");
          fighter.update(dummyOpponent, 0, state.arena);
        }

        // 4. Citizen Contract Shatter & Magnetic Reassembly
        fighter.takeDamage(999, dummyOpponent);
        if (!fighter.isRevivingFromContract && !fighter.isShatterReviving) {
          throw new Error("Makima did not enter Citizen Contract revive on fatal damage!");
        }

        // Draw during reassembly stasis
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima Citizen Contract shatter & magnetic reassembly");

        // Fast-forward to reassembly completion
        while (fighter.reviveStasisTimer > 0) {
          fighter.update(dummyOpponent, 0, state.arena);
        }

        if (fighter.hp <= 0 || fighter.isRevivingFromContract) {
          throw new Error("Makima failed to revive with 50% HP after Citizen Contract reassembly!");
        }
        if (!fighter._lastHealAmount || fighter._lastHealAmount <= 0) {
          throw new Error("Makima Citizen Contract reassembly failed to set _lastHealAmount for HUD floating heal text!");
        }
        if (!fighter._healthBarHealTimer || fighter._healthBarHealTimer <= 0) {
          throw new Error("Makima Citizen Contract reassembly failed to set _healthBarHealTimer for HUD green glow!");
        }

        // 5. Verify HUD Skill Data & Bang Progress Bar Progression
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 800;
        dummyOpponent.y = 800; // Place far and unaligned
        state.fighters = [fighter, dummyOpponent];
        fighter.chainsCooldown = 999;
        fighter.angelCooldown = 999;
        fighter.shrineCooldown = 999;

        let makimaSkills = getSkillDataForFighter(fighter);
        const hasChainsSkill = makimaSkills.some(s => s.id === 'chains');
        const bangSkillInitial = makimaSkills.find(s => s.id === 'bang');
        const hasContractSkill = makimaSkills.some(s => s.id === 'contract');
        if (!hasChainsSkill || !bangSkillInitial || !hasContractSkill) {
          throw new Error("Makima HUD skills must include 'chains', 'bang', and 'contract'!");
        }

        // Initially on reset, Bang should start with 0% progress and not ready
        if (bangSkillInitial.ready || bangSkillInitial.pct > 5) {
          throw new Error(`Bang initial progress should be ~0%, got ${bangSkillInitial.pct}% (ready: ${bangSkillInitial.ready})`);
        }

        // Fast forward halfway through cooldown (e.g., 100 frames for a 200 frame cooldown)
        const halfFrames = Math.floor(fighter.bangCooldownMax / 2);
        for (let frame = 0; frame < halfFrames; frame++) {
          fighter.chainsCooldown = fighter.chainsCooldownMax;
          fighter.angelCooldown = fighter.angelCooldownMax;
          fighter.shrineCooldown = fighter.shrineCooldownMax;
          fighter.update(dummyOpponent, 0, state.arena);
        }

        makimaSkills = getSkillDataForFighter(fighter);
        const bangSkillMid = makimaSkills.find(s => s.id === 'bang');
        if (bangSkillMid.pct < 45 || bangSkillMid.pct > 55) {
          throw new Error(`Bang midpoint progress should be ~50%, got ${bangSkillMid.pct}%`);
        }

        // Fast forward remainder of cooldown up to the frame before ready
        const remainingFrames = fighter.bangCooldown;
        for (let frame = 0; frame < remainingFrames - 1; frame++) {
          fighter.chainsCooldown = fighter.chainsCooldownMax;
          fighter.angelCooldown = fighter.angelCooldownMax;
          fighter.shrineCooldown = fighter.shrineCooldownMax;
          fighter.update(dummyOpponent, 0, state.arena);
        }

        makimaSkills = getSkillDataForFighter(fighter);
        const bangSkillNearReady = makimaSkills.find(s => s.id === 'bang');
        if (bangSkillNearReady.pct < 95) {
          throw new Error(`Bang should be nearly ready before CD expiry, got ${bangSkillNearReady.pct}%`);
        }

        // On the final frame, CD reaches 0 and Bang triggers immediately
        fighter.chainsCooldown = fighter.chainsCooldownMax;
        fighter.angelCooldown = fighter.angelCooldownMax;
        fighter.shrineCooldown = fighter.shrineCooldownMax;
        fighter.update(dummyOpponent, 0, state.arena);

        // After triggering on CD, cooldown resets to max
        if (fighter.bangCooldown < fighter.bangCooldownMax - 2) {
          throw new Error(`Bang cooldown should have reset to max (${fighter.bangCooldownMax}), got ${fighter.bangCooldown}`);
        }
        // Verify Rule 18 (Color Theme Consistency) & Rule 22 (Clean Label Standard) for Makima
        const makimaThemeColor = CONFIG.makima?.hudSkillBarColor || CONFIG.makima?.themeColor || fighter.color || '#A31D24';
        for (const skill of makimaSkills) {
          if (skill.color !== makimaThemeColor) {
            throw new Error(`Makima skill '${skill.id}' color '${skill.color}' violates Rule 18 (expected '${makimaThemeColor}')`);
          }
          if (skill.label.includes('(READY)') || skill.label.includes('(ACTIVE)') || skill.label.includes('(CASTING)') || skill.label.includes('(THROWING)') || skill.label.includes('(SUMMONING)') || skill.label.includes('(EXECUTING)')) {
            throw new Error(`Makima skill '${skill.id}' label '${skill.label}' violates Rule 22 (contains parenthetical status suffix)`);
          }
        }
      }

      // CJ BAGUVIX God Mode Emerald Green Overlay & Cheat Typing Immobility Test
      if (fType === 'cj') {
        fighter.isBaguvixActive = true;
        mockCtx.resetStackDepth();
        drawCjBaguvixDimScreen();
        assertCanvasStackBalance("CJ drawCjBaguvixDimScreen");
        fighter.isBaguvixActive = false;

        // Test cheat typing immobility
        fighter.x = 200;
        fighter.y = 200;
        fighter.vx = 4;
        fighter.vy = 4;
        fighter.startCheatTyping('BAGUVIX', () => {});
        if (fighter.vx !== 0 || fighter.vy !== 0) {
          throw new Error(`CJ vx/vy should be 0 upon startCheatTyping, got (${fighter.vx}, ${fighter.vy})`);
        }
        if (!fighter.isStationarySkillActive()) {
          throw new Error(`CJ isStationarySkillActive() should return true while typing!`);
        }

        // Simulate 10 frames of typing update with enemy nearby
        for (let t = 0; t < 10; t++) {
          fighter.update(dummyOpponent, 0, state.arena);
          if (fighter.x !== 200 || fighter.y !== 200) {
            throw new Error(`CJ position drifted while typing cheat: expected (200, 200), got (${fighter.x}, ${fighter.y})`);
          }
          if (fighter.vx !== 0 || fighter.vy !== 0) {
            throw new Error(`CJ velocity should remain 0 while typing cheat, got (${fighter.vx}, ${fighter.vy})`);
          }
        }
        fighter.isTypingCheat = false;
      }

      // Yuta-specific Domain Activation, Hyper-Armor, & Domain Clash Test
      if (fType === 'yuta') {
        console.log("   Testing Yuta domain clash deployment inside Sukuna's domain...");
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;

        // 1. Verify Yuta can trigger domain even if Rika is dead/inactive
        if (fighter.rika) {
          fighter.rika.active = false;
          fighter.rika.hp = 0;
          fighter.rika.isDying = true;
        }
        fighter.domainUseCount = 0;
        fighter.hp = fighter.maxHp * 0.50; // Dropped below 60% threshold

        const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
        const mockSukuna = new SukunaClass(allDefs.find(d => d.type === 'sukuna') || { type: 'sukuna' });
        mockSukuna.x = 350;
        mockSukuna.y = 200;
        mockSukuna.hp = 300;
        mockSukuna.domainActive = true; // Sukuna's Malevolent Shrine is active

        state.fighters = [fighter, mockSukuna];
        fighter.update(mockSukuna, 0, state.arena);

        if (!fighter.isChannelingDomain) {
          throw new Error("Yuta failed to start channeling domain when Rika was dead/inactive!");
        }

        // 2. Verify Hyper-Armor: forceCancelAll / blast damage does NOT cancel domain channeling
        fighter.interruptAttacks(true);
        if (!fighter.isChannelingDomain) {
          throw new Error("Yuta domain channeling was cancelled by interruptAttacks(true)!");
        }

        // 3. Verify Domain Clash Acceleration: domainChargeTimer increases at accelerated rate (2 per frame)
        const initialCharge = fighter.domainChargeTimer;
        fighter.update(mockSukuna, 0, state.arena);
        const chargeDelta = fighter.domainChargeTimer - initialCharge;
        if (chargeDelta < 2) {
          throw new Error(`Yuta domain clash charge rate is ${chargeDelta}, expected >= 2!`);
        }

        // 4. Simulate until domain deploy: should deploy in ~45 frames and restore Rika to full health
        while (fighter.isChannelingDomain) {
          fighter.update(mockSukuna, 0, state.arena);
        }

        if (!fighter.domainActive) {
          throw new Error("Yuta domain failed to activate after channeling!");
        }
        if (!fighter.rika || !fighter.rika.active || fighter.rika.hp <= 0) {
          throw new Error("Yuta domain deployment failed to auto-summon and restore Rika!");
        }

        // Cleanup
        fighter.domainActive = false;
        mockSukuna.domainActive = false;
        state.fighters = [fighter, dummyOpponent];
      }

      // 7. Winner / Champion Reveal Stance
      mockCtx.resetStackDepth();
      fighter._isWinnerReveal = true;
      fighter.draw(mockCtx, null);
      assertCanvasStackBalance(`Fighter '${fType}' WinnerReveal stance`);

      // 8. Saitama specific punch toggle tests
      if (fType === 'saitama') {
        const origNormal = CONFIG.saitama.normalPunchEnabled;
        const origConsecutive = CONFIG.saitama.consecutivePunchesEnabled;
        const origDisNormal = CONFIG.saitama.disableNormalPunch;
        const origDisConsecutive = CONFIG.saitama.disableConsecutivePunches;

        // Test Normal Punch toggle
        CONFIG.saitama.normalPunchEnabled = false;
        if (fighter.isNormalPunchEnabled() !== false || fighter.canPerformBasicAttack() !== false) {
          throw new Error('Saitama normalPunchEnabled=false failed');
        }
        let hudBars = getSkillDataForFighter(fighter);
        if (hudBars.some(b => b.id === 'punch')) {
          throw new Error('Saitama HUD still displays punch when normalPunchEnabled=false');
        }

        // Test Consecutive Punches toggle
        CONFIG.saitama.normalPunchEnabled = true;
        CONFIG.saitama.consecutivePunchesEnabled = false;
        if (fighter.isConsecutivePunchesEnabled() !== false || fighter.executeConsecutiveNormalPunches(dummyOpponent) !== false) {
          throw new Error('Saitama consecutivePunchesEnabled=false failed');
        }
        hudBars = getSkillDataForFighter(fighter);
        if (hudBars.some(b => b.id === 'flurry')) {
          throw new Error('Saitama HUD still displays flurry when consecutivePunchesEnabled=false');
        }

        // Test disable flags
        CONFIG.saitama.consecutivePunchesEnabled = true;
        CONFIG.saitama.disableNormalPunch = true;
        CONFIG.saitama.disableConsecutivePunches = true;
        if (fighter.isNormalPunchEnabled() !== false || fighter.isConsecutivePunchesEnabled() !== false) {
          throw new Error('Saitama disable flags failed');
        }

        // Restore user's actual configured settings
        CONFIG.saitama.disableNormalPunch = origDisNormal;
        CONFIG.saitama.disableConsecutivePunches = origDisConsecutive;
        CONFIG.saitama.normalPunchEnabled = origNormal;
        CONFIG.saitama.consecutivePunchesEnabled = origConsecutive;
      }

      // 9. CJ specific non-chase movement tests
      if (fType === 'cj') {
        // Activate Jetpack mode and verify natural velocity orientation
        fighter.isJetpackActive = true;
        fighter.speed = 8.4;
        fighter.vx = 8.4;
        fighter.vy = 0;
        dummyOpponent.x = fighter.x;
        dummyOpponent.y = fighter.y + 300; // Opponent is directly below
        fighter.update(dummyOpponent, 0, state.arena);
        // After update in Jetpack mode, velocity should remain primarily horizontal (not forced straight down to follow opponent)
        if (Math.abs(fighter.vx) < 5.0) {
          throw new Error('CJ Jetpack velocity was artificially steered to chase the opponent');
        }
        fighter.isJetpackActive = false;
      }

      // 10. Toji specific back thrust knockback & displacement tests
      if (fType === 'toji') {
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 240;
        dummyOpponent.y = 200;
        fighter.gunAngle = 0;
        fighter.angle = 0;
        dummyOpponent.knockbackVx = 0;
        dummyOpponent.knockbackVy = 0;
        state.fighters = [fighter, dummyOpponent];

        // Perform Inverted Spear back thrust
        const hitTargets = fighter.performInvertedSpearStrike(dummyOpponent, 0, true);
        if (!hitTargets || hitTargets.length === 0) {
          throw new Error('Toji back thrust strike did not land on target');
        }
        if (Math.abs(dummyOpponent.knockbackVx) < 5) {
          throw new Error(`Toji back thrust knockback velocity was insufficient: ${dummyOpponent.knockbackVx} (expected controlled impulse)`);
        }
        if (dummyOpponent.knockbackDecay !== 0.85) {
          throw new Error(`Toji back thrust knockback decay was incorrect: ${dummyOpponent.knockbackDecay} (expected 0.85)`);
        }

        // Setup ambush stasis and verify modUpdateAmbushSequence drives displacement
        fighter.isAmbushing = true;
        fighter.ambushPhase = 'BACK_STAB';
        dummyOpponent.isTargetOfAmbush = true;
        const initialX = dummyOpponent.x;
        fighter.update(dummyOpponent, 0, state.arena);
        if (dummyOpponent.x <= initialX) {
          throw new Error(`Toji ambush sequence did not propel target forward: initialX=${initialX}, currentX=${dummyOpponent.x}`);
        }
        if (dummyOpponent.knockbackVx === 0) {
          throw new Error('Toji ambush target knockback was prematurely zeroed');
        }

        // Clean up test state
        fighter.isAmbushing = false;
        fighter.ambushTarget = null;
        fighter.ambushPhase = null;
        dummyOpponent.isTargetOfAmbush = false;
        dummyOpponent.knockbackVx = 0;
        dummyOpponent.knockbackVy = 0;
      }

      // 11. Gojo specific Hollow Purple Breather Recovery Stasis Test
      if (fType === 'gojo') {
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 350;
        dummyOpponent.y = 250;
        state.fighters = [fighter, dummyOpponent];

        // Fire Hollow Purple to trigger breather recovery based on CONFIG.gojo.purpleRecoveryDuration
        fighter._firePurple(0);
        const expectedRecovery = (CONFIG.gojo?.purpleRecoveryDuration ?? 50);
        if (fighter.purpleRecoveryTimer !== expectedRecovery) {
          throw new Error(`Expected Gojo purpleRecoveryTimer to be ${expectedRecovery}, got ${fighter.purpleRecoveryTimer}`);
        }
        if (!fighter.isStationarySkillActive()) {
          throw new Error('Expected isStationarySkillActive() to return true during Gojo Purple breather');
        }

        // Test Canvas 2D stack balance while drawing breather stasis visuals
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance('Gojo Purple Breather Stasis Visuals');

        // Test breather recovery frame update
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.purpleRecoveryTimer !== expectedRecovery - 1) {
          throw new Error(`Expected purpleRecoveryTimer to decrement to ${expectedRecovery - 1}, got ${fighter.purpleRecoveryTimer}`);
        }
        if (fighter.vx !== 0 || fighter.vy !== 0) {
          throw new Error(`Expected Gojo vx/vy to remain 0 during breather, got (${fighter.vx}, ${fighter.vy})`);
        }
        if (fighter.infinityActive) {
          throw new Error('Expected Limitless Infinity barrier to be disabled while Purple is active');
        }

        // Verify Gojo CANNOT cast another skill while Purple is active
        if (!fighter.isPurpleActive()) {
          throw new Error('Expected isPurpleActive() to be true while Purple is in projectileSystem');
        }
        if (fighter.canPerformBasicAttack()) {
          throw new Error('canPerformBasicAttack() should be false while Purple is active');
        }
        // Attempt to activate Reversal Red while Purple is active -> must fail
        const redResult = fighter._activateRed();
        if (redResult !== false || fighter.redBuildupPhase) {
          throw new Error('Gojo should not be able to cast Reversal Red while Purple is active');
        }
        // Attempt to activate Domain Expansion while Purple is active -> must fail
        fighter.domainCooldown = 0;
        fighter.isChannelingDomainExpansion = false;
        fighter.domainActive = false;
        fighter._activateDomain(state.arena);
        if (fighter.domainActive) {
          throw new Error('Gojo should not be able to activate Domain Expansion while Purple is active');
        }
        // Attempt to activate RCT while Purple is active -> must fail
        fighter.reverseCursedTechniqueCooldown = 0;
        fighter._activateReverseCursedTechnique(dummyOpponent, state.arena);
        if (fighter.isChannelingRCT) {
          throw new Error('Gojo should not be able to activate RCT while Purple is active');
        }

        // Clean up
        fighter.purpleRecoveryTimer = 0;
        fighter.z = 0;
        if (fighter.activePurpleProjectile) {
          fighter.activePurpleProjectile.life = 0;
          const pIdx = projectileSystem.projectiles.indexOf(fighter.activePurpleProjectile);
          if (pIdx !== -1) projectileSystem.projectiles.splice(pIdx, 1);
          fighter.activePurpleProjectile = null;
        }
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.infinityActive) {
          throw new Error('Expected Limitless Infinity barrier to restore after Purple expired');
        }
      }

      // 12. Makima Skill 2: Angel's Armory (1000-Year Holy Spear) Test
      if (fType === 'makima') {
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 200;
        fighter.y = 300;
        dummyOpponent.x = 500;
        dummyOpponent.y = 300;
        dummyOpponent.hp = 400;
        dummyOpponent.maxHp = 400;
        state.fighters = [fighter, dummyOpponent];

        // Trigger Skill 2: Angel's Armory
        fighter.angelCooldown = 0;
        fighter._castAngelArmory(dummyOpponent);
        if (!fighter.isSummoningSpear) {
          throw new Error('Expected Makima isSummoningSpear to be true after casting Skill 2');
        }
        if (!fighter.isStationarySkillActive()) {
          throw new Error('Expected isStationarySkillActive() to return true during spear summon channel');
        }

        const lockedAngle = fighter.spearLaunchAngle;

        // Step through summoning frames while opponent moves, verifying aim remains strictly locked
        while (fighter.spearTimer > 0) {
          mockCtx.resetStackDepth();
          fighter.draw(mockCtx);
          assertCanvasStackBalance(`Makima 1000-Year Spear Summoning Frame ${fighter.spearTimer}`);
          // Move dummy opponent during channeling
          dummyOpponent.x = 200 + Math.sin(fighter.spearTimer) * 100;
          dummyOpponent.y = 600 + Math.cos(fighter.spearTimer) * 100;
          fighter.update(dummyOpponent, 0, state.arena);

          if (Math.abs(fighter.gunAngle - lockedAngle) > 0.0001) {
            throw new Error(`Makima auto-aim rotated during channeling! Expected ${lockedAngle}, got ${fighter.gunAngle}`);
          }
        }
        fighter.update(dummyOpponent, 0, state.arena);

        if (fighter.activeSpears.length === 0) {
          throw new Error('Expected an in-flight 1000-Year Spear projectile after summon channel completed');
        }

        const launchedSpear = fighter.activeSpears[0];
        if (Math.abs(launchedSpear.angle - lockedAngle) > 0.0001) {
          throw new Error(`Makima spear auto-aim snapped on fire! Expected angle ${lockedAngle}, got ${launchedSpear.angle}`);
        }

        // Reposition opponent along the locked trajectory to test collision detonation
        dummyOpponent.x = 500;
        dummyOpponent.y = 300;

        // Test Canvas 2D stack balance during spear flight
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx);
        assertCanvasStackBalance('Makima 1000-Year Spear Flight Visuals');

        // Step through frames until spear hits target and detonates into Holy Cross explosion
        const startHp = dummyOpponent.hp;
        let explosionTriggered = false;
        for (let frame = 0; frame < 30; frame++) {
          fighter.update(dummyOpponent, 0, state.arena);
          if (fighter.activeHolyExplosions.length > 0) {
            explosionTriggered = true;
            break;
          }
        }

        if (!explosionTriggered) {
          throw new Error('Expected 1000-Year Spear to trigger Holy Cross Explosion upon hitting target');
        }
        if (dummyOpponent.hp >= startHp) {
          throw new Error('Expected target to take True Damage from 1000-Year Spear impact');
        }

        // Test Canvas 2D stack balance during Holy Cross Explosion
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx);
        assertCanvasStackBalance('Makima Holy Cross Explosion Visuals');

        // Clean up
        fighter.activeSpears = [];
        fighter.activeHolyExplosions = [];
        fighter.isSummoningSpear = false;
      }

      // 13. Todo Ultimate Background Music Toggle Test
      if (fType === 'todo') {
        const { shouldDuckArenaBgm } = await import('../js/systems/arenaBgmSystem.js');
        const origToggle = CONFIG.todo?.enableTakadaBackgroundSong;

        // Test with music DISABLED
        CONFIG.todo.enableTakadaBackgroundSong = false;
        fighter.reset();
        dummyOpponent.reset();
        fighter.hp = (fighter.maxHp || 100) * 0.2; // HP <= 30% threshold
        state.fighters = [fighter, dummyOpponent];

        // Trigger Takada Channeling
        fighter.isTakadaChanneling = false;
        fighter.isTakadaUltActive = false;
        fighter.takadaSongStarted = false;
        fighter.hasTriggeredTakadaHpUlt = false;
        fighter.update(dummyOpponent, 0, state.arena);

        if (!fighter.isTakadaChanneling) {
          throw new Error('Todo failed to start Takada Channeling with BGM disabled');
        }
        if (fighter.isTakadaBackgroundPlaying) {
          throw new Error('Todo isTakadaBackgroundPlaying should be false when enableTakadaBackgroundSong is false');
        }
        if (shouldDuckArenaBgm()) {
          throw new Error('shouldDuckArenaBgm() should return false when Todo BGM is disabled');
        }

        // Fast forward channeling to activate ultimate
        fighter.takadaChannelTimer = 1;
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.isTakadaUltActive) {
          throw new Error('Todo failed to activate Takada Ultimate with BGM disabled');
        }
        if (fighter.isTakadaBackgroundPlaying) {
          throw new Error('Todo isTakadaBackgroundPlaying should remain false in ultimate when BGM is disabled');
        }

        // Test with music ENABLED
        CONFIG.todo.enableTakadaBackgroundSong = true;
        fighter.reset();
        fighter.hp = (fighter.maxHp || 100) * 0.2; // HP <= 30% threshold
        fighter.isTakadaChanneling = false;
        fighter.isTakadaUltActive = false;
        fighter.takadaSongStarted = false;
        fighter.hasTriggeredTakadaHpUlt = false;
        fighter.update(dummyOpponent, 0, state.arena);

        if (!fighter.isTakadaChanneling) {
          throw new Error('Todo failed to start Takada Channeling with BGM enabled');
        }
        if (!fighter.isTakadaBackgroundPlaying) {
          throw new Error('Todo isTakadaBackgroundPlaying should be true when enableTakadaBackgroundSong is true');
        }
        if (!shouldDuckArenaBgm()) {
          throw new Error('shouldDuckArenaBgm() should return true when Todo BGM is active');
        }

        // Cleanup and restore
        CONFIG.todo.enableTakadaBackgroundSong = origToggle;
        fighter.reset();
      }

    } catch (err) {
      console.error(`❌ [RUNTIME ERROR in fighter '${fType}'] during simulation:`, err);
      errors++;
    }
  }

  // 6.5 Domain Cleanup On Death in 1v2 / 2v2 Matches Test
  console.log('🌌 [Domain Cleanup on Death Test] Verifying active domains/spheres terminate upon fighter death in multi-fighter matches...');
  try {
    const { clearFighterDomain, cleanupDeadFightersDomains, isAnyDomainActive } = await import('../js/systems/domainSystem.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const { YutaFighter } = await import('../js/entities/fighters/YutaFighter.js');
    const { CronosFighter } = await import('../js/entities/fighters/CronosFighter.js');
    const { MahitoFighter } = await import('../js/entities/fighters/MahitoFighter.js');
    const { Fighter } = await import('../js/entities/Fighter.js');

    // Test Gojo Unlimited Void death clearing
    const gojo = new GojoFighter({ startX: 250, startY: 250, type: 'gojo', color: '#FFFFFF' });
    const enemy1 = new Fighter({ startX: 100, startY: 100, type: 'default', color: '#FF0000' });
    const enemy2 = new Fighter({ startX: 400, startY: 400, type: 'default', color: '#FF0000' });
    state.fighters = [gojo, enemy1, enemy2];
    gojo.domainActive = true;
    gojo.domainTimer = 300;
    enemy1.timeStopTimer = 300;
    enemy2.timeStopTimer = 300;

    gojo.hp = 0;
    gojo.onDeath();
    if (gojo.domainActive) {
      throw new Error('Expected Gojo domainActive to be false after death');
    }
    if (enemy1.timeStopTimer !== 0 || enemy2.timeStopTimer !== 0) {
      throw new Error('Expected trapped enemies to be unfrozen when Gojo dies');
    }

    // Test Sukuna Malevolent Shrine death clearing
    const sukuna = new SukunaFighter({ startX: 250, startY: 250, type: 'sukuna', color: '#FF0000' });
    state.fighters = [sukuna, enemy1, enemy2];
    sukuna.domainActive = true;
    sukuna.domainTimer = 500;
    sukuna.hp = 0;
    sukuna.onDeath();
    if (sukuna.domainActive) {
      throw new Error('Expected Sukuna domainActive to be false after death');
    }

    // Test Yuta domain death clearing
    const yuta = new YutaFighter({ startX: 250, startY: 250, type: 'yuta', color: '#D946EF' });
    state.fighters = [yuta, enemy1, enemy2];
    yuta.domainActive = true;
    yuta.domainTimer = 500;
    yuta.domainSwords = [{ x: 100, y: 100 }];
    yuta.hp = 0;
    yuta.onDeath();
    if (yuta.domainActive) {
      throw new Error('Expected Yuta domainActive to be false after death');
    }
    if (yuta.domainSwords.length !== 0) {
      throw new Error('Expected Yuta domainSwords to be cleared after death');
    }

    // Test Mahito domain death clearing
    const mahito = new MahitoFighter({ startX: 250, startY: 250, type: 'mahito', color: '#8B5CF6' });
    state.fighters = [mahito, enemy1, enemy2];
    mahito.domainActive = true;
    mahito.domainTimer = 500;
    enemy1.isFrozenByMahitoDomain = true;
    mahito.hp = 0;
    mahito.onDeath();
    if (mahito.domainActive) {
      throw new Error('Expected Mahito domainActive to be false after death');
    }
    if (enemy1.isFrozenByMahitoDomain) {
      throw new Error('Expected enemy to be unfrozen when Mahito dies');
    }

    // Test Cronos time stop sphere death clearing
    const cronos = new CronosFighter({ startX: 250, startY: 250, type: 'cronos', color: '#00F3FF' });
    state.fighters = [cronos, enemy1, enemy2];
    cronos.sphereActive = true;
    cronos.sphereTimer = 300;
    enemy1.timeStopTimer = 300;
    enemy1._frozenByCronosSphere = true;
    cronos.hp = 0;
    cronos.onDeath();
    if (cronos.sphereActive) {
      throw new Error('Expected Cronos sphereActive to be false after death');
    }
    if (enemy1.timeStopTimer !== 0 || enemy1._frozenByCronosSphere) {
      throw new Error('Expected trapped fighters to be unfrozen when Cronos dies');
    }

    // Test Yuta Non-Fatal RCT Heal & Fatal RCT Revival Mechanics
    state.gameState = 'playing';
    const testYuta = new YutaFighter({ startX: 250, startY: 250, type: 'yuta', color: '#D946EF' });
    const dummyTarget = new YutaFighter({ startX: 300, startY: 250, type: 'yuta', color: '#888888' });
    const dummyTarget2 = new YutaFighter({ startX: 320, startY: 250, type: 'yuta', color: '#555555' });
    state.fighters = [testYuta, dummyTarget, dummyTarget2];

    // Non-fatal heavy damage: takes 25% max HP damage (unblockable)
    const heavyDmg = testYuta.maxHp * 0.25;
    testYuta.takeDamage(heavyDmg, dummyTarget, { undodgeable: true, bypassShield: true });
    if (testYuta.hp !== testYuta.maxHp - heavyDmg) {
      throw new Error(`Expected Yuta HP to be ${testYuta.maxHp - heavyDmg} after non-fatal damage, got ${testYuta.hp}`);
    }
    if (testYuta.rctHealTimer <= 0) {
      throw new Error(`Expected Yuta rctHealTimer to be active after heavy damage, got ${testYuta.rctHealTimer}`);
    }
    if (testYuta.rctRevivalTimer !== 0) {
      throw new Error(`Expected Yuta rctRevivalTimer to remain 0 for non-fatal damage, got ${testYuta.rctRevivalTimer}`);
    }

    // Verify Yuta does NOT freeze during rctHealTimer: can still update and move
    const prevHp = testYuta.hp;
    testYuta.update(dummyTarget, 0, state.arena);
    if (testYuta.hp <= prevHp) {
      throw new Error('Expected Yuta to regenerate HP during rctHealTimer');
    }

    // Fatal blow: triggers once-per-match RCT Revival at 1 HP
    testYuta.rctHealTimer = 0;
    testYuta.takeDamage(testYuta.hp + 50, dummyTarget, { undodgeable: true, bypassShield: true });
    if (testYuta.hp !== 1 || !testYuta.hasUsedRCTRevival || testYuta.rctRevivalTimer <= 0) {
      throw new Error(`Expected fatal blow to trigger RCT Revival survival at 1 HP, got HP=${testYuta.hp}, used=${testYuta.hasUsedRCTRevival}, timer=${testYuta.rctRevivalTimer}`);
    }

    // Test Yuta Flurry -> Thin Ice Breaker seamless transition
    testYuta.reset();
    dummyTarget.reset();
    dummyTarget.x = 290;
    dummyTarget.y = 250;
    dummyTarget2.reset();
    dummyTarget2.x = 310;
    dummyTarget2.y = 250;
    testYuta.flurryHitsLeft = 1;
    testYuta.flurryTimer = 0;
    testYuta.flurryTarget = dummyTarget;

    // Trigger final flurry hit
    testYuta.update(dummyTarget, 0, state.arena);
    if (!testYuta.isChannelingThinIceBreaker) {
      throw new Error('Expected Yuta to cancel directly into Thin Ice Breaker on final flurry hit without delay!');
    }
    if (testYuta.thinIceBreakerChargeTimer > 8) {
      throw new Error(`Expected Thin Ice Breaker charge timer to be snappy <= 8 frames, got ${testYuta.thinIceBreakerChargeTimer}`);
    }
    if (Math.hypot(testYuta.vx, testYuta.vy) <= 0.1) {
      throw new Error('Expected Yuta to have forward momentum toward target during Thin Ice Breaker windup');
    }

    // Test 1v2 dynamic retargeting when target dies/vanishes/swaps
    dummyTarget.hp = 0;
    dummyTarget.isDead = true;
    testYuta.update(dummyTarget2, 0, state.arena);
    if (testYuta.flurryTarget !== dummyTarget2) {
      throw new Error('Expected Yuta to dynamically re-target to dummyTarget2 when primary target died');
    }

    // Fast-forward Thin Ice Breaker charge to execution
    while (testYuta.isChannelingThinIceBreaker) {
      testYuta.update(dummyTarget2, 0, state.arena);
    }
    if (testYuta.thinIceBreakerPunchTimer <= 0) {
      throw new Error('Expected Thin Ice Breaker punch follow-through to be active after unleashing');
    }

    // Test Saitama Flurry cleanup across all fighters
    const { SaitamaFighter } = await import('../js/entities/fighters/SaitamaFighter.js');
    const testSaitama = new SaitamaFighter({ startX: 200, startY: 200, type: 'saitama', color: '#FFD700' });
    state.fighters = [testSaitama, dummyTarget2];
    dummyTarget2.hp = 1000;
    dummyTarget2.isDead = false;
    testSaitama.flurryCooldown = 0;
    testSaitama.executeConsecutiveNormalPunches(dummyTarget2);

    while (testSaitama.isFlurrying) {
      testSaitama.update(dummyTarget2, 0, state.arena);
    }
    if (dummyTarget2.caughtInSaitamaFlurry || dummyTarget2.timeStopTimer !== 0) {
      throw new Error('Expected Saitama flurry completion to cleanly clear caughtInSaitamaFlurry and hold pause across all targets');
    }

    // Test Saitama Serious Skill Counter completion and dodge recovery
    testSaitama.skillPunishCooldown = 0;
    testSaitama.dodgeCooldown = 0;
    dummyTarget2.hp = 1000;
    testSaitama.executeSkillCounterPunish(dummyTarget2);
    if (!testSaitama.isCountering || testSaitama._counterPunchTimer <= 0) {
      throw new Error('Expected Serious Skill Counter to be active after executeSkillCounterPunish');
    }
    // Fast-forward through counter windup and post-counter recovery
    for (let frame = 0; frame < 300; frame++) {
      testSaitama.update(dummyTarget2, 0, state.arena);
      if (!testSaitama.isCountering && testSaitama._counterPunchTimer === 0 && testSaitama._postCounterRecoveryTimer === 0) {
        break;
      }
    }
    if (testSaitama.isCountering || testSaitama._counterPunchTimer > 0 || testSaitama._postCounterRecoveryTimer > 0) {
      throw new Error('Expected Serious Skill Counter to complete and release counter state');
    }
    // Verify dodging works after counter completion
    testSaitama.dodgeCooldown = 0;
    const oldX = testSaitama.x;
    const oldY = testSaitama.y;
    const dodgeResult = testSaitama.executeDodgeTeleport(dummyTarget2);
    if (!dodgeResult && Math.random() < (CONFIG.saitama?.dodgeChance ?? 0.70)) {
      // If RNG succeeded but dodge was blocked by stale state:
      if (testSaitama._counterPunchTarget || testSaitama._counterPunchTimer > 0 || testSaitama._postCounterRecoveryTimer > 0) {
        throw new Error('Saitama dodge was blocked by stale Serious Counter state after completion');
      }
    }

    // Test Saitama Serious Skill Counter cancellation via interruptAttacks
    dummyTarget2.hp = 10000;
    dummyTarget2.isDead = false;
    testSaitama.x = 200;
    testSaitama.y = 200;
    dummyTarget2.x = 300;
    dummyTarget2.y = 200;
    testSaitama.skillPunishCooldown = 0;
    testSaitama.dodgeCooldown = 0;
    testSaitama.executeSkillCounterPunish(dummyTarget2);
    testSaitama.interruptAttacks(true);
    if (testSaitama.isCountering || testSaitama._counterPunchTarget !== null || testSaitama._counterPunchTimer > 0 || testSaitama._postCounterRecoveryTimer > 0) {
      throw new Error('Expected interruptAttacks(true) to cleanly clear all Serious Counter state and target');
    }
    testSaitama.dodgeCooldown = 0;
    const cancelDodgeResult = testSaitama.executeDodgeTeleport(dummyTarget2);
    if (!cancelDodgeResult && testSaitama._counterPunchTarget) {
      throw new Error('Saitama dodge was blocked by uncleared _counterPunchTarget after counter cancellation');
    }

    // Test Saitama dodge disabled inside Gojo's domain (Unlimited Void)
    const testGojo = new GojoFighter({ startX: 400, startY: 400, type: 'gojo', color: '#00F0FF' });
    testGojo.domainActive = true;
    testGojo.hp = 1000;
    state.fighters = [testSaitama, testGojo];
    testSaitama.dodgeCooldown = 0;
    const dodgeInGojoDomain = testSaitama.executeDodgeTeleport(testGojo);
    if (dodgeInGojoDomain) {
      throw new Error('Expected Saitama dodge to be completely disabled inside Gojo domain');
    }
    testGojo.domainActive = false;
    state.fighters = [testSaitama, dummyTarget2];

    // Test Serious Counter cancellation when pulled by Lapse Blue / Hollow Purple / Getsuga drag / Telekinesis
    dummyTarget2.hp = 10000;
    dummyTarget2.isDead = false;
    testSaitama.x = 200;
    testSaitama.y = 200;
    dummyTarget2.x = 300;
    dummyTarget2.y = 200;
    testSaitama.skillPunishCooldown = 0;
    testSaitama.executeSkillCounterPunish(dummyTarget2);
    if (!testSaitama.isCountering || testSaitama._counterPunchTimer <= 0) {
      throw new Error('Expected Serious Counter to be active before testing pull cancellation');
    }
    // Simulate getting pulled by Lapse Blue
    state.projectiles = [{
      x: testSaitama.x + 30,
      y: testSaitama.y + 30,
      life: 100,
      isGojoBlue: true,
      pullRadius: 150,
      owner: 1
    }];
    testSaitama.update(dummyTarget2, 0, state.arena);
    if (testSaitama.isCountering || testSaitama._counterPunchTimer > 0) {
      throw new Error('Expected Serious Counter to be cancelled immediately when pulled by Lapse Blue');
    }
    state.projectiles = [];

    // Test Serious Counter cancellation when Gojo deploys domain (Unlimited Void) in time
    state.gameState = 'playing';
    testGojo.hp = 1000;
    testGojo.domainActive = false;
    testGojo.isChannelingDomainExpansion = true;
    testGojo.domainChargeTimer = testGojo.domainChargeMax - 1; // 1 frame away from deploying domain
    state.fighters = [testSaitama, testGojo];
    testSaitama.x = 200;
    testSaitama.y = 200;
    testGojo.x = 300;
    testGojo.y = 200;
    testSaitama.skillPunishCooldown = 0;
    testSaitama.dodgeCooldown = 0;
    testSaitama.executeSkillCounterPunish(testGojo);
    if (!testSaitama.isCountering || testSaitama._counterPunchTimer <= 0) {
      throw new Error('Expected Serious Counter to be active while Gojo is channeling domain');
    }
    // Gojo deploys domain expansion
    testGojo.update(testSaitama, 1, state.arena);
    if (!testGojo.domainActive) {
      throw new Error('Expected Gojo domain to become active after charge completed');
    }
    // Saitama updates inside Gojo's active domain
    testSaitama.update(testGojo, 0, state.arena);
    if (testSaitama.isCountering || testSaitama._counterPunchTimer > 0 || testSaitama._counterPunchTarget !== null) {
      throw new Error('Expected Saitama Serious Skill Counter to get cancelled when Gojo deploys domain in time');
    }
    if (testSaitama.timeStopTimer <= 0 && testSaitama.hitStunTimer <= 0) {
      throw new Error('Expected Saitama to be frozen by Gojo domain after counter cancellation');
    }
    testGojo.domainActive = false;
    state.fighters = [testSaitama, dummyTarget2];

    // Test Yuji Divergent Fist Dash execution and punch arrival
    const { YujiFighter } = await import('../js/entities/fighters/YujiFighter.js');
    const testYuji = new YujiFighter({ startX: 100, startY: 100, type: 'yuji', color: '#D95C7E' });
    const dummyTarget3 = new Fighter({ startX: 250, startY: 100, type: 'default', color: '#00FFCC' });
    dummyTarget3.hp = 100;
    dummyTarget3.maxHp = 100;
    dummyTarget3.isDead = false;
    state.fighters = [testYuji, dummyTarget3];
    testYuji.divergentDashCooldown = 0;

    const triggered = testYuji.triggerDivergentDash(dummyTarget3);
    if (!triggered || !testYuji.isDivergentDashing) {
      throw new Error('Expected Yuji triggerDivergentDash to successfully initiate dash towards target');
    }

    // Fast-forward dash frames
    let dashSafety = 30;
    while (testYuji.isDivergentDashing && dashSafety-- > 0) {
      testYuji.update(dummyTarget3, 0, state.arena);
    }
    if (testYuji.isDivergentDashing) {
      throw new Error('Expected Yuji to complete dash upon reaching target');
    }
    if (testYuji.delayedShockwaves.length === 0 && dummyTarget3.hp >= 100) {
      throw new Error('Expected Yuji Divergent Fist to strike target and queue delayed shockwave');
    }

    // Test Yuji Soul Swap continuous teleport-slash loop & duration persistence
    testYuji.hp = testYuji.maxHp * 0.25; // Trigger Soul Swap
    testYuji.hasSoulSwapped = false;
    testYuji.soulSwapActive = false;
    dummyTarget3.hp = 10000;
    dummyTarget3.isDead = false;
    testYuji.update(dummyTarget3, 0, state.arena); // Trigger takeover

    if (!testYuji.soulSwapActive || testYuji.soulSwapTimer !== 800) {
      throw new Error(`Expected Soul Swap to activate with duration 800, got active=${testYuji.soulSwapActive}, timer=${testYuji.soulSwapTimer}`);
    }

    // Step through 100 frames of combat and verify continuous teleport-slashes continue without cancellation
    for (let f = 0; f < 100; f++) {
      testYuji.update(dummyTarget3, 0, state.arena);
      // Simulate taking enemy attacks during Soul Swap to verify Super Armor & non-cancellation
      if (f === 20 || f === 50) {
        testYuji.takeDamage(20, dummyTarget3, { isExplosion: true });
        testYuji.interruptAttacks(false);
      }
    }

    if (!testYuji.soulSwapActive || testYuji.soulSwapTimer <= 0) {
      throw new Error(`Expected Soul Swap to remain continuously active throughout duration, got active=${testYuji.soulSwapActive}, timer=${testYuji.soulSwapTimer}`);
    }

    // Fast-forward to end of duration and verify clean revert & RCT heal
    while (testYuji.soulSwapTimer > 0) {
      testYuji.update(dummyTarget3, 0, state.arena);
    }
    if (testYuji.soulSwapActive) {
      throw new Error('Expected Soul Swap to revert when duration reached 0');
    }
    if (testYuji.revertTransitionTimer <= 0) {
      throw new Error('Expected revert transition timer to be active upon transformation expiration');
    }
  } catch (err) {
    console.error('❌ [DOMAIN DEATH CLEANUP TEST ERROR]:', err);
    errors++;
  }

  // 6.5. Makima Chains of Domination & Mind Control Puppetry Test
  console.log('⛓️ [Makima Chains & Mind Control Test] Verifying mind control puppetry, Rika retaliation, and mutual ally combat...');
  try {
    const MakimaClass = FIGHTER_CLASS_MAP['makima'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const YujiClass = FIGHTER_CLASS_MAP['yuji'];

    if (MakimaClass && YutaClass && YujiClass) {
      const makimaDef = allDefs.find(d => (d.type === 'makima' || d.characterId === 'makima'));
      const yutaDef = allDefs.find(d => (d.type === 'yuta' || d.characterId === 'yuta'));
      const yujiDef = allDefs.find(d => (d.type === 'yuji' || d.characterId === 'yuji'));

      const testMakima = new MakimaClass({ ...makimaDef, startX: 200, startY: 200 });
      const testYuta = new YutaClass({ ...yutaDef, startX: 280, startY: 200 });
      
      // Initialize Rika on Yuta and manifest her
      testYuta.rika.active = true;
      testYuta.rika.spawnTimer = 0;
      testYuta.rika.hp = 500;
      testYuta.rika.maxHp = 500;
      testYuta.rika.x = 320;
      testYuta.rika.y = 200;

      state.fighters = [testMakima, testYuta];
      state.illusions = [testYuta.rika];
      state.getFighterTeam = (idx) => (idx === 0 ? 0 : 1);

      // Makima casts Chains of Domination on Yuta
      testMakima._castChainsOfDomination(testYuta);

      if (!testYuta.isChainedByMakima) {
        throw new Error('Expected Yuta to be chained by Makima');
      }
      if (!testYuta.isMindControlledByMakima) {
        throw new Error('Expected Yuta to be mind-controlled because Rika is active');
      }
      if (testYuta.timeStopTimer > 0) {
        throw new Error(`Expected Yuta to NOT be frozen in time-stop stasis while mind-controlled, got timeStopTimer=${testYuta.timeStopTimer}`);
      }

      // Allegiance check
      if (!testYuta.isTeammate(testMakima)) {
        throw new Error('Expected mind-controlled Yuta to treat Makima as friendly');
      }
      if (testYuta.isTeammate(testYuta.rika)) {
        throw new Error('Expected mind-controlled Yuta to treat Rika as hostile enemy');
      }

      // Target acquisition check
      const { getClosestOpponent } = await import('../js/systems/physics.js');
      const yutaOpponent = getClosestOpponent(testYuta);
      if (yutaOpponent !== testYuta.rika) {
        throw new Error(`Expected mind-controlled Yuta to target Rika, got ${yutaOpponent?.type || yutaOpponent?.name || yutaOpponent}`);
      }

      // Rika retaliation check: Rika must target Yuta
      const { updateRika } = await import('../js/entities/fighters/yuta/rikaLogic.js');
      updateRika(testYuta, state.arena);
      if (testYuta.rika.target !== testYuta) {
        throw new Error(`Expected Rika to retaliate and target mind-controlled Yuta, got ${testYuta.rika.target?.type || testYuta.rika.target?.name}`);
      }

      // Test Direct Rika Subjugation: Makima chains Rika directly
      const testMakimaRika = new MakimaClass({ ...makimaDef, startX: 200, startY: 200 });
      const testYutaRika = new YutaClass({ ...yutaDef, startX: 450, startY: 200 });
      testYutaRika.rika.active = true;
      testYutaRika.rika.spawnTimer = 0;
      testYutaRika.rika.hp = 500;
      testYutaRika.rika.maxHp = 500;
      testYutaRika.rika.x = 280;
      testYutaRika.rika.y = 200;
      state.fighters = [testMakimaRika, testYutaRika];
      state.illusions = [testYutaRika.rika];
      state.getFighterTeam = (idx) => (idx === 0 ? 0 : 1);

      testMakimaRika._castChainsOfDomination(testYutaRika.rika);
      if (!testYutaRika.rika.isChainedByMakima || !testYutaRika.rika.isMindControlledByMakima) {
        throw new Error('Expected Rika to be chained and mind-controlled when hit directly by Makima chains');
      }
      if (testYutaRika.rika.owner !== testMakimaRika) {
        throw new Error('Expected chained Rika to be subjugated to Makima');
      }
      updateRika(testYutaRika, state.arena);
      if (testYutaRika.rika.target !== testYutaRika) {
        throw new Error(`Expected directly chained Rika to target Yuta, got ${testYutaRika.rika.target?.type || testYuta.rika.target?.name}`);
      }
      if (!testYutaRika.isMakimaControlledRikaTarget(testYutaRika.rika)) {
        throw new Error('Expected Yuta to treat chained Rika as hostile target');
      }

      // Test 1v1 without summons: victim is held in stasis
      const testMakima2 = new MakimaClass({ ...makimaDef, startX: 200, startY: 200 });
      const testSoloTarget = new YujiClass({ ...yujiDef, startX: 280, startY: 200 });
      state.fighters = [testMakima2, testSoloTarget];
      state.illusions = [];
      state.getFighterTeam = (idx) => (idx === 0 ? 0 : 1);

      testMakima2._castChainsOfDomination(testSoloTarget);
      if (!testSoloTarget.isChainedByMakima) {
        throw new Error('Expected solo target to be chained');
      }
      if (testSoloTarget.isMindControlledByMakima) {
        throw new Error('Expected solo target without allies/summons to NOT be mind-controlled');
      }
      if (testSoloTarget.timeStopTimer <= 0) {
        throw new Error('Expected solo target without allies to be held in Subjugation Stasis');
      }

      // Test 2v2 mutual ally combat: Makima chains Ally A in team with Ally B
      const testAllyA = new YujiClass({ ...yujiDef, startX: 280, startY: 200 });
      const testAllyB = new YutaClass({ ...yutaDef, startX: 340, startY: 200 });
      state.fighters = [testMakima2, testAllyA, testAllyB];
      state.illusions = [];
      state.getFighterTeam = (idx) => (idx === 0 ? 0 : 1); // Makima on team 0, Ally A & B on team 1

      testMakima2._castChainsOfDomination(testAllyA);
      if (!testAllyA.isMindControlledByMakima) {
        throw new Error('Expected Ally A to be mind-controlled because teammate Ally B is present');
      }
      const allyAOpponent = getClosestOpponent(testAllyA);
      if (allyAOpponent !== testAllyB) {
        throw new Error(`Expected mind-controlled Ally A to target former teammate Ally B, got ${allyAOpponent?.name || allyAOpponent?.type}`);
      }
      const allyBOpponent = getClosestOpponent(testAllyB);
      if (allyBOpponent !== testAllyA) {
        throw new Error(`Expected Ally B to retaliate and target mind-controlled Ally A, got ${allyBOpponent?.name || allyBOpponent?.type}`);
      }
    }
  } catch (err) {
    console.error('❌ [MAKIMA MIND CONTROL TEST ERROR]:', err);
    errors++;
  }

  // 6.6. Domain Expansion Duration Natural Drainage Under Stun Test
  console.log('🌌 [Domain Expansion Duration Under Stun Test] Verifying domain duration drains naturally during stuns/paralysis/time-stop...');
  try {
    const dummyTarget = { x: 300, y: 300, r: 25, hp: 1000, maxHp: 1000, isDead: false, team: 1 };
    state.arena = { x: 0, y: 0, width: 800, height: 800 };
    state.gameState = 'playing';

    // 1. Mahito
    const MahitoClass = FIGHTER_CLASS_MAP['mahito'];
    if (MahitoClass) {
      const mahitoDef = allDefs.find(d => (d.type === 'mahito' || d.characterId === 'mahito'));
      const testMahito = new MahitoClass({ ...mahitoDef, startX: 200, startY: 200 });
      testMahito.domainActive = true;
      testMahito.domainTimer = 600;
      testMahito.applyHitStun(60);
      testMahito.applyTimeStop(60);
      state.fighters = [testMahito, dummyTarget];
      state.getFighterTeam = (idx) => idx;

      for (let i = 0; i < 10; i++) {
        testMahito.update(dummyTarget, 0, state.arena);
      }
      if (testMahito.domainTimer !== 590) {
        throw new Error(`Expected Mahito domainTimer to drain naturally from 600 to 590 under stun, got ${testMahito.domainTimer}`);
      }

      // Fast-forward to natural expiration under stun
      while (testMahito.domainTimer > 0) {
        testMahito.applyTimeStop(60);
        testMahito.update(dummyTarget, 0, state.arena);
      }
      if (testMahito.domainActive) {
        throw new Error('Expected Mahito domainActive to become false upon reaching 0 domainTimer');
      }
    }

    // 2. Gojo
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    if (GojoClass) {
      const gojoDef = allDefs.find(d => (d.type === 'gojo' || d.characterId === 'gojo'));
      const testGojo = new GojoClass({ ...gojoDef, startX: 200, startY: 200 });
      testGojo.domainActive = true;
      testGojo.domainTimer = 400;
      testGojo.applyHitStun(60);
      testGojo.applyTimeStop(60);
      state.fighters = [testGojo, dummyTarget];
      state.getFighterTeam = (idx) => idx;

      for (let i = 0; i < 10; i++) {
        testGojo.update(dummyTarget, 0, state.arena);
      }
      if (testGojo.domainTimer !== 390) {
        throw new Error(`Expected Gojo domainTimer to drain naturally from 400 to 390 under stun, got ${testGojo.domainTimer}`);
      }
    }

    // 3. Yuta
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    if (YutaClass) {
      const yutaDef = allDefs.find(d => (d.type === 'yuta' || d.characterId === 'yuta'));
      const testYuta = new YutaClass({ ...yutaDef, startX: 200, startY: 200 });
      testYuta.domainActive = true;
      testYuta.domainTimer = 500;
      testYuta.applyHitStun(60);
      testYuta.applyTimeStop(60);
      state.fighters = [testYuta, dummyTarget];
      state.getFighterTeam = (idx) => idx;

      for (let i = 0; i < 10; i++) {
        testYuta.update(dummyTarget, 0, state.arena);
      }
      if (testYuta.domainTimer !== 490) {
        throw new Error(`Expected Yuta domainTimer to drain naturally from 500 to 490 under stun, got ${testYuta.domainTimer}`);
      }
    }

    // 4. Sukuna
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    if (SukunaClass) {
      const sukunaDef = allDefs.find(d => (d.type === 'sukuna' || d.characterId === 'sukuna'));
      const testSukuna = new SukunaClass({ ...sukunaDef, startX: 200, startY: 200 });
      testSukuna.domainActive = true;
      testSukuna.domainTimer = 500;
      testSukuna.applyHitStun(60);
      testSukuna.applyTimeStop(60);
      state.fighters = [testSukuna, dummyTarget];
      state.getFighterTeam = (idx) => idx;

      for (let i = 0; i < 10; i++) {
        testSukuna.update(dummyTarget, 0, state.arena);
      }
      if (testSukuna.domainTimer !== 490) {
        throw new Error(`Expected Sukuna domainTimer to drain naturally from 500 to 490 under stun, got ${testSukuna.domainTimer}`);
      }
    }

    // 5. Rubbick
    const RubbickClass = FIGHTER_CLASS_MAP['rubbick'];
    if (RubbickClass) {
      const rubbickDef = allDefs.find(d => (d.type === 'rubbick' || d.characterId === 'rubbick'));
      const testRubbick = new RubbickClass({ ...rubbickDef, startX: 200, startY: 200 });
      testRubbick.stolenType = 'gojo_domain';
      testRubbick.stolenDomainActive = true;
      testRubbick.stolenDomainTimer = 300;
      testRubbick.applyHitStun(60);
      testRubbick.applyTimeStop(60);
      state.fighters = [testRubbick, dummyTarget];
      state.getFighterTeam = (idx) => idx;

      for (let i = 0; i < 10; i++) {
        testRubbick.update(dummyTarget, 0, state.arena);
      }
      if (testRubbick.stolenDomainTimer !== 290) {
        throw new Error(`Expected Rubbick stolenDomainTimer to drain naturally from 300 to 290 under stun, got ${testRubbick.stolenDomainTimer}`);
      }
    }
  } catch (err) {
    console.error('❌ [DOMAIN DURATION DRAIN TEST ERROR]:', err);
    errors++;
  }

  // 6.7. Toji Ambush Against Makima (Re-Ambush Across Multiple Lives)
  console.log('🗡️ [Toji vs Makima Re-Ambush Test] Verifying Toji uses Ambush on Makima repeatedly across multiple lives...');
  try {
    const TojiClass = FIGHTER_CLASS_MAP['toji'];
    const MakimaClass = FIGHTER_CLASS_MAP['makima'];

    if (TojiClass && MakimaClass) {
      const tojiDef = allDefs.find(d => (d.type === 'toji' || d.characterId === 'toji'));
      const makimaDef = allDefs.find(d => (d.type === 'makima' || d.characterId === 'makima'));

      const testToji = new TojiClass({ ...tojiDef, startX: 200, startY: 200 });
      const testMakima = new MakimaClass({ ...makimaDef, startX: 260, startY: 200 });

      state.fighters = [testToji, testMakima];
      state.illusions = [];
      state.arena = { x: 0, y: 0, width: 800, height: 800 };
      state.gameState = 'playing';
      state.getFighterTeam = (idx) => idx;

      // 1. Trigger Toji's first Ambush
      testToji.stealthCooldown = 50; // Ambush is ready (<= 55)
      testToji.stealthTimer = 0;
      testToji.update(testMakima, 0, state.arena);

      if (!testToji.isAmbushing) {
        throw new Error('Expected Toji to launch first Ambush against Makima');
      }

      // Step through first Ambush until Makima is defeated and enters contract revival
      let safety = 200;
      while (testToji.isAmbushing && safety-- > 0) {
        testToji.update(testMakima, 0, state.arena);
      }

      // Force Makima to consume 1 life if not already consumed
      if (testMakima.citizenLives === 2) {
        testMakima.takeDamage(1000, testToji);
      }

      // Fast-forward Makima's 75-frame revival stasis
      while (testMakima.isRevivingFromContract) {
        testMakima.update(testToji, 1, state.arena);
      }

      if (testMakima.hp <= 0 || testMakima.isDead) {
        throw new Error('Expected Makima to be alive after contract revival');
      }

      // 2. Fast-forward Toji's stealth cooldown until Ambush is UP again
      testToji.stealthCooldown = 50; // Ambush ready again
      testToji.stealthTimer = 0;
      testToji.isAmbushing = false;

      testToji.update(testMakima, 0, state.arena);

      if (!testToji.isAmbushing) {
        throw new Error(`Expected Toji to launch SECOND Ambush on revived Makima, but isAmbushing=${testToji.isAmbushing}, stealthCooldown=${testToji.stealthCooldown}`);
      }

      // Step through second Ambush
      let safety2 = 200;
      while (testToji.isAmbushing && safety2-- > 0) {
        testToji.update(testMakima, 0, state.arena);
      }
    }
  } catch (err) {
    console.error('❌ [TOJI VS MAKIMA RE-AMBUSH TEST ERROR]:', err);
    errors++;
  }

  // 6.5. Toji Stealth Preservation Under Stuns & Makima Bang Test
  console.log('🗡️ [Toji Stealth Preservation Under Stuns & Makima Bang Test] Verifying stealth persists through hits, stuns, and Makima Bang...');
  try {
    const TojiClass = FIGHTER_CLASS_MAP['toji'];
    const MakimaClass = FIGHTER_CLASS_MAP['makima'];

    if (TojiClass && MakimaClass) {
      const tojiDef = allDefs.find(d => (d.type === 'toji' || d.characterId === 'toji'));
      const makimaDef = allDefs.find(d => (d.type === 'makima' || d.characterId === 'makima'));

      const testToji = new TojiClass(tojiDef);
      const testMakima = new MakimaClass(makimaDef);

      state.fighters = [testToji, testMakima];
      state.arena = { x: 0, y: 0, width: 540, height: 960 };

      testToji.x = 200;
      testToji.y = 400;
      testMakima.x = 200;
      testMakima.y = 300;

      // 1. Enter active stealth mode (duration 240, cooldown 300 so he is roaming in stealth)
      testToji.stealthTimer = 240;
      testToji.stealthCooldown = 300;
      testToji.isStealthed = true;
      testToji.stealthActive = true;
      testToji.isAmbushing = false;

      // 2. Makima strikes Toji with Bang!
      testMakima.gunAngle = Math.PI / 2; // Aim down at Toji
      testMakima.bangCooldown = 0;
      testMakima._castBangAttack(testToji);

      // Verify damage was taken but stealth was NOT canceled
      if (testToji.isStealthed !== true || testToji.stealthTimer <= 0) {
        throw new Error(`Expected Toji to remain in Stealth after Makima Bang, but isStealthed=${testToji.isStealthed}, stealthTimer=${testToji.stealthTimer}`);
      }

      // Step frames through knockback and wall-pin
      for (let i = 0; i < 20; i++) {
        testToji.update(testMakima, 0, state.arena);
        if (testToji.isStealthed !== true || testToji.stealthTimer <= 0) {
          throw new Error(`Expected Toji to maintain Stealth during knockback/wall-pin at frame ${i}, but isStealthed=${testToji.isStealthed}, stealthTimer=${testToji.stealthTimer}`);
        }
      }

      // 3. Test generic stuns, interrupts, and time-stops
      testToji.applyHitStun(30);
      if (testToji.isStealthed !== true) throw new Error('Stealth canceled after applyHitStun');

      testToji.applyTimeStop(30);
      if (testToji.isStealthed !== true) throw new Error('Stealth canceled after applyTimeStop');

      testToji.applyParalyze(30);
      if (testToji.isStealthed !== true) throw new Error('Stealth canceled after applyParalyze');

      testToji.applyKnockback(10, 10, 20);
      if (testToji.isStealthed !== true) throw new Error('Stealth canceled after applyKnockback');

      testToji.suppressCombatAndVisuals({ isGetsuga: true, timer: 20 });
      if (testToji.isStealthed !== true) throw new Error('Stealth canceled after suppressCombatAndVisuals');

      testToji.interruptAttacks(true);
      if (testToji.isStealthed !== true) throw new Error('Stealth canceled after interruptAttacks(true)');

      // Verify stealthTimer is still positive and active
      if (testToji.stealthTimer <= 0) {
        throw new Error(`Expected stealthTimer > 0, got ${testToji.stealthTimer}`);
      }

      // 4. Test Ambush cooldown & spam prevention:
      // Fast-forward cooldown to 50 (ambushTrigger) to launch Ambush
      testToji.stealthCooldown = 50;
      testToji.update(testMakima, 0, state.arena);
      if (!testToji.isAmbushing) {
        throw new Error('Expected Toji to start Ambush when stealthCooldown <= 55');
      }
      if (testToji.stealthCooldown <= 55) {
        throw new Error(`Expected stealthCooldown to reset to max upon starting Ambush, got ${testToji.stealthCooldown}`);
      }

      // Step through Ambush completion (full 3-stage combo takes ~350 frames)
      let safety = 600;
      while (testToji.isAmbushing && safety-- > 0) {
        testToji.update(testMakima, 0, state.arena);
      }
      if (testToji.isAmbushing) {
        throw new Error('Ambush did not conclude cleanly');
      }

      // Immediately on next frame, Toji MUST NOT immediately spam Ambush again!
      testToji.update(testMakima, 0, state.arena);
      if (testToji.isAmbushing) {
        throw new Error('Toji spammed Ambush immediately on the next frame without waiting for cooldown!');
      }
    }
  } catch (err) {
    console.error('❌ [TOJI STEALTH PRESERVATION TEST ERROR]:', err);
    errors++;
  }

  // 6.6 Sukuna Domain Expansion Fuga Cooldown Preservation Test
  console.log('🔥 [Sukuna Domain Fuga Cooldown Test] Verifying Fuga cooldown is not reset upon domain activation...');
  try {
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    if (SukunaClass) {
      const sukuna = new SukunaClass({ startX: 200, startY: 200, hp: 1000, maxHp: 1000 });
      // Set Fuga cooldown to 50 frames remaining
      sukuna.divineFlameCooldown = 50;
      // Activate domain
      sukuna._activateDomain({ x: 0, y: 0, width: 540, height: 960 });
      if (sukuna.divineFlameCooldown > 50) {
        throw new Error(`Expected divineFlameCooldown to be <= 50 after domain activation, but was reset to ${sukuna.divineFlameCooldown}`);
      }
    }
  } catch (err) {
    console.error('❌ [SUKUNA DOMAIN FUGA COOLDOWN TEST ERROR]:', err);
    errors++;
  }

  // 6.7 Yuji Soul Swap Damage Reception & Mortality Test
  console.log('🔄 [Yuji Soul Swap Mortality Test] Verifying Yuji takes damage and dies during Soul Swap...');
  try {
    const YujiClass = FIGHTER_CLASS_MAP['yuji'];
    if (YujiClass) {
      const yuji = new YujiClass({ startX: 200, startY: 200, hp: 1000, maxHp: 1000 });
      // Damage below 30% threshold (to 200 HP) -> triggers Soul Swap
      yuji.takeDamage(800, null);
      if (!yuji.soulSwapActive) {
        throw new Error('Expected Yuji to activate Soul Swap below 30% HP');
      }
      const hpBefore = yuji.hp;
      // Deal 50 damage during active Soul Swap -> HP must reduce
      yuji.takeDamage(50, null);
      if (yuji.hp >= hpBefore) {
        throw new Error(`Expected Yuji HP to decrease from ${hpBefore}, got ${yuji.hp}`);
      }
      // Deal fatal damage (1000 damage) -> Yuji MUST die immediately
      yuji.takeDamage(1000, null);
      if (yuji.hp > 0 || !yuji.dead) {
        throw new Error(`Expected Yuji to die on fatal hit during Soul Swap, but hp=${yuji.hp}, dead=${yuji.dead}`);
      }
      if (typeof yuji.isEffectivelyAlive === 'function' && yuji.isEffectivelyAlive()) {
        throw new Error('Expected isEffectivelyAlive() to return false when Yuji HP <= 0');
      }
    }
  } catch (err) {
    console.error('❌ [YUJI SOUL SWAP MORTALITY TEST ERROR]:', err);
    errors++;
  }

  // 6.8 Sukuna Fuga (Divine Flame) Knockback & Instant Detonation Verification Test
  console.log('💥 [Sukuna Fuga Knockback & Instant Detonation Test] Verifying Fuga thermobaric explosion delivers directional knockback and detonates instantly without delay...');
  try {
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    if (SukunaClass && GojoClass) {
      const sukuna = new SukunaClass({ startX: 100, startY: 200, hp: 1000, maxHp: 1000 });
      const target = new GojoClass({ startX: 200, startY: 200, hp: 1000, maxHp: 1000 });
      state.fighters = [sukuna, target];

      // Test 1: Direct triggerThermobaricExplosion
      projectileSystem.triggerThermobaricExplosion(200, 200, 0, 300);
      if (Math.abs(target.knockbackVx || 0) < 5 && Math.abs(target.knockbackVy || 0) < 5) {
        throw new Error(`Expected target to receive significant knockback from Fuga explosion, but got knockbackVx=${target.knockbackVx}, knockbackVy=${target.knockbackVy}`);
      }
      if ((target.knockbackStunTimer || 0) <= 0) {
        throw new Error(`Expected target to have knockbackStunTimer > 0 from Fuga, got ${target.knockbackStunTimer}`);
      }

      // Test 2: Projectile flight and instant detonation on enemy collision
      target.knockbackVx = 0;
      target.knockbackVy = 0;
      target.hp = 1000;
      sukuna.x = 100;
      sukuna.y = 200;
      sukuna.gunAngle = 0; // pointing right towards target at (200, 200)
      projectileSystem.projectiles = [];
      state.thermobaricExplosions = [];

      projectileSystem.fireSukunaFurnace(sukuna, 0, 1000);
      if (projectileSystem.projectiles.length !== 1) {
        throw new Error(`Expected 1 active Fuga projectile after firing, got ${projectileSystem.projectiles.length}`);
      }
      const fugaProj = projectileSystem.projectiles[0];
      // Position projectile right in front of target to simulate collision
      fugaProj.x = target.x - 5;
      fugaProj.y = target.y;
      fugaProj.vx = 15;
      fugaProj.vy = 0;

      // Update projectile system: collision must trigger explosion and remove projectile with zero delay (no fadingOut)
      projectileSystem.update([sukuna, target]);

      if (projectileSystem.projectiles.length !== 0) {
        throw new Error(`Expected Fuga projectile to be instantly removed from active projectiles on impact, but ${projectileSystem.projectiles.length} projectiles remain (fadingOut delay trap)!`);
      }
      if (!state.thermobaricExplosions || state.thermobaricExplosions.length === 0) {
        throw new Error(`Expected thermobaric explosion to be spawned on Fuga landing, but none found!`);
      }
      const exp = state.thermobaricExplosions[0];
      if (exp.radius < 20) {
        throw new Error(`Expected thermobaric explosion initial radius >= 20 for instant blast visual, got ${exp.radius}`);
      }
    }
  } catch (err) {
    console.error('❌ [SUKUNA FUGA INSTANT DETONATION TEST ERROR]:', err);
    errors++;
  }

  // 7. Weapon Previews Canvas Stack Balance Check
  console.log('⚔️ [Weapon Preview Stack Test] Verifying all weapon graphics transform balance...');
  for (const def of allDefs) {
    try {
      mockCtx.resetStackDepth();
      drawWeaponPreview(mockCtx, def.type, def.color);
      assertCanvasStackBalance(`drawWeaponPreview('${def.type}')`);
    } catch (err) {
      console.error(`❌ [WEAPON PREVIEW ERROR in '${def.type}']:`, err);
      errors++;
    }
  }

  // 8. Core UI Screens Canvas Stack Balance Check
  console.log('🖥️ [UI Screen Stack Test] Verifying all menus & select screens transform balance...');
  const uiScreens = [
    { name: 'drawTitleScreen', fn: drawTitleScreen },
    { name: 'drawSelectScreen', fn: drawSelectScreen },
    { name: 'drawWeaponMenu', fn: drawWeaponMenu },
    { name: 'drawIndexScreen', fn: drawIndexScreen }
  ];

  for (const sc of uiScreens) {
    try {
      mockCtx.resetStackDepth();
      sc.fn();
      assertCanvasStackBalance(sc.name);
    } catch (err) {
      console.error(`❌ [UI SCREEN ERROR in '${sc.name}']:`, err);
      errors++;
    }
  }

  console.log('───────────────────────────────────────────────────────');
  if (errors === 0) {
    console.log(`✅ Successfully tested all ${totalTested} fighter classes, skins, weapon previews, and UI screens with ZERO runtime errors and 100% BALANCED Canvas 2D stacks!`);
    process.exit(0);
  } else {
    console.error(`🚨 Found ${errors} fighter / weapon / UI runtime errors!`);
    process.exit(1);
  }
}

main();
