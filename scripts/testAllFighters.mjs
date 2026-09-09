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
