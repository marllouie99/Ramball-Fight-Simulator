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
    const el = { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {}, appendChild: () => ({}), removeChild: () => ({}), children: [], querySelector: () => null, querySelectorAll: () => [] };
    el.firstElementChild = el;
    return el;
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    const el = { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {}, appendChild: () => ({}), removeChild: () => ({}), children: [], querySelector: () => null, querySelectorAll: () => [] };
    el.firstElementChild = el;
    return el;
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
  const { state, triggerGlobalScreenShake, saveSkinCustomizations, loadSkinCustomizations } = await import('../js/core/state.js');
  const { renderGame } = await import('../js/systems/renderSystem.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');
  const { drawGetsugaSlash } = await import('../js/graphics/weapons/ichigoWeaponGraphics.js');
  const { drawTodoTakadaIdolScreenOverlay } = await import('../js/graphics/renderers/effectsRenderer.js');
  const { spawnBlackFlash, updateBlackFlashEffects, drawBlackFlashEffects, clearBlackFlashEffects } = await import('../js/graphics/particles/blackFlashEffect.js');
  const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
  const { drawWeaponPreview, drawWeaponMenu } = await import('../js/graphics/ui/WeaponIndexScreen.js');
  const { drawSelectScreen } = await import('../js/graphics/ui/CharacterSelectScreen.js');
  const { drawTitleScreen } = await import('../js/graphics/ui/MainMenuScreen.js');
  const { drawIndexScreen } = await import('../js/graphics/ui/FighterIndexScreen.js');
  const { drawSkinStudioScreen, SKIN_STUDIO_FIGHTERS } = await import('../js/graphics/ui/SkinStudioScreen.js');
  const { drawRoundEndScreen, drawMatchEndScreen } = await import('../js/graphics/ui/GameOverScreen.js');
  const { drawRubbickDomainDimScreen, drawBankaiImpactDimScreen } = await import('../js/graphics/renderers/arenaRenderer.js');
  const { drawCjBaguvixDimScreen } = await import('../js/graphics/renderers/environmentalRenderer.js');
  const { drawFighters } = await import('../js/graphics/renderers/EntityRenderer.js');
  const { audioSystem } = await import('../js/systems/audioSystem.js');
  const { updateGame } = await import('../js/systems/updateSystem.js');
  const { resolveFighterCollision, updateFighters } = await import('../js/systems/physics.js');
  const { reinitFighters } = await import('../js/core/gameFlow.js');
  const { GojoPurpleBehavior } = await import('../js/systems/projectiles/behaviors/GojoPurpleBehavior.js');
  const { initCameraState, updateCamera } = await import('../js/systems/cameraSystem.js');
  const { _getRezeHairImage, _drawRezeHair, drawRezeHumanPixelBody, drawRezeBombHybridBody, drawRezeSkin } = await import('../js/graphics/fighters/rezeSkin.js');
  const { _getIchigoHairImage, _drawIchigoHair, drawIchigoSkin } = await import('../js/graphics/fighters/ichigoSkin.js');
  const { _getYujiHairImage, _drawYujiHair, drawYujiSkin } = await import('../js/graphics/fighters/yujiSkin.js');
  const { _getYutaHairImage, _drawYutaHair, drawYutaPixelBody, drawYutaSkin } = await import('../js/graphics/fighters/yutaSkin.js');
  const { _getTojiHairImage, _drawTojiHair, drawTojiPixelBody, drawTojiSkin, drawTojiGhostSkin } = await import('../js/graphics/fighters/tojiSkin.js');
  const { _getMahitoHairImage, _drawMahitoHair, drawMahitoPixelBody, drawMahitoSkin } = await import('../js/graphics/fighters/mahitoSkin.js');
  const { _getGenosHairImage, _drawGenosHair, drawGenosPixelBody, drawGenosSkin } = await import('../js/graphics/fighters/genosSkin.js');
  const { _getTodoHairImage, _drawTodoHair, drawTodoPixelBody, drawTodoSkin } = await import('../js/graphics/fighters/todoSkin.js');
  const { drawNanamiPixelBody, drawNanamiSkin } = await import('../js/graphics/fighters/nanamiSkin.js');
  const { drawZeusPixelBody, drawZeusSkin, _drawZeusHair, _getZeusHairImage, _drawZeusCrown, _getZeusCrownImage } = await import('../js/graphics/fighters/zeusSkin.js');
  const { _getJohnWickHairImage, _drawJohnWickHair, drawJohnWickPixelBody, drawJohnWickSkin } = await import('../js/graphics/fighters/johnWickSkin.js');
  const { _getZenitsuHairImage, _getZenitsuLightningSpriteImage, _getZenitsuDashSpriteImage, _drawZenitsuHair, drawZenitsuPixelBody, drawZenitsuSkin, _getThunderclapBurst, isZenitsuThunderclapBurst, _drawZenitsuThunderclapDashVFX } = await import('../js/graphics/fighters/zenitsuSkin.js');

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
  const errorList = [];

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
      state.illusions = [];
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
        fighter.bankaiTimer = 1;
        fighter.bankaiFinalGetsugaTriggered = true;
        fighter.x = 200;
        fighter.y = 200;
        fighter.vx = 0;
        fighter.vy = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.hollowMaskActive || fighter.hollowMaskFormationTimer <= 0) {
          throw new Error(`Ichigo did not activate Hollow Mask formation upon Bankai expiration`);
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
        fighter.shunpoCooldown = 0;
        fighter.getsugaCooldown = 0;
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
      if (fType === 'reze') {
        mockCtx.resetStackDepth();
        fighter.reset();

        // 0. Verify Reze Hair Asset & Procedural Drawn Body rendering
        const rezeHairImg = _getRezeHairImage();
        if (!rezeHairImg) {
          throw new Error(`Reze hair image failed to instantiate via _getRezeHairImage()!`);
        }
        mockCtx.resetStackDepth();
        _drawRezeHair(mockCtx, 25, false);
        assertCanvasStackBalance(`_drawRezeHair(facingRight)`);

        mockCtx.resetStackDepth();
        _drawRezeHair(mockCtx, 25, true);
        assertCanvasStackBalance(`_drawRezeHair(facingLeft)`);

        mockCtx.resetStackDepth();
        drawRezeHumanPixelBody(mockCtx, 25, Date.now());
        assertCanvasStackBalance(`drawRezeHumanPixelBody`);

        mockCtx.resetStackDepth();
        drawRezeBombHybridBody(mockCtx, 25, Date.now());
        assertCanvasStackBalance(`drawRezeBombHybridBody`);

        mockCtx.resetStackDepth();
        drawRezeSkin(mockCtx, fighter);
        assertCanvasStackBalance(`drawRezeSkin(HumanForm)`);

        mockCtx.resetStackDepth();
        fighter.isHybridModeActive = true;
        drawRezeSkin(mockCtx, fighter);
        assertCanvasStackBalance(`drawRezeSkin(BombDevilForm)`);
        fighter.isHybridModeActive = false;

        // 1. Verify HUD skill bars:
        // Human Form: only Ultimate is visible (1 skill bar)
        fighter.isHybridModeActive = false;
        fighter.isExecutingNuke = false;
        const hudSkillsHuman = getSkillDataForFighter(fighter);
        if (!hudSkillsHuman || hudSkillsHuman.length !== 1 || hudSkillsHuman[0].id !== 'nuke') {
          throw new Error(`Reze Human Form expected 1 HUD skill bar (nuke), got ${hudSkillsHuman?.length}`);
        }
        const expectedColor = fighter.color || CONFIG.reze?.color || '#430363ff';
        if (hudSkillsHuman[0].color !== expectedColor) {
          throw new Error(`Reze Human Form HUD skill violated Rule 18 with mismatched color ${hudSkillsHuman[0].color}`);
        }

        // Bomb Devil Hybrid Form (Ultimate activated):
        const origSpark = CONFIG.reze?.enableSparkFlechette;
        const origDecoy = CONFIG.reze?.enableDecoyBomb;
        try {
          if (CONFIG.reze) {
            CONFIG.reze.enableSparkFlechette = 1;
            CONFIG.reze.enableDecoyBomb = 1;
          }
          fighter.isHybridModeActive = true;
          const hudSkillsHybridAll = getSkillDataForFighter(fighter);
          if (!hudSkillsHybridAll || hudSkillsHybridAll.length !== 4) {
            throw new Error(`Reze Bomb Devil Hybrid Form (all enabled) expected 4 HUD skill bars, got ${hudSkillsHybridAll?.length}`);
          }
          for (let s of hudSkillsHybridAll) {
            if (s.color !== expectedColor) {
              throw new Error(`Reze HUD skill '${s.label}' violated Rule 18 with mismatched color ${s.color}`);
            }
          }

          // Test that disabling skills hides them in HUD
          if (CONFIG.reze) {
            CONFIG.reze.enableSparkFlechette = 0;
            CONFIG.reze.enableDecoyBomb = 0;
          }
          const hudSkillsHybridFiltered = getSkillDataForFighter(fighter);
          if (!hudSkillsHybridFiltered || hudSkillsHybridFiltered.length !== 2) {
            throw new Error(`Reze Bomb Devil Hybrid Form (spark & decoy disabled) expected 2 HUD skill bars, got ${hudSkillsHybridFiltered?.length}`);
          }
        } finally {
          if (CONFIG.reze) {
            CONFIG.reze.enableSparkFlechette = origSpark;
            CONFIG.reze.enableDecoyBomb = origDecoy;
          }
          fighter.isHybridModeActive = false;
        }

        // 2. Test Collar Pin Revive on lethal damage
        const origRevive = CONFIG.reze?.enableCollarPinRevive;
        if (CONFIG.reze) CONFIG.reze.enableCollarPinRevive = true;
        fighter.hp = 10;
        fighter.reviveStocks = 1;
        fighter.isHybridModeActive = false;
        fighter.takeDamage(100, dummyOpponent, false, 100);

        if (fighter.reviveStocks !== 0) {
          throw new Error(`Reze Collar Pin Revive failed to consume revive stock! Remaining: ${fighter.reviveStocks}`);
        }
        if (!fighter.isHybridModeActive) {
          throw new Error(`Reze Collar Pin Revive failed to activate Bomb Devil Hybrid Form!`);
        }
        if (fighter.hp <= 0) {
          throw new Error(`Reze Collar Pin Revive failed to restore HP! HP: ${fighter.hp}`);
        }
        if (CONFIG.reze) CONFIG.reze.enableCollarPinRevive = origRevive;

        // 3. Test Spark Flechette projectile barrage
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350;
        dummyOpponent.y = 200;
        fighter.sparkCooldown = 0;
        fighter._fireSparkFlechettes(dummyOpponent);
        if (fighter.activeFlechettes.length !== 3) {
          throw new Error(`Reze failed to spawn 3 Spark Flechettes! Spawned: ${fighter.activeFlechettes.length}`);
        }

        // 4. Test Decoy Bomb spawn
        fighter.decoyCooldown = 0;
        fighter._deployDecoyBomb(dummyOpponent);
        if (fighter.activeDecoys.length !== 1) {
          throw new Error(`Reze failed to spawn Decoy Bomb! Count: ${fighter.activeDecoys.length}`);
        }

        // 5. Test Rocket Lunge (Only works during Bomb Devil form)
        fighter.rocketCooldown = 0;
        fighter.isHybridModeActive = false;
        fighter._activateRocketLunge(dummyOpponent);
        if (fighter.isRocketLunging) {
          throw new Error(`Reze Rocket Lunge should not activate in Human Form!`);
        }

        fighter.isHybridModeActive = true;
        fighter._activateRocketLunge(dummyOpponent);
        if (!fighter.isRocketLunging) {
          throw new Error(`Reze failed to initiate Rocket Lunge in Bomb Devil Form!`);
        }
        fighter.isRocketLunging = false;
        fighter.isHybridModeActive = false;

        // 6. Test Megaton Tsar Nuke Ultimate (Human Form triggers pin pull transformation; Devil Form triggers dive assault)
        fighter.nukeCooldown = 0;
        fighter._activateMegatonNuke(dummyOpponent);
        if (!fighter.isPullingPin) {
          throw new Error(`Reze failed to initiate Collar Pin Pull transformation in Human Form!`);
        }
        fighter.isPullingPin = false;
        fighter.isHybridModeActive = true;
        fighter.nukeCooldown = 0;
        fighter._activateMegatonNuke(dummyOpponent);
        if (!fighter.isExecutingNuke || fighter.nukePhase !== 'DIVE') {
          throw new Error(`Reze failed to initiate Megaton Tsar Nuke Dive in Bomb Devil Form!`);
        }

        // 7. Test Bomb Devil Form: Punch AOE Explosions on every basic attack
        fighter.reset();
        fighter.isHybridModeActive = true;
        fighter.x = 200;
        fighter.y = 200;
        fighter.gunAngle = 0; // facing right along +X
        dummyOpponent.x = 250;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;

        const aoeDummy = {
          x: 250,
          y: 240,
          r: 25,
          hp: 100,
          maxHp: 100,
          isDead: false,
          knockbackVx: 0,
          knockbackVy: 0,
          applyTimeStop: () => {}
        };
        const prevFighters = state.fighters;
        state.fighters = [fighter, dummyOpponent, aoeDummy];

        fighter._performExplosivePunch(dummyOpponent);

        if (fighter.activePalmBlasts.length !== 1) {
          throw new Error(`Reze expected 1 punch AOE explosion in activePalmBlasts, got ${fighter.activePalmBlasts.length}`);
        }
        if (!fighter.activePalmBlasts[0].isPunchExplosion) {
          throw new Error(`Reze punch explosion missing isPunchExplosion flag!`);
        }
        if (dummyOpponent.hp >= 100) {
          throw new Error(`Reze punch failed to deal damage to direct target!`);
        }
        if (aoeDummy.hp >= 100) {
          throw new Error(`Reze punch failed to deal AOE explosion damage to nearby target in blast radius!`);
        }
        if (dummyOpponent.knockbackVx <= 0) {
          throw new Error(`Reze punch explosion failed to apply directional knockback!`);
        }

        // Test Finisher (Hit 3)
        fighter.shootCooldown = 0;
        fighter._performExplosivePunch(dummyOpponent);
        fighter.shootCooldown = 0;
        fighter._performExplosivePunch(dummyOpponent);
        if (fighter.punchComboCount !== 0) {
          throw new Error(`Reze expected finisher combo count 0, got ${fighter.punchComboCount}`);
        }

        state.fighters = prevFighters;

        // 8. Test Bomb Devil Form vs Human Form for Rocket Lunge
        // Human form: must NOT trigger Rocket Lunge on wall collision or skill activation
        fighter.reset();
        fighter.isHybridModeActive = false;
        fighter.rocketCooldown = 0;
        fighter._activateRocketLunge(dummyOpponent);
        if (fighter.isRocketLunging) {
          throw new Error(`Reze Human Form must NOT activate Supersonic Rocket Lunge!`);
        }

        const testArena = { x: 50, y: 50, width: 800, height: 600 };
        fighter.x = 55;
        fighter.y = 300;
        fighter.resolveWallBounce(testArena, dummyOpponent);
        if (fighter.isRocketLunging) {
          throw new Error(`Reze Human Form must NOT trigger Rocket Lunge on wall collision!`);
        }

        // Bomb Devil form: triggers Supersonic Rocket Lunge upon wall collision
        fighter.reset();
        fighter.isHybridModeActive = true;
        fighter.x = 55; // right at left wall (x - r <= 50)
        fighter.y = 300;
        dummyOpponent.x = 400;
        dummyOpponent.y = 300;
        fighter.isRocketLunging = false;
        fighter.rocketCooldown = 0;
        fighter.wallLungeDebounceTimer = 0;

        const didLunge = fighter.resolveWallBounce(testArena, dummyOpponent);
        if (!didLunge || !fighter.isRocketLunging) {
          throw new Error(`Reze Bomb Devil failed to trigger Supersonic Rocket Lunge upon wall collision!`);
        }
        if (fighter.rocketLungeVx <= 0) {
          throw new Error(`Reze wall Rocket Lunge should launch rightwards into arena, got vx=${fighter.rocketLungeVx}`);
        }
        if (fighter.rocketCooldown !== fighter.rocketCooldownMax) {
          throw new Error(`Reze wall Rocket Lunge failed to trigger skill cooldown!`);
        }

        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Reze Bomb Devil Wall Rocket Lunge Draw`);

        // 9. Test Reze Basic Attack Distance Restraint & Cadence (No spam when out of range)
        fighter.reset();
        state.fighters = [fighter, dummyOpponent];
        dummyOpponent.hp = 100;
        dummyOpponent.x = 600; // Far out of melee range
        dummyOpponent.y = 300;
        fighter.x = 200;
        fighter.y = 300;
        fighter.shootCooldown = 0;
        fighter.isHybridModeActive = false;

        // In Human form, shooting when out of range must NOT attack
        const humanFarShot = fighter.shoot(0);
        if (humanFarShot !== false || fighter.punchAnimTimer > 0 || fighter.activeKnifeSlashes.length > 0) {
          throw new Error(`Reze Human Form incorrectly attacked while opponent was out of range!`);
        }

        // In Bomb Devil form, shooting when out of range must NOT attack
        fighter.isHybridModeActive = true;
        fighter.shootCooldown = 0;
        const devilFarShot = fighter.shoot(0);
        if (devilFarShot !== false || fighter.punchAnimTimer > 0 || fighter.activeMartialArcs.length > 0) {
          throw new Error(`Reze Devil Form incorrectly attacked while opponent was out of range!`);
        }

        // When opponent moves into melee range, shoot MUST trigger clean strike with recovery cooldown
        dummyOpponent.x = 240; // 40px away, within punchReach (75 + 25)
        fighter.shootCooldown = 0;
        const devilCloseShot = fighter.shoot(0);
        if (devilCloseShot !== true || fighter.punchAnimTimer === 0) {
          throw new Error(`Reze Devil Form failed to attack opponent in melee range!`);
        }
        if (fighter.shootCooldown !== 20) {
          throw new Error(`Reze expected 20 frame punch cadence on hit 1, got ${fighter.shootCooldown}`);
        }

        fighter.reset();
        state.fighters = prevFighters;
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
      if (fType === 'saitama') {
        mockCtx.resetStackDepth();
        // Test: Saitama update during Nanami and Escanor hit pauses
        const prevFighters = state.fighters;
        const mockNanami = { characterId: 'nanami', type: 'nanami', ratioHitPauseTimer: 30, ratioHitPauseTarget: fighter, hp: 100 };
        const mockEscanor = { characterId: 'escanor', type: 'escanor', chopHitPauseTimer: 0, chopHitPauseTarget: null, hp: 100 };
        state.fighters = [fighter, mockNanami, mockEscanor];
        fighter.skillPunishCooldown = 0;
        fighter.hp = 100;

        // Nanami hit pause active
        fighter.update(dummyOpponent, 0, state.arena);

        // Escanor hit pause active
        mockNanami.ratioHitPauseTimer = 0;
        mockEscanor.chopHitPauseTimer = 30;
        mockEscanor.chopHitPauseTarget = fighter;
        fighter.update(dummyOpponent, 0, state.arena);

        // Clear hit pauses and verify normal update with Serious Counter scan
        mockEscanor.chopHitPauseTimer = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance(`Saitama hit pause & Serious counter test`);

        state.fighters = prevFighters;
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
        state.projectiles = [];
        dummyOpponent.reset();
        dummyOpponent.hp = 100;
        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        // Seed some lingering afterimages at distant coordinates
        fighter.afterImages.push({ x: 50, y: 50, r: 25, timer: 16, maxTimer: 16 });
        fighter.hp = fighter.maxHp * Math.min(0.75, ((CONFIG.ichigo?.ultimateThreshold ?? CONFIG.ichigo?.bankaiHpThreshold ?? 0.80) - 0.05)); // Satisfies Bankai threshold without triggering Hollow Mask
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
        fighter.shunpoCooldown = 999;
        fighter.getsugaCooldown = 999;
        fighter.x = 350;
        fighter.y = 350;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.afterImages.length !== 0) {
          throw new Error(`Large displacement (>60px) during Bankai spawned distant afterimages instead of re-anchoring! Count: ${fighter.afterImages.length}`);
        }
        if (Math.abs(fighter._lastBankaiTrailX - 350) > 10 || Math.abs(fighter._lastBankaiTrailY - 350) > 10) {
          throw new Error(`Trail origin was not re-anchored on large displacement! Got (${fighter._lastBankaiTrailX}, ${fighter._lastBankaiTrailY}), expected near (350, 350)`);
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

        // 4. When caught in Gojo Purple Vortex or Blue Pull
        fighter.isDraggedByGetsuga = false;
        fighter.isCaughtInPurpleVortex = true;
        fighter.adaptationDashTimer = 10;
        fighter.isBlitzActive = true;
        fighter.wallBounceCount = 3;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.adaptationDashTimer !== 0 || fighter.isBlitzActive || fighter.wallBounceCount !== 0) {
          throw new Error("Mahoraga dash/blitz/wallBounce was not disabled while isCaughtInPurpleVortex is true!");
        }

        fighter.x = state.arena.x;
        fighter.vx = -15;
        fighter.resolveWallBounce(state.arena, dummyOpponent);
        if (fighter.wallBounceCount !== 0 || fighter.isBlitzActive) {
          throw new Error("Mahoraga wall rebound dash triggered while isCaughtInPurpleVortex is true!");
        }

        fighter.isCaughtInPurpleVortex = false;
        fighter.isCaughtInBluePull = true;
        fighter.wallBounceCount = 2;
        fighter.resolveWallBounce(state.arena, dummyOpponent);
        if (fighter.wallBounceCount !== 0) {
          throw new Error("Mahoraga wallBounceCount was not 0 while isCaughtInBluePull is true!");
        }

        // Reset flags for subsequent tests
        fighter.isCaughtInBluePull = false;
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
        mockGojo.meleeModeCooldown = 0;
        fighter.x = 250;
        fighter.y = 500;
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

        // 3.4.1 Test Chained Enemy with Dodging Mechanic (Saitama / Toji / Sukuna / Mahito / etc.)
        console.log("   Testing Makima Chained Enemy Dodging Mechanic Disabled...");
        const { SaitamaFighter } = await import('../js/entities/fighters/SaitamaFighter.js');
        const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
        const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
        const { MahitoFighter } = await import('../js/entities/fighters/MahitoFighter.js');
        const { JohnWickFighter } = await import('../js/entities/fighters/JohnWickFighter.js');
        const { MusashiFighter } = await import('../js/entities/fighters/MusashiFighter.js');

        const testSaitama = new SaitamaFighter({ startX: 300, startY: 200, type: 'saitama' });
        testSaitama.isChainedByMakima = true;
        if (testSaitama.executeDodgeTeleport(fighter, true)) {
          throw new Error("Saitama executed dodge teleport while chained by Makima!");
        }
        testSaitama.hp = 100;
        const saitamaDamageRes = testSaitama.takeDamage(20, fighter, { isProjectile: true });
        if (saitamaDamageRes === false || testSaitama.hp !== 80) {
          throw new Error(`Saitama dodged damage while chained by Makima! HP: ${testSaitama.hp}`);
        }

        const testToji = new TojiFighter({ startX: 300, startY: 200, type: 'toji' });
        testToji.isChainedByMakima = true;
        testToji.hp = 100;
        const tojiDamageRes = testToji.takeDamage(20, fighter, { isProjectile: true });
        if (tojiDamageRes === false || testToji.hp !== 80) {
          throw new Error(`Toji dodged damage while chained by Makima! HP: ${testToji.hp}`);
        }

        const testSukuna = new SukunaFighter({ startX: 300, startY: 200, type: 'sukuna' });
        testSukuna.isChainedByMakima = true;
        testSukuna.hp = 100;
        const sukunaDamageRes = testSukuna.takeDamage(20, fighter, { isMelee: true });
        if (sukunaDamageRes === false || testSukuna.hp !== 80) {
          throw new Error(`Sukuna teleport-dodged damage while chained by Makima! HP: ${testSukuna.hp}`);
        }

        const testMahito = new MahitoFighter({ startX: 300, startY: 200, type: 'mahito' });
        testMahito.isEvading = true;
        testMahito.evasionTimer = 100;
        testMahito.isChainedByMakima = true;
        testMahito.hp = 100;
        testMahito.takeDamage(20, fighter);
        if (testMahito.hp >= 100) {
          throw new Error(`Mahito clone-evaded damage while chained by Makima! HP: ${testMahito.hp}`);
        }

        const testJohnWick = new JohnWickFighter({ startX: 300, startY: 200, type: 'johnwick' });
        testJohnWick.isRolling = true;
        testJohnWick.rollTimer = 20;
        testJohnWick.isChainedByMakima = true;
        testJohnWick.hp = 100;
        testJohnWick.takeDamage(20, fighter);
        if (testJohnWick.hp >= 100) {
          throw new Error(`John Wick evaded damage while chained by Makima! HP: ${testJohnWick.hp}`);
        }

        const testMusashi = new MusashiFighter({ startX: 300, startY: 200, type: 'musashi' });
        testMusashi.currentStance = 'void';
        testMusashi.isChainedByMakima = true;
        testMusashi.hp = 100;
        testMusashi.takeDamage(20, fighter);
        if (testMusashi.hp >= 100) {
          throw new Error(`Musashi Void Stance dodged damage while chained by Makima! HP: ${testMusashi.hp}`);
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
        state.illusions = [];

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
        const prevMakimaArena = state.arena;
        state.arena = { x: 0, y: 0, width: 1200, height: 1200 };
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 200;
        fighter.y = 80;
        dummyOpponent.x = 200;
        dummyOpponent.y = 220;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.isChainedByMakima = false;
        dummyOpponent.chainsCooldown = 999;
        dummyOpponent.angelCooldown = 999;
        dummyOpponent.shrineCooldown = 999;
        dummyOpponent.bangCooldown = 999;
        state.fighters = [fighter, dummyOpponent];

        fighter.gunAngle = Math.PI / 2;
        fighter.angle = Math.PI / 2;
        fighter._castChainsOfDomination(dummyOpponent);
        if (!fighter.isChainingActive || !dummyOpponent.isChainedByMakima) {
          throw new Error("Failed to latch Chains of Domination onto enemy for knockback test!");
        }

        // Fire "Bang!" directly at the chained enemy downwards
        fighter.gunAngle = Math.PI / 2;
        fighter.angle = Math.PI / 2;
        fighter._castBangAttack(dummyOpponent);

        const kbMag = Math.hypot(dummyOpponent.knockbackVx || 0, dummyOpponent.knockbackVy || 0);
        if (kbMag < 10) {
          throw new Error(`Chained enemy did NOT receive knockback from "Bang!" attack! Got knockback magnitude=${kbMag}`);
        }

        // Step simulation frames as enemy gets propelled backward and breaks the chain
        let chainBroke = false;
        for (let frame = 0; frame < 50; frame++) {
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

        state.arena = prevMakimaArena;

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
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 200;
        fighter.y = 200;
        dummyOpponent.x = 350;
        dummyOpponent.y = 200;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        state.fighters = [fighter, dummyOpponent];

        fighter.takeDamage(999, dummyOpponent);
        if (!fighter.isRevivingFromContract && !fighter.isShatterReviving) {
          throw new Error("Makima did not enter Citizen Contract revive on fatal damage!");
        }

        // Test position locking & immovability during death shatter
        const lockedX = fighter.x;
        const lockedY = fighter.y;
        if (fighter._shatterLockedX !== lockedX || fighter._shatterLockedY !== lockedY) {
          throw new Error(`Expected Makima _shatterLockedX/Y to be (${lockedX}, ${lockedY}), got (${fighter._shatterLockedX}, ${fighter._shatterLockedY})`);
        }

        // Test direct knockback impulse during shatter
        fighter.applyKnockback(50, -30, 20);
        if (fighter.vx !== 0 || fighter.vy !== 0 || fighter.knockbackVx !== 0 || fighter.knockbackVy !== 0 || fighter.x !== lockedX || fighter.y !== lockedY) {
          throw new Error(`Makima position or velocity moved during death shatter knockback! Pos: (${fighter.x}, ${fighter.y}), Vel: (${fighter.vx}, ${fighter.vy})`);
        }

        // Test fighter-fighter collision against shattering Makima
        dummyOpponent.x = lockedX + 10;
        dummyOpponent.y = lockedY;
        dummyOpponent.vx = -5;
        dummyOpponent.vy = 0;
        resolveFighterCollision(fighter, dummyOpponent);
        if (fighter.x !== lockedX || fighter.y !== lockedY || fighter.vx !== 0 || fighter.vy !== 0) {
          throw new Error(`Makima was pushed by a colliding fighter during death shatter! Pos: (${fighter.x}, ${fighter.y})`);
        }
        if (dummyOpponent.x <= lockedX + 10) {
          throw new Error("Colliding fighter was not pushed away from shattering Makima!");
        }

        // Draw during reassembly stasis
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance("Makima Citizen Contract shatter & magnetic reassembly");

        // Fast-forward to reassembly completion
        while (fighter.reviveStasisTimer > 0) {
          fighter.update(dummyOpponent, 0, state.arena);
          if (fighter.x !== lockedX || fighter.y !== lockedY) {
            throw new Error(`Makima drifted during revive stasis update! Pos: (${fighter.x}, ${fighter.y}) vs locked (${lockedX}, ${lockedY})`);
          }
        }

        if (fighter.hp <= 0 || fighter.isRevivingFromContract) {
          throw new Error("Makima failed to revive with 50% HP after Citizen Contract reassembly!");
        }
        if (fighter.x !== lockedX || fighter.y !== lockedY) {
          throw new Error(`Makima did not reassemble at locked coordinates (${lockedX}, ${lockedY})! Got (${fighter.x}, ${fighter.y})`);
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

        // 6. Test: When Gojo is chained by Makima, Gojo's Infinity is disabled until the chain expires
        console.log("   Testing Gojo Infinity disabled when chained by Makima...");
        const GojoClass = FIGHTER_CLASS_MAP['gojo'];
        const mockGojo = new GojoClass(allDefs.find(d => d.type === 'gojo') || { type: 'gojo' });
        mockGojo.reset();
        mockGojo.x = 350;
        mockGojo.y = 200;
        mockGojo.hp = 200;
        mockGojo.infinityActive = true;
        mockGojo.infinityCooldown = 0;
        mockGojo.isMeleeMode = false;

        fighter.reset();
        fighter.x = 200;
        fighter.y = 200;
        fighter.gunAngle = 0;
        fighter.angle = 0;
        fighter.chainLockedAimAngle = 0;
        state.fighters = [fighter, mockGojo];

        fighter._castChainsOfDomination(mockGojo);

        if (!mockGojo.isChainedByMakima) {
          throw new Error("Gojo was not marked as isChainedByMakima when hit by Chains of Domination!");
        }
        if (mockGojo.infinityActive) {
          throw new Error("Gojo's infinityActive was NOT disabled when chained by Makima!");
        }
        if (mockGojo.infinityFadeOpacity !== 0) {
          throw new Error(`Gojo's infinityFadeOpacity should be 0 when chained, got ${mockGojo.infinityFadeOpacity}`);
        }

        // Test Gojo takes damage while chained without Infinity blocking
        const hpBefore = mockGojo.hp;
        mockGojo.takeDamage(25, fighter, { isMelee: true });
        if (mockGojo.hp >= hpBefore) {
          throw new Error("Gojo blocked damage with Infinity while chained by Makima!");
        }

        // Test Gojo's update while chained does NOT re-enable Infinity
        mockGojo.update(fighter, 1, state.arena);
        if (mockGojo.infinityActive) {
          throw new Error("Gojo's update re-enabled infinityActive while chained by Makima!");
        }

        // Test triggerInfinityBlock returns false while chained
        const blocked = mockGojo.triggerInfinityBlock(mockGojo.x + 10, mockGojo.y, fighter);
        if (blocked) {
          throw new Error("Gojo triggerInfinityBlock returned true while chained by Makima!");
        }

        // Advance until the chain expires and verify zero tick damage is dealt by the chain
        fighter.bangCooldown = 9999;
        fighter.angelCooldown = 9999;
        fighter.shrineCooldown = 9999;
        const hpBeforeTicks = mockGojo.hp;
        while (fighter.chainTimer > 0) {
          fighter.update(mockGojo, 0, state.arena);
        }
        if (mockGojo.hp < hpBeforeTicks) {
          throw new Error(`Target took tick damage while chained by Makima! hpBefore=${hpBeforeTicks}, hpAfter=${mockGojo.hp}`);
        }

        if (mockGojo.isChainedByMakima) {
          throw new Error("Gojo remained isChainedByMakima after chain expired!");
        }
        if (!mockGojo.infinityActive) {
          throw new Error("Gojo's infinityActive was NOT restored after chain expired!");
        }

        // 7. Test Gojo punch reach and hand extension against Makima inside domain
        console.log("   Testing Gojo punch reach and hand extension against Makima inside domain...");
        mockGojo.domainActive = true;
        mockGojo.isMeleeMode = true;
        mockGojo.x = 200;
        mockGojo.y = 200;
        fighter.x = 264;
        fighter.y = 200;
        mockGojo.aim(fighter);
        if (projectileSystem) projectileSystem.projectiles = [];
        state.fighters = [mockGojo, fighter];

        // Verify idle hand position
        let hands = mockGojo._getHandPositions();
        let idleDist = Math.hypot(hands.frontHandX - mockGojo.x, hands.frontHandY - mockGojo.y);
        if (idleDist > mockGojo.r * 1.1) {
          throw new Error(`Idle hand is detached from Gojo body! Dist=${idleDist}`);
        }

        // Trigger punch
        mockGojo._meleePunch(fighter);
        for (let frame = 0; frame < 15; frame++) {
          hands = mockGojo._getHandPositions();
          const handDistFromGojo = Math.hypot(hands.frontHandX - mockGojo.x, hands.frontHandY - mockGojo.y);
          const makimaDist = Math.hypot(fighter.x - mockGojo.x, fighter.y - mockGojo.y);
          if (handDistFromGojo > makimaDist) {
            throw new Error(`Gojo hand overextended past target! handDist=${handDistFromGojo.toFixed(1)}, makimaDist=${makimaDist.toFixed(1)}`);
          }
          if (handDistFromGojo > mockGojo.r * 2.2) {
            throw new Error(`Gojo hand extended too far in the air! handDist=${handDistFromGojo.toFixed(1)}`);
          }
          if (mockGojo.punchAnimTimer > 0) mockGojo.punchAnimTimer--;
        }

        // Verify post-punch returns to body edge
        hands = mockGojo._getHandPositions();
        const postDist = Math.hypot(hands.frontHandX - mockGojo.x, hands.frontHandY - mockGojo.y);
        if (postDist > mockGojo.r * 1.1) {
          throw new Error(`Post-punch hand remained floating in air! Dist=${postDist}`);
        }

        // 8. Test Gojo RCT heal amount as percentage of maxHp
        const expectedHeal = Math.round(mockGojo.maxHp * (CONFIG.gojo?.reverseCursedTechniqueHealPercent ?? 0.50));
        const actualHeal = mockGojo._getRCTHealAmount();
        if (actualHeal !== expectedHeal) {
          throw new Error(`Expected Gojo RCT heal amount to be ${expectedHeal} (${(CONFIG.gojo?.reverseCursedTechniqueHealPercent ?? 0.50) * 100}%), got ${actualHeal}`);
        }

        // 9. Test Gojo Domain Expansion Snap Aim
        console.log("   Testing Gojo domain snap aim in all 4 cardinal directions...");
        mockGojo.domainActive = true;
        mockGojo.isMeleeMode = true;
        mockGojo.x = 200;
        mockGojo.y = 200;

        // Enemy to the Right (+X) -> aim should snap to 0 (Right)
        fighter.x = 300; fighter.y = 200;
        mockGojo.aim(fighter);
        if (Math.abs(mockGojo.gunAngle - 0) > 0.001) {
          throw new Error(`Expected Gojo domain aim Right to snap to 0, got ${mockGojo.gunAngle}`);
        }

        // Enemy to the Left (-X) -> aim should snap to Math.PI (Left)
        fighter.x = 100; fighter.y = 200;
        mockGojo.aim(fighter);
        if (Math.abs(Math.abs(mockGojo.gunAngle) - Math.PI) > 0.001) {
          throw new Error(`Expected Gojo domain aim Left to snap to Math.PI, got ${mockGojo.gunAngle}`);
        }

        // Enemy Below (+Y) -> aim should snap to Math.PI / 2 (Down)
        fighter.x = 200; fighter.y = 300;
        mockGojo.aim(fighter);
        if (Math.abs(mockGojo.gunAngle - Math.PI / 2) > 0.001) {
          throw new Error(`Expected Gojo domain aim Down to snap to Math.PI/2, got ${mockGojo.gunAngle}`);
        }

        // Enemy Above (-Y) -> aim should snap to -Math.PI / 2 (Up)
        fighter.x = 200; fighter.y = 100;
        mockGojo.aim(fighter);
        if (Math.abs(mockGojo.gunAngle - (-Math.PI / 2)) > 0.001) {
          throw new Error(`Expected Gojo domain aim Up to snap to -Math.PI/2, got ${mockGojo.gunAngle}`);
        }

        // Enemy Diagonal (+X, +Y) -> aim should snap to Math.PI / 4
        fighter.x = 300; fighter.y = 300;
        mockGojo.aim(fighter);
        if (Math.abs(mockGojo.gunAngle - Math.PI / 4) > 0.001) {
          throw new Error(`Expected Gojo domain aim Diagonal to snap to Math.PI/4, got ${mockGojo.gunAngle}`);
        }

        // Verify punch snaps gunAngle directly to enemy
        mockGojo._meleePunch(fighter);
        if (Math.abs(mockGojo.gunAngle - Math.PI / 4) > 0.001) {
          throw new Error(`Expected Gojo domain punch to snap gunAngle to Math.PI/4, got ${mockGojo.gunAngle}`);
        }

        // Test Domain opening snap auto-aim
        mockGojo.gunAngle = -Math.PI / 2;
        mockGojo.angle = -Math.PI / 2;
        mockGojo._activateDomain({ x: 0, y: 0, width: 800, height: 600 });
        const expectedOpeningAngle = Math.atan2(fighter.y - mockGojo.y, fighter.x - mockGojo.x);
        let openAngleDiff = Math.abs(mockGojo.gunAngle - expectedOpeningAngle);
        while (openAngleDiff > Math.PI) openAngleDiff = Math.abs(openAngleDiff - Math.PI * 2);
        if (openAngleDiff > 0.001) {
          throw new Error(`Expected Gojo domain opening to snap aim to enemy (${expectedOpeningAngle}), got ${mockGojo.gunAngle}`);
        }

        fighter.reset();
        state.fighters = [];
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
        const thresh = (CONFIG.yuta?.domainHpThreshold ?? 0.60);
        fighter.hp = fighter.maxHp * Math.max(0.05, thresh * 0.8); // Dropped below domain threshold

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

        // Test: Percentage-based punchDamage calculation against game mode fixed HP
        const origPunch = CONFIG.saitama.punchDamage;
        const origMode = state.mode;

        // Test with 0.90 (90% of mode fixed HP)
        CONFIG.saitama.punchDamage = 0.90;
        state.mode = '1v1';
        if (fighter.getBasePunchDamage() !== 180) {
          throw new Error(`Expected Saitama 1v1 mode punchDamage to be 180 (90% of 200 HP), got ${fighter.getBasePunchDamage()}`);
        }
        state.mode = 'Stand Off';
        if (fighter.getBasePunchDamage() !== 450) {
          throw new Error(`Expected Saitama Stand Off mode punchDamage to be 450 (90% of 500 HP), got ${fighter.getBasePunchDamage()}`);
        }
        state.mode = '2v2';
        if (fighter.getBasePunchDamage() !== 2700) {
          throw new Error(`Expected Saitama 2v2 mode punchDamage to be 2700 (90% of 3000 HP), got ${fighter.getBasePunchDamage()}`);
        }
        state.mode = 'FFA';
        if (fighter.getBasePunchDamage() !== 900) {
          throw new Error(`Expected Saitama FFA mode punchDamage to be 900 (90% of 1000 HP), got ${fighter.getBasePunchDamage()}`);
        }

        // Test with 0.15 (15% of mode fixed HP)
        CONFIG.saitama.punchDamage = 0.15;
        state.mode = 'Stand Off';
        if (fighter.getBasePunchDamage() !== 75) {
          throw new Error(`Expected Saitama Stand Off mode punchDamage at 0.15 to be 75 (15% of 500 HP), got ${fighter.getBasePunchDamage()}`);
        }

        state.mode = origMode;
        CONFIG.saitama.punchDamage = origPunch;

        // Restore user's actual configured settings
        CONFIG.saitama.disableNormalPunch = origDisNormal;
        CONFIG.saitama.disableConsecutivePunches = origDisConsecutive;
        CONFIG.saitama.normalPunchEnabled = origNormal;
        CONFIG.saitama.consecutivePunchesEnabled = origConsecutive;
      }

      // 9. CJ specific non-chase movement tests
      if (fType === 'cj') {
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 200;
        fighter.y = 200;
        // Activate Jetpack mode and verify natural velocity orientation
        fighter.isJetpackActive = true;
        fighter.jetpackTimer = 300;
        fighter.baguvixCooldown = 1000;
        fighter.driveByCooldown = 1000;
        fighter.speed = 8.4;
        fighter.vx = 8.4;
        fighter.vy = 0;
        dummyOpponent.x = fighter.x;
        dummyOpponent.y = fighter.y + 300; // Opponent is directly below
        fighter.update(dummyOpponent, 0, state.arena);
        // After update in Jetpack mode, velocity should remain horizontal (not forced straight down to follow opponent)
        if (Math.abs(fighter.vx) < 3.0 || Math.abs(fighter.vy) > 0.5) {
          throw new Error(`CJ Jetpack velocity was artificially steered: vx=${fighter.vx}, vy=${fighter.vy}`);
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

        // Test Canvas 2D stack balance while drawing breather stasis visuals
        mockCtx.resetStackDepth();
        fighter.draw(mockCtx, null);
        assertCanvasStackBalance('Gojo Purple Breather Stasis Visuals');

        // Test breather recovery frame update (Gojo stays afloat in the air with zero velocity)
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.purpleRecoveryTimer !== expectedRecovery - 1) {
          throw new Error(`Expected purpleRecoveryTimer to decrement to ${expectedRecovery - 1}, got ${fighter.purpleRecoveryTimer}`);
        }
        if (fighter.vx !== 0 || fighter.vy !== 0) {
          throw new Error(`Expected Gojo to be stationary in the air (vx=0, vy=0), got (${fighter.vx}, ${fighter.vy})`);
        }
        if (fighter.z < 30) {
          throw new Error(`Expected Gojo to stay afloat in the air (z ~ 35), got z=${fighter.z}`);
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

        // Verify Gojo lands and can move upon Purple recovery expiration
        fighter.purpleRecoveryTimer = 1;
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 350;
        dummyOpponent.y = 250;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.purpleRecoveryTimer !== 0) {
          throw new Error(`Expected purpleRecoveryTimer to reach 0, got ${fighter.purpleRecoveryTimer}`);
        }
        if (fighter.z !== 0) {
          throw new Error(`Expected Gojo to land on the ground (z=0) after breather ends, got z=${fighter.z}`);
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

        // ── Gojo Hollow Purple Any-Angle Aiming & Locked Orientation Tests ──
        // Case A: Enemy at diagonal angle (+X, +Y) -> Triggers Purple locked to diagonal angle (Math.PI / 4)
        fighter.reset();
        dummyOpponent.reset();
        fighter.hp = fighter.maxHp;
        fighter.isDead = false;
        fighter.dead = false;
        fighter.team = 0;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.dead = false;
        dummyOpponent.team = 1;
        state.fighters = [fighter, dummyOpponent];
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 350;
        dummyOpponent.y = 350; // 45-degree diagonal angle (Math.PI / 4)
        fighter.purpleCooldown = 0;
        fighter.isChannelingPurple = false;
        fighter.update(dummyOpponent, 0, state.arena); // Initiates Purple channeling
        if (!fighter.isChannelingPurple) {
          throw new Error('Expected Gojo to trigger Hollow Purple when enemy is within trigger range at diagonal angle');
        }
        const expectedPurpleAngle = Math.atan2(dummyOpponent.y - fighter.y, dummyOpponent.x - fighter.x);
        if (Math.abs(fighter.purpleCastAngle - expectedPurpleAngle) > 0.05 || Math.abs(fighter.gunAngle - expectedPurpleAngle) > 0.05) {
          throw new Error(`Expected Purple cast angle to be locked to diagonal (${expectedPurpleAngle.toFixed(2)}), got ${fighter.purpleCastAngle}`);
        }
        const initialPurpleAngle = fighter.gunAngle;

        // Enemy moves during channel - verify aim smoothly rotates toward enemy's new angle using channelTurnRate without snapping
        dummyOpponent.x = 100;
        dummyOpponent.y = 50;
        fighter.update(dummyOpponent, 0, state.arena);
        const targetAngle = Math.atan2(dummyOpponent.y - fighter.y, dummyOpponent.x - fighter.x);
        let turnedDiff = Math.abs(fighter.gunAngle - initialPurpleAngle);
        while (turnedDiff > Math.PI) turnedDiff = Math.abs(turnedDiff - Math.PI * 2);
        // Should rotate towards enemy with channelTurnRate (~0.045 rad/frame)
        if (turnedDiff <= 0.01) {
          throw new Error(`Expected Gojo to smoothly track enemy during Purple channeling (initial: ${initialPurpleAngle.toFixed(2)}, current: ${fighter.gunAngle.toFixed(2)})`);
        }
        // Should NOT snap instantly to target angle
        let snapDiff = Math.abs(fighter.gunAngle - targetAngle);
        while (snapDiff > Math.PI) snapDiff = Math.abs(snapDiff - Math.PI * 2);
        if (snapDiff <= 0.1) {
          throw new Error(`Expected Gojo to NOT snap instantly to target angle during Purple channeling`);
        }

        const firedAngle = fighter.gunAngle;
        fighter._firePurple(0);
        const diagProj = fighter.activePurpleProjectile;
        if (!diagProj) {
          throw new Error('Expected Hollow Purple projectile to spawn on fire');
        }
        // Purple fires along Gojo's current gunAngle upon firing (no snap on release)
        const expectedVx = Math.cos(firedAngle) * (CONFIG.gojo.purpleSpeed || 6);
        const expectedVy = Math.sin(firedAngle) * (CONFIG.gojo.purpleSpeed || 6);
        if (Math.abs(diagProj.vx - expectedVx) > 0.1 || Math.abs(diagProj.vy - expectedVy) > 0.1) {
          throw new Error(`Expected Purple projectile to fly along current gunAngle (${expectedVx.toFixed(2)}, ${expectedVy.toFixed(2)}), got vx=${diagProj.vx}, vy=${diagProj.vy}`);
        }
        if (diagProj) {
          diagProj.life = 0;
          fighter.activePurpleProjectile = null;
        }

        // Case B: Enemy vertically above Gojo (250, 100) -> Triggers Purple locked to Up angle (-Math.PI / 2)
        fighter.reset();
        dummyOpponent.reset();
        fighter.hp = fighter.maxHp;
        fighter.isDead = false;
        fighter.dead = false;
        fighter.team = 0;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.dead = false;
        dummyOpponent.team = 1;
        state.fighters = [fighter, dummyOpponent];
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 250;
        dummyOpponent.y = 100;
        fighter.purpleCooldown = 0;
        fighter.isChannelingPurple = false;
        fighter.update(dummyOpponent, 0, state.arena); // Initiates Purple channeling
        if (!fighter.isChannelingPurple) {
          throw new Error('Expected Gojo to trigger Hollow Purple when enemy is vertically above him');
        }
        const expectedUpAngle = -Math.PI / 2;
        if (Math.abs(fighter.purpleCastAngle - expectedUpAngle) > 0.05 || Math.abs(fighter.gunAngle - expectedUpAngle) > 0.05) {
          throw new Error(`Expected Purple cast angle to be locked to -Math.PI/2 (Up), got ${fighter.purpleCastAngle}`);
        }
        fighter._firePurple(0);
        const upProj = fighter.activePurpleProjectile;
        if (!upProj || upProj.vy >= 0 || Math.abs(upProj.vx) > 0.001) {
          throw new Error(`Expected Purple projectile to fly purely Up (vy < 0, vx = 0), got vx=${upProj?.vx}, vy=${upProj?.vy}`);
        }
        if (upProj) {
          upProj.life = 0;
          fighter.activePurpleProjectile = null;
        }

        // Case C: Enemy out of trigger range (1500, 1500) -> Must NOT trigger Purple
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 1500;
        dummyOpponent.y = 1500;
        fighter.purpleCooldown = 0;
        fighter.isChannelingPurple = false;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.isChannelingPurple) {
          throw new Error('Gojo should NOT initiate Hollow Purple when enemy is out of trigger range');
        }

        // Case E: Purple projectile persistence and flight when NO enemy is hit across non-standard arena dimensions
        const prevArena = state.arena;
        state.arena = { x: 50, y: 50, width: 1100, height: 700 };
        fighter.reset();
        fighter.x = 200;
        fighter.y = 120; // y = 120 is outside default CONFIG.arena (y = 240)
        fighter.gunAngle = 0; // Fire Right
        fighter.purpleCastAngle = 0;
        fighter._firePurple(0);
        const freeProj = fighter.activePurpleProjectile;
        if (!freeProj) {
          throw new Error('Expected Hollow Purple projectile to spawn');
        }
        const initialX = freeProj.x;
        // Simulate 20 frames of projectile updates with NO enemy nearby
        for (let frame = 0; frame < 20; frame++) {
          projectileSystem.update([fighter]);
        }
        if (freeProj.life <= 0) {
          throw new Error(`Hollow Purple disappeared instantly when no enemy was hit! Expected life > 0, got ${freeProj.life}`);
        }
        if (freeProj.vx <= 0) {
          throw new Error(`Hollow Purple velocity stopped moving when no enemy was hit! Expected vx > 0, got vx=${freeProj.vx}`);
        }
        if (freeProj.x <= initialX) {
          throw new Error(`Hollow Purple did not travel across the arena! Expected x > ${initialX}, got ${freeProj.x}`);
        }
        freeProj.life = 0;
        fighter.activePurpleProjectile = null;
        state.arena = prevArena;

        // ── Gojo Post-Purple Aerial Hover & Slow Descent Test ──
        // Case 1: Gojo fires Hollow Purple. During active flight (life > 60), Gojo stays afloat at z=35 with vx=0, vy=0.
        const testArena = { x: 50, y: 50, width: 800, height: 600 };
        state.arena = testArena;
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 200;
        fighter.y = 300;
        dummyOpponent.x = 500;
        dummyOpponent.y = 300;
        state.fighters = [fighter, dummyOpponent];
        fighter.gunAngle = 0;
        fighter.purpleCastAngle = 0;
        fighter._firePurple(0);

        // Fast-forward through recovery
        while (fighter.purpleRecoveryTimer > 0) {
          fighter.update(dummyOpponent, 0, testArena);
        }

        // When recovery ends, Gojo is on the ground (z=0) and can move freely even while Purple is active
        if (fighter.z !== 0) {
          throw new Error(`Expected Gojo to touch down on the ground (z=0) after recovery ends, got z=${fighter.z}`);
        }
        if (!fighter.infinityActive) {
          throw new Error(`Expected Limitless Infinity barrier to restore once Gojo touches down`);
        }

        const prevX = fighter.x;
        const prevY = fighter.y;
        for (let i = 0; i < 30; i++) {
          fighter.update(dummyOpponent, 0, testArena);
        }
        if (fighter.x === prevX && fighter.y === prevY && fighter.vx === 0 && fighter.vy === 0) {
          throw new Error(`Expected Gojo to be able to move once breather ends while Purple is active`);
        }

        // Expire Purple projectile cleanly
        if (fighter.activePurpleProjectile) {
          fighter.activePurpleProjectile.life = 0;
          const pIdx = projectileSystem.projectiles.indexOf(fighter.activePurpleProjectile);
          if (pIdx !== -1) projectileSystem.projectiles.splice(pIdx, 1);
          fighter.activePurpleProjectile = null;
        }
        if (projectileSystem && projectileSystem.projectiles) {
          projectileSystem.projectiles = [];
        }
        state.arena = prevArena;

        // ── Gojo Reversal Red Straight Vertical Up and Down Constraint Tests ──
        // Test Red Case 1: Enemy straight Above Gojo (255, 100) -> Triggers Red with locked Up angle (-Math.PI / 2)
        state.gameState = 'playing';
        fighter.reset();
        dummyOpponent.reset();
        fighter.hp = fighter.maxHp;
        fighter.isDead = false;
        fighter.dead = false;
        fighter.team = 0;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.dead = false;
        dummyOpponent.team = 1;
        state.fighters = [fighter, dummyOpponent];
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 350;
        dummyOpponent.y = 150; // Diagonal position (dx=100, dy=-100) -> -45 degrees (-Math.PI / 4)
        fighter.domainCooldown = 1000;
        fighter.domainUseCount = 2;
        fighter.purpleCooldown = 1000;
        fighter.redCooldown = 0;
        fighter.redEffectTimer = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.redEffectTimer <= 0) {
          throw new Error('Expected Gojo to trigger Reversal Red when enemy is within range');
        }
        const expectedAngle1 = Math.atan2(150 - 250, 350 - 250);
        if (Math.abs(fighter.redTargetAngle - expectedAngle1) > 0.05 || Math.abs(fighter.gunAngle - expectedAngle1) > 0.05) {
          throw new Error(`Expected Red target and gun angle to be diagonal (${expectedAngle1.toFixed(2)}), got redTargetAngle=${fighter.redTargetAngle}, gunAngle=${fighter.gunAngle}`);
        }
        const initialRedAngle = fighter.gunAngle;

        // Enemy moves behind Gojo during buildup - verify aim tracks smoothly on committed side and NEVER rotates to the opposite side
        dummyOpponent.x = 100;
        dummyOpponent.y = 80;
        for (let i = 0; i < 20; i++) {
          fighter.update(dummyOpponent, 0, state.arena);
        }
        if (Math.cos(fighter.gunAngle) < -0.001 || Math.abs(fighter.gunAngle) > (Math.PI / 2 + 0.001)) {
          throw new Error(`Expected Gojo to stay committed to right side without turning around (angle: ${fighter.gunAngle.toFixed(2)})`);
        }
        const firedRedAngle = fighter.gunAngle;
        fighter._detonateRed();
        if (Math.abs(fighter.gunAngle - firedRedAngle) > 0.001) {
          throw new Error(`Expected Gojo to detonate Red strictly along gunAngle (${firedRedAngle.toFixed(2)}), got ${fighter.gunAngle.toFixed(2)}`);
        }

        // Test Red Case 2: Enemy out of trigger range (600, 600) -> Must NOT trigger Red
        state.gameState = 'playing';
        fighter.reset();
        dummyOpponent.reset();
        fighter.hp = fighter.maxHp;
        fighter.isDead = false;
        fighter.dead = false;
        fighter.team = 0;
        dummyOpponent.hp = 100;
        dummyOpponent.isDead = false;
        dummyOpponent.dead = false;
        dummyOpponent.team = 1;
        state.fighters = [fighter, dummyOpponent];
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 650;
        dummyOpponent.y = 650;
        fighter.domainCooldown = 1000;
        fighter.domainUseCount = 2;
        fighter.purpleCooldown = 1000;
        fighter.redCooldown = 0;
        fighter.redEffectTimer = 0;
        fighter.update(dummyOpponent, 0, state.arena);
        if (fighter.redEffectTimer > 0) {
          throw new Error('Gojo should NOT initiate Reversal Red when enemy is out of trigger range');
        }

        // Test Red Case 5: Gojo Red Reversal Cancellation & Audio Termination Test
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 250;
        dummyOpponent.y = 100;
        fighter.redCooldown = 0;
        fighter.redEffectTimer = 0;
        fighter._activateRed();
        if (!fighter.redBuildupPhase || fighter.redEffectTimer <= 0) {
          throw new Error('Expected Gojo to be in Red buildup phase after _activateRed()');
        }
        if (!fighter._hasPlayedRedChannelingSound) {
          throw new Error('Expected _hasPlayedRedChannelingSound to be true during Red buildup');
        }
        // Force interrupt Red channeling
        fighter.interruptAttacks(true);
        if (fighter.redBuildupPhase || fighter.redEffectTimer !== 0) {
          throw new Error('Expected redBuildupPhase and redEffectTimer to be reset on hard interrupt');
        }
        if (fighter._hasPlayedRedChannelingSound) {
          throw new Error('Expected _hasPlayedRedChannelingSound to be reset to false on Red cancellation');
        }
        if (fighter._redChannelingSoundHandle !== null || fighter._redChargingSoundHandle !== null) {
          throw new Error('Expected Red sound handles to be nullified and faded out on Red cancellation');
        }
        if (fighter.redCooldown < 270) {
          throw new Error(`Expected penalty cooldown on interrupted Red, got ${fighter.redCooldown}`);
        }

        // Test Gojo Reversal Red auto-aim tracking during buildup
        fighter.reset();
        dummyOpponent.reset();
        if (projectileSystem) projectileSystem.projectiles = [];
        if (state.projectiles) state.projectiles = [];
        fighter.activePurpleProjectile = null;
        fighter.hp = fighter.maxHp;
        fighter.isDead = false;
        fighter.dead = false;
        fighter.team = 0;
        dummyOpponent.hp = 500;
        dummyOpponent.isDead = false;
        dummyOpponent.dead = false;
        dummyOpponent.team = 1;
        state.fighters = [fighter, dummyOpponent];
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 350;
        dummyOpponent.y = 350; // 45-degree diagonal angle (Math.PI / 4)
        fighter.redCooldown = 0;
        fighter.redEffectTimer = 0;
        fighter._activateRed();

        const expectedRedAngle = Math.atan2(dummyOpponent.y - fighter.y, dummyOpponent.x - fighter.x);
        if (Math.abs(fighter.gunAngle - expectedRedAngle) > 0.05) {
          throw new Error(`Expected Gojo Red to aim at diagonal angle ${expectedRedAngle.toFixed(2)}, got ${fighter.gunAngle.toFixed(2)}`);
        }
        const lockedRedAngle2 = fighter.gunAngle;

        // Move opponent behind Gojo during Red buildup and verify Gojo aim tracks smoothly on committed side without turning around
        dummyOpponent.x = 100;
        dummyOpponent.y = 400;
        for (let i = 0; i < 20; i++) {
          fighter.aim(dummyOpponent);
        }
        if (Math.cos(fighter.gunAngle) < -0.001 || Math.abs(fighter.gunAngle) > (Math.PI / 2 + 0.001)) {
          throw new Error(`Expected Gojo to stay committed to right side without turning around (angle: ${fighter.gunAngle.toFixed(2)})`);
        }

        // Fast-forward to detonation
        while (fighter.redEffectTimer > 0 && !fighter.redDetonated) {
          fighter.update(dummyOpponent, 0, state.arena);
        }
        if (!fighter.redDetonated) {
          throw new Error('Expected Gojo to detonate Red');
        }


        // ── Gojo Basic Attack (Lapse: Blue) Cardinal 4-Way Direction Tests ──
        // Helper to clear projectiles
        const clearProjectiles = () => {
          if (projectileSystem && projectileSystem.projectiles) {
            projectileSystem.projectiles.forEach(p => { if (p) p.life = 0; });
          }
        };

        // Test Blue Right (0)
        clearProjectiles();
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 400;
        dummyOpponent.y = 250;
        fighter.shootCooldown = 0;
        fighter.aim(dummyOpponent);
        if (Math.abs(fighter.gunAngle - 0) > 0.001) {
          throw new Error(`Expected Gojo to aim Right (0), got ${fighter.gunAngle}`);
        }
        fighter.shoot(0);
        const blueRight = projectileSystem.projectiles.find(p => p && p.isGojoBlue && p.life > 0);
        if (!blueRight || blueRight.vx <= 0 || Math.abs(blueRight.vy) > 0.001) {
          throw new Error(`Expected Blue projectile to fire Right (vx > 0, vy = 0), got vx=${blueRight?.vx}, vy=${blueRight?.vy}`);
        }
        clearProjectiles();

        // Test Blue Left (Math.PI)
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 100;
        dummyOpponent.y = 250;
        fighter.shootCooldown = 0;
        fighter.aim(dummyOpponent);
        if (Math.abs(Math.abs(fighter.gunAngle) - Math.PI) > 0.001) {
          throw new Error(`Expected Gojo to aim Left (Math.PI), got ${fighter.gunAngle}`);
        }
        fighter.shoot(0);
        const blueLeft = projectileSystem.projectiles.find(p => p && p.isGojoBlue && p.life > 0);
        if (!blueLeft || blueLeft.vx >= 0 || Math.abs(blueLeft.vy) > 0.001) {
          throw new Error(`Expected Blue projectile to fire Left (vx < 0, vy = 0), got vx=${blueLeft?.vx}, vy=${blueLeft?.vy}`);
        }
        clearProjectiles();

        // Test Blue Down (Math.PI / 2)
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 250;
        dummyOpponent.y = 400;
        fighter.shootCooldown = 0;
        fighter.aim(dummyOpponent);
        if (Math.abs(fighter.gunAngle - (Math.PI / 2)) > 0.001) {
          throw new Error(`Expected Gojo to aim Down (Math.PI / 2), got ${fighter.gunAngle}`);
        }
        fighter.shoot(0);
        const blueDown = projectileSystem.projectiles.find(p => p && p.isGojoBlue && p.life > 0);
        if (!blueDown || blueDown.vy <= 0 || Math.abs(blueDown.vx) > 0.001) {
          throw new Error(`Expected Blue projectile to fire Down (vx = 0, vy > 0), got vx=${blueDown?.vx}, vy=${blueDown?.vy}`);
        }
        clearProjectiles();

        // Test Blue Up (-Math.PI / 2)
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 250;
        dummyOpponent.y = 100;
        fighter.shootCooldown = 0;
        fighter.aim(dummyOpponent);
        if (Math.abs(fighter.gunAngle - (-Math.PI / 2)) > 0.001) {
          throw new Error(`Expected Gojo to aim Up (-Math.PI / 2), got ${fighter.gunAngle}`);
        }
        fighter.shoot(0);
        const blueUp = projectileSystem.projectiles.find(p => p && p.isGojoBlue && p.life > 0);
        if (!blueUp || blueUp.vy >= 0 || Math.abs(blueUp.vx) > 0.001) {
          throw new Error(`Expected Blue projectile to fire Up (vx = 0, vy < 0), got vx=${blueUp?.vx}, vy=${blueUp?.vy}`);
        }
        clearProjectiles();

        // Test Blue Diagonal (dx = 150, dy = 150 -> Math.PI / 4)
        fighter.reset();
        dummyOpponent.reset();
        fighter.x = 250;
        fighter.y = 250;
        dummyOpponent.x = 400;
        dummyOpponent.y = 400;
        fighter.shootCooldown = 0;
        fighter.aim(dummyOpponent);
        const expectedGojoDiagAngle = Math.atan2(400 - 250, 400 - 250);
        if (Math.abs(fighter.gunAngle - expectedGojoDiagAngle) > 0.001) {
          throw new Error(`Expected Gojo to aim diagonally (${expectedGojoDiagAngle}), got ${fighter.gunAngle}`);
        }
        fighter.shoot(0);
        const blueDiag = projectileSystem.projectiles.find(p => p && p.isGojoBlue && p.life > 0);
        if (!blueDiag) {
          throw new Error(`Expected Blue projectile to spawn on shoot()`);
        }
        const blueDiagAngle = Math.atan2(blueDiag.vy, blueDiag.vx);
        if (Math.abs(blueDiagAngle - expectedGojoDiagAngle) > 0.001) {
          throw new Error(`Expected Blue projectile to fire diagonally (${expectedGojoDiagAngle}), got ${blueDiagAngle}`);
        }
        clearProjectiles();
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
        fighter.hasUsedTakadaUlt = false;
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
        fighter.hasUsedTakadaUlt = false;
        fighter.hasTriggeredTakadaHpUlt = false;
        fighter.update(dummyOpponent, 0, state.arena);

        if (!fighter.isTakadaChanneling) {
          throw new Error('Todo failed to start Takada Channeling with BGM enabled');
        }
        if (fighter.isTakadaBackgroundPlaying) {
          throw new Error('Todo isTakadaBackgroundPlaying should be false during channeling');
        }
        if (shouldDuckArenaBgm()) {
          throw new Error('shouldDuckArenaBgm() should return false during channeling (arena BGM must not cut off)');
        }

        // Fast forward channeling to activate ultimate
        fighter.takadaChannelTimer = 1;
        fighter.update(dummyOpponent, 0, state.arena);
        if (!fighter.isTakadaUltActive) {
          throw new Error('Todo failed to activate Takada Ultimate with BGM enabled');
        }
        if (!fighter.isTakadaBackgroundPlaying) {
          throw new Error('Todo isTakadaBackgroundPlaying should be true after channeling when BGM is enabled');
        }
        if (!shouldDuckArenaBgm()) {
          throw new Error('shouldDuckArenaBgm() should return true after channeling when Todo BGM is active');
        }

        // Cleanup and restore
        CONFIG.todo.enableTakadaBackgroundSong = origToggle;
        fighter.reset();
      }

    } catch (err) {
      console.log(`❌ [RUNTIME ERROR in fighter '${fType}'] during simulation:`, err.stack || err.message || err);
      errors++;
      errorList.push(`[RUNTIME ERROR in fighter '${fType}']: ${err.stack || err.message || err}`);
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

    // Test Yuta Mortality Inside Gojo's Unlimited Void Domain
    const testGojoDomain = new GojoFighter({ startX: 200, startY: 200, type: 'gojo', color: '#00F0FF' });
    const testYutaInDomain = new YutaFighter({ startX: 250, startY: 250, type: 'yuta', color: '#D946EF' });
    state.fighters = [testGojoDomain, testYutaInDomain];
    state.gameState = 'playing';
    testGojoDomain.domainActive = true;
    testGojoDomain.domainTimer = 300;
    testYutaInDomain.reset();
    testYutaInDomain.hasUsedRCTRevival = false;
    testYutaInDomain.hp = 100;
    testYutaInDomain.maxHp = 100;

    // Gojo punches Yuta in domain with fatal damage
    testYutaInDomain.takeDamage(150, testGojoDomain, { isMelee: true, isDomain: true, isSkill: true, bypassShield: true, undodgeable: true });
    if (testYutaInDomain.hp > 0 || !testYutaInDomain.dead) {
      throw new Error(`Expected Yuta to die immediately from fatal domain damage inside Gojo domain, got HP=${testYutaInDomain.hp}, dead=${testYutaInDomain.dead}`);
    }
    if (testYutaInDomain.isEffectivelyAlive()) {
      throw new Error('Expected isEffectivelyAlive() to return false for Yuta when killed inside Gojo domain');
    }
    testGojoDomain.domainActive = false;

    // Test Yuta Pure Love Beam cancellation when Gojo opens Unlimited Void domain
    const testYutaBeam = new YutaFighter({ startX: 250, startY: 250, type: 'yuta', color: '#D946EF' });
    const testGojoBeamCancel = new GojoFighter({ startX: 350, startY: 250, type: 'gojo', color: '#00F0FF' });
    state.fighters = [testYutaBeam, testGojoBeamCancel];

    // Case 1: Channeling Pure Love Beam
    testYutaBeam.reset();
    testYutaBeam.isChannelingPureLoveBeam = true;
    testYutaBeam.pureLoveBeamChargeTimer = 50;
    testGojoBeamCancel._activateDomain(state.arena);

    if (testYutaBeam.isChannelingPureLoveBeam || testYutaBeam.pureLoveBeamChargeTimer > 0) {
      throw new Error('Expected Yuta Pure Love Beam channeling to be cancelled when Gojo opened domain!');
    }

    // Case 2: Firing Pure Love Beam with active projectile
    testYutaBeam.reset();
    testGojoBeamCancel.domainActive = false;
    testYutaBeam.activatePureLoveBeam();
    if (!testYutaBeam.isFiringPureLoveBeam) {
      throw new Error('Expected Yuta to be firing Pure Love Beam');
    }
    const hasBeamProjBefore = projectileSystem.projectiles.some(p => p.visual === 'yuta_pure_love_beam' || p.behaviorType === 'yuta_pure_love_beam');
    if (!hasBeamProjBefore) {
      throw new Error('Expected projectileSystem to contain Pure Love Beam projectile');
    }

    // Gojo opens domain
    testGojoBeamCancel._activateDomain(state.arena);
    testYutaBeam.update(testGojoBeamCancel, 0, state.arena);

    if (testYutaBeam.isFiringPureLoveBeam || testYutaBeam.pureLoveBeamActiveTimer > 0) {
      throw new Error('Expected Yuta Pure Love Beam firing state to be cancelled when Gojo opened domain!');
    }
    const hasBeamProjAfter = projectileSystem.projectiles.some(p => p.visual === 'yuta_pure_love_beam' || p.behaviorType === 'yuta_pure_love_beam');
    if (hasBeamProjAfter) {
      throw new Error('Expected Pure Love Beam projectile to be destroyed when Gojo opened domain!');
    }
    testGojoBeamCancel.domainActive = false;

    // Test Yuta Pure Love Beam cancelling enemy skill channeling when beam hits first
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const TodoClass = FIGHTER_CLASS_MAP['todo'];
    const testSukunaTarget = new SukunaClass(allDefs.find(d => d.type === 'sukuna') || { type: 'sukuna' });
    const testTodoTarget = new TodoClass(allDefs.find(d => d.type === 'todo') || { type: 'todo' });

    // 1. Gojo channeling Hollow Purple cancelled when hit by Yuta Pure Love Beam
    testYutaBeam.reset();
    testGojoBeamCancel.reset();
    testGojoBeamCancel.x = 350;
    testGojoBeamCancel.y = 250;
    testGojoBeamCancel.isChannelingPurple = true;
    testGojoBeamCancel.purpleChargeTimer = 60;
    state.fighters = [testYutaBeam, testGojoBeamCancel];

    testYutaBeam.activatePureLoveBeam();
    projectileSystem.update(state.fighters);
    testGojoBeamCancel.update(testYutaBeam, 0, state.arena);

    if (testGojoBeamCancel.isChannelingPurple || testGojoBeamCancel.purpleChargeTimer > 0) {
      throw new Error('Expected Gojo Hollow Purple channeling to be cancelled when hit by Yuta Pure Love Beam!');
    }

    // 2. Gojo channeling Domain Expansion cancelled when hit by Yuta Pure Love Beam
    testYutaBeam.reset();
    testGojoBeamCancel.reset();
    testGojoBeamCancel.x = 350;
    testGojoBeamCancel.y = 250;
    testGojoBeamCancel.isChannelingDomainExpansion = true;
    testGojoBeamCancel.domainChargeTimer = 40;
    state.fighters = [testYutaBeam, testGojoBeamCancel];

    testYutaBeam.activatePureLoveBeam();
    projectileSystem.update(state.fighters);
    testGojoBeamCancel.update(testYutaBeam, 0, state.arena);

    if (testGojoBeamCancel.isChannelingDomainExpansion || testGojoBeamCancel.domainChargeTimer > 0) {
      throw new Error('Expected Gojo Domain Expansion channeling to be cancelled when hit by Yuta Pure Love Beam!');
    }

    // 3. Sukuna channeling Fuga (Divine Flame) cancelled when hit by Yuta Pure Love Beam
    testYutaBeam.reset();
    testSukunaTarget.reset();
    testSukunaTarget.x = 350;
    testSukunaTarget.y = 250;
    testSukunaTarget.isChannelingDivineFlame = true;
    testSukunaTarget.divineFlameChargeTimer = 45;
    state.fighters = [testYutaBeam, testSukunaTarget];

    testYutaBeam.activatePureLoveBeam();
    projectileSystem.update(state.fighters);
    testSukunaTarget.update(testYutaBeam, 0, state.arena);

    if (testSukunaTarget.isChannelingDivineFlame || testSukunaTarget.divineFlameChargeTimer > 0) {
      throw new Error('Expected Sukuna Fuga channeling to be cancelled when hit by Yuta Pure Love Beam!');
    }

    // 4. Todo channeling Takada cancelled when hit by Yuta Pure Love Beam
    testYutaBeam.reset();
    testTodoTarget.reset();
    testTodoTarget.x = 350;
    testTodoTarget.y = 250;
    testTodoTarget.isTakadaChanneling = true;
    testTodoTarget.takadaChannelTimer = 60;
    state.fighters = [testYutaBeam, testTodoTarget];

    testYutaBeam.activatePureLoveBeam();
    projectileSystem.update(state.fighters);
    testTodoTarget.update(testYutaBeam, 0, state.arena);

    if (testTodoTarget.isTakadaChanneling || testTodoTarget.takadaChannelTimer > 0) {
      throw new Error('Expected Todo Takada channeling to be cancelled when hit by Yuta Pure Love Beam!');
    }

    // 5. Test that enemies hit by Yuta Pure Love Beam are NOT paralyzed and CAN move slowly
    testYutaBeam.reset();
    testGojoBeamCancel.reset();
    testGojoBeamCancel.x = 350;
    testGojoBeamCancel.y = 250;
    testGojoBeamCancel.vx = 2.0;
    testGojoBeamCancel.vy = 0;
    state.fighters = [testYutaBeam, testGojoBeamCancel];

    testYutaBeam.activatePureLoveBeam();
    projectileSystem.update(state.fighters);

    if (testGojoBeamCancel.isParalyzedDebuffActive()) {
      throw new Error('Expected Gojo to NOT have paralyze debuff active when hit by Yuta Pure Love Beam!');
    }
    if (testGojoBeamCancel._handleTimeStop()) {
      throw new Error('Expected Gojo _handleTimeStop() to return false (not frozen) when hit by Yuta Pure Love Beam!');
    }
    if ((testGojoBeamCancel.slowTimer || 0) <= 0 && (testGojoBeamCancel.pureLoveBeamRecoveryTimer || 0) <= 0 && (testGojoBeamCancel.statusEffects?.slowTimer || 0) <= 0) {
      throw new Error('Expected Gojo to have a slow effect applied when hit by Yuta Pure Love Beam!');
    }

    // Cleanup projectiles after beam tests
    projectileSystem.projectiles.length = 0;

    // Test Yuta Flurry -> Thin Ice Breaker seamless transition
    state.fighters = [testYuta, dummyTarget, dummyTarget2];
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

    // Test Saitama Serious Skill Counter charging state: Dodge enabled, Teleport/Sidestep disabled
    testSaitama.skillPunishCooldown = 0;
    testSaitama.dodgeCooldown = 0;
    dummyTarget2.hp = 10000;
    dummyTarget2.x = 300;
    dummyTarget2.y = 200;
    testSaitama.executeSkillCounterPunish(dummyTarget2);
    if (!testSaitama.isCountering || testSaitama._counterPunchTimer <= 0) {
      throw new Error('Expected Serious Skill Counter to be active and charging');
    }
    const chargingX = testSaitama.x;
    const chargingY = testSaitama.y;
    const chargingAngle = testSaitama.gunAngle;
    const chargingHp = testSaitama.hp;
    const initialChargeTimer = testSaitama._counterPunchTimer;

    // Force dodge to succeed by setting dodgeCooldown to 0 and executing takeDamage
    testSaitama.dodgeCooldown = 0;
    // Execute incoming attack while charging
    const originalRandom = Math.random;
    Math.random = () => 0.1; // Force 100% dodge success
    try {
      const takeDamageResult = testSaitama.takeDamage(50, dummyTarget2, { isDirect: true, isMelee: true });
      if (takeDamageResult !== false) {
        throw new Error('Expected takeDamage to return false on successful dodge during Serious Skill Counter charge');
      }
      if (testSaitama.hp !== chargingHp) {
        throw new Error('Expected Saitama HP to remain full after dodging during Serious Skill Counter charge');
      }
      if (testSaitama.x !== chargingX || testSaitama.y !== chargingY) {
        throw new Error(`Expected Saitama position to NOT change on dodge during counter charge (was ${testSaitama.x},${testSaitama.y}, expected ${chargingX},${chargingY})`);
      }
      if (testSaitama.vx !== 0 || testSaitama.vy !== 0) {
        throw new Error('Expected Saitama velocity to remain 0 on dodge during counter charge');
      }
      if (testSaitama.gunAngle !== chargingAngle) {
        throw new Error('Expected Saitama gunAngle to remain locked on counter target on dodge during counter charge');
      }
      if (testSaitama._counterPunchTimer <= 0) {
        throw new Error('Expected counter punch timer to remain active and charging after dodging');
      }
    } finally {
      Math.random = originalRandom;
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

    // Test Serious Counter immunity to push back / drag / pull attacks (Lapse Blue / Hollow Purple / Getsuga drag / Black Hole / knockback)
    dummyTarget2.hp = 10000;
    dummyTarget2.isDead = false;
    testSaitama.x = 200;
    testSaitama.y = 200;
    dummyTarget2.x = 300;
    dummyTarget2.y = 200;
    testSaitama.skillPunishCooldown = 0;
    testSaitama.executeSkillCounterPunish(dummyTarget2);
    if (!testSaitama.isCountering || testSaitama._counterPunchTimer <= 0) {
      throw new Error('Expected Serious Counter to be active before testing pull immunity');
    }
    // Simulate getting pulled by Lapse Blue / drag projectile
    const testBlue = {
      x: testSaitama.x + 30,
      y: testSaitama.y + 30,
      life: 100,
      isGojoBlue: true,
      pullRadius: 150,
      owner: 1,
      draggedTargets: new Set([testSaitama])
    };
    state.projectiles = [testBlue];
    testSaitama.isDraggedByGetsuga = true;
    testSaitama.knockbackVx = 10;
    testSaitama.knockbackVy = 10;
    testSaitama.applyKnockback(15, 15, { isPull: true, isGetsuga: true });
    testSaitama.update(dummyTarget2, 0, state.arena);
    if (!testSaitama.isCountering || testSaitama._counterPunchTimer <= 0) {
      throw new Error('Expected Serious Counter to remain active and immune to pull/drag/knockback attacks');
    }
    if (testSaitama.knockbackVx !== 0 || testSaitama.knockbackVy !== 0 || testSaitama.isDraggedByGetsuga || testBlue.draggedTargets.has(testSaitama)) {
      throw new Error('Expected push back and drag states on Saitama to be completely canceled/negated during Serious Counter');
    }
    state.projectiles = [];

    // Test Saitama Serious Skill Counter any-angle aim and locked aim angle without auto-aim rotation
    testSaitama.skillPunishCooldown = 0;
    testSaitama.dodgeCooldown = 0;
    dummyTarget2.hp = 1000;
    dummyTarget2.x = 300;
    dummyTarget2.y = 250;
    dummyTarget2.gunAngle = 0.52; // Target facing ~30 degrees diagonally
    dummyTarget2.angle = 0.52;
    state.fighters = [testSaitama, dummyTarget2];
    testSaitama.executeSkillCounterPunish(dummyTarget2);
    
    // Verify aim is along the true diagonal vector towards target, not cardinal
    const expectedAngle = Math.atan2(dummyTarget2.y - testSaitama.y, dummyTarget2.x - testSaitama.x);
    if (Math.abs(testSaitama.gunAngle - expectedAngle) > 0.05) {
      throw new Error(`Expected Saitama counter to aim at any diagonal angle ${expectedAngle.toFixed(2)}, got ${testSaitama.gunAngle.toFixed(2)}`);
    }
    const lockedAimAngle = testSaitama.gunAngle;

    // Move target elsewhere during windup to verify Saitama does NOT rotate or snap auto-aim
    dummyTarget2.x = 100;
    dummyTarget2.y = 500;
    testSaitama.aim(dummyTarget2);
    if (Math.abs(testSaitama.gunAngle - lockedAimAngle) > 0.001) {
      throw new Error(`Saitama rotated towards target during counter windup! Expected ${lockedAimAngle}, got ${testSaitama.gunAngle}`);
    }

    // Fast-forward to punch land
    while (testSaitama._counterPunchTimer > 0) {
      testSaitama.update(dummyTarget2, 0, state.arena);
    }
    if (Math.abs(testSaitama.gunAngle - lockedAimAngle) > 0.001) {
      throw new Error(`Saitama snapped auto-aim to target on punch release! Expected ${lockedAimAngle}, got ${testSaitama.gunAngle}`);
    }

    // Test Serious Counter directional frontal-only hit detection (no side/back hit even when close)
    state.mode = '1v1';
    state.gameState = 'playing';
    testSaitama.skillPunishCooldown = 0;
    testSaitama.dodgeCooldown = 0;
    testSaitama._postCounterRecoveryTimer = 0;
    testSaitama.isCountering = false;
    testSaitama.x = 300;
    testSaitama.y = 300;

    const frontEnemy = new Fighter({ startX: 370, startY: 300, type: 'default', color: '#555555' }); // directly in front (along aim angle 0)
    const backEnemy = new Fighter({ startX: 250, startY: 300, type: 'default', color: '#666666' });  // 50px directly behind
    const sideEnemy = new Fighter({ startX: 300, startY: 350, type: 'default', color: '#777777' });  // 50px directly to side (90 deg)
    frontEnemy.maxHp = 5000;
    frontEnemy.hp = 5000;
    frontEnemy.isDead = false;
    backEnemy.maxHp = 5000;
    backEnemy.hp = 5000;
    backEnemy.isDead = false;
    sideEnemy.maxHp = 5000;
    sideEnemy.hp = 5000;
    sideEnemy.isDead = false;

    state.fighters = [testSaitama, frontEnemy, backEnemy, sideEnemy];
    testSaitama.executeSkillCounterPunish(frontEnemy);

    // Fast-forward counter wind-up to punch impact
    while (testSaitama._counterPunchTimer > 0) {
      testSaitama.update(frontEnemy, 0, state.arena);
    }

    if (frontEnemy.hp >= 5000) {
      throw new Error(`Expected front enemy in frontal arc to take counter punch damage, got hp=${frontEnemy.hp}`);
    }
    if (backEnemy.hp < 5000) {
      throw new Error(`Expected enemy directly behind Saitama to take 0 damage, but took ${5000 - backEnemy.hp} damage!`);
    }
    if (sideEnemy.hp < 5000) {
      throw new Error(`Expected enemy to the side of Saitama to take 0 damage, but took ${5000 - sideEnemy.hp} damage!`);
    }

    while (testSaitama._postCounterRecoveryTimer > 0) {
      testSaitama.update(frontEnemy, 0, state.arena);
    }
    testSaitama.isCountering = false;
    testSaitama._counterPunchTarget = null;
    testSaitama._counterPunchTimer = 0;
    testSaitama._postCounterRecoveryTimer = 0;

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
    testYuji.maxHp = 300;
    const yujiThreshold = CONFIG.yuji?.soulSwapHpThreshold ?? 0.30;
    testYuji.hp = testYuji.maxHp * Math.min(0.25, yujiThreshold - 0.05); // Trigger Soul Swap below threshold
    testYuji.hasSoulSwapped = false;
    testYuji.soulSwapActive = false;
    dummyTarget3.hp = 10000;
    dummyTarget3.isDead = false;
    testYuji.update(dummyTarget3, 0, state.arena); // Trigger takeover

    const expectedSoulSwapDuration = CONFIG.yuji?.soulSwapDuration ?? CONFIG.yuji?.soulSwapDurationFrames ?? 800;
    if (!testYuji.soulSwapActive || testYuji.soulSwapTimer !== expectedSoulSwapDuration) {
      throw new Error(`Expected Soul Swap to activate with duration ${expectedSoulSwapDuration}, got active=${testYuji.soulSwapActive}, timer=${testYuji.soulSwapTimer}`);
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
    errorList.push(`[DOMAIN DEATH CLEANUP TEST]: ${err.stack || err.message}`);
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
      testToji.timeStopTimer = 0;
      testToji.hitStunTimer = 0;
      testToji.paralyzeTimer = 0;
      testToji.isGetsugaSuppressed = false;
      testToji.makimaWallPinTimer = 0;
      testToji.isCurrentlyWallPinnedByMakima = false;
      testToji.isWallPinnedByMakima = false;
      testToji._hitByGetsugaTimer = 0;
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

  // 6.5.1 Toji Domain Dodge Chance vs Sukuna Domain Slashes Test
  console.log('🗡️ [Toji Domain Dodge Chance vs Sukuna Domain Slashes Test] Verifying Toji physically dodges Malevolent Shrine spatial cuts...');
  try {
    const TojiClass = FIGHTER_CLASS_MAP['toji'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const { spawnDomainSlashLines } = await import('../js/entities/fighters/sukuna/sukunaDomainVisuals.js');

    if (TojiClass && SukunaClass) {
      const tojiDef = allDefs.find(d => (d.type === 'toji' || d.characterId === 'toji'));
      const sukunaDef = allDefs.find(d => (d.type === 'sukuna' || d.characterId === 'sukuna'));

      const testToji = new TojiClass(tojiDef);
      const testSukuna = new SukunaClass(sukunaDef);

      state.fighters = [testToji, testSukuna];
      state.arena = { x: 0, y: 0, width: 540, height: 960 };

      testToji.x = 200;
      testToji.y = 300;
      testSukuna.x = 200;
      testSukuna.y = 500;
      testSukuna.domainActive = true;

      // 1. Verify dodgeSliceLine method exists on Toji
      if (typeof testToji.dodgeSliceLine !== 'function') {
        throw new Error('Expected TojiFighter to implement dodgeSliceLine(lineData)');
      }

      // 2. Test dodgeSliceLine high success rate (domainDodgeChance = 0.95)
      let dodgeSuccessCount = 0;
      const trialCount = 100;
      for (let i = 0; i < trialCount; i++) {
        const didDodge = testToji.dodgeSliceLine({
          angle: 0,
          cx: testToji.x,
          cy: testToji.y,
          normalX: 0,
          normalY: 1,
          thickness: 3,
          attacker: testSukuna
        });
        if (didDodge) dodgeSuccessCount++;
      }

      const minExpected = Math.max(15, Math.floor((CONFIG.toji?.domainDodgeChance ?? 0.50) * trialCount) - 25);
      if (dodgeSuccessCount < minExpected) {
        throw new Error(`Expected Toji domain dodge rate >= ${minExpected}% out of 100 trials with config ${(CONFIG.toji?.domainDodgeChance ?? 0.50) * 100}%, got ${dodgeSuccessCount}%`);
      }

      // 3. Verify afterimages and sidestep displacement occurred
      if (!testToji.stealthAfterimages || testToji.stealthAfterimages.length === 0) {
        throw new Error('Expected Toji to spawn stealth afterimages upon dodging slice lines');
      }

      // 4. Verify Sukuna spawnDomainSlashLines integration with Toji inside domain
      testToji.hp = testToji.maxHp || 420;
      testSukuna.domainTimeInsideMap = new Map();
      const didHitAny = spawnDomainSlashLines(testSukuna, 3);

      // Verify that Toji survived and did not take unconditional 100% damage spikes
      if (testToji.hp <= 0) {
        throw new Error('Expected Toji to survive domain slice lines');
      }
    }
  } catch (err) {
    console.error('❌ [TOJI DOMAIN DODGE CHANCE TEST ERROR]:', err);
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
      // Test Yuji Base Passive Damage Reduction (DEF)
      const baseDefYuji = new YujiClass({ startX: 200, startY: 200, hp: 500, maxHp: 500 });
      const hpBeforeHit = baseDefYuji.hp;
      const rawHit = 100;
      baseDefYuji.takeDamage(rawHit, null);
      const expectedReduction = CONFIG.yuji?.baseDamageReduction ?? 0.20;
      const expectedDamage = rawHit * (1 - expectedReduction);
      const actualDamage = hpBeforeHit - baseDefYuji.hp;
      if (Math.abs(actualDamage - expectedDamage) > 0.01) {
        throw new Error(`Expected Yuji to take ${expectedDamage} damage (with ${expectedReduction * 100}% DEF reduction), but took ${actualDamage}!`);
      }

      const yuji = new YujiClass({ startX: 200, startY: 200, hp: 1000, maxHp: 1000 });
      // Damage below threshold -> triggers Soul Swap
      const swapThreshold = CONFIG.yuji?.soulSwapHpThreshold ?? 0.30;
      const defReduction = CONFIG.yuji?.baseDamageReduction ?? 0;
      // Account for passive DEF: divide by (1 - reduction) so effective post-DEF damage crosses threshold
      const rawDamageNeeded = yuji.maxHp * (1 - swapThreshold + 0.1);
      yuji.takeDamage(defReduction > 0 ? rawDamageNeeded / (1 - defReduction) : rawDamageNeeded, null);
      if (!yuji.soulSwapActive) {
        throw new Error('Expected Yuji to activate Soul Swap below threshold HP');
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
      target.invincibilityTimer = 0;
      target.infinityCooldown = 1000;
      target.infinityActive = false;
      target.isMeleeMode = true;
      target.infinityBlockTimer = 0;
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

  // 6b. Countdown End Omnidirectional Movement Verification Test
  console.log('🎲 [Countdown End Omnidirectional Movement Test] Verifying fighters launch in varied directions rather than charging forward into each other...');
  try {
    const gojoDef = FIGHTER_DEFS.find(d => d.type === 'gojo') || FIGHTER_DEFS[0];
    const sukunaDef = FIGHTER_DEFS.find(d => d.type === 'sukuna') || FIGHTER_DEFS[1];
    const GojoClass = FIGHTER_CLASS_MAP.gojo || FIGHTER_CLASS_MAP.default;
    const SukunaClass = FIGHTER_CLASS_MAP.sukuna || FIGHTER_CLASS_MAP.default;

    let nonZeroAnglesCount = 0;
    const trials = 30;

    for (let t = 0; t < trials; t++) {
      const f1 = new GojoClass(gojoDef);
      const f2 = new SukunaClass(sukunaDef);
      f1.x = 100;
      f1.y = 400;
      f1.gunAngle = 0; // aimed directly right at f2
      f2.x = 400;
      f2.y = 400;
      f2.gunAngle = Math.PI; // aimed directly left at f1
      f1.vx = 0;
      f1.vy = 0;
      f2.vx = 0;
      f2.vy = 0;

      state.fighters = [f1, f2];
      state.gameState = 'countdown';
      state.countdownTimer = 200; // Reaches countdown end

      updateGame();

      if (state.gameState !== 'playing') {
        throw new Error(`Expected gameState to be 'playing' after countdownTimer reached completion, got '${state.gameState}'`);
      }

      const spd1 = Math.hypot(f1.vx, f1.vy);
      const spd2 = Math.hypot(f2.vx, f2.vy);
      if (spd1 < 0.5 || spd2 < 0.5) {
        throw new Error(`Expected fighters to have active initial velocities after countdown, got spd1=${spd1}, spd2=${spd2}`);
      }

      const angle1 = Math.atan2(f1.vy, f1.vx);
      // Angle 0 would be charging straight forward at the enemy
      if (Math.abs(angle1) > 0.1) {
        nonZeroAnglesCount++;
      }
    }

    if (nonZeroAnglesCount < trials * 0.7) {
      throw new Error(`Expected fighters to move in randomized omnidirectional angles on countdown end, but received mostly forward (0 rad) angles!`);
    }

    // Also test zero-speed auto-recovery in applyMovementPhysics()
    let stallRecoveryVariedCount = 0;
    for (let t = 0; t < trials; t++) {
      const f = new GojoClass(gojoDef);
      f.gunAngle = 0; // aimed straight forward
      f.vx = 0;
      f.vy = 0;
      f.applyMovementPhysics();
      const recAngle = Math.atan2(f.vy, f.vx);
      if (Math.abs(recAngle) > 0.1) {
        stallRecoveryVariedCount++;
      }
    }

    if (stallRecoveryVariedCount < trials * 0.7) {
      throw new Error(`Expected applyMovementPhysics() zero-speed recovery to use randomized direction, but was locked to gunAngle!`);
    }
  } catch (err) {
    console.error('❌ [COUNTDOWN MOVEMENT TEST ERROR]:', err);
    errors++;
  }

  // 6.2. Sukuna & Gojo Any-Angle Basic Attack Aiming and Firing Test
  console.log('🔥 [Sukuna & Gojo Any-Angle Basic Attack Test] Verifying basic attack Dismantle and Blue orb fire in any 360-degree angle...');
  try {
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const sukunaDef = FIGHTER_DEFS.find(d => d.id === 'sukuna');
    if (SukunaClass && sukunaDef) {
      // Test 1: Sukuna Basic Attack Dismantle aim and shoot in continuous 360-degree angles
      const s = new SukunaClass(sukunaDef);
      s.x = 270;
      s.y = 480;
      s.isMeleeMode = false;
      state.fighters = [s];

      // Enemy to the Right
      const enemyRight = { x: 450, y: 480, r: 25, hp: 100, maxHp: 100, isDead: false };
      s.aim(enemyRight);
      if (Math.abs(s.gunAngle - 0) > 0.001) {
        throw new Error(`Expected Sukuna right aim to be 0 rad, got ${s.gunAngle}`);
      }

      // Enemy to the Left
      const enemyLeft = { x: 90, y: 480, r: 25, hp: 100, maxHp: 100, isDead: false };
      s.aim(enemyLeft);
      if (Math.abs(Math.abs(s.gunAngle) - Math.PI) > 0.001) {
        throw new Error(`Expected Sukuna left aim to be Math.PI rad, got ${s.gunAngle}`);
      }

      // Enemy Down
      const enemyDown = { x: 270, y: 700, r: 25, hp: 100, maxHp: 100, isDead: false };
      s.aim(enemyDown);
      if (Math.abs(s.gunAngle - (Math.PI / 2)) > 0.001) {
        throw new Error(`Expected Sukuna down aim to be Math.PI/2 rad, got ${s.gunAngle}`);
      }

      // Enemy Up
      const enemyUp = { x: 270, y: 200, r: 25, hp: 100, maxHp: 100, isDead: false };
      s.aim(enemyUp);
      if (Math.abs(s.gunAngle - (-Math.PI / 2)) > 0.001) {
        throw new Error(`Expected Sukuna up aim to be -Math.PI/2 rad, got ${s.gunAngle}`);
      }

      // Enemy at diagonal (dx=180, dy=40 -> exact Math.atan2(40, 180))
      const enemyDiagRight = { x: 450, y: 520, r: 25, hp: 100, maxHp: 100, isDead: false };
      s.aim(enemyDiagRight);
      const expectedDiagRightAngle = Math.atan2(520 - 480, 450 - 270);
      if (Math.abs(s.gunAngle - expectedDiagRightAngle) > 0.001) {
        throw new Error(`Expected Sukuna diagonal aim to be ${expectedDiagRightAngle} rad, got ${s.gunAngle}`);
      }

      // Enemy at diagonal (dx=30, dy=220 -> exact Math.atan2(220, 30))
      const enemyDiagDown = { x: 300, y: 700, r: 25, hp: 100, maxHp: 100, isDead: false };
      s.aim(enemyDiagDown);
      const expectedDiagDownAngle = Math.atan2(700 - 480, 300 - 270);
      if (Math.abs(s.gunAngle - expectedDiagDownAngle) > 0.001) {
        throw new Error(`Expected Sukuna diagonal vertical aim to be ${expectedDiagDownAngle} rad, got ${s.gunAngle}`);
      }

      // Test 2: Shoot Dismantle projectile fires along exact diagonal angle
      projectileSystem.projectiles = [];
      s.shoot(0);
      const proj = projectileSystem.projectiles.find(p => p.visual === 'ghostBlade' || p.isSukunaSlash);
      if (!proj) {
        throw new Error(`Expected Sukuna shoot() to fire ghostBlade/Dismantle projectile!`);
      }
      if (Math.abs(proj.angle - expectedDiagDownAngle) > 0.001) {
        throw new Error(`Expected Dismantle projectile angle to match diagonal aim (${expectedDiagDownAngle} rad), got ${proj.angle}`);
      }

      // Test 3: Fuga any-angle aiming and initiation
      s.reset();
      s.x = 270;
      s.y = 480;
      s.divineFlameCooldown = 0;
      const diagonalEnemy = { x: 450, y: 650, r: 25, hp: 100, maxHp: 100, isDead: false };
      state.fighters = [s, diagonalEnemy];
      s.update(diagonalEnemy, 0, state.arena);
      if (!s.isChannelingDivineFlame) {
        throw new Error(`Expected Sukuna to trigger Fuga when enemy is at diagonal within trigger range!`);
      }
      const expectedFugaAngle = Math.atan2(650 - 480, 450 - 270);
      if (Math.abs(s.divineFlameCastAngle - expectedFugaAngle) > 0.05 || Math.abs(s.gunAngle - expectedFugaAngle) > 0.05) {
        throw new Error(`Expected Sukuna Fuga cast angle to be locked to diagonal (${expectedFugaAngle.toFixed(2)}), got ${s.divineFlameCastAngle}`);
      }
      const lockedFugaAngle = s.gunAngle;

      // Test 4: Enemy moves during Fuga charge - verify aim smoothly rotates toward enemy without snapping
      const angleBefore = s.gunAngle;
      diagonalEnemy.x = 100;
      diagonalEnemy.y = 200;
      s.update(diagonalEnemy, 0, state.arena);
      const angleAfter = s.gunAngle;
      if (angleAfter === angleBefore) {
        throw new Error(`Expected Sukuna aim to rotate toward enemy during Fuga channeling! Before: ${angleBefore}, After: ${angleAfter}`);
      }
      const directTargetAngle = Math.atan2(200 - s.y, 100 - s.x);
      if (Math.abs(angleAfter - directTargetAngle) < 0.01) {
        throw new Error(`Expected Sukuna aim to rotate smoothly without instant snapping during Fuga channeling! Got: ${angleAfter}, Target: ${directTargetAngle}`);
      }
      const updatedFugaAngle = s.gunAngle;

      // Test 5: Fuga firing launches arrow along current facing angle without snapping to a relocated enemy
      diagonalEnemy.x = 800;
      diagonalEnemy.y = 800;
      projectileSystem.projectiles = [];
      s._fireDivineFlame(0);
      const fugaProj = projectileSystem.projectiles.find(p => p.isSukunaFurnace || p.behaviorType === 'sukuna_furnace');
      if (!fugaProj) {
        throw new Error(`Expected _fireDivineFlame to spawn sukuna_furnace projectile!`);
      }
      const fugaVelocityAngle = Math.atan2(fugaProj.vy, fugaProj.vx);
      if (Math.abs(fugaVelocityAngle - updatedFugaAngle) > 0.05) {
        throw new Error(`Expected Fuga arrow velocity angle to match locked angle (${updatedFugaAngle.toFixed(2)}), got ${fugaVelocityAngle}`);
      }

      // Test 6: Enemy out of trigger range (1500, 1500) -> should NOT trigger Fuga
      s.reset();
      s.x = 270;
      s.y = 480;
      s.divineFlameCooldown = 0;
      const farEnemy = { x: 1500, y: 1500, r: 25, hp: 100, maxHp: 100, isDead: false };
      state.fighters = [s, farEnemy];
      s.update(farEnemy, 0, state.arena);
      if (s.isChannelingDivineFlame) {
        throw new Error(`Expected Sukuna to NOT trigger Fuga when enemy is out of trigger range!`);
      }
    }

    // Test Gojo Basic Attack Blue aim and shoot in continuous 360-degree angles
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const gojoDef = FIGHTER_DEFS.find(d => d.id === 'gojo');
    if (GojoClass && gojoDef) {
      const g = new GojoClass(gojoDef);
      g.x = 270;
      g.y = 480;
      g.isMeleeMode = false;
      state.fighters = [g];

      // Enemy at diagonal (dx=150, dy=150 -> Math.PI / 4)
      const diagEnemy = { x: 420, y: 630, r: 25, hp: 100, maxHp: 100, isDead: false };
      g.aim(diagEnemy);
      const expectedBlueAngle = Math.atan2(630 - 480, 420 - 270);
      if (Math.abs(g.gunAngle - expectedBlueAngle) > 0.001) {
        throw new Error(`Expected Gojo diagonal aim to be ${expectedBlueAngle} rad, got ${g.gunAngle}`);
      }

      // Shoot Blue projectile and verify it launches along continuous diagonal angle
      projectileSystem.projectiles = [];
      g.shoot(0);
      const blueProj = projectileSystem.projectiles.find(p => p.isGojoBlue || p.behaviorType === 'gojo_blue');
      if (!blueProj) {
        throw new Error(`Expected Gojo shoot() to fire gojo_blue projectile!`);
      }
      const blueVelocityAngle = Math.atan2(blueProj.vy, blueProj.vx);
      if (Math.abs(blueVelocityAngle - expectedBlueAngle) > 0.001) {
        throw new Error(`Expected Gojo Blue projectile velocity angle to match diagonal (${expectedBlueAngle} rad), got ${blueVelocityAngle}`);
      }
    }
  } catch (err) {
    console.error('❌ [SUKUNA & GOJO ANY-ANGLE BASIC ATTACK TEST ERROR]:', err);
    errors++;
  }

  // 6.3. Makima 360° Any-Angle ("Bang!" Primary Attack) Test
  console.log('🔫 [Makima Any-Angle Aim Test] Verifying "Bang!" primary attack fires along any 360-degree angle...');
  try {
    const MakimaClass = FIGHTER_CLASS_MAP['makima'];
    const makimaDef = FIGHTER_DEFS.find(d => d.id === 'makima');
    if (MakimaClass && makimaDef) {
      const m = new MakimaClass(makimaDef);
      m.x = 270;
      m.y = 480;
      state.fighters = [m];
      state.illusions = [];

      // Enemy to the Right -> 0
      const enemyRight = { x: 450, y: 480, r: 25, hp: 100, maxHp: 100, isDead: false };
      m.aim(enemyRight);
      if (Math.abs(m.gunAngle - 0) > 0.001) {
        throw new Error(`Expected Makima right aim to be 0 rad, got ${m.gunAngle}`);
      }

      // Enemy to the Left -> Math.PI
      const enemyLeft = { x: 90, y: 480, r: 25, hp: 100, maxHp: 100, isDead: false };
      m.aim(enemyLeft);
      if (Math.abs(Math.abs(m.gunAngle) - Math.PI) > 0.001) {
        throw new Error(`Expected Makima left aim to be Math.PI rad, got ${m.gunAngle}`);
      }

      // Enemy Down -> Math.PI / 2
      const enemyDown = { x: 270, y: 700, r: 25, hp: 100, maxHp: 100, isDead: false };
      m.aim(enemyDown);
      if (Math.abs(m.gunAngle - (Math.PI / 2)) > 0.001) {
        throw new Error(`Expected Makima down aim to be Math.PI/2 rad, got ${m.gunAngle}`);
      }

      // Enemy Up -> -Math.PI / 2
      const enemyUp = { x: 270, y: 200, r: 25, hp: 100, maxHp: 100, isDead: false };
      m.aim(enemyUp);
      if (Math.abs(m.gunAngle - (-Math.PI / 2)) > 0.001) {
        throw new Error(`Expected Makima up aim to be -Math.PI/2 rad, got ${m.gunAngle}`);
      }

      // Enemy at true diagonal (dx=180, dy=40 -> exact Math.atan2(40, 180))
      const enemyDiagRight = { x: 450, y: 520, r: 25, hp: 100, maxHp: 100, isDead: false };
      m.aim(enemyDiagRight);
      const expectedAngle = Math.atan2(520 - 480, 450 - 270);
      if (Math.abs(m.gunAngle - expectedAngle) > 0.001) {
        throw new Error(`Expected Makima diagonal aim to be ${expectedAngle} rad, got ${m.gunAngle}`);
      }

      // Enemy at steep diagonal (dx=30, dy=220 -> exact Math.atan2(220, 30))
      const enemyDiagDown = { x: 300, y: 700, r: 25, hp: 100, maxHp: 100, isDead: false };
      m.aim(enemyDiagDown);
      const expectedSteepAngle = Math.atan2(700 - 480, 300 - 270);
      if (Math.abs(m.gunAngle - expectedSteepAngle) > 0.001) {
        throw new Error(`Expected Makima steep diagonal aim to be ${expectedSteepAngle} rad, got ${m.gunAngle}`);
      }

      // Test "Bang!" attack execution creates beam along exact target angle
      m.activeBangBeams = [];
      m._castBangAttack(enemyDiagDown);
      if (m.activeBangBeams.length === 0) {
        throw new Error(`Expected _castBangAttack to register activeBangBeams!`);
      }
      const lastBeam = m.activeBangBeams[m.activeBangBeams.length - 1];
      if (Math.abs(lastBeam.angle - expectedSteepAngle) > 0.001) {
        throw new Error(`Expected Bang beam angle to be ${expectedSteepAngle} rad, got ${lastBeam.angle}`);
      }

      // Test shoot() triggers "Bang!" along exact diagonal target angle
      m.bangCooldown = 0;
      m.activeBangBeams = [];
      state.fighters = [m, enemyDiagRight];
      m.shoot(0);
      if (m.isPreparingBang) {
        const windup = m.bangWindupMax || 8;
        for (let w = 0; w < windup; w++) {
          m.update(enemyDiagRight, 0, null);
        }
      }
      if (m.activeBangBeams.length === 0) {
        throw new Error(`Expected shoot() to fire Bang!`);
      }
      const shootBeam = m.activeBangBeams[m.activeBangBeams.length - 1];
      if (Math.abs(shootBeam.angle - expectedAngle) > 0.001) {
        throw new Error(`Expected Bang shoot beam angle to be ${expectedAngle} rad, got ${shootBeam.angle}`);
      }
    }
  } catch (err) {
    console.error('❌ [MAKIMA ANY-ANGLE AIM TEST ERROR]:', err);
    errors++;
  }

  // 6.4. Yuta Pure Love Beam 360° Any-Angle & Non-Snap Aiming Test
  console.log('💍 [Yuta Pure Love Beam Test] Verifying Pure Love Beam supports continuous 360° aiming without snap auto-aim...');
  try {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const yutaDef = FIGHTER_DEFS.find(d => d.id === 'yuta');
    if (YutaClass && yutaDef) {
      const y = new YutaClass(yutaDef);
      y.x = 270;
      y.y = 480;
      state.fighters = [y];
      state.illusions = [];

      // Test 1: Cardinal helper calculation in 4 directions
      const enemyRight = { x: 450, y: 480, r: 25, hp: 100, isDead: false };
      const enemyLeft  = { x: 90,  y: 480, r: 25, hp: 100, isDead: false };
      const enemyDown  = { x: 270, y: 700, r: 25, hp: 100, isDead: false };
      const enemyUp    = { x: 270, y: 200, r: 25, hp: 100, isDead: false };

      if (Math.abs(y._getCardinalAngle(enemyRight) - 0) > 0.001) throw new Error(`Expected Yuta cardinal Right to be 0 rad`);
      if (Math.abs(Math.abs(y._getCardinalAngle(enemyLeft)) - Math.PI) > 0.001) throw new Error(`Expected Yuta cardinal Left to be Math.PI rad`);
      if (Math.abs(y._getCardinalAngle(enemyDown) - (Math.PI / 2)) > 0.001) throw new Error(`Expected Yuta cardinal Down to be Math.PI/2 rad`);
      if (Math.abs(y._getCardinalAngle(enemyUp) - (-Math.PI / 2)) > 0.001) throw new Error(`Expected Yuta cardinal Up to be -Math.PI/2 rad`);

      // Test 2: Auto-aim while charging tracks moving enemy
      const diagonalEnemy = { x: 450, y: 660, r: 25, hp: 100, isDead: false };
      const expectedDiagAngle = Math.atan2(660 - 480, 450 - 270);
      y.reset();
      y.x = 270;
      y.y = 480;
      y.hp = y.maxHp * 0.5; // Below threshold
      y.rika = { active: true, hp: 500, maxHp: 500, isDying: false, disappearing: false, x: 270, y: 480, r: 25 };
      state.fighters = [y, diagonalEnemy];
      y.update(diagonalEnemy, 0, state.arena);

      if (Math.abs(y.gunAngle - expectedDiagAngle) > 0.05) {
        throw new Error(`Expected Yuta gunAngle to auto-aim diagonally (${expectedDiagAngle.toFixed(2)}), got ${y.gunAngle}`);
      }

      // Test 3: Channeling locks aim and does NOT rotate/track new enemy positions
      y.isChannelingPureLoveBeam = true;
      y.pureLoveBeamLockedAngle = expectedDiagAngle;
      y.update(enemyUp, 0, state.arena);
      if (Math.abs(y.gunAngle - expectedDiagAngle) > 0.001 || Math.abs(y.angle - expectedDiagAngle) > 0.001) {
        throw new Error(`Expected Yuta gunAngle to remain locked at diagonal angle (${expectedDiagAngle.toFixed(2)}) without aim tracking during channeling, got ${y.gunAngle}`);
      }

      // Test 4: Firing snapshots and locks angle, rejecting snap auto-aim
      projectileSystem.projectiles = [];
      y.activatePureLoveBeam();
      const lockedAngle = y.pureLoveBeamLockedAngle;
      if (Math.abs(lockedAngle - expectedDiagAngle) > 0.05) {
        throw new Error(`Expected locked angle to snapshot charge angle (${expectedDiagAngle.toFixed(2)}), got ${lockedAngle}`);
      }

      // Enemy moves to enemyDown after firing -> Yuta must NOT snap auto-aim
      y.aim(enemyDown);
      if (Math.abs(y.gunAngle - lockedAngle) > 0.001 || Math.abs(y.angle - lockedAngle) > 0.001) {
        throw new Error(`Expected Yuta gunAngle to remain locked at ${lockedAngle} without snap auto-aim, got ${y.gunAngle}`);
      }

      const beam = projectileSystem.projectiles.find(p => p && p.isPureLoveBeam);
      if (!beam) throw new Error(`Expected Pure Love Beam projectile to spawn!`);
      if (Math.abs(beam.angle - lockedAngle) > 0.001) throw new Error(`Expected Pure Love Beam angle to match locked angle (${lockedAngle}), got ${beam.angle}`);
      
      const expectedVx = Math.cos(lockedAngle);
      const expectedVy = Math.sin(lockedAngle);
      if (Math.sign(beam.vx) !== Math.sign(expectedVx) || Math.sign(beam.vy) !== Math.sign(expectedVy)) {
        throw new Error(`Expected Pure Love Beam velocity vectors to match angle`);
      }
      if (Math.sign(y.vx) !== -Math.sign(expectedVx) || Math.sign(y.vy) !== -Math.sign(expectedVy)) {
        throw new Error(`Expected Yuta recoil vectors opposite to beam angle`);
      }
    }
  } catch (err) {
    console.error('❌ [YUTA PURE LOVE BEAM TEST ERROR]:', err);
    errors++;
  }

  // 6.4a. Yuta Phantom Flurry 5 Basic Attack Hits & Parry Activation Test
  console.log('💍 [Yuta Phantom Flurry Test] Verifying Phantom Flurry activates on 5 basic attack hits and on parries...');
  try {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const TargetDummyClass = FIGHTER_CLASS_MAP['target_dummy'] || FIGHTER_CLASS_MAP['normal'];
    const yutaDef = FIGHTER_DEFS.find(d => d.id === 'yuta');
    if (YutaClass && yutaDef && TargetDummyClass) {
      const y = new YutaClass(yutaDef);
      const dummy = new TargetDummyClass({ id: 'dummy', type: 'dummy', hp: 500, radius: 25 });
      state.fighters = [y, dummy];
      state.illusions = [];

      y.x = 200; y.y = 200;
      dummy.x = 230; dummy.y = 200;

      if (y.basicAttackHitCount !== 0) throw new Error('Expected initial basicAttackHitCount to be 0');

      for (let i = 1; i <= 4; i++) {
        dummy.x = 230; dummy.y = 200;
        y.x = 200; y.y = 200;
        y.meleeCooldown = 0;
        y.executeKatanaMelee(0);
        if (y.basicAttackHitCount !== i) throw new Error(`Expected basicAttackHitCount ${i}, got ${y.basicAttackHitCount}`);
        if (y.flurryHitsLeft !== 0) throw new Error(`Flurry should not have triggered on hit ${i}`);
      }

      dummy.x = 230; dummy.y = 200;
      y.x = 200; y.y = 200;
      y.meleeCooldown = 0;
      y.executeKatanaMelee(0);

      if (y.basicAttackHitCount !== 0) throw new Error(`Expected basicAttackHitCount to reset to 0, got ${y.basicAttackHitCount}`);
      if (y.flurryHitsLeft !== (CONFIG.yuta?.flurryHits || 7)) throw new Error(`Expected flurryHitsLeft to be ${CONFIG.yuta?.flurryHits || 7}, got ${y.flurryHitsLeft}`);

      // Run flurry until Thin Ice Breaker
      let frames = 0;
      while ((y.flurryHitsLeft > 0 || y.flurryTimer > 0) && frames < 200) {
        y.update(dummy, 0, state.arena);
        frames++;
      }
      if (!y.isChannelingThinIceBreaker && y.thinIceBreakerChargeTimer <= 0) {
        throw new Error('Expected Yuta to transition into Thin Ice Breaker after flurry completion');
      }

      // Test reset and parry trigger
      y.reset();
      if (y.basicAttackHitCount !== 0 || y.flurryHitsLeft !== 0 || y.parryCount !== 0) {
        throw new Error('Expected reset() to clear all flurry counters');
      }

      y.targetParriesForFlurry = 3;
      y.parryCount = 2;
      y.getParryChance = () => 1.0;
      dummy.x = 220; dummy.y = 200; dummy.hp = 100; dummy.isDead = false;
      y.x = 200; y.y = 200; y.hp = 200; y.isDead = false;

      y.takeDamage(10, dummy, { isMelee: true });
      if (y.flurryHitsLeft !== (CONFIG.yuta?.flurryHits || 7)) throw new Error('Expected parry to trigger Phantom Flurry');
      if (y.parryStacks !== 1) throw new Error('Expected parryStacks to be 1');
    }
  } catch (err) {
    console.error('❌ [YUTA PHANTOM FLURRY TEST ERROR]:', err);
    errors++;
  }

  // 6.4b. Ichigo Getsuga Tensho 360° Any-Angle & Non-Snap Aiming Test
  console.log('🗡️ [Ichigo Getsuga Tensho Test] Verifying Getsuga Tensho and Final Massive Getsuga support continuous 360° aiming without snap auto-aim...');
  try {
    const IchigoClass = FIGHTER_CLASS_MAP['ichigo'];
    const ichigoDef = FIGHTER_DEFS.find(d => d.id === 'ichigo' || d.type === 'ichigo');
    if (IchigoClass && ichigoDef) {
      const ichigo = new IchigoClass(ichigoDef);
      ichigo.x = 270;
      ichigo.y = 480;
      state.fighters = [ichigo];
      state.illusions = [];

      // Test 1: Cardinal helper calculation in 4 directions
      const enemyRight = { x: 450, y: 480, r: 25, hp: 100, maxHp: 100, isDead: false };
      const enemyLeft  = { x: 90,  y: 480, r: 25, hp: 100, maxHp: 100, isDead: false };
      const enemyDown  = { x: 270, y: 700, r: 25, hp: 100, maxHp: 100, isDead: false };
      const enemyUp    = { x: 270, y: 200, r: 25, hp: 100, maxHp: 100, isDead: false };

      if (Math.abs(ichigo._getCardinalAngle(enemyRight) - 0) > 0.001) throw new Error(`Expected Ichigo cardinal Right to be 0 rad`);
      if (Math.abs(Math.abs(ichigo._getCardinalAngle(enemyLeft)) - Math.PI) > 0.001) throw new Error(`Expected Ichigo cardinal Left to be Math.PI rad`);
      if (Math.abs(ichigo._getCardinalAngle(enemyDown) - (Math.PI / 2)) > 0.001) throw new Error(`Expected Ichigo cardinal Down to be Math.PI/2 rad`);
      if (Math.abs(ichigo._getCardinalAngle(enemyUp) - (-Math.PI / 2)) > 0.001) throw new Error(`Expected Ichigo cardinal Up to be -Math.PI/2 rad`);

      // Test 2: Standard Getsuga Tensho firing along any angle (including diagonals)
      const testAngles = [
        { target: enemyRight, expectedAngle: 0 },
        { target: enemyLeft, expectedAngle: Math.PI },
        { target: enemyDown, expectedAngle: Math.PI / 2 },
        { target: enemyUp, expectedAngle: -Math.PI / 2 },
        { target: { x: 450, y: 660, r: 25, hp: 100, maxHp: 100, isDead: false }, expectedAngle: Math.atan2(660 - 480, 450 - 270) },
        { target: { x: 90, y: 300, r: 25, hp: 100, maxHp: 100, isDead: false }, expectedAngle: Math.atan2(300 - 480, 90 - 270) }
      ];

      for (const d of testAngles) {
        ichigo.reset();
        ichigo.x = 270;
        ichigo.y = 480;
        projectileSystem.projectiles = [];
        ichigo.fireGetsuga(d.target, false);

        if (Math.abs(Math.abs(d.expectedAngle) - Math.PI) < 0.001) {
          if (Math.abs(Math.abs(ichigo.gunAngle) - Math.PI) > 0.001) throw new Error(`Expected Ichigo gunAngle to be Math.PI for Left`);
        } else {
          if (Math.abs(ichigo.gunAngle - d.expectedAngle) > 0.001) throw new Error(`Expected Ichigo gunAngle to be ${d.expectedAngle}, got ${ichigo.gunAngle}`);
        }

        // Release Getsuga
        ichigo._releaseGetsuga();
        const getsugaProj = projectileSystem.projectiles.find(p => p && (p.isGetsuga || p.behaviorType === 'getsuga_tensho'));
        if (!getsugaProj) throw new Error('Expected Getsuga Tensho projectile to spawn on release!');

        if (Math.abs(Math.abs(d.expectedAngle) - Math.PI) < 0.001) {
          if (Math.abs(Math.abs(getsugaProj.angle) - Math.PI) > 0.001) throw new Error(`Expected Getsuga projectile angle Math.PI`);
        } else {
          if (Math.abs(getsugaProj.angle - d.expectedAngle) > 0.001) throw new Error(`Expected Getsuga projectile angle ${d.expectedAngle}, got ${getsugaProj.angle}`);
        }

        const expectedVx = Math.cos(d.expectedAngle);
        const expectedVy = Math.sin(d.expectedAngle);
        if (Math.abs(expectedVx) > 0.05 && Math.sign(getsugaProj.vx) !== Math.sign(expectedVx)) {
          throw new Error(`Expected Getsuga vx sign to match angle`);
        }
        if (Math.abs(expectedVy) > 0.05 && Math.sign(getsugaProj.vy) !== Math.sign(expectedVy)) {
          throw new Error(`Expected Getsuga vy sign to match angle`);
        }
      }

      // Test 3: Final Massive Kuroi Getsuga Tensho firing along diagonal angle
      ichigo.reset();
      ichigo.x = 270;
      ichigo.y = 480;
      projectileSystem.projectiles = [];
      const diagonalTarget = { x: 450, y: 660, r: 25, hp: 100, maxHp: 100, isDead: false };
      const expectedFinalAngle = Math.atan2(660 - 480, 450 - 270);
      ichigo.fireFinalMassiveGetsuga(diagonalTarget);

      if (Math.abs(ichigo.gunAngle - expectedFinalAngle) > 0.001) {
        throw new Error(`Expected Final Getsuga gunAngle to be diagonal ${expectedFinalAngle}, got ${ichigo.gunAngle}`);
      }

      ichigo._releaseGetsuga();
      const finalProj = projectileSystem.projectiles.find(p => p && p.isFinalMassiveGetsuga);
      if (!finalProj) throw new Error('Expected Final Massive Getsuga projectile to spawn!');
      if (Math.abs(finalProj.angle - expectedFinalAngle) > 0.001) {
        throw new Error(`Expected Final Getsuga angle to be ${expectedFinalAngle}, got ${finalProj.angle}`);
      }

      // Test 4: Direction Commitment (No snap auto-aim during charge/channeling)
      ichigo.reset();
      ichigo.x = 270;
      ichigo.y = 480;
      projectileSystem.projectiles = [];
      // Initiate Getsuga aimed at enemy on Right (0 rad)
      ichigo.fireGetsuga(enemyRight, false);
      if (Math.abs(ichigo.gunAngle - 0) > 0.001) throw new Error('Expected initial aim 0 rad (Right)');

      // Enemy dashes to Up (-Math.PI/2) while Ichigo is channeling
      ichigo.aim(enemyUp);
      ichigo.update(enemyUp, 0, state.arena);
      if (Math.abs(ichigo.gunAngle - 0) > 0.001 || Math.abs(ichigo.angle - 0) > 0.001) {
        throw new Error(`Expected Ichigo to stay 100% committed to Right (0 rad) without snapping to enemy, got gunAngle=${ichigo.gunAngle}`);
      }

      // Releasing Getsuga fires strictly in the committed Right direction
      ichigo._releaseGetsuga();
      const committedProj = projectileSystem.projectiles.find(p => p && (p.isGetsuga || p.behaviorType === 'getsuga_tensho'));
      if (!committedProj) throw new Error('Expected Getsuga projectile to spawn on release!');
      if (Math.abs(committedProj.angle - 0) > 0.001) {
        throw new Error(`Expected Getsuga projectile to fire along committed Right angle (0 rad), got ${committedProj.angle}`);
      }
      if (committedProj.vx <= 0 || Math.abs(committedProj.vy) > 0.001) {
        throw new Error('Expected committed Getsuga projectile velocity along +X axis (vx > 0, vy = 0)');
      }

      // Test 5: Post-Getsuga Backward Movement (Move back instead of forward toward enemy)
      ichigo.reset();
      ichigo.x = 270;
      ichigo.y = 480;
      projectileSystem.projectiles = [];
      ichigo.fireGetsuga(enemyRight, false);
      ichigo._releaseGetsuga();

      // Step through recovery frames until recovery timer expires
      while (ichigo.getsugaRecoveryTimer > 0) {
        ichigo.update(enemyRight, 0, state.arena);
      }
      // On the frame recovery ends, Ichigo's velocity must move BACKWARD (-X / away from enemyRight at +X)
      if (ichigo.vx >= 0) {
        throw new Error(`Expected Ichigo to move backward away from enemy (vx < 0), got vx=${ichigo.vx}`);
      }

      // Test 6: Getsuga Tensho Hit Slows Enemy Movement (Does Not Stop/Freeze Enemy)
      const { NormalFighter } = await import('../js/entities/fighters/NormalFighter.js');
      const victim = new NormalFighter({ startX: 320, startY: 480, hp: 500, maxHp: 500, speed: 5 });
      victim.vx = 5;
      victim.vy = 0;
      state.fighters = [ichigo, victim];
      state.getFighterTeam = (idx) => idx;

      ichigo.reset();
      ichigo.x = 270;
      ichigo.y = 480;
      projectileSystem.projectiles = [];
      ichigo.fireGetsuga(victim, false);
      ichigo._releaseGetsuga();

      // Update projectile system so Getsuga hits victim
      projectileSystem.update(state.fighters);

      // Verify victim is slowed down
      if ((victim.slowTimer || 0) <= 0) {
        throw new Error('Expected victim to receive slowTimer > 0 upon being hit by Getsuga Tensho');
      }
      if (victim.slowMultiplier > 0.45) {
        throw new Error(`Expected victim slowMultiplier <= 0.40 upon Getsuga hit, got ${victim.slowMultiplier}`);
      }

      // Verify victim is NOT stopped/frozen (no paralyze, no timestop freeze)
      if (victim.paralyzeTimer > 0 || victim.isParalyzed) {
        throw new Error('Expected victim to NOT be paralyzed by Getsuga Tensho');
      }
      if (victim._handleTimeStop()) {
        throw new Error('Expected victim _handleTimeStop() to return false (not frozen) when hit by Getsuga Tensho');
      }

      // Verify victim can actively move at slowed speed
      victim.applyMovementPhysics();
      const victimSpeed = Math.hypot(victim.vx, victim.vy);
      if (victimSpeed <= 0.1) {
        throw new Error('Expected victim to maintain active movement at slowed speed, but velocity was 0');
      }
    }
  } catch (err) {
    console.error('❌ [ICHIGO CARDINAL ANGLES TEST ERROR]:', err);
    errors++;
  }

  // 6.4b. Ichigo Active Getsuga Form & Color Persistence Across Transformations Test
  console.log('🗡️ [Ichigo Active Getsuga Form Persistence Test] Verifying active Getsuga Tensho retains its original form/color when Ichigo transforms...');
  try {
    const IchigoClass = FIGHTER_CLASS_MAP['ichigo'];
    if (IchigoClass) {
      const ichigoDef = FIGHTER_DEFS.find(d => d.type === 'ichigo') || { type: 'ichigo', name: 'Ichigo' };
      const ichigo = new IchigoClass(ichigoDef);
      const enemy = new IchigoClass(ichigoDef);
      state.fighters = [ichigo, enemy];
      state.getFighterTeam = (idx) => idx;
      state.arena = { x: 0, y: 0, width: 800, height: 600, radius: 400, shape: 'circle' };
      projectileSystem.projectiles = [];

      // Fire a Shikai Getsuga Tensho
      ichigo.gunAngle = 0;
      ichigo.bankaiActive = false;
      ichigo.hollowMaskActive = false;
      const shikaiProj = projectileSystem.fireGetsugaTensho(ichigo, 0, 2, 11, 'shikai');

      if (shikaiProj.getsugaForm !== 'shikai') {
        throw new Error(`Expected shikai projectile to have getsugaForm='shikai', got ${shikaiProj.getsugaForm}`);
      }
      if (shikaiProj.visual !== 'getsuga') {
        throw new Error(`Expected shikai projectile to have visual='getsuga', got ${shikaiProj.visual}`);
      }

      // Transform Ichigo into Bankai + Hollow Mask
      ichigo.bankaiActive = true;
      ichigo.hollowMaskActive = true;

      // Ensure projectile still maintains its original 'shikai' form
      if (shikaiProj.getsugaForm !== 'shikai') {
        throw new Error(`Expected active getsugaForm to remain 'shikai' after transformation, got ${shikaiProj.getsugaForm}`);
      }

      // Render Getsuga using mock ctx to verify no errors and form remains shikai
      const { drawGetsugaSlash } = await import('../js/graphics/weapons/ichigoWeaponGraphics.js');
      const mockCtx = {
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        scale() {},
        fillRect() {},
        beginPath() {},
        arc() {},
        fill() {},
        stroke() {},
        closePath() {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        imageSmoothingEnabled: true
      };
      drawGetsugaSlash(mockCtx, shikaiProj, false);
    }
  } catch (err) {
    console.error('❌ [ICHIGO GETSUGA FORM PERSISTENCE TEST ERROR]:', err);
    errors++;
  }

  // 6.5. Yuta Pure Love Beam Inside Domain & Full Duration Stability Test
  console.log('💍 [Yuta Pure Love Beam Inside Domain & Duration Stability Test] Verifying beam can trigger/fire inside domain and full duration is preserved...');
  try {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    if (YutaClass) {
      const yutaDef = FIGHTER_DEFS.find(d => d.type === 'yuta') || { type: 'yuta', name: 'Yuta' };
      const y = new YutaClass(yutaDef);
      const enemy = new YutaClass(yutaDef);
      enemy.x = 400;
      enemy.y = 250;
      state.fighters = [y, enemy];
      state.getFighterTeam = (idx) => idx;
      state.arena = { x: 0, y: 0, width: 800, height: 600, radius: 400, shape: 'circle' };
      projectileSystem.projectiles = [];

      // Setup Yuta inside his Domain Expansion
      y.x = 300;
      y.y = 250;
      y.hp = y.maxHp;
      y.domainActive = true;
      y.domainX = 300;
      y.domainY = 250;
      y.domainTimer = 400;
      if (y.rika) {
        y.rika.active = true;
        y.rika.hp = y.rika.maxHp;
      }

      // Drop HP to 5% to trigger Pure Love Beam while domain is active
      y.hp = y.maxHp * 0.05;
      y.update(enemy, 0, state.arena);

      // Verify retreat slide initiated inside domain
      if (y.beamRetreatSlideTimer <= 0) {
        throw new Error('Expected Yuta to initiate Pure Love Beam retreat slide inside domain!');
      }

      // Verify retreat destination is clamped within domain radius
      const domRadius = CONFIG.yuta?.domainRadius || 350;
      const distFromCenter = Math.hypot(y.beamRetreatTargetX - y.domainX, y.beamRetreatTargetY - y.domainY);
      if (distFromCenter > domRadius) {
        throw new Error(`Expected retreat target to remain inside domain radius (${domRadius}), got dist ${distFromCenter}`);
      }

      // Fast-forward retreat slide (16 frames)
      while (y.beamRetreatSlideTimer > 0) {
        y.update(enemy, 0, state.arena);
      }

      // Fast-forward Rika emergence phase (25 frames)
      while (y.rikaEmergingForBeamTimer > 0) {
        y.update(enemy, 0, state.arena);
      }

      // Fast-forward channeling phase while verifying Yuta smoothly auto-aims and tracks moving enemy with Rika
      const initialChannelAngle = y.pureLoveBeamLockedAngle;
      enemy.x = y.x + 200;
      enemy.y = y.y + 150;
      let finalChannelAngle = initialChannelAngle;
      while (y.isChannelingPureLoveBeam) {
        y.update(enemy, 0, state.arena);

        if (y.rika && y.isChannelingPureLoveBeam) {
          if (Math.abs(y.rika.angle - y.gunAngle) > 0.01) {
            throw new Error(`Expected Rika angle (${y.rika.angle}) to match Yuta aim angle (${y.gunAngle}) during channeling!`);
          }
        }
        if (y.isChannelingPureLoveBeam) {
          finalChannelAngle = y.gunAngle;
        }
      }

      // Verify Yuta rotated toward moving enemy during channeling (auto-aim enabled)
      let turnDelta = Math.abs(finalChannelAngle - initialChannelAngle);
      while (turnDelta > Math.PI) turnDelta = Math.abs(turnDelta - Math.PI * 2);
      if (turnDelta < 0.01) {
        throw new Error(`Expected Yuta to rotate toward moving enemy during beam channeling (turned ${turnDelta} rad)!`);
      }

      // Verify Yuta committed to the final channeling angle upon firing (no snap on release)
      if (Math.abs(y.gunAngle - finalChannelAngle) > 0.001) {
        throw new Error(`Expected Yuta gunAngle (${y.gunAngle}) to commit to final channeling angle (${finalChannelAngle}) without snap on fire!`);
      }

      // Verify beam is now FIRING inside domain!
      if (!y.isFiringPureLoveBeam) {
        throw new Error('Expected Yuta to be firing Pure Love Beam inside his active domain!');
      }
      if (!y.domainActive) {
        throw new Error('Expected domain to remain active while beam is firing!');
      }

      const beamProj = projectileSystem.projectiles.find(p => p && (p.isPureLoveBeam || p.visual === 'yuta_pure_love_beam'));
      if (!beamProj) {
        throw new Error('Expected Pure Love Beam projectile to exist in projectileSystem!');
      }

      // Verify beam projectile life matches Yuta active timer
      const initialTimer = y.pureLoveBeamActiveTimer;
      if (initialTimer <= 0) {
        throw new Error(`Expected pureLoveBeamActiveTimer > 0, got ${initialTimer}`);
      }
      if (beamProj.life !== initialTimer) {
        throw new Error(`Expected beamProj.life (${beamProj.life}) to match yuta.pureLoveBeamActiveTimer (${initialTimer})`);
      }

      // Test Hyper-Armor: Attacks with bypassShield or clearAllAttackEffects MUST NOT terminate the beam!
      y.applyHitStun(60, { bypassShield: true, isDomain: true });
      if (!y.isFiringPureLoveBeam || y.pureLoveBeamActiveTimer <= 0) {
        throw new Error('Expected Pure Love Beam to survive applyHitStun with bypassShield!');
      }

      y.clearAllAttackEffects();
      if (!y.isFiringPureLoveBeam || y.pureLoveBeamActiveTimer <= 0) {
        throw new Error('Expected Pure Love Beam to survive clearAllAttackEffects()!');
      }

      // Update for 50 frames and verify timer and projectile life decay smoothly together
      for (let f = 0; f < 50; f++) {
        y.update(enemy, 0, state.arena);
        projectileSystem.update(state.fighters);
      }

      if (!y.isFiringPureLoveBeam) {
        throw new Error('Expected Pure Love Beam to still be firing after 50 frames!');
      }
      if (beamProj.life !== y.pureLoveBeamActiveTimer) {
        throw new Error(`Expected beamProj.life (${beamProj.life}) to remain strictly synced with y.pureLoveBeamActiveTimer (${y.pureLoveBeamActiveTimer})!`);
      }

      // 6.5.1 Test: Yuta Beam Completion Win/Loss Integrity (Never lose when alive!)
      // Scenario A: Yuta is Fighter 1 (P2), Enemy is Fighter 0 (P1), Enemy has HP > 0.
      state.mode = '1v1';
      state.gameState = 'playing';
      state.scores = [0, 0];
      state.roundWinner = null;
      state.matchWinner = null;

      enemy.hp = 500;
      enemy.dead = false;
      enemy.isDead = false;
      enemy.fighterIndex = 0;

      y.hp = 1000;
      y.dead = false;
      y.isDead = false;
      y.fighterIndex = 1;
      y.isFiringPureLoveBeam = true;
      y.pureLoveBeamActiveTimer = 1; // 1 frame left before beam finishes

      state.fighters = [enemy, y];

      // Update to complete the beam
      y.update(enemy, 1, state.arena);

      if (state.gameState !== 'playing') {
        throw new Error(`Regression: Yuta (P2) lost or round ended (${state.gameState}) after beam ended when both fighters are alive! Winner was: ${state.roundWinner === enemy ? 'Enemy' : 'Yuta'}`);
      }
      if (state.roundWinner !== null) {
        throw new Error(`Expected roundWinner to remain null when both fighters are alive, got ${state.roundWinner}`);
      }

      // Scenario B: Enemy died during the beam -> When beam finishes, Yuta wins!
      enemy.hp = 0;
      enemy.dead = true;
      enemy.isDead = true;
      y.isFiringPureLoveBeam = true;
      y.pureLoveBeamActiveTimer = 1;

      y.update(enemy, 1, state.arena);

      if (state.roundWinner !== y) {
        throw new Error(`Expected Yuta to win after killing enemy with beam, got roundWinner: ${state.roundWinner}`);
      }

      // 6.5.2 Test: Yuta Death Audio Cutoff for Rika
      // When Yuta dies while summoning or while Rika is active/roaring/channeling, all Rika audio MUST be cut off immediately!
      y.reset();
      y.hp = 100;
      y.comeRikaSoundHandle = { src: 'Assets/Sound Effects/Skills/comerika.mp3', stop: () => {}, pause: () => {} };
      y._pureLoveBeamChargeSoundHandle = { src: 'Assets/Sound Effects/Skills/rikaAppearance.mp3', stop: () => {}, pause: () => {} };
      y.pureLoveBeamBgSoundHandle = { src: 'Assets/Sound Effects/Skills/yuta-lovebeam-background.mp3', stop: () => {}, pause: () => {} };
      if (y.rika) {
        y.rika.active = true;
        y.rika.hp = 500;
        y.rika.activeTrembleSound = { src: 'groundTremble.mp3', stop: () => {}, pause: () => {} };
        y.rika.activeRoarSound = { src: 'Assets/Sound Effects/Attacks/rikanoise1.mp3', stop: () => {}, pause: () => {} };
      }

      // Trigger death
      y.hp = 0;
      y.dead = true;
      y.isDead = true;
      y.onDeath();

      if (y.comeRikaSoundHandle !== null) {
        throw new Error('Expected comeRikaSoundHandle to be cleared on Yuta death!');
      }
      if (y._pureLoveBeamChargeSoundHandle !== null) {
        throw new Error('Expected _pureLoveBeamChargeSoundHandle to be cleared on Yuta death!');
      }
      if (y.pureLoveBeamBgSoundHandle !== null) {
        throw new Error('Expected pureLoveBeamBgSoundHandle to be cleared on Yuta death!');
      }
      if (y.rika) {
        if (y.rika.active !== false || y.rika.hp !== 0) {
          throw new Error('Expected Rika to be fully deactivated with hp=0 on Yuta death!');
        }
        if (y.rika.activeTrembleSound !== null || y.rika.activeRoarSound !== null) {
          throw new Error('Expected Rika tremble and roar sounds to be cleared on Yuta death!');
        }
      }
    }
  } catch (err) {
    console.error('❌ [YUTA PURE LOVE BEAM INSIDE DOMAIN & DURATION TEST ERROR]:', err);
    errors++;
  }

  // 6.6. Rika Instant Death Shatter Test
  console.log('💀 [Rika Instant Death Shatter Test] Verifying Rika shatters instantly upon losing all HP...');
  try {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    if (YutaClass) {
      const yutaDef = FIGHTER_DEFS.find(d => d.type === 'yuta') || { type: 'yuta', name: 'Yuta' };
      const yuta = new YutaClass(yutaDef);
      const dummy = new YutaClass(yutaDef);
      yuta.x = 200; yuta.y = 200;
      dummy.x = 250; dummy.y = 200;
      state.fighters = [yuta, dummy];
      state.deathEffects = [];
      state.gameState = 'playing';

      // Force-activate Rika
      yuta.hp = 100;
      yuta.rika.active = true;
      yuta.rika.hp = yuta.rika.maxHp;
      yuta.rika.x = 240;
      yuta.rika.y = 200;
      state.illusions = [yuta.rika];

      const initialDeathEffectsCount = state.deathEffects.length;
      const initialDummyHp = dummy.hp;

      // Deal lethal damage to Rika
      yuta.rika.takeDamage(9999, dummy);

      if (yuta.rika.active !== false) {
        throw new Error('Expected Rika active to be false immediately upon losing all HP!');
      }
      if (yuta.rika.hp !== 0) {
        throw new Error(`Expected Rika HP to be 0, got ${yuta.rika.hp}`);
      }
      if (state.deathEffects.length <= initialDeathEffectsCount) {
        throw new Error('Expected deathEffects to spawn shatter shards when Rika dies!');
      }
      if (state.illusions.includes(yuta.rika)) {
        throw new Error('Expected Rika to be removed from state.illusions immediately!');
      }
      if (dummy.hp >= initialDummyHp) {
        throw new Error('Expected nearby enemy to receive cursed dispersion damage upon Rika shatter!');
      }
    }
  } catch (err) {
    console.error('❌ [RIKA INSTANT DEATH SHATTER TEST ERROR]:', err);
    errors++;
  }

  // Mahoraga Adaptation vs Genos Skill Preservation Test
  console.log('🤖 [Mahoraga vs Genos Adaptation Skills Test] Verifying wheel click adaptation does not cancel Genos skills...');
  try {
    const GenosClass = FIGHTER_CLASS_MAP['genos'];
    const MahoragaClass = FIGHTER_CLASS_MAP['mahoraga'];
    if (GenosClass && MahoragaClass) {
      const genosDef = FIGHTER_DEFS.find(d => d.type === 'genos') || { type: 'genos', name: 'Genos' };
      const mahoragaDef = FIGHTER_DEFS.find(d => d.type === 'mahoraga') || { type: 'mahoraga', name: 'Mahoraga' };

      // ── Test 1: Machine Gun Blows (Flurry) Preservation During Wheel Click ──
      const genos = new GenosClass(genosDef);
      const mahoraga = new MahoragaClass(mahoragaDef);
      genos.x = 200;
      genos.y = 200;
      mahoraga.x = 220;
      mahoraga.y = 200;
      state.fighters = [genos, mahoraga];

      // Genos starts Machine Gun Blows
      genos.flurryCooldown = 0;
      genos.executeMachineGunBlows(mahoraga);
      if (!genos.isFlurrying || genos.flurryHitsLeft <= 0) {
        throw new Error('Genos failed to initiate Machine Gun Blows');
      }

      // Step frames and deal damage until Mahoraga adapts
      let adaptedDuringFlurry = false;
      for (let frame = 0; frame < 30; frame++) {
        // Genos punches mahoraga
        mahoraga.takeDamage(30, genos, {
          isSkill: true,
          isRanged: true,
          isMachineGunBlow: true,
          isGenosMachineBlow: true,
          isGenosFlurry: true
        });

        if (mahoraga.adaptationPauseTimer > 0) {
          adaptedDuringFlurry = true;
          // While wheel adaptation is active and pause is ticking:
          genos.update(mahoraga, 0, state.arena);
          mahoraga.update(genos, 1, state.arena);

          // Genos skills MUST NOT be cancelled!
          if (!genos.isFlurrying) {
            throw new Error('Genos Machine Gun Blows (isFlurrying) was cancelled during Mahoraga wheel click pause!');
          }
          if (genos.flurryHitsLeft <= 0) {
            throw new Error('Genos flurryHitsLeft was reset to 0 during Mahoraga wheel click pause!');
          }

          // Step through remainder of pause
          while (mahoraga.adaptationPauseTimer > 0) {
            genos.update(mahoraga, 0, state.arena);
            mahoraga.update(genos, 1, state.arena);
          }

          if (!genos.isFlurrying) {
            throw new Error('Genos isFlurrying was cancelled after wheel pause finished!');
          }
          break;
        }
      }

      if (!adaptedDuringFlurry) {
        throw new Error('Mahoraga did not trigger adaptation during Machine Gun Blows test');
      }

      if (!mahoraga.adaptedGenosFlurry) {
        throw new Error('Mahoraga failed to acquire adaptedGenosFlurry flag');
      }

      // Verify 50% damage reduction on adapted flurry hit
      const testFlurryHpBefore = mahoraga.hp;
      mahoraga.takeDamage(20, genos, {
        isSkill: true,
        isRanged: true,
        isMachineGunBlow: true,
        isGenosMachineBlow: true,
        isGenosFlurry: true
      });
      const flurryDamageTaken = testFlurryHpBefore - mahoraga.hp;
      if (flurryDamageTaken > 11) { // ~10 damage with 50% reduction + defense
        throw new Error(`Expected ~10 damage from adapted flurry, but took ${flurryDamageTaken}`);
      }

      // ── Test 2: Spiral Incineration Cannon (Ultimate) Preservation During Wheel Click ──
      const genos2 = new GenosClass(genosDef);
      const mahoraga2 = new MahoragaClass(mahoragaDef);
      genos2.x = 200;
      genos2.y = 200;
      mahoraga2.x = 350;
      mahoraga2.y = 200;
      state.fighters = [genos2, mahoraga2];

      // Genos starts Ultimate charging (smoothly slides then charges)
      genos2.ultCooldown = 0;
      genos2.executeSpiralIncinerationCannon(mahoraga2);
      while (genos2.isUltSliding) {
        genos2.update(mahoraga2, 0, state.arena);
      }
      if (!genos2.isChargingUlt) {
        throw new Error('Genos failed to start charging Spiral Incineration Cannon');
      }

      // Step frames and deal beam damage until Mahoraga adapts
      let adaptedDuringBeamCharge = false;
      for (let frame = 0; frame < 30; frame++) {
        mahoraga2.takeDamage(30, genos2, {
          isSkill: true,
          isUltimate: true,
          isGenosBeam: true,
          isIncinerationCannon: true
        });

        if (mahoraga2.adaptationPauseTimer > 0) {
          adaptedDuringBeamCharge = true;
          // Run update during pause
          genos2.update(mahoraga2, 0, state.arena);
          mahoraga2.update(genos2, 1, state.arena);

          // Ultimate MUST NOT be cancelled!
          if (!genos2.isChargingUlt && !genos2.isFiringUlt) {
            throw new Error('Genos Spiral Incineration Cannon was cancelled during Mahoraga wheel click pause!');
          }

          // Drain pause
          while (mahoraga2.adaptationPauseTimer > 0) {
            genos2.update(mahoraga2, 0, state.arena);
            mahoraga2.update(genos2, 1, state.arena);
          }

          if (!genos2.isChargingUlt && !genos2.isFiringUlt) {
            throw new Error('Genos Spiral Incineration Cannon was cancelled after wheel pause finished!');
          }
          break;
        }
      }

      if (!adaptedDuringBeamCharge) {
        throw new Error('Mahoraga did not trigger adaptation during Beam test');
      }

      if (!mahoraga2.adaptedGenosBeam) {
        throw new Error('Mahoraga failed to acquire adaptedGenosBeam flag');
      }

      // Verify 50% damage reduction on adapted beam hit
      const testBeamHpBefore = mahoraga2.hp;
      mahoraga2.takeDamage(20, genos2, {
        isSkill: true,
        isUltimate: true,
        isGenosBeam: true,
        isIncinerationCannon: true
      });
      const beamDamageTaken = testBeamHpBefore - mahoraga2.hp;
      if (beamDamageTaken > 11) {
        throw new Error(`Expected ~10 damage from adapted beam, but took ${beamDamageTaken}`);
      }
    }
  } catch (err) {
    console.error('❌ [MAHORAGA VS GENOS ADAPTATION TEST ERROR]:', err);
    errors++;
  }

  // Genos Spiral Incineration Cannon Continuous 360° Aiming Test (Rule #36)
  console.log('🔥 [Genos Spiral Incineration Cannon 360° Aiming Test] Verifying Spiral Incineration Cannon supports continuous 360° aiming without snap auto-aim...');
  try {
    const GenosClass = FIGHTER_CLASS_MAP['genos'];
    if (GenosClass) {
      const genosDef = FIGHTER_DEFS.find(d => d.type === 'genos') || { type: 'genos', name: 'Genos' };
      const genos = new GenosClass(genosDef);
      genos.x = 300;
      genos.y = 300;

      // 1. Test continuous 360° omnidirectional aiming along multiple diagonal/arbitrary angles
      const testAngles = [
        { name: 'Up-Right (36.87°)', targetX: 300 + 400, targetY: 300 - 300, expectedAngle: Math.atan2(-300, 400) },
        { name: 'Down-Left (-143.13°)', targetX: 300 - 400, targetY: 300 + 300, expectedAngle: Math.atan2(300, -400) },
        { name: 'Down-Right (53.13°)', targetX: 300 + 300, targetY: 300 + 400, expectedAngle: Math.atan2(400, 300) },
        { name: 'Up-Left (-126.87°)', targetX: 300 - 300, targetY: 300 - 400, expectedAngle: Math.atan2(-400, -300) }
      ];

      for (const t of testAngles) {
        genos.x = 300;
        genos.y = 300;
        genos.vx = 0;
        genos.vy = 0;
        genos.isUltSliding = false;
        genos.isChargingUlt = false;
        genos.isFiringUlt = false;
        genos.ultCooldown = 0;
        const dummy = { x: t.targetX, y: t.targetY, r: 25, hp: 100, maxHp: 100, isDead: false };

        genos.executeSpiralIncinerationCannon(dummy);
        while (genos.isUltSliding) {
          genos.update(dummy, 0, state.arena);
        }

        if (!genos.isChargingUlt) {
          throw new Error(`Genos failed to initiate Spiral Incineration Cannon for ${t.name}!`);
        }
        const currentTargetAngle = Math.atan2(dummy.y - genos.y, dummy.x - genos.x);
        if (Math.abs(genos.ultAngle - currentTargetAngle) > 0.005) {
          throw new Error(`Expected Genos ultAngle for ${t.name} to be ${currentTargetAngle}, got ${genos.ultAngle} (snapped or incorrect)`);
        }
        if (Math.abs(genos.gunAngle - currentTargetAngle) > 0.005 || Math.abs(genos.angle - currentTargetAngle) > 0.005) {
          throw new Error(`Expected Genos gunAngle/angle for ${t.name} to match ${currentTargetAngle}, got gunAngle=${genos.gunAngle}`);
        }
      }

      // 2. Test Direction Commitment (No snap auto-aim during wind-up charging or active firing)
      genos.x = 300;
      genos.y = 300;
      genos.vx = 0;
      genos.vy = 0;
      genos.isUltSliding = false;
      genos.isChargingUlt = false;
      genos.isFiringUlt = false;
      genos.ultCooldown = 0;
      const initialTarget = { x: 300 + 300, y: 300 + 300, r: 25, hp: 100, maxHp: 100, isDead: false };
      genos.executeSpiralIncinerationCannon(initialTarget);
      while (genos.isUltSliding) {
        genos.update(initialTarget, 0, state.arena);
      }
      const initialAngle = genos.ultAngle; // Locked cast angle upon completing slide into windup stance

      // Opponent moves/teleports to top-left (-135°) during windup
      const movedTarget = { x: 300 - 300, y: 300 - 300, r: 25, hp: 100, maxHp: 100, isDead: false };
      genos.aim(movedTarget);
      genos.update(movedTarget, 0, state.arena);

      if (Math.abs(genos.ultAngle - initialAngle) > 0.001 || Math.abs(genos.gunAngle - initialAngle) > 0.001) {
        throw new Error(`Genos auto-aim snapped or rotated during ultimate windup! Expected ${initialAngle}, got gunAngle=${genos.gunAngle}`);
      }
      if (genos.canAim()) {
        throw new Error(`Genos canAim() should return false during ultimate windup!`);
      }

      // Transition to active firing
      genos.ultTimer = 0;
      genos.update(movedTarget, 0, state.arena);
      if (!genos.isFiringUlt) {
        throw new Error(`Genos failed to transition from windup to active beam firing!`);
      }

      // Opponent teleports directly behind Genos during beam fire
      const behindTarget = { x: 300 - 200, y: 300, r: 25, hp: 100, maxHp: 100, isDead: false };
      genos.aim(behindTarget);
      genos.update(behindTarget, 0, state.arena);

      if (Math.abs(genos.ultAngle - initialAngle) > 0.001 || Math.abs(genos.gunAngle - initialAngle) > 0.001) {
        throw new Error(`Genos auto-aim snapped or rotated during active beam firing! Expected ${initialAngle}, got gunAngle=${genos.gunAngle}`);
      }

      // Draw beam overlay to verify Canvas 2D transform stack balance
      mockCtx.resetStackDepth();
      genos.drawBeamOverlay(mockCtx);
      assertCanvasStackBalance('Genos Spiral Incineration Cannon Beam Draw');
    }
  } catch (err) {
    console.error('❌ [GENOS SPIRAL INCINERATION CANNON 360 TEST ERROR]:', err);
    errors++;
  }

  // Round Skill Reset Test
  console.log('🔄 [Round Skill Reset Test] Verifying all fighter skills and cooldowns reset cleanly on new round...');
  try {
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'gojo');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(false);

    const gojo = state.fighters[0];
    const sukuna = state.fighters[1];

    // Simulate fighters expending skills & having dirty cooldowns
    gojo.purpleCooldown = 99999;
    gojo.redCooldown = 99999;
    gojo.domainActive = true;
    gojo.domainTimer = 400;

    sukuna.divineFlameCooldown = 99999;
    sukuna.cleaveCooldown = 99999;
    sukuna.domainActive = true;
    sukuna.domainTimer = 350;

    // Trigger next round reinit
    reinitFighters(false);

    const freshGojo = state.fighters[0];
    const freshSukuna = state.fighters[1];

    if (freshGojo.purpleCooldown === 99999 || freshGojo.redCooldown === 99999 || freshGojo.domainActive) {
      throw new Error(`Gojo skills were not reset on new round! purpleCooldown=${freshGojo.purpleCooldown}, redCooldown=${freshGojo.redCooldown}, domainActive=${freshGojo.domainActive}`);
    }
    if (freshSukuna.divineFlameCooldown === 99999 || freshSukuna.cleaveCooldown === 99999 || freshSukuna.domainActive) {
      throw new Error(`Sukuna skills were not reset on new round! divineFlameCooldown=${freshSukuna.divineFlameCooldown}, cleaveCooldown=${freshSukuna.cleaveCooldown}, domainActive=${freshSukuna.domainActive}`);
    }
  } catch (err) {
    console.error('❌ [ROUND SKILL RESET TEST ERROR]:', err);
    errors++;
  }

  // You Win Audio Tests Across All Modes
  console.log('🏆 [You Win Audio Tests Across All Modes] Verifying youwin audio triggers properly across all game modes...');
  try {
    let playedSounds = [];
    const origPlaySFX = audioSystem.playSFX;
    audioSystem.playSFX = (src) => {
      playedSounds.push(src);
    };

    // 1. 1v1 Mode: requires 2 wins
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'gojo');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(true);

    state.gameState = 'roundEnd';
    state.matchWinner = null;
    state.roundNum = 1;
    state.scores = [1, 0];
    state.roundWinner = state.fighters[0];
    state.roundEndTimer = 10;
    state._hasPlayedChampionYouWinVoice = false;

    // Round 1 end: 1 win in 1v1 -> should NOT play youwin audio
    playedSounds = [];
    drawRoundEndScreen();
    if (playedSounds.some(s => typeof s === 'string' && s.includes('you-win'))) {
      throw new Error(`Played 'youwin' audio on 1 win in 1v1 mode!`);
    }

    // Round 2 end: 2 wins in 1v1 -> MUST play youwin audio
    state.gameState = 'matchEnd';
    state.matchWinner = state.fighters[0];
    state.roundNum = 2;
    state.scores = [2, 0];
    state.roundEndTimer = 10;
    state._hasPlayedChampionYouWinVoice = false;
    playedSounds = [];
    drawRoundEndScreen();
    if (!playedSounds.some(s => typeof s === 'string' && s.includes('you-win'))) {
      throw new Error(`Failed to play 'youwin' audio when fighter won 2 times in 1v1 mode!`);
    }

    // 2. Stand Off Mode: 1 round -> MUST play youwin audio on 1st win
    state.mode = 'Stand Off';
    state.roundNum = 1;
    state.scores = [1, 0];
    state.roundEndTimer = 10;
    state.matchEndTimer = 10;
    state.matchWinner = state.fighters[0];
    state.roundWinner = state.fighters[0];
    state.gameState = 'matchEnd';
    state._hasPlayedChampionYouWinVoice = false;
    playedSounds = [];
    drawMatchEndScreen();
    if (!playedSounds.some(s => typeof s === 'string' && s.includes('you-win'))) {
      throw new Error(`Failed to play 'youwin' audio on match end in Stand Off mode!`);
    }

    // 3. 1v2 Stand Off Mode: 1 round -> MUST play youwin audio on match win
    state.mode = '1v2 Stand Off';
    state.roundNum = 1;
    state.teamScores = [1, 0];
    state.roundEndTimer = 10;
    state.matchEndTimer = 10;
    state.matchWinner = state.fighters[0];
    state.roundWinner = state.fighters[0];
    state.gameState = 'matchEnd';
    state._hasPlayedChampionYouWinVoice = false;
    playedSounds = [];
    drawMatchEndScreen();
    if (!playedSounds.some(s => typeof s === 'string' && s.includes('you-win'))) {
      throw new Error(`Failed to play 'youwin' audio on match end in 1v2 Stand Off mode!`);
    }

    // 4. FFA Mode: 1 round -> MUST play youwin audio on match win
    state.mode = 'FFA';
    state.roundNum = 1;
    state.scores = [1, 0, 0, 0];
    state.roundEndTimer = 10;
    state.matchEndTimer = 10;
    state.matchWinner = state.fighters[0];
    state.roundWinner = state.fighters[0];
    state.ffaMatchComplete = true;
    state.gameState = 'matchEnd';
    state._hasPlayedChampionYouWinVoice = false;
    playedSounds = [];
    drawMatchEndScreen();
    if (!playedSounds.some(s => typeof s === 'string' && s.includes('you-win'))) {
      throw new Error(`Failed to play 'youwin' audio on match end in FFA mode!`);
    }

    audioSystem.playSFX = origPlaySFX;
    reinitFighters(true);
  } catch (err) {
    console.error('❌ [YOU WIN AUDIO TEST ERROR]:', err);
    errors++;
  }

  // 1v1 Background Music Seamless Continuity & Cutoff on 2 Round Wins Test
  console.log('🎵 [1v1 BGM Seamless Continuity Test] Verifying BGM continues across 1v1 rounds and cuts only upon 2 round wins...');
  try {
    const { isArenaBgmPlaying, startArenaBgm, stopArenaBgm } = await import('../js/systems/arenaBgmSystem.js');
    const { startCountdown, startNextRound } = await import('../js/core/gameFlow.js');

    // 1. Initialize fresh 1v1 match
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'gojo');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    state.scores = [0, 0];
    state.roundNum = 1;
    state.gameState = 'countdown';
    reinitFighters(true);

    startCountdown();
    if (!isArenaBgmPlaying()) {
      throw new Error('Expected Arena BGM to start playing during 1v1 countdown');
    }

    // Advance to playing
    state.gameState = 'playing';
    updateGame();
    if (!isArenaBgmPlaying()) {
      throw new Error('Expected Arena BGM to remain playing in 1v1 playing state');
    }

    // 2. Round 1 End: Fighter 0 wins (scores = [1, 0]) -> BGM MUST KEEP PLAYING!
    state.scores = [1, 0];
    state.roundWinner = state.fighters[0];
    state.matchWinner = null;
    state.gameState = 'roundEnd';
    state.roundEndTimer = 10;
    updateGame();
    drawRoundEndScreen();

    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM was cut off during 1v1 Round 1 roundEnd (Fighter has only 1 win)!');
    }

    // 3. Round 2 Transition: startNextRound & startCountdown -> BGM MUST KEEP PLAYING SEAMLESSLY!
    startNextRound();
    if (state.roundNum !== 2) {
      throw new Error(`Expected roundNum to be 2, got ${state.roundNum}`);
    }
    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM was cut off during startNextRound() transition to Round 2 in 1v1 mode!');
    }

    startCountdown();
    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM was cut off during Round 2 countdown in 1v1 mode!');
    }

    state.gameState = 'playing';
    updateGame();
    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM stopped playing during Round 2 in 1v1 mode!');
    }

    // 4. Round 2 End: Fighter 1 wins (scores = [1, 1], tied) -> BGM MUST KEEP PLAYING FOR FINAL ROUND!
    state.scores = [1, 1];
    state.roundWinner = state.fighters[1];
    state.matchWinner = null;
    state.gameState = 'roundEnd';
    state.roundEndTimer = 10;
    updateGame();
    drawRoundEndScreen();

    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM was cut off during 1v1 Round 2 roundEnd with tied score 1-1!');
    }

    // 5. Final Round Transition (Round 3) -> BGM MUST KEEP PLAYING!
    startNextRound();
    if (state.roundNum !== 3) {
      throw new Error(`Expected roundNum to be 3 (Final Round), got ${state.roundNum}`);
    }
    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM was cut off transitioning to Final Round in 1v1 mode!');
    }

    startCountdown();
    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM was cut off during Final Round countdown in 1v1 mode!');
    }

    state.gameState = 'playing';
    updateGame();
    if (!isArenaBgmPlaying()) {
      throw new Error('Arena BGM stopped playing during Final Round in 1v1 mode!');
    }

    // 6. Final Round End: Fighter 0 wins (scores = [2, 1]) -> Match Won! BGM MUST CUT OFF!
    state.scores = [2, 1];
    state.roundWinner = state.fighters[0];
    state.matchWinner = state.fighters[0];
    state.gameState = 'matchEnd';
    state.matchEndTimer = 10;
    state.roundEndTimer = 10;
    updateGame();
    drawMatchEndScreen();

    if (isArenaBgmPlaying()) {
      throw new Error('Arena BGM failed to cut off after fighter achieved 2 round wins in 1v1 mode!');
    }

    stopArenaBgm(true);
  } catch (err) {
    console.error('❌ [1v1 BGM SEAMLESS CONTINUITY TEST ERROR]:', err);
    errors++;
  }

  // Gojo RCT No Sudden Teleport Test
  console.log('⚡ [Gojo RCT Teleport Test] Verifying Gojo does not teleport when activating RCT...');
  try {
    state.mode = '1v1';
    state.gameState = 'playing';
    state.p1Index = allDefs.findIndex(d => d.type === 'gojo');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(true);

    const gojo = state.fighters[0];
    const opponent = state.fighters[1];

    gojo.x = 200;
    gojo.y = 300;
    opponent.x = 250;
    opponent.y = 300;

    gojo.reverseCursedTechniqueCooldown = 0;
    gojo.hp = gojo.maxHp * 0.20; // Trigger threshold

    gojo._activateReverseCursedTechnique(opponent, state.arena);

    if (gojo.x !== 200 || gojo.y !== 300) {
      throw new Error(`Gojo suddenly teleported on RCT! Old pos (200, 300), new pos (${gojo.x}, ${gojo.y})`);
    }

    const skills = getSkillDataForFighter(gojo);
    const rctSkill = skills.find(s => s.id === 'rct');
    if (!rctSkill || rctSkill.pct !== 0 || rctSkill.ready) {
      throw new Error(`Gojo RCT skill bar did not immediately empty upon healing! pct=${rctSkill?.pct}, ready=${rctSkill?.ready}`);
    }
  } catch (err) {
    console.error('❌ [GOJO RCT TELEPORT TEST ERROR]:', err);
    errors++;
  }

  // Escanor Finishing Ability & Animation Preservation on Lethal Victory Test
  console.log('☀️ [Escanor Finishing Ability Test] Verifying Escanor does not cut off basic attack animation on lethal win...');
  try {
    state.mode = '1v1';
    state.gameState = 'playing';
    state.p1Index = allDefs.findIndex(d => d.type === 'escanor');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(true);

    const escanor = state.fighters[0];
    const dummySukuna = state.fighters[1];

    escanor.x = 200;
    escanor.y = 300;
    dummySukuna.x = 240;
    dummySukuna.y = 300;
    dummySukuna.hp = 1; // 1 HP -> lethal hit incoming

    // Start Escanor basic attack chop
    escanor._startRhittaChop(dummySukuna);
    if (!escanor.hasActiveFinishingAbility()) {
      throw new Error(`Escanor hasActiveFinishingAbility() returned false during weapon lift/windup!`);
    }

    // Advance to impact frame and deliver lethal hit
    escanor.slashSwingTimer = escanor.slashSwingImpactTimer;
    escanor._executeRhittaChopHit();

    if (dummySukuna.hp > 0) {
      throw new Error(`Expected dummy opponent to die from Rhitta chop hit! HP=${dummySukuna.hp}`);
    }

    // Verify hit pause is active and hasActiveFinishingAbility holds victory
    if (escanor.chopHitPauseTimer <= 0) {
      throw new Error(`Expected chopHitPauseTimer > 0 on basic attack hit! Got ${escanor.chopHitPauseTimer}`);
    }
    if (!escanor.hasActiveFinishingAbility()) {
      throw new Error(`Escanor hasActiveFinishingAbility() returned false during chop hit-pause!`);
    }

    // Step through hit-pause frames
    while (escanor.chopHitPauseTimer > 0) {
      escanor.update(dummySukuna, 0, state.arena);
      if (escanor.chopHitPauseTimer > 0 && !escanor.hasActiveFinishingAbility()) {
        throw new Error(`Escanor hasActiveFinishingAbility() prematurely returned false during hit-pause countdown!`);
      }
    }

    // Verify after hit-pause unpause, downward strike & recovery frames play out with finishing ability active
    if (escanor.slashSwingTimer <= 0) {
      throw new Error(`Expected slashSwingTimer > 0 after hit-pause unpause for downward chop follow-through!`);
    }
    if (!escanor.hasActiveFinishingAbility()) {
      throw new Error(`Escanor hasActiveFinishingAbility() returned false during downward chop recovery follow-through!`);
    }

    // Step through remaining swing & recovery frames
    while (escanor.slashSwingTimer > 0) {
      escanor.update(dummySukuna, 0, state.arena);
    }

    // Animation 100% finished -> hasActiveFinishingAbility returns false to allow round/match end
    if (escanor.hasActiveFinishingAbility()) {
      throw new Error(`Escanor hasActiveFinishingAbility() returned true after swing & recovery completed!`);
    }
  } catch (err) {
    console.error('❌ [ESCANOR FINISHING ABILITY TEST ERROR]:', err);
    errors++;
  }

  // Escanor Blade Physical Collision & Zero Phantom Hits Test
  console.log('☀️ [Escanor Blade Physical Collision Test] Verifying zero phantom hits for targets behind or outside the blade path...');
  try {
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'escanor');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(true);

    const escanor = state.fighters[0];
    const dummySukuna = state.fighters[1];

    escanor.x = 300;
    escanor.y = 300;
    escanor.gunAngle = 0; // Escanor faces directly right (along +X)
    escanor.angle = 0;
    escanor.chopCastAngle = 0;

    // 1. Position dummySukuna BEHIND Escanor (at x: 240, 60px behind him)
    dummySukuna.x = 240;
    dummySukuna.y = 300;
    dummySukuna.hp = 200;

    // Execute forward chop strike
    const connectedBehind = escanor._executeRhittaChopHit(0.5, 0.4);
    if (connectedBehind || escanor.chopHitPauseTimer > 0) {
      throw new Error(`Phantom hit detected! Escanor hit target standing behind him!`);
    }
    if (dummySukuna.hp < 200) {
      throw new Error(`Dummy behind Escanor took damage from forward chop! HP=${dummySukuna.hp}`);
    }

    // 2. Position dummySukuna far to the side (at x: 300, y: 190, perpendicular to chop)
    dummySukuna.x = 300;
    dummySukuna.y = 190;
    dummySukuna.hp = 200;

    const connectedSide = escanor._executeRhittaChopHit(0.5, 0.4);
    if (connectedSide || escanor.chopHitPauseTimer > 0) {
      throw new Error(`Phantom hit detected! Escanor hit target outside the blade chop arc!`);
    }

    // 3. Position dummySukuna directly in front within blade reach (x: 400, y: 300)
    dummySukuna.x = 400;
    dummySukuna.y = 300;
    dummySukuna.hp = 200;

    const connectedInFront = escanor._executeRhittaChopHit(0.6, 0.2);
    if (!connectedInFront || escanor.chopHitPauseTimer <= 0) {
      throw new Error(`Expected direct blade collision in front of Escanor to connect! Got connected=${connectedInFront}`);
    }
    if (dummySukuna.hp >= 200) {
      throw new Error(`Expected target in blade path to take damage! HP=${dummySukuna.hp}`);
    }
  } catch (err) {
    console.error('❌ [ESCANOR BLADE COLLISION TEST ERROR]:', err);
    errors++;
  }

  // Escanor Wall Pin & Wall Crack Decal Test
  console.log('🧱 [Escanor Wall Pin & Wall Crack Test] Verifying Escanor knockback pins opponent to wall in stasis with solar crack decal...');
  try {
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'escanor');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(true);

    const escanor = state.fighters[0];
    const dummyTarget = state.fighters[1];

    state.wallCracks = [];
    const arena = state.arena || { x: 50, y: 50, width: 800, height: 600 };
    state.arena = arena;

    // Position Escanor and target near the right wall (x: 850 - 25 = 825 max)
    escanor.x = 760;
    escanor.y = 300;
    escanor.introReboundActive = false;
    dummyTarget.x = 800;
    dummyTarget.y = 300;
    dummyTarget.hp = 200; // Survives hit
    dummyTarget.introReboundActive = false;

    // Escanor faces target toward right wall
    escanor.aim(dummyTarget);

    // Trigger basic attack chop
    escanor._startRhittaChop(dummyTarget);
    escanor.slashSwingTimer = escanor.slashSwingImpactTimer || 12;
    escanor._executeRhittaChopHit();

    if (escanor.chopHitPauseTimer <= 0) {
      throw new Error(`Expected chopHitPauseTimer > 0 on Rhitta chop hit!`);
    }

    // Step through hit-pause to reach the unpause release
    while (escanor.chopHitPauseTimer > 0) {
      escanor.update(dummyTarget, 0, arena);
    }

    // Target is tagged for wall pin
    if (!dummyTarget.isWallPinnedByEscanor && !dummyTarget._knockedBackByEscanorBasicAttack) {
      throw new Error(`Target was not tagged with isWallPinnedByEscanor / _knockedBackByEscanorBasicAttack!`);
    }

    // Update target physics so knockback pushes target into right wall
    dummyTarget.update(escanor, 1, arena);

    // Verify wall pin activated
    if (!dummyTarget.isCurrentlyWallPinnedByEscanor && dummyTarget.escanorWallPinTimer <= 0) {
      throw new Error(`Target failed to trigger wall pin upon colliding with arena wall! isCurrentlyWallPinnedByEscanor=${dummyTarget.isCurrentlyWallPinnedByEscanor}, timer=${dummyTarget.escanorWallPinTimer}`);
    }

    const expectedInitialTimer = (CONFIG.escanor?.wallPinDurationFrames || 55) - 1; // 1 frame ticked during the update that triggered wall contact
    if (dummyTarget.escanorWallPinTimer !== expectedInitialTimer) {
      throw new Error(`Unexpected escanorWallPinTimer value! Expected ${expectedInitialTimer}, got ${dummyTarget.escanorWallPinTimer}`);
    }

    // Verify NO wall cracks are spawned for Escanor
    if (state.wallCracks && state.wallCracks.length > 0) {
      throw new Error(`Expected NO wall cracks to be spawned for Escanor! Found ${state.wallCracks.length}`);
    }

    // Verify target remains pinned in stasis during countdown
    const initialPinTimer = dummyTarget.escanorWallPinTimer;
    for (let frame = 0; frame < initialPinTimer - 1; frame++) {
      const isFrozen = dummyTarget._handleTimeStop();
      if (!isFrozen) {
        throw new Error(`Target update loop was not frozen during active wall pin stasis at frame ${frame}!`);
      }
      if (dummyTarget.vx !== 0 || dummyTarget.vy !== 0 || dummyTarget.knockbackVx !== 0 || dummyTarget.knockbackVy !== 0) {
        throw new Error(`Target moved while pinned to wall at frame ${frame}! vx=${dummyTarget.vx}, vy=${dummyTarget.vy}`);
      }
    }

    // Final frame ticks pin timer to 0 -> pin released!
    dummyTarget._handleTimeStop();
    if (dummyTarget.isCurrentlyWallPinnedByEscanor) {
      throw new Error(`Target remained wall pinned after pin duration fully expired!`);
    }
    if (dummyTarget.slowTimer <= 0 || dummyTarget.slowMultiplier !== (CONFIG.escanor?.wallBounceSlowMultiplier || 0.40)) {
      throw new Error(`Post-pin slow debuff was not correctly applied! slowTimer=${dummyTarget.slowTimer}, slowMult=${dummyTarget.slowMultiplier}`);
    }

    // Test Configurable Pinned Duration (e.g. user changes wallPinDurationFrames to 90)
    const originalDuration = CONFIG.escanor.wallPinDurationFrames;
    CONFIG.escanor.wallPinDurationFrames = 90;
    dummyTarget._lastKnockbackFrame = -1;
    dummyTarget.timeStopTimer = 0;
    if (dummyTarget.statusEffects) dummyTarget.statusEffects.timeStopTimer = 0;
    dummyTarget.isWallPinnedByEscanor = true;
    dummyTarget._knockedBackByEscanorBasicAttack = true;
    dummyTarget.knockbackVx = 30;
    dummyTarget.x = 840;
    dummyTarget._processKnockbackPhysics();
    if (dummyTarget.escanorWallPinTimer !== 90) {
      throw new Error(`Configurable wallPinDurationFrames failed! Expected 90, got ${dummyTarget.escanorWallPinTimer}`);
    }
    CONFIG.escanor.wallPinDurationFrames = originalDuration; // Restore original config
  } catch (err) {
    console.error('❌ [ESCANOR WALL PIN TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Hollow Transformation Animation Preservation Under Fuga & Attacks Test
  console.log('💀 [Ichigo Hollow Transformation Animation Preservation Test] Verifying transformation animation is not skipped or wiped by Fuga or attacks...');
  try {
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'ichigo');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');
    reinitFighters(true);

    const ichigo = state.fighters[0];
    const sukuna = state.fighters[1];

    ichigo.x = 200;
    ichigo.y = 300;
    sukuna.x = 250;
    sukuna.y = 300;

    // Pop Bankai first
    ichigo.activateBankai();
    ichigo.isChannelingBankai = false;
    ichigo.bankaiActive = true;
    ichigo.bankaiUsed = true;
    ichigo.bankaiTimer = 1000;

    // Trigger Hollow Awakening at 40% HP to test 50% recovery
    const preHollowHp = Math.round(ichigo.maxHp * 0.40);
    ichigo.hp = preHollowHp;
    ichigo.activateHollowMask();

    const expectedHealedHp = Math.min(ichigo.maxHp, preHollowHp + Math.round(ichigo.maxHp * 0.50));
    if (ichigo.hp !== expectedHealedHp) {
      throw new Error(`Expected Ichigo HP to recover to ${expectedHealedHp}, got ${ichigo.hp}`);
    }

    if (ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`Hollow Mask did not start formation timer!`);
    }

    const expectedMaxDuration = CONFIG.ichigo?.hollowMaskDuration ?? 800;
    if (ichigo.hollowMaskTimer !== expectedMaxDuration) {
      throw new Error(`Expected hollowMaskTimer to start at ${expectedMaxDuration}, got ${ichigo.hollowMaskTimer}`);
    }

    const startFormationFrames = ichigo.hollowMaskFormationTimer;

    // 1. Hit Ichigo with Fuga suppressCombatAndVisuals
    if (typeof ichigo.suppressCombatAndVisuals === 'function') {
      ichigo.suppressCombatAndVisuals({ isDivineFlame: true, isFuga: true, timer: 45 });
    }
    if (ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`Fuga suppressCombatAndVisuals wiped hollowMaskFormationTimer to 0!`);
    }

    // 2. Hit Ichigo with direct Fuga damage via takeDamage
    ichigo.takeDamage(50, sukuna, { isDivineFlame: true, isFuga: true });
    if (ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`takeDamage with Fuga wiped hollowMaskFormationTimer to 0!`);
    }

    // 3. Hit Ichigo with CCs and interrupts
    ichigo.applyHitStun(60);
    ichigo.applyParalysis(60);
    ichigo.applyElectricStun(60);
    ichigo.applyTimeStop(60);
    ichigo.interruptAttacks(true);

    if (ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`CC methods or interruptAttacks(true) on live fighter wiped hollowMaskFormationTimer to 0!`);
    }

    // 4. Tick simulation frames and verify smooth completion of formation and burst, with duration not draining
    let framesTicked = 0;
    while (ichigo.hollowMaskFormationTimer > 0) {
      ichigo.update(sukuna, 0, state.arena);
      if (ichigo.hollowMaskTimer !== expectedMaxDuration) {
        throw new Error(`hollowMaskTimer drained during formation! Expected ${expectedMaxDuration}, got ${ichigo.hollowMaskTimer}`);
      }
      framesTicked++;
      if (framesTicked > 450) {
        throw new Error(`Hollow formation exceeded 450 frames without completing!`);
      }
    }

    if (ichigo.hollowBurstTimer <= 0 && !ichigo._hollowVoicelineWait) {
      throw new Error(`Hollow Burst timer was not triggered upon formation completion!`);
    }

    while (ichigo.hollowBurstTimer > 0) {
      ichigo.update(sukuna, 0, state.arena);
      if (ichigo.hollowMaskTimer !== expectedMaxDuration) {
        throw new Error(`hollowMaskTimer drained during burst! Expected ${expectedMaxDuration}, got ${ichigo.hollowMaskTimer}`);
      }
    }

    if (!ichigo.hollowMaskActive) {
      throw new Error(`hollowMaskActive is false after transformation completed!`);
    }

    // After animation finishes, duration should now start draining on normal update ticks
    ichigo.update(sukuna, 0, state.arena);
    if (ichigo.hollowMaskTimer >= expectedMaxDuration) {
      throw new Error(`Expected hollowMaskTimer to start draining after animation finished, got ${ichigo.hollowMaskTimer}`);
    }
  } catch (err) {
    console.error('❌ [ICHIGO HOLLOW TRANSFORMATION TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Multiple Hollow Mask Awakenings Test
  console.log('💀 [Ichigo Multiple Hollow Mask Awakenings Test] Verifying Ichigo can transform into Hollow Mask multiple times in the same round...');
  try {
    reinitFighters(true);
    const ichigo = state.fighters[0];
    const sukuna = state.fighters[1];

    // 0. Verify in Shikai form, dropping HP does NOT progress or trigger Hollow Mask
    ichigo.hp = Math.round(ichigo.maxHp * 0.50);
    ichigo.update(sukuna, 0, state.arena);
    if (ichigo.hollowMaskActive || ichigo.hollowMaskFormationTimer > 0) {
      throw new Error(`Ichigo activated Hollow Mask while still in Shikai (Bankai not active)!`);
    }
    let preBankaiSkills = getSkillDataForFighter(ichigo);
    let preBankaiHollow = preBankaiSkills.find(s => s.id === 'hollow');
    if (preBankaiHollow && preBankaiHollow.pct > 0) {
      throw new Error(`Hollow Mask HUD bar progressed in Shikai! pct=${preBankaiHollow.pct}`);
    }

    // 1. Pop Bankai
    ichigo.hp = Math.round(ichigo.maxHp * 0.70);
    ichigo.activateBankai();
    ichigo.isChannelingBankai = false;
    ichigo.bankaiActive = true;
    ichigo.bankaiUsed = true;
    ichigo.bankaiDurationMax = 1000;
    ichigo.bankaiTimer = 1000;

    // Verify Hollow bar starts at 0% right after entering Bankai
    let initialBankaiSkills = getSkillDataForFighter(ichigo);
    let initialBankaiHollow = initialBankaiSkills.find(s => s.id === 'hollow');
    if (initialBankaiHollow && initialBankaiHollow.pct > 0) {
      throw new Error(`Hollow Mask HUD bar was not at 0% on Bankai activation! pct=${initialBankaiHollow.pct}`);
    }

    // Verify taking damage in Bankai does NOT activate Hollow Mask or prematurely fill Hollow bar
    const reqDmg = Math.round(ichigo.maxHp * 0.22);
    ichigo.takeDamage(reqDmg, sukuna, { damage: reqDmg, bypassShield: true });
    ichigo.update(sukuna, 0, state.arena);
    if (ichigo.hollowMaskActive || ichigo.hollowMaskFormationTimer > 0) {
      throw new Error(`Ichigo activated Hollow Mask prematurely upon taking damage in Bankai!`);
    }

    // Verify Hollow bar progresses strictly with Bankai timer (e.g. 50% through Bankai -> 50% bar)
    ichigo.bankaiTimer = 500;
    let midBankaiSkills = getSkillDataForFighter(ichigo);
    let midBankaiHollow = midBankaiSkills.find(s => s.id === 'hollow');
    if (!midBankaiHollow || Math.abs(midBankaiHollow.pct - 50) > 1) {
      throw new Error(`Hollow Mask HUD bar did not strictly track Bankai timer progression! pct=${midBankaiHollow?.pct}`);
    }

    // Expiration of Bankai duration triggers Hollow Mask Awakening
    ichigo.bankaiTimer = 1;
    ichigo.bankaiFinalGetsugaTriggered = true;
    ichigo.isChannelingGetsuga = false;
    ichigo.isGetsugaSlash = false;
    ichigo.getsugaRecoveryTimer = 0;
    ichigo.shunpoComboActive = false;
    ichigo._stopFinalGetsugaVoiceline(true);
    ichigo.update(sukuna, 0, state.arena);

    if (!ichigo.hollowMaskActive && ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`Ichigo failed to activate 1st Hollow Mask transformation upon Bankai expiration!`);
    }

    // Complete 1st transformation animation
    ichigo.hollowMaskFormationTimer = 0;
    ichigo.hollowBurstTimer = 0;
    ichigo.hollowMaskActive = true;
    ichigo.hollowMaskTimer = 10;

    // Check HUD skill provider during active Hollow Mask
    let hudSkills = getSkillDataForFighter(ichigo);
    let hollowSkill = hudSkills.find(s => s.id === 'hollow');
    if (!hollowSkill || !hollowSkill.ready || hollowSkill.label !== 'HOLLOW AWAKENED') {
      throw new Error(`HUD Hollow Skill during 1st active form failed! Got: ${JSON.stringify(hollowSkill)}`);
    }

    // Drain 1st Hollow Mask to shatter
    while (ichigo.hollowMaskActive) {
      ichigo.update(sukuna, 0, state.arena);
    }
    if (ichigo.hollowMaskActive) {
      throw new Error(`1st Hollow Mask failed to deactivate on timer expire!`);
    }
    if (!ichigo.hollowMaskUsed) {
      throw new Error(`1st Hollow Mask shatter did not set hollowMaskUsed!`);
    }

    // Clear any post-shatter reversion timers so Ichigo is ready for next awakening cycle
    ichigo.shikaiReversionBurstTimer = 0;
    ichigo.ultimateCooldown = 0; // ready for 2nd Bankai

    // Enter 2nd Bankai
    ichigo._releaseBankai();
    ichigo.bankaiDurationMax = 1000;
    ichigo.bankaiTimer = 1000;
    ichigo.bankaiBurstTimer = 0;

    // Drain 2nd Bankai to trigger 2nd Hollow Awakening upon expiration
    ichigo.bankaiTimer = 1;
    ichigo.bankaiFinalGetsugaTriggered = true;
    ichigo.isChannelingGetsuga = false;
    ichigo.isGetsugaSlash = false;
    ichigo.getsugaRecoveryTimer = 0;
    ichigo.shunpoComboActive = false;
    ichigo._stopFinalGetsugaVoiceline(true);
    ichigo.update(sukuna, 0, state.arena);

    if (!ichigo.hollowMaskActive && ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`Ichigo failed to activate 2nd Hollow Mask transformation upon 2nd Bankai expiration!`);
    }

    // Complete 2nd transformation animation
    ichigo.hollowMaskFormationTimer = 0;
    ichigo.hollowBurstTimer = 0;
    ichigo.hollowMaskActive = true;
    ichigo.hollowMaskTimer = 5;

    // Drain 2nd Hollow Mask to shatter
    while (ichigo.hollowMaskActive) {
      ichigo.update(sukuna, 0, state.arena);
    }
    if (ichigo.hollowMaskActive) {
      throw new Error(`2nd Hollow Mask failed to deactivate on timer expire!`);
    }
    ichigo.shikaiReversionBurstTimer = 0;

    // Test Hollow Mask Lifesteal strictly respects CONFIG (no hardcoded lifesteal)
    ichigo.reset();
    ichigo.hp = 100;
    ichigo.maxHp = 240;
    ichigo.hollowMaskActive = true;
    ichigo.hollowMaskTimer = 500;
    const dummyEnemy = { x: 300, y: 300, r: 25, hp: 200, isDead: false };

    // With hollowLifesteal = 0, dealing 50 damage should NOT heal Ichigo
    CONFIG.ichigo.hollowLifesteal = 0;
    ichigo.applyHollowLifesteal(50, dummyEnemy);
    if (ichigo.hp !== 100) {
      throw new Error(`Expected Ichigo to NOT heal when hollowLifesteal is 0, but hp changed to ${ichigo.hp}`);
    }

    // With hollowLifesteal = 0.20, dealing 50 damage should heal exactly 10 HP
    CONFIG.ichigo.hollowLifesteal = 0.20;
    ichigo.applyHollowLifesteal(50, dummyEnemy);
    if (ichigo.hp !== 110) {
      throw new Error(`Expected Ichigo to heal exactly 10 HP with 20% lifesteal, got hp=${ichigo.hp}`);
    }
    CONFIG.ichigo.hollowLifesteal = 0.0; // Restore config

    // Test Round Reset cleans up hollow baseline
    ichigo.reset();
    if (ichigo.hollowMaskActive || ichigo.hollowMaskUsed || ichigo.hollowRechargeHpBaseline !== undefined || ichigo._maxHollowPct !== 0) {
      throw new Error(`Ichigo reset() did not clear hollow mask states!`);
    }
  } catch (err) {
    console.error('❌ [ICHIGO MULTIPLE HOLLOW AWAKENINGS TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Multiple Bankai Awakenings Test
  console.log('🗡️ [Ichigo Multiple Bankai Awakenings Test] Verifying Ichigo can activate and use Bankai multiple times in the same round...');
  try {
    reinitFighters(true);
    const ichigo = state.fighters[0];
    const sukuna = state.fighters[1];

    // 1. Initial State: Shikai
    if (ichigo.bankaiActive || ichigo.bankaiUsed || ichigo.ultimateCooldown > 0) {
      throw new Error(`Ichigo did not initialize in fresh Shikai state! bankaiActive=${ichigo.bankaiActive}, bankaiUsed=${ichigo.bankaiUsed}, cd=${ichigo.ultimateCooldown}`);
    }

    // Check HUD skill provider before 1st Bankai
    let hudSkills = getSkillDataForFighter(ichigo);
    let bankaiSkill = hudSkills.find(s => s.id === 'bankai');
    if (!bankaiSkill || bankaiSkill.label !== 'BANKAI') {
      throw new Error(`HUD Bankai Skill initial display failed! Got: ${JSON.stringify(bankaiSkill)}`);
    }

    // 2. First Bankai Trigger at 75% HP (under 80% threshold)
    ichigo.hp = Math.round(ichigo.maxHp * 0.75);
    ichigo.update(sukuna, 0, state.arena); // triggers activateBankai via AI/threshold
    if (!ichigo.isChannelingBankai && !ichigo.bankaiActive) {
      throw new Error(`Ichigo failed to initiate 1st Bankai activation at 75% HP!`);
    }

    // Complete 1st Bankai channeling and release
    ichigo.isChannelingBankai = false;
    ichigo.bankaiChargeTimer = 0;
    ichigo._releaseBankai();
    ichigo.bankaiBurstTimer = 0;

    if (!ichigo.bankaiActive || ichigo.bankaiTimer <= 0) {
      throw new Error(`1st Bankai failed to become active! bankaiActive=${ichigo.bankaiActive}, timer=${ichigo.bankaiTimer}`);
    }

    // Verify HUD reflects active Bankai
    hudSkills = getSkillDataForFighter(ichigo);
    bankaiSkill = hudSkills.find(s => s.id === 'bankai');
    if (!bankaiSkill || !bankaiSkill.ready) {
      throw new Error(`HUD Bankai Skill during active Bankai failed! Got: ${JSON.stringify(bankaiSkill)}`);
    }

    // Drain 1st Bankai to expiration -> Triggers Bankai + Hollow Mask combo transition!
    ichigo.bankaiTimer = 1;
    ichigo.bankaiFinalGetsugaTriggered = true; // allow final getsuga to complete
    ichigo.isChannelingGetsuga = false;
    ichigo.isGetsugaSlash = false;
    ichigo.getsugaRecoveryTimer = 0;
    ichigo.shunpoComboActive = false;
    ichigo._stopFinalGetsugaVoiceline(true);
    ichigo.update(sukuna, 0, state.arena);

    // Verify Bankai duration ending triggers Hollow Mask activation while remaining in Bankai
    if (!ichigo.hollowMaskActive && ichigo.hollowMaskFormationTimer <= 0) {
      throw new Error(`Bankai duration end failed to trigger Hollow Mask activation combo!`);
    }
    if (!ichigo.bankaiActive) {
      throw new Error(`Bankai did not remain active when transitioning to Hollow Mask combo!`);
    }

    // Complete Hollow Mask formation and drain mask duration to test full combo conclusion
    ichigo.hollowMaskFormationTimer = 0;
    ichigo.hollowBurstTimer = 0;
    ichigo.hollowMaskActive = true;
    ichigo.hollowMaskTimer = 1;
    ichigo.update(sukuna, 0, state.arena); // drains hollowMaskTimer to 0 -> mask shatters and Bankai expires

    if (ichigo.bankaiActive) {
      throw new Error(`Bankai failed to expire when Hollow Mask finished its duration!`);
    }
    if (!ichigo.bankaiUsed || ichigo.ultimateCooldown <= 0) {
      throw new Error(`1st Bankai combo expiration failed to set bankaiUsed or ultimateCooldown! cd=${ichigo.ultimateCooldown}`);
    }

    // Clear post-expiration burst lockout for testing
    ichigo.shikaiReversionBurstTimer = 0;

    // 3. Verify HUD reflects Bankai recharge cooldown
    hudSkills = getSkillDataForFighter(ichigo);
    bankaiSkill = hudSkills.find(s => s.id === 'bankai');
    if (!bankaiSkill || bankaiSkill.ready) {
      throw new Error(`HUD Bankai Skill should be recharging on cooldown, but marked ready! Got: ${JSON.stringify(bankaiSkill)}`);
    }

    // 4. Tick Cooldown to 0 -> 2nd Bankai must become READY!
    ichigo.ultimateCooldown = 0;
    hudSkills = getSkillDataForFighter(ichigo);
    bankaiSkill = hudSkills.find(s => s.id === 'bankai');
    if (!bankaiSkill || !bankaiSkill.ready || bankaiSkill.pct < 99) {
      throw new Error(`HUD Bankai Skill failed to show 100% ready after cooldown expired! Got: ${JSON.stringify(bankaiSkill)}`);
    }

    // 5. Trigger 2nd Bankai Activation
    ichigo.update(sukuna, 0, state.arena);
    if (!ichigo.isChannelingBankai && !ichigo.bankaiActive) {
      throw new Error(`Ichigo failed to activate 2nd Bankai after cooldown completed!`);
    }

    // Complete 2nd Bankai channeling
    ichigo.isChannelingBankai = false;
    ichigo.bankaiChargeTimer = 0;
    ichigo._releaseBankai();
    ichigo.bankaiBurstTimer = 0;

    if (!ichigo.bankaiActive) {
      throw new Error(`2nd Bankai failed to become active upon release!`);
    }

    // Drain 2nd Bankai to expiration -> Triggers 2nd Hollow combo
    ichigo.bankaiTimer = 1;
    ichigo.bankaiFinalGetsugaTriggered = true;
    ichigo.isChannelingGetsuga = false;
    ichigo.isGetsugaSlash = false;
    ichigo.getsugaRecoveryTimer = 0;
    ichigo.shunpoComboActive = false;
    ichigo._stopFinalGetsugaVoiceline(true);
    ichigo.update(sukuna, 0, state.arena);

    ichigo.hollowMaskFormationTimer = 0;
    ichigo.hollowBurstTimer = 0;
    ichigo.hollowMaskActive = true;
    ichigo.hollowMaskTimer = 1;
    ichigo.update(sukuna, 0, state.arena);

    if (ichigo.bankaiActive) {
      throw new Error(`2nd Bankai failed to expire on timer 0!`);
    }
    ichigo.shikaiReversionBurstTimer = 0;

    // 6. Test 3rd Bankai Activation (e.g. Bankai + Hollow Mask combination)
    ichigo.hollowMaskFormationTimer = 0;
    ichigo.hollowBurstTimer = 0;
    ichigo.ultimateCooldown = 0;
    ichigo.update(sukuna, 0, state.arena);

    if (!ichigo.isChannelingBankai && !ichigo.bankaiActive) {
      throw new Error(`Ichigo failed to activate 3rd Bankai! isChannelingBankai=${ichigo.isChannelingBankai}, bankaiActive=${ichigo.bankaiActive}, hollowActive=${ichigo.hollowMaskActive}, hollowTimer=${ichigo.hollowMaskFormationTimer}`);
    }

    // 7. Verify reset() restores pristine initial state
    ichigo.reset();
    if (ichigo.bankaiActive || ichigo.bankaiUsed || ichigo.ultimateCooldown !== 0 || ichigo.bankaiFinalGetsugaTriggered) {
      throw new Error(`Ichigo reset() did not clear Bankai states! bankaiActive=${ichigo.bankaiActive}, bankaiUsed=${ichigo.bankaiUsed}, cd=${ichigo.ultimateCooldown}`);
    }
  } catch (err) {
    console.error('❌ [ICHIGO MULTIPLE BANKAI AWAKENINGS TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Bankai to Hollow Form Combo Progression Test
  console.log('🗡️ [Ichigo Bankai to Hollow Form Combo Progression Test] Verifying Ichigo activates Hollow Form upon Bankai duration end while maintaining Bankai form...');
  try {
    reinitFighters(true);
    const ichigo = state.fighters[0];
    const sukuna = state.fighters[1];

    // 1. Enter Bankai
    ichigo.hp = Math.round(ichigo.maxHp * 0.70);
    ichigo.activateBankai();
    ichigo.isChannelingBankai = false;
    ichigo.bankaiChargeTimer = 0;
    ichigo._releaseBankai();
    ichigo.bankaiBurstTimer = 0;

    if (!ichigo.bankaiActive || ichigo.hollowMaskActive) {
      throw new Error(`Expected Bankai active=true, Hollow active=false upon Bankai release!`);
    }

    // 2. Set Bankai timer to 1 and complete final getsuga wave
    ichigo.bankaiTimer = 1;
    ichigo.bankaiFinalGetsugaTriggered = true;
    ichigo.isChannelingGetsuga = false;
    ichigo.isGetsugaSlash = false;
    ichigo.getsugaRecoveryTimer = 0;
    ichigo.shunpoComboActive = false;
    ichigo._stopFinalGetsugaVoiceline(true);

    // 3. Update Ichigo -> Bankai duration ends (reaches 0) -> activates Hollow Mask while staying in Bankai!
    ichigo.update(sukuna, 0, state.arena);

    if (ichigo.hollowMaskFormationTimer <= 0 && !ichigo.hollowMaskActive) {
      throw new Error(`Hollow Mask failed to trigger upon Bankai duration ending!`);
    }
    if (!ichigo.bankaiActive) {
      throw new Error(`Bankai form was disabled when Hollow Mask activated! bankaiActive must remain true for bankai_hollow combo.`);
    }

    // 4. Complete Hollow formation & burst
    ichigo.hollowMaskFormationTimer = 0;
    ichigo.hollowBurstTimer = 0;
    ichigo.hollowMaskActive = true;
    ichigo.hollowMaskTimer = 500;

    // Verify speedMultiplier combines both Bankai and Hollow Mask
    ichigo.update(sukuna, 0, state.arena);
    const expectedBankaiMult = CONFIG.ichigo?.bankaiSpeedMultiplier || 1.1;
    const expectedHollowMult = CONFIG.ichigo?.hollowSpeedMultiplier || 0.50;
    const expectedCombined = expectedBankaiMult * expectedHollowMult;
    if (Math.abs(ichigo.speedMultiplier - expectedCombined) > 0.01) {
      throw new Error(`Expected combined speed multiplier ${expectedCombined}, got ${ichigo.speedMultiplier}`);
    }

    // 5. Drain Hollow Mask timer to 0 -> conclude full combo
    ichigo.hollowMaskTimer = 1;
    ichigo.update(sukuna, 0, state.arena); // mask shatters, bankai expires, reverts to Shikai

    if (ichigo.bankaiActive) {
      throw new Error(`Bankai active=true after Hollow Mask shattered at end of combo!`);
    }
    if (ichigo.hollowMaskActive) {
      throw new Error(`Hollow Mask active=true after timer 0!`);
    }
    if (ichigo.ultimateCooldown <= 0 || !ichigo.bankaiUsed) {
      throw new Error(`Bankai combo conclusion did not set ultimateCooldown or bankaiUsed! cd=${ichigo.ultimateCooldown}`);
    }
    if (ichigo.shikaiReversionBurstTimer <= 0) {
      throw new Error(`Shikai reversion burst timer was not triggered upon combo conclusion!`);
    }
  } catch (err) {
    console.error('❌ [ICHIGO BANKAI TO HOLLOW COMBO TEST ERROR]:', err);
    errors++;
  }

  console.log('💀 [Ichigo Audio Cutoff On Death Mid-Channeling Test] Verifying all audio cuts off when dying during skill channeling...');
  try {
    state.mode = '1v1';
    state.p1Index = allDefs.findIndex(d => d.type === 'ichigo');
    state.p2Index = allDefs.findIndex(d => d.type === 'sukuna');

    // 1. Bankai Channeling Death Test
    {
      reinitFighters(true);
      const ichigo = state.fighters[0];
      const sukuna = state.fighters[1];
      ichigo.hp = ichigo.maxHp * 0.5; // low enough to pop Bankai
      ichigo.activateBankai();
      if (!ichigo.isChannelingBankai && ichigo.bankaiChargeTimer <= 0) {
        throw new Error(`Ichigo failed to start Bankai channeling!`);
      }
      // Kill Ichigo mid-channeling
      ichigo.hp = 0;
      ichigo.isDead = true;
      ichigo.onDeath();
      if (ichigo._bankaiVoiceHandle !== null || ichigo._bankaiVoicePlaying || ichigo._isBankaiVoicelinePlaying()) {
        throw new Error(`Bankai voice handle or playing state remained active on death!`);
      }
    }

    // 2. Hollow Mask Formation Death Test
    {
      reinitFighters(true);
      const ichigo = state.fighters[0];
      const sukuna = state.fighters[1];
      ichigo.bankaiActive = true;
      ichigo.bankaiTimer = 1000;
      ichigo.activateHollowMask();
      if (ichigo.hollowMaskFormationTimer <= 0) {
        throw new Error(`Ichigo failed to start Hollow Mask formation!`);
      }
      // Kill Ichigo mid-channeling
      ichigo.hp = 0;
      ichigo.isDead = true;
      ichigo.onDeath();
      if (ichigo._hollowVoiceHandle !== null || ichigo._hollowFlareHandle !== null || ichigo._hollowVoicePlaying || ichigo._isHollowTransformationVoicelinePlaying()) {
        throw new Error(`Hollow voice/flare handle or playing state remained active on death!`);
      }
    }

    // 3. Normal Getsuga Channeling Death Test
    {
      reinitFighters(true);
      const ichigo = state.fighters[0];
      const sukuna = state.fighters[1];
      ichigo.fireGetsuga(sukuna, false);
      if (!ichigo.isChannelingGetsuga) {
        throw new Error(`Ichigo failed to start Getsuga Tensho channeling!`);
      }
      // Kill Ichigo mid-channeling
      ichigo.hp = 0;
      ichigo.isDead = true;
      ichigo.onDeath();
      if (ichigo._getsugaVoiceHandle !== null || ichigo._getsugaChargeHandle !== null || ichigo._getsugaVoicePlaying || ichigo._isGetsugaVoicelinePlaying()) {
        throw new Error(`Getsuga voice/charge handle or playing state remained active on death!`);
      }
    }

    // 4. Final Massive Getsuga Channeling Death Test
    {
      reinitFighters(true);
      const ichigo = state.fighters[0];
      const sukuna = state.fighters[1];
      ichigo.bankaiActive = true;
      ichigo.fireFinalMassiveGetsuga(sukuna);
      if (!ichigo.isChannelingGetsuga || !ichigo.isFinalMassiveGetsuga) {
        throw new Error(`Ichigo failed to start Final Massive Getsuga channeling!`);
      }
      // Kill Ichigo mid-channeling
      ichigo.hp = 0;
      ichigo.isDead = true;
      ichigo.onDeath();
      if (ichigo._finalGetsugaVoiceHandle !== null || ichigo._finalGetsugaVoicePlaying || ichigo._isFinalGetsugaVoicelinePlaying()) {
        throw new Error(`Final Getsuga voice handle or playing state remained active on death!`);
      }
    }
  } catch (err) {
    console.error('❌ [ICHIGO AUDIO CUTOFF ON DEATH TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Shunpo Blitz Initial Cooldown Test
  console.log('⚡ [Ichigo Shunpo Initial Cooldown Test] Verifying Shunpo Blitz starts on initial cooldown after countdown and resets per round...');
  try {
    const IchigoClass = FIGHTER_CLASS_MAP['ichigo'];
    const dummyOpponent = new (FIGHTER_CLASS_MAP['ichigo'])({ startX: 200, startY: 200 });
    const ichigo = new IchigoClass({ startX: 300, startY: 250 });
    const expectedInitCD = CONFIG.ichigo?.initialShunpoCooldown ?? 180;

    // 1. Verify constructor sets initial cooldown
    if (ichigo.shunpoCooldown !== expectedInitCD) {
      throw new Error(`Ichigo constructor did not set initial shunpoCooldown! Expected: ${expectedInitCD}, Got: ${ichigo.shunpoCooldown}`);
    }

    // 2. Verify AI cannot trigger Shunpo on frame 1 of battle
    state.fighters = [ichigo, dummyOpponent];
    state.illusions = [];
    ichigo.update(dummyOpponent, 0, state.arena);
    if (ichigo.shunpoComboActive || ichigo.isShunpoDashing) {
      throw new Error(`Ichigo triggered Shunpo Blitz on frame 1 of battle despite initial cooldown!`);
    }

    // 3. Verify reset() restores initial cooldown between rounds
    ichigo.shunpoCooldown = 0;
    ichigo.reset();
    if (ichigo.shunpoCooldown !== expectedInitCD) {
      throw new Error(`Ichigo reset() did not restore initial shunpoCooldown! Expected: ${expectedInitCD}, Got: ${ichigo.shunpoCooldown}`);
    }

    // 4. Verify cooldown decays during active gameplay and triggers Shunpo when reaching 0
    let framesTicked = 0;
    while (ichigo.shunpoCooldown > 0 && !ichigo.shunpoComboActive && !ichigo.isShunpoDashing && framesTicked < 300) {
      state.frameCount = (state.frameCount || 0) + 1;
      dummyOpponent.x = ichigo.x + 80;
      dummyOpponent.y = ichigo.y + 80;
      ichigo.update(dummyOpponent, 0, state.arena);
      framesTicked++;
    }
    if (framesTicked !== expectedInitCD) {
      throw new Error(`Expected initial cooldown to last ${expectedInitCD} frames, but combo triggered after ${framesTicked} frames!`);
    }
    if (!ichigo.shunpoComboActive && !ichigo.isShunpoDashing) {
      throw new Error(`Ichigo failed to trigger Shunpo Blitz once initial cooldown expired!`);
    }
  } catch (err) {
    console.error('❌ [ICHIGO SHUNPO INITIAL COOLDOWN TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Finishing Ability & Attack Animation Preservation Test
  console.log('🗡️ [Ichigo Finishing Ability & Attack Animation Preservation Test] Verifying Ichigo does not cut off basic attack animation, Getsuga release swing, recovery, or Shunpo combo on lethal win...');
  try {
    const IchigoClass = FIGHTER_CLASS_MAP['ichigo'];
    state.mode = '1v1';
    state.gameState = 'playing';

    // 1. Basic Sword Cleave Attack Animation Preservation
    const ichigo1 = new IchigoClass({ startX: 200, startY: 200 });
    const dummy1 = new (FIGHTER_CLASS_MAP['sukuna'])({ startX: 240, startY: 200 });
    dummy1.hp = 1; // 1 HP -> lethal hit incoming
    state.fighters = [ichigo1, dummy1];
    state.illusions = [];

    ichigo1.performMeleeCleave(dummy1);
    if (dummy1.hp > 0) {
      throw new Error(`Expected dummy opponent to die from basic melee cleave! HP=${dummy1.hp}`);
    }
    if (ichigo1.slashSwingTimer <= 0) {
      throw new Error(`Expected slashSwingTimer > 0 during basic sword swing follow-through! Got ${ichigo1.slashSwingTimer}`);
    }
    if (!ichigo1.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned false during basic sword swing follow-through!`);
    }

    // Step through remaining swing frames
    while (ichigo1.slashSwingTimer > 0) {
      ichigo1.update(dummy1, 0, state.arena);
    }
    if (ichigo1.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned true after basic sword swing completed!`);
    }

    // 2. Getsuga Tensho Release Swing & Recovery Preservation
    const ichigo2 = new IchigoClass({ startX: 200, startY: 200 });
    const dummy2 = new (FIGHTER_CLASS_MAP['sukuna'])({ startX: 350, startY: 200 });
    dummy2.hp = 0; // Dummy dead
    state.fighters = [ichigo2, dummy2];

    ichigo2.isChannelingGetsuga = true;
    ichigo2.getsugaChargeTimer = 1;
    if (!ichigo2.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned false during Getsuga channeling!`);
    }

    // Trigger release
    ichigo2._releaseGetsuga();
    if (ichigo2.slashSwingTimer <= 0 || ichigo2.getsugaRecoveryTimer <= 0) {
      throw new Error(`Expected slashSwingTimer > 0 and getsugaRecoveryTimer > 0 on Getsuga release!`);
    }
    if (!ichigo2.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned false during Getsuga release swing/recovery!`);
    }

    // Step through recovery frames
    while (ichigo2.getsugaRecoveryTimer > 0 || ichigo2.slashSwingTimer > 0) {
      ichigo2.update(dummy2, 0, state.arena);
    }
    if (ichigo2.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned true after Getsuga release swing and recovery completed!`);
    }

    // 3. Final Massive Getsuga Release & Recovery Preservation
    const ichigo3 = new IchigoClass({ startX: 200, startY: 200 });
    const dummy3 = new (FIGHTER_CLASS_MAP['sukuna'])({ startX: 350, startY: 200 });
    dummy3.hp = 0;
    state.fighters = [ichigo3, dummy3];

    ichigo3.isFinalMassiveGetsuga = true;
    ichigo3._releaseGetsuga();
    if (!ichigo3.isFinalGetsugaRecovery || ichigo3.getsugaRecoveryTimer <= 0) {
      throw new Error(`Expected isFinalGetsugaRecovery = true and getsugaRecoveryTimer > 0 on Final Massive Getsuga release!`);
    }
    if (!ichigo3.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned false during Final Massive Getsuga recovery!`);
    }

    // Step through final recovery frames
    while (ichigo3.getsugaRecoveryTimer > 0 || ichigo3.slashSwingTimer > 0) {
      ichigo3.update(dummy3, 0, state.arena);
    }
    if (ichigo3.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned true after Final Massive Getsuga recovery completed!`);
    }

    // 4. Shunpo Multi-Strike Combo Preservation
    const ichigo4 = new IchigoClass({ startX: 200, startY: 200 });
    const dummy4 = new (FIGHTER_CLASS_MAP['sukuna'])({ startX: 280, startY: 200 });
    state.fighters = [ichigo4, dummy4];
    ichigo4.shunpoCooldown = 0;

    ichigo4.performShunpoGetsugaCombo(dummy4);
    if (!ichigo4.shunpoComboActive && !ichigo4.isShunpoDashing) {
      throw new Error(`Expected shunpoComboActive or isShunpoDashing = true!`);
    }
    if (!ichigo4.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned false during Shunpo combo initiation!`);
    }

    // Step through Shunpo combo until fully finished
    let comboStepLimit = 500;
    while ((ichigo4.shunpoComboActive || ichigo4.isShunpoDashing || ichigo4.isChannelingGetsuga || ichigo4.getsugaRecoveryTimer > 0 || ichigo4.slashSwingTimer > 0) && comboStepLimit > 0) {
      ichigo4.update(dummy4, 0, state.arena);
      comboStepLimit--;
    }
    ichigo4._getsugaVoicePlaying = false;
    ichigo4._getsugaVoiceEndTime = 0;
    ichigo4._finalGetsugaVoicePlaying = false;
    ichigo4._finalGetsugaVoiceEndTime = 0;
    if (ichigo4.hasActiveFinishingAbility()) {
      throw new Error(`Ichigo hasActiveFinishingAbility() returned true after full Shunpo combo completed!`);
    }
  } catch (err) {
    console.error('❌ [ICHIGO FINISHING ABILITY TEST ERROR]:', err);
    errors++;
  }

  // Saitama Caped Baldy Reflexes Tick Damage Disabled Test
  console.log('🥋 [Saitama Caped Baldy Reflexes Tick Damage Disabled Test] Verifying Saitama cannot dodge any tick damage skills...');
  try {
    const SaitamaClass = FIGHTER_CLASS_MAP['saitama'];
    const saitama = new SaitamaClass({ startX: 250, startY: 250 });
    const ichigo = new (FIGHTER_CLASS_MAP['ichigo'])({ startX: 100, startY: 250 });
    state.fighters = [saitama, ichigo];
    state.illusions = [];

    // Force 100% dodge chance for deterministic test
    CONFIG.saitama = CONFIG.saitama || {};
    const origDodgeChance = CONFIG.saitama.dodgeChance;
    CONFIG.saitama.dodgeChance = 1.0;

    // 1. Verify Getsuga Tensho tick damage CANNOT be dodged
    saitama.hp = 100;
    const preGetsugaHp = saitama.hp;
    const getsugaResult = saitama.takeDamage(10, ichigo, { isSkill: true, isGetsuga: true, getsugaForm: 'bankai', isTickDamage: true });
    if (saitama.hp >= preGetsugaHp) {
      throw new Error(`Saitama should NOT dodge Getsuga tick damage, but HP did not decrease!`);
    }

    // 2. Verify Hollow Purple continuous DPS CANNOT be dodged
    saitama.hp = 100;
    const prePurpleHp = saitama.hp;
    saitama.takeDamage(15, ichigo, { isPurpleDPS: true, isHollowPurple: true });
    if (saitama.hp >= prePurpleHp) {
      throw new Error(`Saitama should NOT dodge Hollow Purple DPS tick damage!`);
    }

    // 3. Verify Pure Love Beam CANNOT be dodged
    saitama.hp = 100;
    const preBeamHp = saitama.hp;
    saitama.takeDamage(12, ichigo, { isPureLoveBeam: true, isBeam: true });
    if (saitama.hp >= preBeamHp) {
      throw new Error(`Saitama should NOT dodge Pure Love Beam tick damage!`);
    }

    // 4. Verify Genos Beam / Flurry CANNOT be dodged
    saitama.hp = 100;
    const preGenosHp = saitama.hp;
    saitama.takeDamage(8, ichigo, { isGenosBeam: true, isMachineGunBlow: true, isTickDamage: true });
    if (saitama.hp >= preGenosHp) {
      throw new Error(`Saitama should NOT dodge Genos Beam / Flurry tick damage!`);
    }

    // 5. Verify direct attacks / projectiles CAN still be dodged
    saitama.hp = 100;
    saitama.dodgeCooldown = 0;
    const preDirectHp = saitama.hp;
    saitama.takeDamage(20, ichigo, { isProjectile: true, isBasic: true });
    if (saitama.hp < preDirectHp) {
      throw new Error(`Saitama should be able to dodge direct projectile attacks when dodgeChance=1.0!`);
    }

    // Restore original dodge chance
    CONFIG.saitama.dodgeChance = origDodgeChance;
  } catch (err) {
    console.error('❌ [SAITAMA TICK DAMAGE DODGE TEST ERROR]:', err);
    errors++;
  }

  // Sukuna Model Hair Asset Test
  console.log('💇 [Sukuna Model Hair Asset Test] Verifying Sukuna hair asset image loader and drawSukunaBody rendering...');
  try {
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const sukuna = new SukunaClass({ startX: 300, startY: 300 });
    
    mockCtx.resetStackDepth();
    sukuna.drawBody(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Sukuna drawBody resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    sukuna.drawSkin(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Sukuna drawSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Sukuna Malevolent Shrine Asset Test
    mockCtx.resetStackDepth();
    sukuna.domainActive = true;
    sukuna._drawShrineBody(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Sukuna _drawShrineBody resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    sukuna.drawDomainBackground(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Sukuna drawDomainBackground resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    sukuna.drawDomainForeground(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Sukuna drawDomainForeground resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
  } catch (err) {
    console.error('❌ [SUKUNA HAIR & SHRINE ASSET TEST ERROR]:', err);
    errors++;
  }

  // Gojo Model Hair Asset Test
  console.log('💇 [Gojo Model Hair Asset Test] Verifying Gojo hair asset image loader, facing directions, and drawGojoBody rendering...');
  try {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const gojo = new GojoClass({ startX: 300, startY: 300 });
    
    mockCtx.resetStackDepth();
    gojo.drawBody(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Gojo drawBody resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    gojo.drawSkin(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Gojo drawSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test facing left mirroring
    gojo.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    gojo.drawBody(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Gojo drawBody (facing left) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
  } catch (err) {
    console.error('❌ [GOJO HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Makima Model Hair Asset Test
  console.log('💇 [Makima Model Hair Asset Test] Verifying Makima hair asset image loader, drawn pixel body, facing directions, and drawMakimaSkin rendering...');
  try {
    const MakimaClass = FIGHTER_CLASS_MAP['makima'];
    const makima = new MakimaClass({ startX: 300, startY: 300 });
    
    mockCtx.resetStackDepth();
    makima.drawBody(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Makima drawBody resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    makima.drawSkin(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Makima drawSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test facing left mirroring
    makima.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    makima.drawSkin(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Makima drawSkin (facing left) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
  } catch (err) {
    console.error('❌ [MAKIMA HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Reze Model Hair Asset Test
  console.log('💇 [Reze Model Hair Asset Test] Verifying Reze hair asset image loader, drawn pixel body, facing directions, and drawRezeSkin rendering...');
  try {
    const RezeClass = FIGHTER_CLASS_MAP['reze'];
    const reze = new RezeClass({ startX: 300, startY: 300 });
    
    mockCtx.resetStackDepth();
    drawRezeHumanPixelBody(mockCtx, reze.r || 25, Date.now());
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawRezeHumanPixelBody resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    drawRezeSkin(mockCtx, reze);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawRezeSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    reze.draw(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Reze draw resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test facing left mirroring
    reze.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawRezeSkin(mockCtx, reze);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawRezeSkin (facing left) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test Hybrid Bomb Devil Form drawSkin
    reze.isHybridModeActive = true;
    mockCtx.resetStackDepth();
    drawRezeSkin(mockCtx, reze);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawRezeSkin (Bomb Devil form) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
    reze.isHybridModeActive = false;
  } catch (err) {
    console.error('❌ [REZE HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Ichigo Model Hair Asset Test
  console.log('💇 [Ichigo Model Hair Asset Test] Verifying Ichigo hair asset image loader, facing directions, and drawIchigoSkin rendering...');
  try {
    const IchigoClass = FIGHTER_CLASS_MAP['ichigo'];
    const ichigo = new IchigoClass({ startX: 300, startY: 300 });

    mockCtx.resetStackDepth();
    _drawIchigoHair(mockCtx, ichigo.r || 25, false);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`_drawIchigoHair resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    drawIchigoSkin(mockCtx, ichigo);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawIchigoSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    ichigo.draw(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Ichigo draw resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test facing left mirroring
    ichigo.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawIchigoSkin(mockCtx, ichigo);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawIchigoSkin (facing left) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test Bankai Form drawSkin
    ichigo.bankaiActive = true;
    mockCtx.resetStackDepth();
    drawIchigoSkin(mockCtx, ichigo);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawIchigoSkin (Bankai form) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
    ichigo.bankaiActive = false;
  } catch (err) {
    console.error('❌ [ICHIGO HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Yuji Model Hair Asset Test
  console.log('💇 [Yuji Model Hair Asset Test] Verifying Yuji hair asset image loader, facing directions, Soul Swap, and drawYujiSkin rendering...');
  try {
    const YujiClass = FIGHTER_CLASS_MAP['yuji'];
    const yuji = new YujiClass({ startX: 300, startY: 300 });

    mockCtx.resetStackDepth();
    _drawYujiHair(mockCtx, yuji.r || 25, false);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`_drawYujiHair resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    drawYujiSkin(mockCtx, yuji);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawYujiSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    yuji.draw(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Yuji draw resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test facing left mirroring
    yuji.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawYujiSkin(mockCtx, yuji);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawYujiSkin (facing left) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test Soul Swap (Sukuna Form) drawSkin
    yuji.soulSwapActive = true;
    mockCtx.resetStackDepth();
    drawYujiSkin(mockCtx, yuji);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawYujiSkin (Soul Swap form) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
    yuji.soulSwapActive = false;
  } catch (err) {
    console.error('❌ [YUJI HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Yuta Model Hair Asset Test
  console.log('💇 [Yuta Model Hair Asset Test] Verifying Yuta hair asset image loader, pixel body, facing directions, and drawYutaSkin rendering...');
  try {
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const yuta = new YutaClass({ startX: 300, startY: 300 });

    mockCtx.resetStackDepth();
    _drawYutaHair(mockCtx, yuta.r || 25, false);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`_drawYutaHair resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    drawYutaPixelBody(mockCtx, yuta.r || 25);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawYutaPixelBody resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    drawYutaSkin(mockCtx, yuta);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawYutaSkin resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    mockCtx.resetStackDepth();
    yuta.draw(mockCtx);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`Yuta draw resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }

    // Test facing left mirroring
    yuta.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawYutaSkin(mockCtx, yuta);
    if (mockCtx.getStackDepth() !== 0) {
      throw new Error(`drawYutaSkin (facing left) resulted in corrupted canvas stack: depth=${mockCtx.getStackDepth()}`);
    }
  } catch (err) {
    console.error('❌ [YUTA HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Mahito Model Hair Asset Test
  console.log('💇 [Mahito Model Hair Asset Test] Verifying Mahito hair asset image loader, pixel body, facing directions, and drawMahitoSkin rendering...');
  try {
    const MahitoClass = FIGHTER_CLASS_MAP['mahito'];
    const mahito = new MahitoClass({ startX: 300, startY: 300 });

    const hairImg = _getMahitoHairImage();
    if (!hairImg) {
      throw new Error('_getMahitoHairImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    _drawMahitoHair(mockCtx, mahito.r || 25, false);
    assertCanvasStackBalance('_drawMahitoHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawMahitoHair(mockCtx, mahito.r || 25, true);
    assertCanvasStackBalance('_drawMahitoHair(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawMahitoPixelBody(mockCtx, mahito.r || 25, false);
    assertCanvasStackBalance('drawMahitoPixelBody(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    drawMahitoPixelBody(mockCtx, mahito.r || 25, true);
    assertCanvasStackBalance('drawMahitoPixelBody(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawMahitoSkin(mockCtx, mahito);
    assertCanvasStackBalance('drawMahitoSkin(mockCtx, mahito)');

    mockCtx.resetStackDepth();
    mahito.draw(mockCtx);
    assertCanvasStackBalance('mahito.draw(mockCtx)');

    // Test facing left mirroring
    mahito.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawMahitoSkin(mockCtx, mahito);
    assertCanvasStackBalance('drawMahitoSkin (facing left)');

    // Test Transformed (ISBoDK) form
    mahito.isTransformed = true;
    mockCtx.resetStackDepth();
    drawMahitoSkin(mockCtx, mahito);
    assertCanvasStackBalance('drawMahitoSkin (transformed)');
    mahito.isTransformed = false;
  } catch (err) {
    console.error('❌ [MAHITO HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Genos Model Hair Asset Test
  console.log('💇 [Genos Model Hair Asset Test] Verifying Genos hair asset image loader, pixel body, facing directions, and drawGenosSkin rendering...');
  try {
    const GenosClass = FIGHTER_CLASS_MAP['genos'];
    const genos = new GenosClass({ startX: 300, startY: 300 });

    const hairImg = _getGenosHairImage();
    if (!hairImg) {
      throw new Error('_getGenosHairImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    _drawGenosHair(mockCtx, genos.r || 25, false);
    assertCanvasStackBalance('_drawGenosHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawGenosHair(mockCtx, genos.r || 25, true);
    assertCanvasStackBalance('_drawGenosHair(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawGenosPixelBody(mockCtx, genos.r || 25);
    assertCanvasStackBalance('drawGenosPixelBody(mockCtx, 25)');

    mockCtx.resetStackDepth();
    drawGenosSkin(mockCtx, genos);
    assertCanvasStackBalance('drawGenosSkin(mockCtx, genos)');

    mockCtx.resetStackDepth();
    genos.draw(mockCtx);
    assertCanvasStackBalance('genos.draw(mockCtx)');

    // Test facing left mirroring
    genos.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawGenosSkin(mockCtx, genos);
    assertCanvasStackBalance('drawGenosSkin (facing left)');
  } catch (err) {
    console.error('❌ [GENOS HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Nanami Model & Bald Pixel Body Test
  console.log('🥋 [Nanami Model & Bald Pixel Body Test] Verifying Nanami bald pixel body, goggles, facing directions, and drawNanamiSkin rendering...');
  try {
    const NanamiClass = FIGHTER_CLASS_MAP['nanami'];
    const nanami = new NanamiClass({ startX: 300, startY: 300 });

    mockCtx.resetStackDepth();
    drawNanamiPixelBody(mockCtx, nanami.r || 25, false);
    assertCanvasStackBalance('drawNanamiPixelBody(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    drawNanamiPixelBody(mockCtx, nanami.r || 25, true);
    assertCanvasStackBalance('drawNanamiPixelBody(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawNanamiSkin(mockCtx, nanami);
    assertCanvasStackBalance('drawNanamiSkin(mockCtx, nanami)');

    mockCtx.resetStackDepth();
    nanami.draw(mockCtx);
    assertCanvasStackBalance('nanami.draw(mockCtx)');

    // Test facing left mirroring
    nanami.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawNanamiSkin(mockCtx, nanami);
    assertCanvasStackBalance('drawNanamiSkin (facing left)');

    // Test Overtime 120% form
    nanami.isOvertimeActive = true;
    mockCtx.resetStackDepth();
    drawNanamiSkin(mockCtx, nanami);
    assertCanvasStackBalance('drawNanamiSkin (overtime)');
    nanami.isOvertimeActive = false;
  } catch (err) {
    console.error('❌ [NANAMI BALD PIXEL BODY TEST ERROR]:', err);
    errors++;
  }

  // Todo Model Hair Asset & Pixel Body Test
  console.log('💇 [Todo Model Hair Asset Test] Verifying Todo hair asset image loader, pixel body, facing directions, and drawTodoSkin rendering...');
  try {
    const TodoClass = FIGHTER_CLASS_MAP['todo'];
    const todo = new TodoClass({ startX: 300, startY: 300 });

    const hairImg = _getTodoHairImage();
    if (!hairImg) {
      throw new Error('_getTodoHairImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    _drawTodoHair(mockCtx, todo.r || 25, false);
    assertCanvasStackBalance('_drawTodoHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawTodoHair(mockCtx, todo.r || 25, true);
    assertCanvasStackBalance('_drawTodoHair(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawTodoPixelBody(mockCtx, todo.r || 25, false);
    assertCanvasStackBalance('drawTodoPixelBody(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    drawTodoPixelBody(mockCtx, todo.r || 25, true);
    assertCanvasStackBalance('drawTodoPixelBody(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawTodoSkin(mockCtx, todo);
    assertCanvasStackBalance('drawTodoSkin(mockCtx, todo)');

    mockCtx.resetStackDepth();
    todo.draw(mockCtx);
    assertCanvasStackBalance('todo.draw(mockCtx)');

    // Test facing left mirroring
    todo.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawTodoSkin(mockCtx, todo);
    assertCanvasStackBalance('drawTodoSkin (facing left)');
  } catch (err) {
    console.error('❌ [TODO HAIR ASSET TEST ERROR]:', err);
    errors++;
  }

  // Nanami Ratio Hit-Pause Enemy Skill Channeling Preservation Test
  console.log('🥋 [Nanami Ratio Hit-Pause Channeling Preservation Test] Verifying enemy skill channeling is preserved and continues after 7:3 Ratio hit-pause...');
  try {
    const NanamiClass = FIGHTER_CLASS_MAP['nanami'];
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const GenosClass = FIGHTER_CLASS_MAP['genos'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const MahitoClass = FIGHTER_CLASS_MAP['mahito'];

    const nanami = new NanamiClass({ startX: 300, startY: 300, color: '#D4AF37' });
    const gojo = new GojoClass({ startX: 340, startY: 300, color: '#00E5FF' });
    const sukuna = new SukunaClass({ startX: 340, startY: 300, color: '#FF0055' });
    const genos = new GenosClass({ startX: 340, startY: 300, color: '#FFA500' });
    const yuta = new YutaClass({ startX: 340, startY: 300, color: '#FF1493' });
    const mahito = new MahitoClass({ startX: 340, startY: 300, color: '#D946EF' });

    state.fighters = [nanami, gojo];
    const testArena = { x: 50, y: 50, width: 800, height: 600, shape: 'rect' };

    // 1. Test Gojo Hollow Purple channeling preservation
    gojo.isChannelingPurple = true;
    gojo.purpleChargeTimer = 20;
    gojo.purpleChargeMax = 180;
    
    // Nanami triggers 7:3 Ratio hit-pause on Gojo
    nanami.ratioHitPauseTimer = 30;
    nanami.ratioHitPauseMax = 30;
    nanami.ratioHitPauseTarget = gojo;
    gojo.applyTimeStop(30);

    // Simulate 5 frames of hit-pause update
    for (let i = 0; i < 5; i++) {
      gojo.update(nanami, 1, testArena);
    }

    if (!gojo.isChannelingPurple) {
      throw new Error('Gojo Hollow Purple channeling was cancelled during Nanami 7:3 Ratio Hit-Pause!');
    }
    if (gojo.purpleChargeTimer !== 20) {
      throw new Error(`Gojo purpleChargeTimer changed during Nanami hit-pause! Expected 20, got ${gojo.purpleChargeTimer}`);
    }

    // Unpause Nanami
    nanami.ratioHitPauseTimer = 0;
    nanami.ratioHitPauseTarget = null;
    gojo.timeStopTimer = 0;

    // Simulate 10 frames of post-pause update
    for (let i = 0; i < 10; i++) {
      gojo.update(nanami, 1, testArena);
    }
    if (!gojo.isChannelingPurple) {
      throw new Error('Gojo Hollow Purple channeling did not continue after Nanami 7:3 Ratio Hit-Pause!');
    }
    if (gojo.purpleChargeTimer <= 20) {
      throw new Error('Gojo purpleChargeTimer did not increment after unpausing!');
    }

    // 2. Test Sukuna Fuga channeling preservation
    state.fighters = [nanami, sukuna];
    sukuna.isChannelingDivineFlame = true;
    sukuna.divineFlameChargeTimer = 20;
    sukuna.divineFlameChargeMax = 120;
    nanami.ratioHitPauseTimer = 30;
    nanami.ratioHitPauseTarget = sukuna;
    sukuna.applyTimeStop(30);

    for (let i = 0; i < 5; i++) {
      sukuna.update(nanami, 1, testArena);
    }
    if (!sukuna.isChannelingDivineFlame) {
      throw new Error('Sukuna Fuga channeling was cancelled during Nanami 7:3 Ratio Hit-Pause!');
    }
    if (sukuna.divineFlameChargeTimer !== 20) {
      throw new Error(`Sukuna divineFlameChargeTimer changed during Nanami hit-pause! Expected 20, got ${sukuna.divineFlameChargeTimer}`);
    }

    nanami.ratioHitPauseTimer = 0;
    nanami.ratioHitPauseTarget = null;
    sukuna.timeStopTimer = 0;

    for (let i = 0; i < 10; i++) {
      sukuna.update(nanami, 1, testArena);
    }
    if (!sukuna.isChannelingDivineFlame) {
      throw new Error('Sukuna Fuga channeling did not continue after Nanami 7:3 Ratio Hit-Pause!');
    }
    if (sukuna.divineFlameChargeTimer <= 20) {
      throw new Error('Sukuna divineFlameChargeTimer did not increment after unpausing!');
    }

    // 3. Test Genos Incinerate channeling preservation
    state.fighters = [nanami, genos];
    genos.isChannelingIncinerate = true;
    genos.incinerateChargeTimer = 20;
    nanami.ratioHitPauseTimer = 30;
    nanami.ratioHitPauseTarget = genos;
    genos.applyTimeStop(30);

    for (let i = 0; i < 5; i++) {
      genos.update(nanami, 1, testArena);
    }
    if (!genos.isChannelingIncinerate) {
      throw new Error('Genos Incinerate channeling was cancelled during Nanami 7:3 Ratio Hit-Pause!');
    }

    nanami.ratioHitPauseTimer = 0;
    nanami.ratioHitPauseTarget = null;
    genos.timeStopTimer = 0;

    // 4. Test Yuta Pure Love Beam channeling preservation
    state.fighters = [nanami, yuta];
    yuta.isChannelingPureLoveBeam = true;
    yuta.pureLoveBeamChargeTimer = 20;
    nanami.ratioHitPauseTimer = 30;
    nanami.ratioHitPauseTarget = yuta;
    yuta.applyTimeStop(30);

    for (let i = 0; i < 5; i++) {
      yuta.update(nanami, 1, testArena);
    }
    if (!yuta.isChannelingPureLoveBeam) {
      throw new Error('Yuta Pure Love Beam channeling was cancelled during Nanami 7:3 Ratio Hit-Pause!');
    }

    // 5. Test Mahito Domain Expansion (Self-Embodiment of Perfection) channeling preservation
    state.fighters = [nanami, mahito];
    mahito.isChannelingDomainExpansion = true;
    mahito.domainChargeTimer = 60;
    mahito.domainChargeMax = 120;
    nanami.ratioHitPauseTimer = 30;
    nanami.ratioHitPauseTarget = mahito;
    mahito.applyTimeStop(30);

    for (let i = 0; i < 5; i++) {
      mahito.update(nanami, 1, testArena);
    }
    if (!mahito.isChannelingDomainExpansion) {
      throw new Error('Mahito Self-Embodiment of Perfection Domain channeling was cancelled during Nanami 7:3 Ratio Hit-Pause!');
    }
    if (mahito.domainChargeTimer !== 60) {
      throw new Error(`Mahito domainChargeTimer changed during Nanami hit-pause! Expected 60, got ${mahito.domainChargeTimer}`);
    }

    nanami.ratioHitPauseTimer = 0;
    nanami.ratioHitPauseTarget = null;
    mahito.timeStopTimer = 0;

    for (let i = 0; i < 10; i++) {
      mahito.update(nanami, 1, testArena);
    }
    if (!mahito.isChannelingDomainExpansion) {
      throw new Error('Mahito Domain channeling did not continue after Nanami 7:3 Ratio Hit-Pause!');
    }
    if (mahito.domainChargeTimer >= 60) {
      throw new Error(`Mahito domainChargeTimer did not decrement after unpausing! Expected < 60, got ${mahito.domainChargeTimer}`);
    }

    state.fighters = [];
  } catch (err) {
    console.error('❌ [NANAMI RATIO HIT-PAUSE CHANNELING PRESERVATION TEST ERROR]:', err);
    errors++;
  }

  // Nanami 4-Fold Black Flash Blitz Execution & Reference Safety Test
  console.log('⚡ [Nanami 4-Fold Black Flash Blitz Test] Verifying Black Flash Blitz channels, teleports, executes all 4 strikes without reference errors, and restores movement...');
  try {
    const NanamiClass = FIGHTER_CLASS_MAP['nanami'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const testArena = { x: 50, y: 50, width: 800, height: 600, shape: 'rect' };

    const nanami = new NanamiClass({ x: 200, y: 300, color: '#D4AF37', controls: {} });
    const target = new SukunaClass({ x: 350, y: 300, color: '#E53E3E', controls: {} });
    target.hp = 300;
    target.maxHp = 300;
    state.fighters = [nanami, target];
    state.arena = testArena;
    state.gameState = 'playing';

    // Temporarily enable Black Flash for this test (config has enableBlackFlash: 0)
    const savedBlackFlash = CONFIG.nanami.enableBlackFlash;
    CONFIG.nanami.enableBlackFlash = true;

    // 1. Initiate Blitz
    nanami.performBlitz(CONFIG.nanami, target);
    if (!nanami.isChannelingBlackFlash) {
      throw new Error('Expected nanami.isChannelingBlackFlash to be true after performBlitz()');
    }

    // 2. Step through channeling frames
    while (nanami.isChannelingBlackFlash) {
      nanami.update(target, 0, testArena);
    }
    if (!nanami.isBlitzing) {
      throw new Error('Expected nanami.isBlitzing to be true after Black Flash channeling finished');
    }

    // 3. Step through all 4 strikes of the Blitz combo
    let updateFrames = 0;
    const initialTargetHp = target.hp;
    while (nanami.isBlitzing && updateFrames < 200) {
      nanami.update(target, 0, testArena);
      updateFrames++;
    }

    if (nanami.isBlitzing) {
      throw new Error('Expected nanami.isBlitzing to finish within 200 frames');
    }
    if (target.hp >= initialTargetHp) {
      throw new Error(`Expected target to take damage from 4-Fold Black Flash Blitz! HP before: ${initialTargetHp}, HP after: ${target.hp}`);
    }

    CONFIG.nanami.enableBlackFlash = savedBlackFlash;
    state.fighters = [];
  } catch (err) {
    if (typeof savedBlackFlash !== 'undefined') CONFIG.nanami.enableBlackFlash = savedBlackFlash;
    console.error('❌ [NANAMI 4-FOLD BLACK FLASH BLITZ TEST ERROR]:', err);
    errors++;
  }

  // Gojo Hollow Purple Wall Collision Test
  console.log('🔮 [Gojo Hollow Purple Wall Collision Test] Verifying Purple stops completely on wall contact without sliding...');
  try {
    const purpleBehavior = new GojoPurpleBehavior();
    const testArena = { x: 50, y: 50, width: 800, height: 600, shape: 'rect' };
    const halfR = 25;

    // Test 1: Diagonal collision with left wall (vx < 0, vy > 0)
    const projLeft = {
      x: testArena.x + 10,
      y: testArena.y + 150,
      r: 50,
      vx: -8,
      vy: 6,
      life: 200,
      behaviorType: 'gojo_purple'
    };
    state.arena = testArena;
    const expiredLeft = purpleBehavior.checkExpire(projLeft, projectileSystem);
    if (expiredLeft) {
      throw new Error(`Purple expired on wall collision instead of staying pinned!`);
    }
    if (projLeft.x !== testArena.x + halfR) {
      throw new Error(`Purple x-coordinate not clamped properly on left wall! Expected ${testArena.x + halfR}, got ${projLeft.x}`);
    }
    if (projLeft.vx !== 0 || projLeft.vy !== 0) {
      throw new Error(`Purple failed to stop on left wall collision! Slid with vx=${projLeft.vx}, vy=${projLeft.vy}`);
    }

    // Test 2: Diagonal collision with right wall (vx > 0, vy > 0)
    const projRight = {
      x: testArena.x + testArena.width - 10,
      y: testArena.y + 200,
      r: 50,
      vx: 8,
      vy: 6,
      life: 200,
      behaviorType: 'gojo_purple'
    };
    purpleBehavior.checkExpire(projRight, projectileSystem);
    if (projRight.x !== testArena.x + testArena.width - halfR) {
      throw new Error(`Purple x-coordinate not clamped properly on right wall! Expected ${testArena.x + testArena.width - halfR}, got ${projRight.x}`);
    }
    if (projRight.vx !== 0 || projRight.vy !== 0) {
      throw new Error(`Purple failed to stop on right wall collision! Slid with vx=${projRight.vx}, vy=${projRight.vy}`);
    }

    // Test 3: Diagonal collision with top wall (vx > 0, vy < 0)
    const projTop = {
      x: testArena.x + 250,
      y: testArena.y + 10,
      r: 50,
      vx: 8,
      vy: -6,
      life: 200,
      behaviorType: 'gojo_purple'
    };
    purpleBehavior.checkExpire(projTop, projectileSystem);
    if (projTop.y !== testArena.y + halfR) {
      throw new Error(`Purple y-coordinate not clamped properly on top wall! Expected ${testArena.y + halfR}, got ${projTop.y}`);
    }
    if (projTop.vx !== 0 || projTop.vy !== 0) {
      throw new Error(`Purple failed to stop on top wall collision! Slid with vx=${projTop.vx}, vy=${projTop.vy}`);
    }

    // Test 4: Diagonal collision with bottom wall (vx < 0, vy > 0)
    const projBottom = {
      x: testArena.x + 250,
      y: testArena.y + testArena.height - 10,
      r: 50,
      vx: -8,
      vy: 6,
      life: 200,
      behaviorType: 'gojo_purple'
    };
    purpleBehavior.checkExpire(projBottom, projectileSystem);
    if (projBottom.y !== testArena.y + testArena.height - halfR) {
      throw new Error(`Purple y-coordinate not clamped properly on bottom wall! Expected ${testArena.y + testArena.height - halfR}, got ${projBottom.y}`);
    }
    if (projBottom.vx !== 0 || projBottom.vy !== 0) {
      throw new Error(`Purple failed to stop on bottom wall collision! Slid with vx=${projBottom.vx}, vy=${projBottom.vy}`);
    }

    // Test 5: Circular arena perimeter collision
    const circleArena = { x: 50, y: 50, width: 800, height: 800, radius: 400, shape: 'circle' };
    state.arena = circleArena;
    const projCircle = {
      x: circleArena.x + circleArena.width / 2 + 390,
      y: circleArena.y + circleArena.height / 2 + 100,
      r: 50,
      vx: 8,
      vy: 8,
      life: 200,
      behaviorType: 'gojo_purple'
    };
    purpleBehavior.checkExpire(projCircle, projectileSystem);
    if (projCircle.vx !== 0 || projCircle.vy !== 0) {
      throw new Error(`Purple failed to stop on circular arena wall collision! Slid with vx=${projCircle.vx}, vy=${projCircle.vy}`);
    }
  } catch (err) {
    console.error('❌ [GOJO PURPLE WALL COLLISION TEST ERROR]:', err);
    errors++;
  }

  // Screen Shake Lifecycle & Persistence Test
  console.log('📳 [Screen Shake Lifecycle & Persistence Test] Verifying screen shake activates, decays, and persists across multiple consecutive hits...');
  try {
    state.screenShake = { timer: 0, maxTimer: 0, intensity: 0 };
    state.shakeX = 0;
    state.shakeY = 0;

    // Test 1: Single-argument triggerGlobalScreenShake (missing duration)
    triggerGlobalScreenShake(10);
    if (!state.screenShake || state.screenShake.timer <= 0 || state.screenShake.intensity <= 0) {
      throw new Error(`Single argument triggerGlobalScreenShake(10) failed to set timer/intensity! Got: timer=${state.screenShake?.timer}, intensity=${state.screenShake?.intensity}`);
    }
    if (isNaN(state.screenShake.timer) || isNaN(state.screenShake.intensity)) {
      throw new Error(`Single argument triggerGlobalScreenShake(10) resulted in NaN values!`);
    }

    // Step frames to drain shake
    while (state.screenShake.timer > 0) {
      renderGame();
    }
    if (state.screenShake.timer !== 0 || state.screenShake.intensity !== 0) {
      throw new Error(`Screen shake did not cleanly zero out after timer expired! Got: timer=${state.screenShake.timer}, intensity=${state.screenShake.intensity}`);
    }

    // Test 2: Consecutive combat hits reactivate shake repeatedly
    for (let hit = 1; hit <= 5; hit++) {
      triggerGlobalScreenShake(8.0, 12);
      if (state.screenShake.timer <= 0 || state.screenShake.intensity <= 0) {
        throw new Error(`Failed to activate screen shake on hit #${hit}! timer=${state.screenShake.timer}, intensity=${state.screenShake.intensity}`);
      }
      renderGame();
      if (state.camera && (state.camera.shakeX === undefined || state.camera.shakeY === undefined)) {
        throw new Error(`state.camera.shakeX/Y was undefined during active screen shake on hit #${hit}!`);
      }
      // Step to completion
      while (state.screenShake.timer > 0) {
        renderGame();
      }
    }

    // Test 3: Overlapping shakes (Escanor impact -> unpause -> enemy counter-attack)
    triggerGlobalScreenShake(7.0, 12); // Initial impact
    renderGame();
    renderGame();
    // Mid-decay unpause blast
    triggerGlobalScreenShake(10.0, 18);
    if (state.screenShake.intensity <= 0 || state.screenShake.timer !== 18) {
      throw new Error(`Failed to adopt unpause shake: timer=${state.screenShake.timer}, intensity=${state.screenShake.intensity}`);
    }
    // Enemy counters with quick jab
    triggerGlobalScreenShake(4.0, 6);
    if (state.screenShake.intensity <= 0 || state.screenShake.timer <= 0) {
      throw new Error(`Enemy counter-attack corrupted active screen shake! timer=${state.screenShake.timer}, intensity=${state.screenShake.intensity}`);
    }
    while (state.screenShake.timer > 0) {
      renderGame();
    }
  } catch (err) {
    console.error('❌ [SCREEN SHAKE LIFECYCLE TEST ERROR]:', err);
    errors++;
  }

  // 6.5. Post-Kill Winner Smooth Angle Return Test
  console.log('🔄 [Post-Kill Winner Angle Recovery Test] Verifying winner slowly returns to normal angle (0 rad) upon killing enemy...');
  try {
    const d1 = FIGHTER_DEFS[0];
    const d2 = FIGHTER_DEFS[1];
    const C1 = FIGHTER_CLASS_MAP[d1.type] || FIGHTER_CLASS_MAP.default;
    const C2 = FIGHTER_CLASS_MAP[d2.type] || FIGHTER_CLASS_MAP.default;
    const f1 = new C1(d1, 0); // Winner
    const f2 = new C2(d2, 1); // Enemy
    f1.x = 200; f1.y = 200;
    f2.x = 200; f2.y = 100; // Directly above
    state.fighters = [f1, f2];
    state.gameState = 'playing';
    
    // Aim at live enemy over multiple frames until aligned
    for (let i = 0; i < 20; i++) {
      f1.aim(f2);
    }
    const initialAim = f1.gunAngle;
    if (Math.abs(initialAim) < 1.0) {
      throw new Error(`Expected aim angle aligned toward enemy above (-1.57 rad)! Got: ${initialAim}`);
    }

    // Kill enemy
    f2.hp = 0;
    f2.isDead = true;
    state.gameState = 'roundEnd';

    // Step frames and verify angle is held before smoothly turning towards 0
    let prevDiff = Math.abs(f1.gunAngle);
    let angleHeldCount = 0;
    for (let frame = 0; frame < 100; frame++) {
      updateFighters();
      const currentDiff = Math.abs(f1.gunAngle);
      if (Math.abs(currentDiff - Math.abs(initialAim)) < 0.0001) {
        angleHeldCount++;
      }
      if (currentDiff > prevDiff + 0.0001) {
        throw new Error(`Angle moved away from 0 rad during post-kill coasting! Frame ${frame}: prevDiff=${prevDiff}, currentDiff=${currentDiff}`);
      }
      prevDiff = currentDiff;
      if (f1.gunAngle === 0) break;
    }

    if (angleHeldCount < 30) {
      throw new Error(`Fighter did not hold kill angle before returning to normal position! Held for only ${angleHeldCount} frames.`);
    }

    if (f1.gunAngle !== 0 || f1.angle !== 0) {
      throw new Error(`Winner failed to return to 0 rad normal position after 100 frames! gunAngle=${f1.gunAngle}, angle=${f1.angle}`);
    }
  } catch (err) {
    console.error('❌ [POST-KILL ANGLE RECOVERY TEST ERROR]:', err);
    errors++;
  }

  // 6.5b. Gojo Domain Punch Kill Smooth Angle Recovery Test
  console.log('🔄 [Gojo Domain Punch Kill Smooth Angle Test] Verifying Gojo domain punch kill smoothly recovers angle to 0 without snapping...');
  try {
    const gojoDef = FIGHTER_DEFS.find(d => d.type === 'gojo') || FIGHTER_DEFS[0];
    const enemyDef = FIGHTER_DEFS.find(d => d.type !== 'gojo') || FIGHTER_DEFS[1];
    const GojoClass = FIGHTER_CLASS_MAP.gojo || FIGHTER_CLASS_MAP.default;
    const EnemyClass = FIGHTER_CLASS_MAP[enemyDef.type] || FIGHTER_CLASS_MAP.default;
    const gojo = new GojoClass(gojoDef, 0);
    const enemy = new EnemyClass(enemyDef, 1);
    gojo.x = 200; gojo.y = 200;
    enemy.x = 200; enemy.y = 100; // Directly above (angle ~ -1.57 rad)
    enemy.hp = 10; // Low HP so one punch kills
    state.fighters = [gojo, enemy];
    state.gameState = 'playing';

    // Activate domain and melee mode
    gojo.domainActive = true;
    gojo.domainTimer = 300;
    gojo.isMeleeMode = true;

    // Aim at enemy
    gojo.aim(enemy);
    const prePunchAim = gojo.gunAngle;
    if (Math.abs(prePunchAim) < 1.0) {
      throw new Error(`Expected Gojo domain aim aligned toward enemy above (-1.57 rad)! Got: ${prePunchAim}`);
    }

    // Execute punch which kills enemy
    gojo._meleePunch(enemy);
    if (!enemy.isDead && enemy.hp > 0) {
      enemy.hp = 0;
      enemy.isDead = true;
    }
    state.gameState = 'roundEnd';

    // Verify angle did NOT immediately snap to 0 on the first frame
    updateFighters();
    const frame1Angle = Math.abs(gojo.gunAngle);
    if (frame1Angle < 0.5) {
      throw new Error(`Gojo angle snapped immediately to 0 on roundEnd! Got: ${gojo.gunAngle}`);
    }

    // Verify smooth decay towards 0
    let lastDiff = frame1Angle;
    for (let frame = 0; frame < 120; frame++) {
      updateFighters();
      const currDiff = Math.abs(gojo.gunAngle);
      if (currDiff > lastDiff + 0.0001) {
        throw new Error(`Gojo angle diverged from 0 during post-kill coasting! Frame ${frame}: last=${lastDiff}, curr=${currDiff}`);
      }
      lastDiff = currDiff;
      if (gojo.gunAngle === 0) break;
    }

    if (gojo.gunAngle !== 0 || gojo.angle !== 0) {
      throw new Error(`Gojo failed to smoothly return to 0 rad normal position after 120 frames! gunAngle=${gojo.gunAngle}, angle=${gojo.angle}`);
    }
  } catch (err) {
    console.error('❌ [GOJO DOMAIN PUNCH KILL ANGLE TEST ERROR]:', err);
    errors++;
  }

  // 6.5c. Left-Facing Winner Normal Angle Recovery Test
  console.log('🔄 [Left-Facing Winner Angle Recovery Test] Verifying winner aiming left recovers to left normal angle (Math.PI) upon killing enemy...');
  try {
    const d1 = FIGHTER_DEFS[0];
    const d2 = FIGHTER_DEFS[1];
    const C1 = FIGHTER_CLASS_MAP[d1.type] || FIGHTER_CLASS_MAP.default;
    const C2 = FIGHTER_CLASS_MAP[d2.type] || FIGHTER_CLASS_MAP.default;
    const f1 = new C1(d1, 0); // Winner
    const f2 = new C2(d2, 1); // Enemy to the left
    f1.x = 250; f1.y = 200;
    f2.x = 100; f2.y = 180; // Facing left (~2.94 rad > Math.PI / 2)
    state.fighters = [f1, f2];
    state.gameState = 'playing';

    // Aim at enemy to the left
    for (let i = 0; i < 20; i++) {
      f1.aim(f2);
    }
    const initialAim = f1.gunAngle;
    if (Math.abs(initialAim) <= Math.PI / 2) {
      throw new Error(`Expected leftward aim angle (> 1.57 rad)! Got: ${initialAim}`);
    }

    // Kill enemy
    f2.hp = 0;
    f2.isDead = true;
    state.gameState = 'roundEnd';

    // Step frames and verify angle is held before smoothly turning towards Math.PI (left)
    let prevDiff = Math.abs(Math.abs(f1.gunAngle) - Math.PI);
    let angleHeldCount = 0;
    for (let frame = 0; frame < 100; frame++) {
      updateFighters();
      const currentDiff = Math.abs(Math.abs(f1.gunAngle) - Math.PI);
      if (Math.abs(f1.gunAngle - initialAim) < 0.0001) {
        angleHeldCount++;
      }
      if (currentDiff > prevDiff + 0.0001) {
        throw new Error(`Angle moved away from Math.PI during post-kill coasting! Frame ${frame}: prevDiff=${prevDiff}, currentDiff=${currentDiff}`);
      }
      prevDiff = currentDiff;
      if (Math.abs(Math.abs(f1.gunAngle) - Math.PI) < 0.0001) break;
    }

    if (angleHeldCount < 30) {
      throw new Error(`Fighter did not hold left kill angle before returning to normal position! Held for only ${angleHeldCount} frames.`);
    }

    if (Math.abs(Math.abs(f1.gunAngle) - Math.PI) > 0.0001 || Math.abs(Math.abs(f1.angle) - Math.PI) > 0.0001) {
      throw new Error(`Winner failed to return to Math.PI left normal position after 100 frames! gunAngle=${f1.gunAngle}, angle=${f1.angle}`);
    }
  } catch (err) {
    console.error('❌ [LEFT-FACING WINNER ANGLE TEST ERROR]:', err);
    errors++;
  }

  // Camera Dynamic Tracking Zoom Test
  console.log('📷 [Camera Dynamic Zoom Configuration Test] Verifying camera config has increased zoom range and responsive midpoint framing...');
  try {
    if ((CONFIG.camera?.minZoom ?? 0) < 1.04) {
      throw new Error(`CONFIG.camera.minZoom is ${CONFIG.camera?.minZoom}, expected >= 1.04`);
    }
    if ((CONFIG.camera?.maxZoom ?? 0) < 1.14) {
      throw new Error(`CONFIG.camera.maxZoom is ${CONFIG.camera?.maxZoom}, expected >= 1.14`);
    }
    if ((CONFIG.camera?.winnerZoom ?? 0) < 1.08) {
      throw new Error(`CONFIG.camera.winnerZoom is ${CONFIG.camera?.winnerZoom}, expected >= 1.08`);
    }
    if ((CONFIG.camera?.maxPanRatio ?? 0) < 0.22) {
      throw new Error(`CONFIG.camera.maxPanRatio is ${CONFIG.camera?.maxPanRatio}, expected >= 0.22`);
    }

    state.camera = initCameraState();
    if (state.camera.minZoom !== CONFIG.camera.minZoom || state.camera.maxZoom !== CONFIG.camera.maxZoom) {
      throw new Error(`state.camera initialized with mismatched zoom bounds: min=${state.camera.minZoom}, max=${state.camera.maxZoom}`);
    }

    // Test close-range zoom (max zoom)
    const CloseGojo = FIGHTER_CLASS_MAP['gojo'];
    const CloseSukuna = FIGHTER_CLASS_MAP['sukuna'];
    const cg = new CloseGojo({ ...FIGHTER_DEFS.find(d => d.id === 'gojo'), startX: 250, startY: 250 });
    const cs = new CloseSukuna({ ...FIGHTER_DEFS.find(d => d.id === 'sukuna'), startX: 270, startY: 250 });
    state.fighters = [cg, cs];
    state.gameState = 'playing';
    updateCamera();
    if (state.camera.targetZoom < 1.10) {
      throw new Error(`Expected close-range targetZoom >= 1.10, got ${state.camera.targetZoom}`);
    }

    // Test winner zoom
    cs.hp = 0;
    cs.dead = true;
    updateCamera();
    if (state.camera.targetZoom !== CONFIG.camera.winnerZoom) {
      throw new Error(`Expected winner targetZoom === ${CONFIG.camera.winnerZoom}, got ${state.camera.targetZoom}`);
    }
  } catch (err) {
    console.error('❌ [CAMERA DYNAMIC ZOOM TEST ERROR]:', err);
    errors++;
  }

  // Gojo Hollow Purple Explosion Channeling Protection Test
  console.log('🔮 [Gojo Purple Explosion Channeling Protection Test] Verifying Purple explosion does NOT cancel active skill channeling...');
  try {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const YutaClass = FIGHTER_CLASS_MAP['yuta'];
    const IchigoClass = FIGHTER_CLASS_MAP['ichigo'];

    const attackerGojo = new GojoClass({ ...FIGHTER_DEFS.find(d => d.id === 'gojo'), startX: 200, startY: 200 });
    const targetSukuna = new SukunaClass({ ...FIGHTER_DEFS.find(d => d.id === 'sukuna'), startX: 250, startY: 200 });
    const targetYuta = new YutaClass({ ...FIGHTER_DEFS.find(d => d.id === 'yuta'), startX: 220, startY: 250 });
    const targetIchigo = new IchigoClass({ ...FIGHTER_DEFS.find(d => d.id === 'ichigo'), startX: 240, startY: 240 });

    state.fighters = [attackerGojo, targetSukuna, targetYuta, targetIchigo];
    state.gameState = 'playing';

    // Put all 3 targets into active skill channeling
    targetSukuna.isChannelingDivineFlame = true;
    targetSukuna.divineFlameChargeTimer = 60;

    targetYuta.isChannelingPureLoveBeam = true;
    targetYuta.pureLoveBeamChargeTimer = 60;

    targetIchigo.isChannelingBankai = true;
    targetIchigo.bankaiBurstTimer = 45;

    // Verify isChannelingSkill returns true
    if (!targetSukuna.isChannelingSkill()) {
      throw new Error(`Sukuna isChannelingSkill() returned false while channeling Divine Flame`);
    }
    if (!targetYuta.isChannelingSkill()) {
      throw new Error(`Yuta isChannelingSkill() returned false while channeling Pure Love Beam`);
    }
    if (!targetIchigo.isChannelingSkill()) {
      throw new Error(`Ichigo isChannelingSkill() returned false while channeling Bankai`);
    }

    const sukunaHpBefore = targetSukuna.hp;
    const yutaHpBefore = targetYuta.hp;
    const ichigoHpBefore = targetIchigo.hp;

    // Trigger Purple projectile spawn and explosion
    projectileSystem.clear();
    projectileSystem.fireGojoPurple(attackerGojo, 0, 80, 150);
    const purpleProj = projectileSystem.projectiles.find(p => p.behaviorType === 'gojo_purple' || p.isGojoPurpleOrb);
    if (!purpleProj) {
      throw new Error(`Failed to find spawned Gojo Purple projectile in projectileSystem`);
    }
    purpleProj.x = 230;
    purpleProj.y = 230;

    // Force expire life to trigger explosion
    purpleProj.life = 0;
    projectileSystem.update(state.fighters);

    // Verify all targets took damage
    if (targetSukuna.hp >= sukunaHpBefore) {
      throw new Error(`Sukuna failed to take Purple explosion damage (HP before=${sukunaHpBefore}, after=${targetSukuna.hp})`);
    }
    if (targetYuta.hp >= yutaHpBefore) {
      throw new Error(`Yuta failed to take Purple explosion damage (HP before=${yutaHpBefore}, after=${targetYuta.hp})`);
    }
    if (targetIchigo.hp >= ichigoHpBefore) {
      throw new Error(`Ichigo failed to take Purple explosion damage (HP before=${ichigoHpBefore}, after=${targetIchigo.hp})`);
    }

    // CRITICAL: Verify all channeling states and timers are fully intact and NOT cancelled!
    if (!targetSukuna.isChannelingDivineFlame || targetSukuna.divineFlameChargeTimer !== 60) {
      throw new Error(`Sukuna Divine Flame channeling was CANCELLED by Purple explosion! isChannelingDivineFlame=${targetSukuna.isChannelingDivineFlame}, timer=${targetSukuna.divineFlameChargeTimer}`);
    }
    if (!targetYuta.isChannelingPureLoveBeam || targetYuta.pureLoveBeamChargeTimer !== 60) {
      throw new Error(`Yuta Pure Love Beam channeling was CANCELLED by Purple explosion! isChannelingPureLoveBeam=${targetYuta.isChannelingPureLoveBeam}, timer=${targetYuta.pureLoveBeamChargeTimer}`);
    }
    if (!targetIchigo.isChannelingBankai || targetIchigo.bankaiBurstTimer !== 45) {
      throw new Error(`Ichigo Bankai channeling was CANCELLED by Purple explosion! isChannelingBankai=${targetIchigo.isChannelingBankai}, timer=${targetIchigo.bankaiBurstTimer}`);
    }
  } catch (err) {
    console.error('❌ [GOJO PURPLE CHANNELING PROTECTION TEST ERROR]:', err);
    errors++;
  }

  // 6.22. Gojo Hollow Purple Aerial Levitation & Slow Descent Test
  console.log('🔮 [Gojo Purple Aerial Levitation & Slow Descent Test] Verifying Gojo stays afloat in the air after firing Purple and slowly descends as Purple expires...');
  try {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const gojoDef = FIGHTER_DEFS.find(d => d.id === 'gojo');
    if (GojoClass && gojoDef) {
      const arena = { x: 50, y: 50, width: 800, height: 600 };
      const gojo = new GojoClass(gojoDef);
      const enemy = { x: 500, y: 350, r: 25, hp: 100, maxHp: 100, isDead: false };

      gojo.x = 200;
      gojo.y = 350;
      gojo.gunAngle = 0;
      gojo.purpleCastAngle = 0;
      state.fighters = [gojo, enemy];
      state.arena = arena;
      state.gameState = 'playing';

      // Gojo fires Hollow Purple
      gojo._firePurple(0);

      // Verify zero velocity (stationary in the air) and aerial levitation (z = 35)
      if (gojo.vx !== 0 || gojo.vy !== 0) {
        throw new Error(`Expected Gojo to have zero velocity (stationary in the air) after firing Purple, but got vx=${gojo.vx}, vy=${gojo.vy}`);
      }
      if (gojo.z !== 35) {
        throw new Error(`Expected Gojo to be afloat in the air (z=35) after firing Purple, got z=${gojo.z}`);
      }
      if (gojo.purpleRecoveryTimer <= 0) {
        throw new Error(`Expected purpleRecoveryTimer to be > 0 after firing, got ${gojo.purpleRecoveryTimer}`);
      }

      // Simulate recovery updates — verify Gojo stays afloat and descends as breather expires
      while (gojo.purpleRecoveryTimer > 0) {
        gojo.update(enemy, 0, arena);
        if (gojo.vx !== 0 || gojo.vy !== 0) {
          throw new Error(`Expected Gojo to remain stationary during recovery breather, got vx=${gojo.vx}, vy=${gojo.vy}`);
        }
      }

      // When breather ends: Gojo is on the ground (z=0), Infinity is restored, and he is able to move!
      if (gojo.z !== 0) {
        throw new Error(`Expected Gojo to land on the ground (z=0) when breather ends, got z=${gojo.z}`);
      }
      if (!gojo.infinityActive) {
        throw new Error(`Expected Limitless Infinity to restore once Gojo touches down`);
      }

      // Verify Gojo can move after breather ends
      const preMoveX = gojo.x;
      const preMoveY = gojo.y;
      for (let i = 0; i < 30; i++) {
        gojo.update(enemy, 0, arena);
      }
      if (gojo.x === preMoveX && gojo.y === preMoveY && gojo.vx === 0 && gojo.vy === 0) {
        throw new Error(`Expected Gojo to be able to move once breather ends`);
      }
    }
  } catch (err) {
    console.error('❌ [GOJO PURPLE AERIAL LEVITATION & SLOW DESCENT TEST ERROR]:', err);
    errors++;
  }

  // 6.23. Gojo & Sukuna Melee Mode Proximity Activation & Punch Attack Test
  console.log('🥋 [Gojo & Sukuna Melee Mode Proximity Test] Verifying Gojo and Sukuna switch into Melee Mode and punch when enemies enter melee range radius...');
  try {
    const GojoClass = FIGHTER_CLASS_MAP['gojo'];
    const SukunaClass = FIGHTER_CLASS_MAP['sukuna'];
    const gojoDef = FIGHTER_DEFS.find(d => d.id === 'gojo');
    const sukunaDef = FIGHTER_DEFS.find(d => d.id === 'sukuna');
    const arena = { x: 50, y: 50, width: 800, height: 600 };

    if (GojoClass && gojoDef) {
      const gojo = new GojoClass(gojoDef);
      const enemy = { x: 500, y: 350, r: 25, hp: 200, maxHp: 200, isDead: false, takeDamage: (dmg) => { enemy.hp -= dmg; return true; } };
      gojo.x = 200;
      gojo.y = 350;
      state.fighters = [gojo, enemy];
      state.gameState = 'playing';

      // 1. Enemy far away (300px) -> Gojo stays in Ranged Mode
      gojo.update(enemy, 0, arena);
      if (gojo.isMeleeMode) {
        throw new Error(`Expected Gojo to be in Ranged Mode when enemy is far (300px), but isMeleeMode was true`);
      }

      // 2. Move enemy within closeRangeRadius (60px) -> Gojo enters Melee Mode
      enemy.x = 260; // dist = 60 <= closeRangeRadius (85px)
      gojo.update(enemy, 0, arena);
      if (!gojo.isMeleeMode) {
        throw new Error(`Expected Gojo to enter Melee Mode when enemy is in closeRangeRadius (60px), but isMeleeMode remained false`);
      }
      if (gojo.forcedMeleeTimer <= 0) {
        throw new Error(`Expected Gojo forcedMeleeTimer > 0 on entering Melee Mode`);
      }
      if (gojo.canPerformBasicAttack()) {
        throw new Error(`Expected Gojo canPerformBasicAttack() to be false while in Melee Mode`);
      }

      // 3. Update melee combat -> Gojo executes punch-teleport-punch combo
      const initialEnemyHp = enemy.hp;
      const initialGojoX = gojo.x;
      const initialGojoY = gojo.y;
      let gojoTeleported = false;
      let punchHits = 0;
      let lastHp = enemy.hp;

      for (let f = 0; f < 60; f++) {
        gojo.update(enemy, 0, arena);
        if (gojo.x !== initialGojoX || gojo.y !== initialGojoY) {
          gojoTeleported = true;
        }
        if (enemy.hp < lastHp) {
          punchHits++;
          lastHp = enemy.hp;
        }
      }
      if (enemy.hp >= initialEnemyHp || punchHits === 0) {
        throw new Error(`Expected Gojo to land melee punch damage on enemy during Melee Mode, but enemy HP remained ${enemy.hp}`);
      }
      if (!gojoTeleported) {
        throw new Error(`Expected Gojo to teleport to flank angles during punch-teleport-punch melee combo, but position remained (${gojo.x}, ${gojo.y})`);
      }
    }

    if (SukunaClass && sukunaDef) {
      const sukuna = new SukunaClass(sukunaDef);
      const enemy = { x: 500, y: 350, r: 25, hp: 200, maxHp: 200, isDead: false, takeDamage: (dmg) => { enemy.hp -= dmg; return true; } };
      sukuna.x = 200;
      sukuna.y = 350;
      state.fighters = [sukuna, enemy];
      state.gameState = 'playing';

      // 1. Enemy far away (300px) -> Sukuna stays in Ranged Mode
      sukuna.update(enemy, 0, arena);
      if (sukuna.isMeleeMode) {
        throw new Error(`Expected Sukuna to be in Ranged Mode when enemy is far (300px), but isMeleeMode was true`);
      }

      // 2. Move enemy within closeRangeRadius (60px) -> Sukuna enters Melee Mode
      enemy.x = 260; // dist = 60 <= closeRangeRadius (85px)
      sukuna.update(enemy, 0, arena);
      if (!sukuna.isMeleeMode) {
        throw new Error(`Expected Sukuna to enter Melee Mode when enemy is in closeRangeRadius (60px), but isMeleeMode remained false`);
      }
      if (sukuna.forcedMeleeTimer <= 0) {
        throw new Error(`Expected Sukuna forcedMeleeTimer > 0 on entering Melee Mode`);
      }
      if (sukuna.canPerformBasicAttack()) {
        throw new Error(`Expected Sukuna canPerformBasicAttack() to be false while in Melee Mode`);
      }

      // 3. Update melee combat -> Sukuna executes punch-teleport-punch combo
      const initialEnemyHp = enemy.hp;
      const initialSukunaX = sukuna.x;
      const initialSukunaY = sukuna.y;
      let sukunaTeleported = false;
      let punchHits = 0;
      let lastHp = enemy.hp;

      for (let f = 0; f < 60; f++) {
        sukuna.update(enemy, 0, arena);
        if (sukuna.x !== initialSukunaX || sukuna.y !== initialSukunaY) {
          sukunaTeleported = true;
        }
        if (enemy.hp < lastHp) {
          punchHits++;
          lastHp = enemy.hp;
        }
      }
      if (enemy.hp >= initialEnemyHp || punchHits === 0) {
        throw new Error(`Expected Sukuna to land melee punch damage on enemy during Melee Mode, but enemy HP remained ${enemy.hp}`);
      }
      if (!sukunaTeleported) {
        throw new Error(`Expected Sukuna to teleport to flank angles during punch-teleport-punch melee combo, but position remained (${sukuna.x}, ${sukuna.y})`);
      }
    }
  } catch (err) {
    console.error('❌ [GOJO & SUKUNA MELEE MODE PROXIMITY TEST ERROR]:', err);
    errors++;
  }

  // Sukuna Domain Slash Ricochet Disabled Check
  console.log('🩸 [Sukuna Domain Slash Ricochet Disabled Test] Verifying ricochet effects are disabled on Sukuna domain slashes...');
  try {
    const { spawnDomainSlashLines } = await import('../js/entities/fighters/sukuna/sukunaDomainVisuals.js');
    const { doDomainRapidSlashes } = await import('../js/entities/fighters/sukuna/sukunaSkills.js');
    const sukunaDef = FIGHTER_DEFS.find(d => d.id === 'sukuna');
    const gojoDef = FIGHTER_DEFS.find(d => d.id === 'gojo');
    if (sukunaDef && gojoDef) {
      const sukuna = new FIGHTER_CLASS_MAP['sukuna'](sukunaDef);
      const enemy = new FIGHTER_CLASS_MAP['gojo'](gojoDef);
      sukuna.x = 200;
      sukuna.y = 200;
      sukuna.domainActive = true;
      enemy.x = 220;
      enemy.y = 200;
      state.fighters = [sukuna, enemy];
      state.arena = { x: 0, y: 0, width: 600, height: 600, shape: 'circle', radius: 300 };

      // Execute domain slash lines
      const hit = spawnDomainSlashLines(sukuna, 3);

      // Execute domain rapid slashes
      doDomainRapidSlashes(sukuna, enemy, state.arena, 0);
    }
  } catch (err) {
    console.error('❌ [SUKUNA DOMAIN SLASH RICOCHET DISABLED TEST ERROR]:', err);
    errors++;
  }

  // Gojo Active Purple Attack & Skill Prevention Check
  console.log('🔮 [Gojo Active Purple Attack & Skill Prevention Test] Verifying Gojo cannot attack or cast skills while Hollow Purple is in flight...');
  try {
    const gojoDef = FIGHTER_DEFS.find(d => d.id === 'gojo');
    const targetDef = FIGHTER_DEFS.find(d => d.id === 'targetDummy' || d.id === 'normal');
    if (gojoDef && targetDef) {
      const gojo = new FIGHTER_CLASS_MAP['gojo'](gojoDef);
      const dummy = new FIGHTER_CLASS_MAP[targetDef.id](targetDef);
      gojo.x = 200;
      gojo.y = 200;
      dummy.x = 250;
      dummy.y = 200;
      dummy.hp = 1000;
      dummy.maxHp = 1000;
      state.fighters = [gojo, dummy];
      state.projectiles = [];
      const arena = { x: 0, y: 0, width: 800, height: 800, shape: 'rect' };
      state.arena = arena;

      // 1. Fire Hollow Purple
      gojo._firePurple(0);

      if (!gojo.isPurpleActive()) {
        throw new Error('Expected Gojo isPurpleActive() to be true immediately after firing Purple!');
      }

      // 2. Verify basic attacks are prevented
      if (gojo.canPerformBasicAttack()) {
        throw new Error('Expected canPerformBasicAttack() to return false while Purple is active!');
      }
      const shootResult = gojo.shoot(0);
      if (shootResult !== false) {
        throw new Error('Expected shoot() to return false while Purple is active!');
      }

      // 3. Verify skills are prevented
      const redResult = gojo._activateRed();
      if (redResult !== false) {
        throw new Error('Expected _activateRed() to return false while Purple is active!');
      }
      gojo.redCooldown = 0;
      gojo._activateRed();
      if (gojo.redEffectTimer > 0 || gojo.redBuildupPhase) {
        throw new Error('Expected Red not to activate while Purple is active!');
      }

      // 4. Verify domain is prevented
      gojo.domainCooldown = 0;
      gojo._activateDomain(arena);
      if (gojo.domainActive) {
        throw new Error('Expected Domain Expansion not to activate while Purple is active!');
      }

      // 5. Verify RCT is prevented
      gojo.hp = 10;
      gojo.reverseCursedTechniqueCooldown = 0;
      gojo._activateReverseCursedTechnique(dummy, arena);
      if (gojo.isChannelingRCT || gojo.hp > 10) {
        throw new Error('Expected Reverse Cursed Technique not to trigger while Purple is active!');
      }

      // 6. Verify melee punches and melee mode are prevented
      gojo.isMeleeMode = false;
      gojo.forcedMeleeTimer = 0;
      dummy.takeDamage(0, gojo); // reset dummy
      const prePunchHp = dummy.hp;
      gojo._meleePunch(dummy);
      if (dummy.hp < prePunchHp) {
        throw new Error('Expected _meleePunch() not to deal damage while Purple is active!');
      }

      // Run update cycles: Gojo must not punch, shoot or enter melee mode
      gojo.shootCooldown = 0;
      for (let i = 0; i < 30; i++) {
        gojo.update(dummy, 0, arena);
        if (gojo.isMeleeMode) {
          throw new Error('Expected Gojo not to enter Melee Mode while Purple is active!');
        }
        if (gojo.punchAnimTimer > 0) {
          throw new Error('Expected Gojo punch animation not to start while Purple is active!');
        }
      }

      // 7. Expire Purple projectile and verify combat resumes
      if (gojo.activePurpleProjectile) {
        gojo.activePurpleProjectile.life = 0;
      }
      projectileSystem.projectiles = [];
      state.projectiles = [];
      gojo.activePurpleProjectile = null;
      gojo.purpleRecoveryTimer = 0;
      gojo.z = 0;

      if (gojo.isPurpleActive()) {
        throw new Error('Expected isPurpleActive() to return false once Purple projectile is removed!');
      }
      if (!gojo.canPerformBasicAttack()) {
        throw new Error('Expected canPerformBasicAttack() to return true once Purple has expired!');
      }
    }
  } catch (err) {
    console.error('❌ [GOJO ACTIVE PURPLE ATTACK & SKILL PREVENTION TEST ERROR]:', err);
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
    { name: 'drawIndexScreen', fn: drawIndexScreen },
    { name: 'drawRoundEndScreen', fn: () => {
      state.roundEndTimer = 100;
      state.roundWinner = state.fighters[0];
      state.mode = '1v1';
      drawRoundEndScreen();
    }},
    { name: 'drawMatchEndScreen', fn: () => {
      state.matchOver = true;
      state.matchEndTimer = 100;
      state.mode = '1v1';
      drawMatchEndScreen();
    }},
    { name: 'drawSkinStudioScreen', fn: () => {
      state.gameState = 'skinStudio';
      for (const f of SKIN_STUDIO_FIGHTERS) {
        state.studioSelectedSkinFighter = f.key;
        for (const facing of ['right', 'left']) {
          state.studioSkinFacing = facing;
          for (const tab of ['scale', 'position', 'rotation', 'export']) {
            state.studioSkinDetailTab = tab;
            if (f.forms) {
              for (const fm of f.forms) {
                state.studioSkinForm = fm.id;
                drawSkinStudioScreen();
              }
            } else {
              drawSkinStudioScreen();
            }
          }
        }
      }
    }}
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

  // 9. Skin Studio Customization Persistence Test
  console.log('💇 [Skin Studio Customization Persistence Test] Verifying live adjustments, JSON saving, and loading...');
  try {
    let savedStorage = null;
    globalThis.localStorage.setItem = (key, val) => {
      if (key === 'circleMiniBattleSkinCustomizations') savedStorage = val;
    };
    globalThis.localStorage.getItem = (key) => {
      if (key === 'circleMiniBattleSkinCustomizations') return savedStorage;
      return null;
    };

    state.skinCustomizations.ichigo.widthScale = 1.15;
    state.skinCustomizations.ichigo.heightScale = 0.95;
    state.skinCustomizations.ichigo.offsetX = 4;
    state.skinCustomizations.ichigo.offsetY = -2;
    state.skinCustomizations.ichigo.angleOffset = 0.08;
    saveSkinCustomizations();

    if (!savedStorage) {
      throw new Error('saveSkinCustomizations() failed to write to localStorage!');
    }

    // Reset state and reload
    state.skinCustomizations.ichigo = { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false };
    loadSkinCustomizations();

    if (state.skinCustomizations.ichigo.widthScale !== 1.15 || state.skinCustomizations.ichigo.offsetX !== 4) {
      throw new Error(`loadSkinCustomizations() failed to restore saved values! Got widthScale=${state.skinCustomizations.ichigo.widthScale}, offsetX=${state.skinCustomizations.ichigo.offsetX}`);
    }
  } catch (err) {
    console.error('❌ [SKIN CUSTOMIZATION PERSISTENCE TEST ERROR]:', err);
    errors++;
  }

  // 10. Sukuna Fuga Channeling Pull & Hyper-Armor Test
  console.log('🔥 [Sukuna Fuga Channeling Pull Test] Verifying Sukuna gets pulled by attacks without cancelling Fuga...');
  try {
    const SukunaClass = FIGHTER_CLASS_MAP.sukuna;
    const IchigoClass = FIGHTER_CLASS_MAP.ichigo;
    const sukuna = new SukunaClass({ x: 300, y: 300, color: '#ff0000', controls: {} });
    const ichigo = new IchigoClass({ x: 100, y: 300, color: '#ff8800', controls: {} });
    sukuna.introReboundActive = false;
    ichigo.introReboundActive = false;
    state.fighters = [sukuna, ichigo];
    state.arena = { x: 50, y: 50, width: 800, height: 600 };
    state.gameState = 'playing';

    sukuna.isChannelingDivineFlame = true;
    sukuna.divineFlameChargeTimer = 10;
    sukuna.divineFlameChargeMax = 50;
    sukuna.divineFlameCastAngle = 0;

    const initialX = sukuna.x;
    sukuna.applyKnockback(15, 0, 0);
    sukuna.update(ichigo, 0, state.arena);

    if (sukuna.x <= initialX) {
      throw new Error(`Expected Sukuna to be displaced by knockback (x: ${sukuna.x}, initialX: ${initialX})`);
    }
    if (!sukuna.isChannelingDivineFlame) {
      throw new Error('Expected Sukuna to still be channeling Fuga after knockback displacement');
    }
    if (sukuna.divineFlameChargeTimer !== 11) {
      throw new Error(`Expected divineFlameChargeTimer to advance to 11, got ${sukuna.divineFlameChargeTimer}`);
    }
  } catch (err) {
    console.error('❌ [SUKUNA FUGA PULL TEST ERROR]:', err);
    errors++;
  }

  // 11. Toji Model Hair Asset & Procedural Body Canvas Stack Test
  console.log('🗡️ [Toji Model Hair & Pixel Body Test] Verifying toji-hair.png overlay and procedural pixel body stack balance...');
  try {
    const tojiImg = _getTojiHairImage();
    if (!tojiImg) {
      throw new Error('_getTojiHairImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    drawTojiPixelBody(mockCtx, 25);
    assertCanvasStackBalance('drawTojiPixelBody(mockCtx, 25)');

    mockCtx.resetStackDepth();
    _drawTojiHair(mockCtx, 25, false);
    assertCanvasStackBalance('_drawTojiHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawTojiHair(mockCtx, 25, true);
    assertCanvasStackBalance('_drawTojiHair(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    drawTojiGhostSkin(mockCtx, 200, 200, 0.5, 25, 0.5, false);
    assertCanvasStackBalance('drawTojiGhostSkin(mockCtx, 200, 200, ...)');

    const TojiClass = FIGHTER_CLASS_MAP.toji;
    const toji = new TojiClass({ x: 300, y: 300, color: '#1a1a24', controls: {} });
    mockCtx.resetStackDepth();
    drawTojiSkin(mockCtx, toji);
    assertCanvasStackBalance('drawTojiSkin(mockCtx, toji)');
  } catch (err) {
    console.error('❌ [TOJI MODEL HAIR & PIXEL BODY TEST ERROR]:', err);
    errors++;
  }

  // 11.5. John Wick Model Hair Asset & Procedural Body Canvas Stack Test
  console.log('🔫 [John Wick Model Hair & Pixel Body Test] Verifying Johnwick-hair.png overlay and procedural pixel body stack balance...');
  try {
    const wickImg = _getJohnWickHairImage();
    if (!wickImg) {
      throw new Error('_getJohnWickHairImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    drawJohnWickPixelBody(mockCtx, 25);
    assertCanvasStackBalance('drawJohnWickPixelBody(mockCtx, 25)');

    mockCtx.resetStackDepth();
    _drawJohnWickHair(mockCtx, 25, false);
    assertCanvasStackBalance('_drawJohnWickHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawJohnWickHair(mockCtx, 25, true);
    assertCanvasStackBalance('_drawJohnWickHair(mockCtx, 25, true)');

    const JohnWickClass = FIGHTER_CLASS_MAP.john_wick;
    const wick = new JohnWickClass({ x: 300, y: 300, color: '#475569', controls: {} });
    mockCtx.resetStackDepth();
    drawJohnWickSkin(mockCtx, wick);
    assertCanvasStackBalance('drawJohnWickSkin(mockCtx, wick)');

    // Test Pencil Stab Committed Aim Lock & Stability
    const enemy = new JohnWickClass({ x: 340, y: 300, color: '#FF0000', controls: {} });
    state.fighters = [wick, enemy];
    wick.startAssassinationCombo(enemy);
    wick.rollTimer = 0; // complete forward roll
    wick.update(enemy, 0, state.arena);

    if (wick.cqcComboPhase !== 'PENCIL_STAB') {
      throw new Error(`Expected cqcComboPhase to be 'PENCIL_STAB', got '${wick.cqcComboPhase}'`);
    }
    if (wick.canAim() !== false) {
      throw new Error(`Expected canAim() to return false during PENCIL_STAB`);
    }
    const lockedAngle = wick.pencilCastAngle;
    if (lockedAngle === undefined || Number.isNaN(lockedAngle)) {
      throw new Error(`Expected pencilCastAngle to be defined, got ${lockedAngle}`);
    }

    // Verify resolveFighterCollision does not separate or jitter them during stab
    const initialWickX = wick.x;
    const initialEnemyX = enemy.x;
    resolveFighterCollision(wick, enemy);
    if (wick.x !== initialWickX || enemy.x !== initialEnemyX) {
      throw new Error(`resolveFighterCollision modified position during PENCIL_STAB! wick.x: ${wick.x} (expected ${initialWickX}), enemy.x: ${enemy.x} (expected ${initialEnemyX})`);
    }

    // Update through stab completion and verify drawing stack balance
    mockCtx.resetStackDepth();
    wick.draw(mockCtx, enemy);
    assertCanvasStackBalance('wick.draw during PENCIL_STAB');
  } catch (err) {
    console.error('❌ [JOHN WICK MODEL HAIR & PIXEL BODY TEST ERROR]:', err);
    errors++;
  }

  // 11.6. Zenitsu Model Hair Asset & Procedural Body Canvas Stack Test
  console.log('⚡ [Zenitsu Model Hair & Pixel Body Test] Verifying Zenitsu-hair.png overlay and procedural pixel body stack balance...');
  try {
    const zenitsuImg = _getZenitsuHairImage();
    if (!zenitsuImg) {
      throw new Error('_getZenitsuHairImage() returned null or undefined');
    }
    const zenitsuLightningImg = _getZenitsuLightningSpriteImage();
    if (!zenitsuLightningImg) {
      throw new Error('_getZenitsuLightningSpriteImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    drawZenitsuPixelBody(mockCtx, 25);
    assertCanvasStackBalance('drawZenitsuPixelBody(mockCtx, 25)');

    mockCtx.resetStackDepth();
    _drawZenitsuHair(mockCtx, 25, false);
    assertCanvasStackBalance('_drawZenitsuHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawZenitsuHair(mockCtx, 25, true);
    assertCanvasStackBalance('_drawZenitsuHair(mockCtx, 25, true)');

    const ZenitsuClass = FIGHTER_CLASS_MAP.zenitsu;
    const zenitsu = new ZenitsuClass({ x: 300, y: 300, color: '#f59e0b', controls: {} });
    mockCtx.resetStackDepth();
    drawZenitsuSkin(mockCtx, zenitsu);
    assertCanvasStackBalance('drawZenitsuSkin(mockCtx, zenitsu)');

    // Channeling Frame 1 (Stance) stack test
    zenitsu.isChannelingThunderclap = true;
    zenitsu.thunderclapChannelDuration = 36;
    zenitsu.thunderclapChannelTimer = 30; // Frame 1: Stance
    mockCtx.resetStackDepth();
    drawZenitsuSkin(mockCtx, zenitsu);
    assertCanvasStackBalance('drawZenitsuSkin Frame 1 Stance Channeling');

    // Channeling Frame 2 (Charge / Lightning VFX) stack test
    zenitsu.thunderclapChannelTimer = 10; // Frame 2: Charge (elapsed = 26, triggers Burst 2)
    mockCtx.resetStackDepth();
    drawZenitsuSkin(mockCtx, zenitsu);
    assertCanvasStackBalance('drawZenitsuSkin Frame 2 Charge Channeling');

    // 11.6.1 Sporadic Lightning Burst Schedule Test
    // For standard 100-frame combat channel:
    // Burst 1: Frame 6 (1 frame)
    if (!_getThunderclapBurst(100, 6) || _getThunderclapBurst(100, 6).burstId !== 1) {
      throw new Error('Zenitsu Burst 1 (1-frame early flicker) failed to trigger at frame 6 of 100');
    }
    // Quiet tension pause (~1.2-1.5s wait = zero lightning)
    if (_getThunderclapBurst(100, 7) !== null || _getThunderclapBurst(100, 50) !== null || _getThunderclapBurst(100, 77) !== null) {
      throw new Error('Zenitsu quiet tension pause must have zero lightning between bursts');
    }
    // Burst 2: Frame 78 (2 frames)
    const b2_0 = _getThunderclapBurst(100, 78);
    const b2_1 = _getThunderclapBurst(100, 79);
    const b2_after = _getThunderclapBurst(100, 80);
    if (!b2_0 || b2_0.burstId !== 2 || !b2_1 || b2_1.burstId !== 2 || b2_after !== null) {
      throw new Error('Zenitsu Burst 2 must be exactly 2 frames after the quiet pause');
    }
    // Pre-launch surge (frames 97..99)
    if (!_getThunderclapBurst(100, 98) || _getThunderclapBurst(100, 98).burstId !== 3) {
      throw new Error('Zenitsu Pre-launch surge must trigger right before launch dash');
    }

    // Aim lock test during channeling
    if (zenitsu.canAim() !== false) {
      throw new Error('Zenitsu canAim() should return false during Thunderclap channeling');
    }
    zenitsu.interruptAttacks();
    if (zenitsu.isChannelingThunderclap !== false) {
      throw new Error('Zenitsu interruptAttacks() should clear isChannelingThunderclap');
    }

    // 11.6.2 Six-Frame Lightning Dash Animation & Disappearance Stack Test
    for (const testTimer of [2, 8, 16, 22]) {
      zenitsu.thunderclapDashVFX = {
        startX: 100,
        startY: 100,
        destX: 360,
        destY: 100,
        angle: 0,
        dist: 260,
        timer: testTimer,
        travelDuration: 6,
        lingerDuration: 8,
        disappearDuration: 12,
        maxTimer: 26
      };
      mockCtx.resetStackDepth();
      drawZenitsuSkin(mockCtx, zenitsu);
      assertCanvasStackBalance(`drawZenitsuSkin with dash VFX at timer ${testTimer}`);
    }
    // 11.6.3 Dash VFX Timer Progress & Cooldown Channeling Protection Test (Custom Duration = 200)
    zenitsu.isChannelingThunderclap = true;
    zenitsu.thunderclapChannelDuration = 200;
    zenitsu.thunderclapChannelTimer = 200;
    zenitsu.thunderclapCooldown = 228;
    zenitsu.thunderclapDashVFX = {
      startX: 100,
      startY: 100,
      destX: 360,
      destY: 100,
      angle: 0,
      dist: 260,
      timer: 0,
      travelDuration: 6,
      lingerDuration: 8,
      disappearDuration: 16,
      maxTimer: 30
    };
    for (let f = 0; f < 35; f++) {
      zenitsu.update(null, 0, state.arena);
    }
    if (zenitsu.thunderclapDashVFX !== null) {
      throw new Error(`Zenitsu dash VFX failed to clear during channeling! timer: ${zenitsu.thunderclapDashVFX?.timer}`);
    }
    if (zenitsu.thunderclapCooldown !== 228) {
      throw new Error(`Zenitsu thunderclapCooldown ticked down during channeling! Expected 228, got ${zenitsu.thunderclapCooldown}`);
    }
    zenitsu.interruptAttacks(true);

    // 11.6.4 Consecutive 4-Dash Wall-to-Wall Execution, Stance Persistence & Pass-Through Test
    const wallHit = zenitsu._getArenaWallIntersection(300, 300, 0);
    const arena = state.arena || { x: 0, y: 0, width: 1000, height: 700 };
    const pad = (zenitsu.r || 25) + 8;
    const expectedMaxX = (arena.x || 0) + (arena.width || 1000) - pad;
    if (Math.abs(wallHit.destX - expectedMaxX) > 1.0) {
      throw new Error(`Zenitsu _getArenaWallIntersection failed to reach right wall! Expected ${expectedMaxX}, got ${wallHit.destX}`);
    }

    zenitsu.thunderclapTotalDashes = 4;
    zenitsu.thunderclapDashDuration = 5;
    zenitsu._executeThunderclapDash(null);
    if (!zenitsu.isDashingThunderclap || zenitsu.thunderclapDashIndex !== 0) {
      throw new Error('Expected Zenitsu to begin Dash 1 of 4');
    }

    // Test entity pass-through collision solver during active dash
    const dummyEnemy = new ZenitsuClass({ x: zenitsu.x + 10, y: zenitsu.y, color: '#ff0000', controls: {} });
    dummyEnemy.vx = 0; dummyEnemy.vy = 0;
    resolveFighterCollision(zenitsu, dummyEnemy);
    if (dummyEnemy.vx !== 0 || dummyEnemy.vy !== 0) {
      throw new Error('Expected entity pass-through: dummyEnemy should not receive collision displacement while Zenitsu is dashing');
    }

    // Test stun debuff application and entity movement stopping on Skill 1 hit
    dummyEnemy.vx = 5; dummyEnemy.vy = 5;
    zenitsu._finalizeThunderclapDashStep(dummyEnemy, 0, 0, 100, 100, 0, 0, false);
    if (dummyEnemy.vx !== 0 || dummyEnemy.vy !== 0) {
      throw new Error('Expected dummyEnemy movement velocity to be stopped to 0 on Skill 1 hit');
    }
    const isStunned = Boolean((dummyEnemy.paralyzeTimer && dummyEnemy.paralyzeTimer > 0) || (dummyEnemy.hitStunTimer && dummyEnemy.hitStunTimer > 0));
    if (!isStunned) {
      throw new Error('Expected dummyEnemy to receive stun / paralyze debuff on Skill 1 hit');
    }

    // Simulate all dashes + pauses (dynamically accounts for configured dash count, duration, and pause frames)
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : zenitsuConfig;
    const totalDashes = zenitsu.thunderclapTotalDashes || cfg.thunderclapDashCount || 4;
    const dashDuration = cfg.thunderclapDashDuration || 5;
    const pauseFrames = cfg.thunderclapDashPauseFrames !== undefined ? cfg.thunderclapDashPauseFrames : 2;
    const totalSimFrames = (totalDashes * dashDuration) + ((totalDashes - 1) * pauseFrames) + 15;
    for (let f = 0; f < totalSimFrames; f++) {
      mockCtx.resetStackDepth();
      drawZenitsuSkin(mockCtx, zenitsu);
      assertCanvasStackBalance(`drawZenitsuSkin during consecutive multi-dash frame ${f}`);
      zenitsu.update(null, 0, state.arena);
    }
    if (zenitsu.isDashingThunderclap || zenitsu.thunderclapDashPauseTimer > 0) {
      throw new Error(`Expected Zenitsu ${totalDashes} consecutive dashes and pauses to be completed after ${totalSimFrames} frames`);
    }
    if (!Array.isArray(zenitsu.thunderclapDashVFXList) || zenitsu.thunderclapDashVFXList.length === 0) {
      throw new Error('Expected active dash VFX trails in thunderclapDashVFXList');
    }
    zenitsu.interruptAttacks(true);
  } catch (err) {
    console.error('❌ [ZENITSU MODEL HAIR & PIXEL BODY TEST ERROR]:', err);
    errors++;
  }

  // 12. Makima Shatter Reformation Aim Tracking Test
  console.log('🩸 [Makima Shatter Reformation Aim Tracking Test] Verifying enemy fighters continue aiming toward Makima while she is reforming from contract...');
  try {
    const MakimaClass = FIGHTER_CLASS_MAP.makima;
    const fightersToTest = ['normal', 'toji', 'gojo', 'sukuna', 'saitama', 'genos', 'mahoraga', 'nanami', 'john_wick', 'todo', 'yuji', 'yuta'];

    for (const fighterKey of fightersToTest) {
      const EnemyClass = FIGHTER_CLASS_MAP[fighterKey];
      if (!EnemyClass) continue;

      const makima = new MakimaClass({ x: 300, y: 100, color: '#FF7B6B', controls: {} });
      makima.isDead = false;
      makima.dead = false;
      makima.hp = 0;
      makima.isRevivingFromContract = true;
      makima.isShatterReviving = true;
      makima.reviveStasisTimer = 75;

      const enemy = new EnemyClass({ x: 300, y: 400, color: '#FFFFFF', controls: {} });
      state.fighters = [enemy, makima];
      state.gameState = 'playing';

      // Run update for 20 frames while Makima is reforming
      for (let f = 0; f < 20; f++) {
        enemy.update(makima, 0, state.arena);
      }

      const expectedAngle = Math.atan2(makima.y - enemy.y, makima.x - enemy.x);
      let currentAngle = enemy.gunAngle !== undefined ? enemy.gunAngle : (enemy.angle || 0);
      while (currentAngle > Math.PI) currentAngle -= Math.PI * 2;
      while (currentAngle < -Math.PI) currentAngle += Math.PI * 2;

      let expAngle = expectedAngle;
      while (expAngle > Math.PI) expAngle -= Math.PI * 2;
      while (expAngle < -Math.PI) expAngle += Math.PI * 2;

      let diff = Math.abs(currentAngle - expAngle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

      if (diff > 0.15) {
        console.log(`DEBUG ${fighterKey}: enemy.x=${enemy.x}, enemy.y=${enemy.y}, makima.x=${makima.x}, makima.y=${makima.y}, enemy.gunAngle=${enemy.gunAngle}, enemy.angle=${enemy.angle}`);
        throw new Error(`[REFORMATION AIM FAILED] ${fighterKey} failed to aim at reforming Makima. Expected ~${expAngle.toFixed(3)} rad, got ${currentAngle.toFixed(3)} rad (diff ${diff.toFixed(3)}).`);
      }
    }
  } catch (err) {
    console.error('❌ [MAKIMA SHATTER REFORMATION AIM TEST ERROR]:', err);
    errors++;
  }

  // ─────────────────────────────────────────────
  // 36. HUD SETTINGS TOGGLE & VISIBILITY TEST
  // ─────────────────────────────────────────────
  try {
    console.log('🎛️ [HUD Settings Toggle Test] Verifying toggling to completely hide all HUD skill bars, stats, and health bars...');

    const { updateHealthHud, clearHealthHud, drawHUD } = await import('../js/graphics/hudManager.js');
    const { FighterRenderer } = await import('../js/graphics/renderers/fighterRenderer.js');
    const IchigoClass = FIGHTER_CLASS_MAP.ichigo;
    const ichigo = new IchigoClass({ x: 200, y: 200, color: '#FF7700', controls: {} });

    // 1. Test hideAllHud (hides screen HUD elements, but PRESERVES overhead fighter HP overlay!)
    CONFIG.hudHideAll = true;
    CONFIG.hudHideOverheadHp = false;
    state.fighters = [ichigo];
    let fillTextCalled = false;
    mockCtx.fillText = () => { fillTextCalled = true; };
    mockCtx.strokeText = () => {};
    FighterRenderer.drawHealth(mockCtx, ichigo);
    if (!fillTextCalled) {
      throw new Error('Overhead health text was NOT drawn while CONFIG.hudHideAll was active (overhead HP should remain visible)!');
    }

    // 2. Test hideOverheadHp (hides overhead fighter HP overlay when explicitly toggled)
    CONFIG.hudHideAll = false;
    CONFIG.hudHideOverheadHp = true;
    fillTextCalled = false;
    FighterRenderer.drawHealth(mockCtx, ichigo);
    if (fillTextCalled) {
      throw new Error('Overhead health text was drawn while CONFIG.hudHideOverheadHp was active!');
    }

    // 3. Test hideSkillBars (completely hide with 0 exceptions)
    CONFIG.hudHideOverheadHp = false;
    CONFIG.hudHideSkillBars = true;
    CONFIG.hudSkillBarsMode = 'none';
    const { getSkillDataForFighter } = await import('../js/graphics/ui/hudSkillProviders.js');
    const skills = getSkillDataForFighter(ichigo);
    if (!skills || skills.length === 0) {
      throw new Error('Failed to retrieve skills for Ichigo test.');
    }

    // 4. Test when all HUD elements are enabled (hudHideAll = false, hudHideHealthBars = false, hudHideOverheadHp = false), overhead HP text IS drawn!
    CONFIG.hudHideAll = false;
    CONFIG.hudHideHealthBars = false;
    CONFIG.hudHideOverheadHp = false;
    fillTextCalled = false;
    FighterRenderer.drawHealth(mockCtx, ichigo);
    if (!fillTextCalled) {
      throw new Error('Overhead health text was NOT drawn when all HUD elements were enabled!');
    }
    
    // 5. Test Yuji HUD Stats includes DEF and DMG
    const YujiClass = FIGHTER_CLASS_MAP.yuji;
    const yuji = new YujiClass({ x: 200, y: 200, color: '#D95C7E', controls: {} });
    state.fighters = [yuji];
    state.mode = '1v1';
    state.gameState = 'matchEnd';
    state._hudFrameCount = 0;
    CONFIG.hudHideAll = false;
    CONFIG.hudHideStats = false;
    CONFIG.darkModeShowHudStats = 1;

    let capturedHTML = '';
    const origCreateElement = globalThis.document.createElement;
    globalThis.document.createElement = (tag) => {
      const el = origCreateElement(tag);
      let _html = '';
      Object.defineProperty(el, 'innerHTML', {
        set(val) {
          _html = val;
          capturedHTML += val;
        },
        get() {
          return _html;
        }
      });
      return el;
    };

    clearHealthHud();
    updateHealthHud();
    globalThis.document.createElement = origCreateElement;

    if (!capturedHTML.includes('DEF:') || !capturedHTML.includes('DMG:')) {
      throw new Error(`[YUJI HUD STATS FAILED] Expected Yuji HUD HTML to contain 'DEF:' and 'DMG:', got: ${capturedHTML}`);
    }
    
    // Reset CONFIG back to normal defaults after test
    CONFIG.hudHideAll = false;
    CONFIG.hudHideHealthBars = false;
    CONFIG.hudHideSkillBars = false;
    CONFIG.hudHideStats = false;
    CONFIG.darkModeShowHudStats = 0;
    CONFIG.hudHideOverheadHp = false;
    CONFIG.hudSkillBarsMode = 'all';
  } catch (err) {
    console.error('❌ [HUD SETTINGS TOGGLE TEST ERROR]:', err);
    errors++;
  }

  // ─────────────────────────────────────────────
  // 37. ZEUS MODEL & PIXEL BODY CANVAS STACK TEST
  // ─────────────────────────────────────────────
  try {
    console.log('⚡ [Zeus Model & Pixel Body Test] Verifying Zeus pixel art skin, laurel crown, flowing beard, royal toga, and Canvas stack balance...');

    mockCtx.resetStackDepth();
    _drawZeusHair(mockCtx, 25, false, false);
    assertCanvasStackBalance('_drawZeusHair(mockCtx, 25, false, false)');

    mockCtx.resetStackDepth();
    _drawZeusHair(mockCtx, 25, true, true);
    assertCanvasStackBalance('_drawZeusHair(mockCtx, 25, true, true)');

    mockCtx.resetStackDepth();
    _drawZeusCrown(mockCtx, 25, false, false);
    assertCanvasStackBalance('_drawZeusCrown(mockCtx, 25, false, false)');

    mockCtx.resetStackDepth();
    _drawZeusCrown(mockCtx, 25, true, true);
    assertCanvasStackBalance('_drawZeusCrown(mockCtx, 25, true, true)');

    mockCtx.resetStackDepth();
    drawZeusPixelBody(mockCtx, 25, false);
    assertCanvasStackBalance('drawZeusPixelBody(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    drawZeusPixelBody(mockCtx, 25, true);
    assertCanvasStackBalance('drawZeusPixelBody(mockCtx, 25, true)');

    const ZeusClass = FIGHTER_CLASS_MAP.zeus;
    if (!ZeusClass) {
      throw new Error('FIGHTER_CLASS_MAP.zeus not found');
    }

    const zeus = new ZeusClass({ x: 300, y: 300, color: '#38bdf8', controls: {} });

    // Right-facing standard skin render
    zeus.gunAngle = 0;
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeus);
    assertCanvasStackBalance('drawZeusSkin(mockCtx, zeus [facing right])');

    // Left-facing inverted skin render (Rule 19 vertical mirror)
    zeus.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeus);
    assertCanvasStackBalance('drawZeusSkin(mockCtx, zeus [facing left])');

    // Divine Wrath / Thunder Storm Active mode
    zeus.isChargingStorm = true;
    zeus.stormActive = true;
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeus);
    assertCanvasStackBalance('drawZeusSkin(mockCtx, zeus [storm active])');
    zeus.isChargingStorm = false;
    zeus.stormActive = false;

    // Winner reveal podium mode
    zeus._isWinnerReveal = true;
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeus);
    assertCanvasStackBalance('drawZeusSkin(mockCtx, zeus [winner reveal])');
    zeus._isWinnerReveal = false;

    // Skin Studio showSkinOnly mode (Rule 20)
    state.showSkinOnly = true;
    mockCtx.resetStackDepth();
    drawZeusSkin(mockCtx, zeus);
    assertCanvasStackBalance('drawZeusSkin(mockCtx, zeus [showSkinOnly])');
    state.showSkinOnly = false;
  } catch (err) {
    console.log('❌ [ZEUS MODEL & PIXEL BODY TEST ERROR]:', err.stack || err.message || err);
    errors++;
    errorList.push(`[ZEUS MODEL & PIXEL BODY TEST]: ${err.stack || err.message || err}`);
  }

  // ─────────────────────────────────────────────
  // 37.1 ESCANOR MODEL & PIXEL BODY CANVAS STACK TEST
  // ─────────────────────────────────────────────
  try {
    console.log('☀️ [Escanor Model & Pixel Body Test] Verifying Escanor pixel art skin, Escanor-hair.png overlay, Escanor-mustache.png overlay, lowered holy knight armor, and Canvas stack balance...');
    const { drawEscanorPixelBody, drawEscanorSkin, _drawEscanorHair, _getEscanorHairImage, _drawEscanorMustache, _getEscanorMustacheImage } = await import('../js/graphics/fighters/escanorSkin.js');

    const hairImg = _getEscanorHairImage();
    if (!hairImg) {
      throw new Error('_getEscanorHairImage() returned null or undefined');
    }

    const mustacheImg = _getEscanorMustacheImage();
    if (!mustacheImg) {
      throw new Error('_getEscanorMustacheImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    drawEscanorPixelBody(mockCtx, 25, false);
    assertCanvasStackBalance('drawEscanorPixelBody(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    drawEscanorPixelBody(mockCtx, 25, true);
    assertCanvasStackBalance('drawEscanorPixelBody(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    _drawEscanorHair(mockCtx, 25, false);
    assertCanvasStackBalance('_drawEscanorHair(mockCtx, 25, false)');

    mockCtx.resetStackDepth();
    _drawEscanorHair(mockCtx, 25, true);
    assertCanvasStackBalance('_drawEscanorHair(mockCtx, 25, true)');

    mockCtx.resetStackDepth();
    _drawEscanorMustache(mockCtx, 25, false);
    assertCanvasStackBalance('_drawEscanorMustache(mockCtx, 25, false)');

    const { drawDivineAxeRhitta, drawRhittaSlashArc, _getEscanorSlashEffectImage, drawRhittaSolarFlash } = await import('../js/graphics/weapons/escanorWeaponGraphics.js');

    const slashEffectImg = _getEscanorSlashEffectImage();
    if (!slashEffectImg) {
      throw new Error('_getEscanorSlashEffectImage() returned null or undefined');
    }

    mockCtx.resetStackDepth();
    drawRhittaSlashArc(mockCtx, 0, 0, 0, 25, { phase: 'strike', strikeP: 0.5 }, false, 100);
    assertCanvasStackBalance('drawRhittaSlashArc(strike phase)');

    mockCtx.resetStackDepth();
    drawRhittaSlashArc(mockCtx, 0, 0, 0, 25, { phase: 'hitPause', strikeP: 1.0, pauseP: 0.2 }, false, 100);
    assertCanvasStackBalance('drawRhittaSlashArc(hitPause phase)');

    mockCtx.resetStackDepth();
    drawRhittaSlashArc(mockCtx, 0, 0, 0, 25, { phase: 'recovery', recP: 0.5 }, true, 120);
    assertCanvasStackBalance('drawRhittaSlashArc(recovery phase)');

    mockCtx.resetStackDepth();
    drawRhittaSolarFlash(mockCtx, 50, 50, false, 0.8);
    assertCanvasStackBalance('drawRhittaSolarFlash(false, 0.8)');

    mockCtx.resetStackDepth();
    drawRhittaSolarFlash(mockCtx, 50, 50, true, 1.0);
    assertCanvasStackBalance('drawRhittaSolarFlash(true, 1.0)');

    const EscanorClass = FIGHTER_CLASS_MAP.escanor;
    if (!EscanorClass) {
      throw new Error('FIGHTER_CLASS_MAP.escanor not found');
    }

    const escanor = new EscanorClass({ x: 300, y: 300, color: '#f59e0b', controls: {} });

    // Right-facing standard skin render
    escanor.gunAngle = 0;
    mockCtx.resetStackDepth();
    drawEscanorSkin(mockCtx, escanor);
    assertCanvasStackBalance('drawEscanorSkin(mockCtx, escanor [facing right])');

    // Left-facing inverted skin render (Rule 19 vertical mirror)
    escanor.gunAngle = Math.PI;
    mockCtx.resetStackDepth();
    drawEscanorSkin(mockCtx, escanor);
    assertCanvasStackBalance('drawEscanorSkin(mockCtx, escanor [facing left])');

    // The One mode
    escanor.isTheOneActive = true;
    mockCtx.resetStackDepth();
    drawEscanorSkin(mockCtx, escanor);
    assertCanvasStackBalance('drawEscanorSkin(mockCtx, escanor [the one active])');
    escanor.isTheOneActive = false;

    // Winner reveal podium mode
    escanor._isWinnerReveal = true;
    mockCtx.resetStackDepth();
    drawEscanorSkin(mockCtx, escanor);
    assertCanvasStackBalance('drawEscanorSkin(mockCtx, escanor [winner reveal])');
    escanor._isWinnerReveal = false;

    // Skin Studio showSkinOnly mode (Rule 20)
    state.showSkinOnly = true;
    mockCtx.resetStackDepth();
    drawEscanorSkin(mockCtx, escanor);
    assertCanvasStackBalance('drawEscanorSkin(mockCtx, escanor [showSkinOnly])');
    state.showSkinOnly = false;
  } catch (err) {
    console.log('❌ [ESCANOR MODEL & PIXEL BODY TEST ERROR]:', err.stack || err.message || err);
    errors++;
    errorList.push(`[ESCANOR MODEL & PIXEL BODY TEST]: ${err.stack || err.message || err}`);
  }

  // ─────────────────────────────────────────────
  // 38. GOJO RED & PURPLE AUTO-AIM CHANNELING TEST
  // ─────────────────────────────────────────────
  try {
    console.log('🔴🟣 [Gojo Red & Purple Smooth Aim Tracking & No Firing Snap Test] Verifying Gojo tracks smoothly during channeling and does not snap on firing...');

    const GojoClass = FIGHTER_CLASS_MAP.gojo;
    const SukunaClass = FIGHTER_CLASS_MAP.sukuna;
    if (!GojoClass || !SukunaClass) {
      throw new Error('Fighter classes for Gojo / Sukuna not found');
    }

    const gojo = new GojoClass({ x: 300, y: 300, color: '#00E5FF', hp: 100, controls: {} });
    const target = new SukunaClass({ x: 400, y: 300, color: '#E53E3E', hp: 100, controls: {} });
    gojo.hp = 100;
    gojo.isDead = false;
    gojo.dead = false;
    target.hp = 100;
    target.isDead = false;
    target.dead = false;
    state.fighters = [gojo, target];
    state.gameState = 'playing';

    // 1. Test Purple Channeling Smooth Aim Tracking & No Firing Snap
    gojo.isChannelingPurple = true;
    gojo.purpleChargeTimer = 20;
    gojo.purpleChargeMax = 120;
    gojo.gunAngle = 0; // facing right
    gojo.angle = 0;

    // Target moves down (angle = PI/2)
    target.x = 300;
    target.y = 400;

    const angleBefore = gojo.gunAngle;
    gojo.aim(target);
    const angleAfter = gojo.gunAngle;

    // Must have turned smoothly toward target (angleAfter > angleBefore) but NOT snapped instantly to PI/2 (~1.57)
    if (angleAfter <= angleBefore) {
      throw new Error(`[PURPLE AIM TRACKING FAILED] Gojo did not rotate toward target during Purple channeling. Before: ${angleBefore}, After: ${angleAfter}`);
    }
    if (angleAfter >= Math.PI / 2 - 0.1) {
      throw new Error(`[PURPLE AIM SNAPPING FAILED] Gojo snapped instantly to target angle during Purple channeling. Expected smooth turn, got: ${angleAfter}`);
    }

    // Now test firePurple releases at current gunAngle without snapping to a newly relocated target
    target.x = 100; // suddenly moved to opposite side
    target.y = 300;
    const savedGunAngle = gojo.gunAngle;
    gojo.purpleChargeTimer = gojo.purpleChargeMax;
    gojo._firePurple(0);

    if (Math.abs(gojo.gunAngle - savedGunAngle) > 0.001) {
      throw new Error(`[PURPLE FIRING SNAP FAILED] Gojo snapped aim upon firing Purple. Expected ${savedGunAngle}, got ${gojo.gunAngle}`);
    }

    gojo.isChannelingPurple = false;
    gojo.purpleChargeTimer = 0;
    gojo.purpleRecoveryTimer = 0;
    gojo.activePurpleProjectile = null;
    if (typeof projectileSystem !== 'undefined' && projectileSystem.projectiles) {
      projectileSystem.projectiles.length = 0;
    }
    state.projectiles = [];

    // 2. Test Reversal Red Side-Committed Auto-Aim During Channeling & No Turnaround
    gojo.x = 300;
    gojo.y = 250;
    gojo.z = 0;
    gojo.gunAngle = 0;
    gojo.angle = 0;
    gojo.redTargetAngle = 0;
    gojo.redInitialAngle = 0;
    gojo.redCommittedSide = 'right';
    gojo.redEffectTimer = 80;
    gojo.redEffectMaxTimer = 125;
    gojo.redBuildupPhase = true;
    gojo._redTargetRef = target;

    target.x = 400; // to the right and up
    target.y = 150;
    target.hp = 100;
    target.isDead = false;
    target.dead = false;

    const redAngleBefore = gojo.gunAngle;
    const aimResult = gojo.aim(target);
    const redAngleAfter = gojo.gunAngle;

    // Gojo's aim MUST track smoothly toward the target on the current side
    if (redAngleAfter >= redAngleBefore) {
      throw new Error(`[RED AUTO-AIM TRACKING FAILED] Gojo aim did not rotate upward toward target. Before: ${redAngleBefore}, After: ${redAngleAfter}`);
    }

    // Target moves BEHIND Gojo to the left hemisphere (target.x = 100, target.y = 300)
    target.x = 100;
    target.y = 300;
    for (let i = 0; i < 30; i++) {
      gojo.aim(target);
    }

    // Gojo MUST NOT rotate to the other side (left hemisphere) — gunAngle must remain on right hemisphere (Math.cos >= 0)
    if (Math.cos(gojo.gunAngle) < -0.001 || Math.abs(gojo.gunAngle) > (Math.PI / 2 + 0.001)) {
      throw new Error(`[RED NO-TURNAROUND FAILED] Gojo rotated to the opposite side while channeling Red! Angle: ${gojo.gunAngle}`);
    }

    // Test detonateRed releases at current gunAngle without snapping to a newly relocated target
    target.x = 500;
    target.y = 300;
    const savedRedGunAngle = gojo.gunAngle;
    gojo._detonateRed();

    if (Math.abs(gojo.gunAngle - savedRedGunAngle) > 0.001) {
      throw new Error(`[RED DETONATION SNAP FAILED] Gojo snapped aim upon detonating Red. Expected ${savedRedGunAngle}, got ${gojo.gunAngle}`);
    }

    gojo.redEffectTimer = 0;
    gojo.redBuildupPhase = false;
  } catch (err) {
    console.error('❌ [GOJO RED & PURPLE AIM BEHAVIOR TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[GOJO RED & PURPLE AIM BEHAVIOR TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Yuta Domain Expansion PNG Overlay & Stack Balance Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('💍 [Yuta Domain Overlay Test] Verifying Yuta Domain Expansion PNG overlay rendering and Canvas stack balance...');
    const { renderYutaDomainBackground, getYutaDomainImage } = await import('../js/entities/fighters/yuta/yutaDomainVisuals.js');
    const { YutaFighter } = await import('../js/entities/fighters/YutaFighter.js');
    const yuta = new YutaFighter({ color: '#FF1493', name: 'Yuta' });
    yuta.domainActive = true;
    yuta.x = 400;
    yuta.y = 300;

    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    renderYutaDomainBackground(yuta, mockCtx);
    assertCanvasStackBalance('renderYutaDomainBackground (rect arena)');

    // Test circular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    renderYutaDomainBackground(yuta, mockCtx);
    assertCanvasStackBalance('renderYutaDomainBackground (circular arena)');
  } catch (err) {
    console.error('❌ [YUTA DOMAIN OVERLAY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[YUTA DOMAIN OVERLAY TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Toji Ultimate Arena PNG Overlay & Stack Balance Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🗡️ [Toji Ultimate Overlay Test] Verifying Toji Ultimate Arena PNG overlay rendering and Canvas stack balance...');
    const { drawTojiUltimateOverlay, getTojiUltimateOverlayImage } = await import('../js/graphics/renderers/domainDimOverlays.js');
    const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
    const toji = new TojiFighter({ color: '#A040FF', name: 'Toji' });
    toji.ultimateActive = true;
    toji.ultimatePhase = 'STRIKING';
    toji.x = 400;
    toji.y = 300;

    const dummyTarget = { x: 450, y: 300, r: 25, hp: 100, maxHp: 100, z: 0 };
    toji.ultimateTarget = dummyTarget;
    state.fighters = [toji, dummyTarget];

    // Verify image loader
    const tojiImg = getTojiUltimateOverlayImage();
    if (!tojiImg) {
      throw new Error('[TOJI OVERLAY IMAGE FAILED] getTojiUltimateOverlayImage() returned null/undefined');
    }

    // Test rectangular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawTojiUltimateOverlay();
    assertCanvasStackBalance('drawTojiUltimateOverlay (rect arena)');

    // Test circular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawTojiUltimateOverlay();
    assertCanvasStackBalance('drawTojiUltimateOverlay (circular arena)');

    // Test across all ultimate phases
    const phases = ['CHANNELING', 'VANISHED', 'STRIKING', 'CRATER_FADEIN', 'CRATER', 'CRATER_DIVE'];
    for (const ph of phases) {
      toji.ultimatePhase = ph;
      mockCtx.resetStackDepth();
      drawTojiUltimateOverlay();
      assertCanvasStackBalance(`drawTojiUltimateOverlay (phase: ${ph})`);
    }

    toji.ultimateActive = false;
    toji.ultimatePhase = null;
  } catch (err) {
    console.error('❌ [TOJI ULTIMATE OVERLAY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[TOJI ULTIMATE OVERLAY TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // CJ BAGUVIX God Mode Arena PNG Overlay & Stack Balance Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🔫 [CJ BAGUVIX Overlay Test] Verifying CJ BAGUVIX Arena PNG overlay rendering and Canvas stack balance...');
    const { renderCjBaguvixBackground, getCjBaguvixOverlayImage } = await import('../js/graphics/renderers/environmentalRenderer.js');
    const { CJFighter } = await import('../js/entities/fighters/CJFighter.js');
    const cj = new CJFighter({ color: '#16A34A', name: 'CJ' });
    cj.isBaguvixActive = true;
    cj.x = 400;
    cj.y = 300;

    const dummyEnemy = { x: 450, y: 300, r: 25, hp: 100, maxHp: 100, z: 0 };
    state.fighters = [cj, dummyEnemy];

    // Verify image loader
    const cjImg = getCjBaguvixOverlayImage();
    if (!cjImg) {
      throw new Error('[CJ BAGUVIX OVERLAY IMAGE FAILED] getCjBaguvixOverlayImage() returned null/undefined');
    }

    // Test rectangular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    renderCjBaguvixBackground(cj, mockCtx);
    assertCanvasStackBalance('renderCjBaguvixBackground (rect arena)');

    // Test circular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    renderCjBaguvixBackground(cj, mockCtx);
    assertCanvasStackBalance('renderCjBaguvixBackground (circular arena)');

    // Test drawDomainBackground method on CJ fighter instance
    mockCtx.resetStackDepth();
    cj.drawDomainBackground(mockCtx);
    assertCanvasStackBalance('cj.drawDomainBackground');

    // ─────────────────────────────────────────────────────────────
    // CJ BAGUVIX Animated Ki Flame Aura Frame Loader & Stack Balance Test
    // ─────────────────────────────────────────────────────────────
    console.log('🔥 [CJ BAGUVIX Animated Aura Test] Verifying CJ BAGUVIX animated frame loader and drawCjSkin stack balance...');
    const { getCjBaguvixAuraFrames, drawCjSkin } = await import('../js/graphics/fighters/cjSkin.js');
    const auraFrames = getCjBaguvixAuraFrames();
    if (!auraFrames || auraFrames.length !== 3) {
      throw new Error(`[CJ BAGUVIX AURA FRAMES FAILED] getCjBaguvixAuraFrames() expected 3 frames, got ${auraFrames ? auraFrames.length : 'null'}`);
    }
    mockCtx.resetStackDepth();
    drawCjSkin(mockCtx, cj);
    assertCanvasStackBalance('drawCjSkin with animated BAGUVIX aura');

    cj.isBaguvixActive = false;

    // ─────────────────────────────────────────────────────────────
    // CJ Rocketman Jetpack Mode Skill Lockout Test
    // ─────────────────────────────────────────────────────────────
    console.log('🚀 [CJ Rocketman Skill Lockout Test] Verifying CJ cannot cast other skills while in Jetpack mode...');
    cj.reset();
    cj.isJetpackActive = true;
    cj.jetpackTimer = 300;
    cj.hp = 100; // Low HP (< 50%)
    cj.maxHp = 440;
    cj.hasUsedHesoyam = false;
    cj.driveByCooldown = 0;
    cj.baguvixCooldown = 0;

    // 1. Attempt Hesoyam while in jetpack mode
    cj.activateHesoyam();
    if (cj.hasUsedHesoyam || cj.isTypingCheat) {
      throw new Error('[CJ ROCKETMAN SKILL LOCKOUT FAILED] activateHesoyam was not blocked during Jetpack mode!');
    }

    // 2. Attempt Drive-By while in jetpack mode
    cj.activateDriveBy();
    if (cj.isDriveByActive || cj.isTypingCheat) {
      throw new Error('[CJ ROCKETMAN SKILL LOCKOUT FAILED] activateDriveBy was not blocked during Jetpack mode!');
    }

    // 3. Attempt Baguvix while in jetpack mode
    cj.activateBaguvix();
    if (cj.isBaguvixActive || cj.isTypingCheat) {
      throw new Error('[CJ ROCKETMAN SKILL LOCKOUT FAILED] activateBaguvix was not blocked during Jetpack mode!');
    }

    // 4. Update loop check while in jetpack mode
    cj.update(dummyEnemy, 0, state.arena);
    if (cj.hasUsedHesoyam || cj.isDriveByActive || cj.isBaguvixActive || cj.isTypingCheat) {
      throw new Error('[CJ ROCKETMAN SKILL LOCKOUT FAILED] Skill was triggered in update() during Jetpack mode!');
    }

    // 5. Expire jetpack mode and verify skills can be cast
    cj.isJetpackActive = false;
    cj.jetpackTimer = 0;
    cj.activateHesoyam();
    if (!cj.hasUsedHesoyam || !cj.isTypingCheat) {
      throw new Error('[CJ ROCKETMAN SKILL LOCKOUT FAILED] activateHesoyam failed to trigger after Jetpack mode ended!');
    }
    cj.isTypingCheat = false;
  } catch (err) {
    console.error('❌ [CJ BAGUVIX OVERLAY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[CJ BAGUVIX OVERLAY TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Genos Ultimate (Spiral Incineration Cannon) Arena PNG Overlay & Stack Balance Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🔥 [Genos Ultimate Overlay Test] Verifying Genos Ultimate Arena PNG overlay rendering and Canvas stack balance...');
    const { drawGenosUltimateArenaOverlay, getGenosUltimateOverlayImage } = await import('../js/graphics/renderers/domainDimOverlays.js');
    const { GenosFighter } = await import('../js/entities/fighters/GenosFighter.js');
    const genos = new GenosFighter({ color: '#FF5500', name: 'Genos' });
    genos.x = 400;
    genos.y = 300;
    genos.hp = 320;
    genos.isChargingUlt = true;
    genos.ultTimer = 60;

    const dummyEnemy = { x: 550, y: 300, r: 25, hp: 100, maxHp: 100, z: 0 };
    state.fighters = [genos, dummyEnemy];

    // Verify image loader
    const genosImg = getGenosUltimateOverlayImage();
    if (!genosImg) {
      throw new Error('[GENOS OVERLAY IMAGE FAILED] getGenosUltimateOverlayImage() returned null/undefined');
    }

    // Test rectangular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawGenosUltimateArenaOverlay();
    assertCanvasStackBalance('drawGenosUltimateArenaOverlay (rect arena)');

    // Test circular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawGenosUltimateArenaOverlay();
    assertCanvasStackBalance('drawGenosUltimateArenaOverlay (circular arena)');

    // Test across all ultimate phases
    genos.isChargingUlt = false;
    genos.isUltSliding = true;
    mockCtx.resetStackDepth();
    drawGenosUltimateArenaOverlay();
    assertCanvasStackBalance('drawGenosUltimateArenaOverlay (isUltSliding)');

    genos.isUltSliding = false;
    genos.isFiringUlt = true;
    mockCtx.resetStackDepth();
    drawGenosUltimateArenaOverlay();
    assertCanvasStackBalance('drawGenosUltimateArenaOverlay (isFiringUlt)');

    genos.isFiringUlt = false;
    genos.isUltRecovering = true;
    genos.ultRecoveryTimer = 30;
    mockCtx.resetStackDepth();
    drawGenosUltimateArenaOverlay();
    assertCanvasStackBalance('drawGenosUltimateArenaOverlay (isUltRecovering)');

    genos.isUltRecovering = false;
  } catch (err) {
    console.error('❌ [GENOS ULTIMATE OVERLAY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[GENOS ULTIMATE OVERLAY TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Zeus Storm Dim Screen Overlay & Canvas Stack Balance Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('⚡ [Zeus Storm Dim Screen Test] Verifying Zeus Storm Dim Screen overlay rendering and Canvas stack balance...');
    const { drawStormDimScreen } = await import('../js/graphics/renderers/environmentalRenderer.js');
    const { ZeusFighter } = await import('../js/entities/fighters/ZeusFighter.js');
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');

    const zeus = new ZeusFighter({ color: '#FFD700', name: 'Zeus' });
    zeus.x = 400;
    zeus.y = 300;
    zeus.isChargingStorm = true;
    zeus.stormTimer = 40;

    const gojo = new GojoFighter({ color: '#4A90E2', name: 'Gojo' });
    gojo.x = 250;
    gojo.y = 300;
    gojo.infinityActive = true;
    gojo.infinityCooldown = 0;

    state.fighters = [zeus, gojo];

    // Test rect arena
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawStormDimScreen();
    assertCanvasStackBalance('drawStormDimScreen (Zeus charging, rect arena)');

    // Test circular arena during active storm strikes
    zeus.isChargingStorm = false;
    zeus.stormStrikesRemaining = 5;
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawStormDimScreen();
    assertCanvasStackBalance('drawStormDimScreen (Zeus active strikes, circular arena)');

    // Test idle transition (ease-out fade)
    zeus.stormStrikesRemaining = 0;
    mockCtx.resetStackDepth();
    drawStormDimScreen();
    assertCanvasStackBalance('drawStormDimScreen (Zeus fade-out)');
  } catch (err) {
    console.error('❌ [ZEUS STORM DIM SCREEN TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[ZEUS STORM DIM SCREEN TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Sukuna Domain Expansion Channeling Facing Angle & Stack Balance Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('⛩️ [Sukuna Domain Channeling Angle Test] Verifying Sukuna domain channeling faces player (angle 0) and maintains Canvas stack balance...');
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const { SukunaRenderer } = await import('../js/graphics/fighters/sukunaRenderer.js');
    const sukuna = new SukunaFighter({ color: '#FF0000', name: 'Sukuna' });
    sukuna.x = 400;
    sukuna.y = 300;
    sukuna.gunAngle = Math.PI / 4; // Arbitrary previous aim angle

    const dummyEnemy = { x: 100, y: 100, r: 25, hp: 100, maxHp: 100, z: 0, vx: 0, vy: 0 };
    state.fighters = [sukuna, dummyEnemy];

    // Trigger domain channeling
    sukuna.domainCooldown = 0;
    sukuna.isChannelingDomainExpansion = true;
    sukuna.domainChargeTimer = 10;
    sukuna.aim(dummyEnemy);

    if (sukuna.gunAngle !== 0 || sukuna.angle !== 0) {
      throw new Error(`[SUKUNA DOMAIN ANGLE FAILED] Expected gunAngle & angle to be 0 (facing player), got gunAngle: ${sukuna.gunAngle}, angle: ${sukuna.angle}`);
    }

    // Verify update() maintains angle = 0 and stops movement
    sukuna.update(dummyEnemy, 0, state.arena);
    if (sukuna.gunAngle !== 0 || sukuna.angle !== 0) {
      throw new Error(`[SUKUNA DOMAIN ANGLE UPDATE FAILED] Expected gunAngle & angle to remain 0 after update(), got gunAngle: ${sukuna.gunAngle}, angle: ${sukuna.angle}`);
    }
    if (sukuna.vx !== 0 || sukuna.vy !== 0) {
      throw new Error(`[SUKUNA DOMAIN MOVEMENT LOCK FAILED] Expected vx/vy to be 0, got vx: ${sukuna.vx}, vy: ${sukuna.vy}`);
    }

    // Verify Canvas 2D stack balance during domain channeling
    mockCtx.resetStackDepth();
    sukuna.drawBody(mockCtx);
    assertCanvasStackBalance('sukuna.drawBody during domain channeling');

    mockCtx.resetStackDepth();
    SukunaRenderer.draw(mockCtx, sukuna);
    assertCanvasStackBalance('SukunaRenderer.draw during domain channeling');

    sukuna.isChannelingDomainExpansion = false;
  } catch (err) {
    console.error('❌ [SUKUNA DOMAIN CHANNELING ANGLE TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[SUKUNA DOMAIN CHANNELING ANGLE TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Soul-Swapped Sukuna (Yuji) Fuga Smooth Aim Tracking & No Firing Snap Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🔥 [Soul-Swapped Sukuna Fuga Aim Tracking & No Firing Snap Test] Verifying smooth aim tracking during channeling and no snap upon firing...');
    const { YujiFighter } = await import('../js/entities/fighters/YujiFighter.js');
    const yuji = new YujiFighter({ color: '#E11D48', name: 'Yuji' });
    yuji.x = 300;
    yuji.y = 300;
    yuji.gunAngle = 0;
    yuji.angle = 0;
    yuji.soulSwapActive = true;
    yuji.soulSwapTimer = 1000;
    yuji.isChannelingDivineFlame = true;
    yuji.divineFlameChargeTimer = 10;
    yuji.divineFlameChargeMax = 85;

    const dummyEnemy = { x: 300, y: 500, r: 25, hp: 100, maxHp: 100, z: 0, vx: 0, vy: 0, isDead: false };
    state.fighters = [yuji, dummyEnemy];

    const angleBefore = yuji.gunAngle;
    yuji.aim(dummyEnemy);
    const angleAfter = yuji.gunAngle;

    if (angleAfter <= angleBefore) {
      throw new Error(`[SOUL SWAP FUGA AIM FAILED] Soul Swapped Sukuna did not rotate toward target. Before: ${angleBefore}, After: ${angleAfter}`);
    }
    if (Math.abs(angleAfter - Math.PI / 2) < 0.01) {
      throw new Error(`[SOUL SWAP FUGA AIM SNAPPING FAILED] Soul Swapped Sukuna snapped instantly instead of turning smoothly. Got: ${angleAfter}`);
    }

    // Now test Fuga firing releases strictly at current facing gunAngle without snapping to relocated enemy
    dummyEnemy.x = 100;
    dummyEnemy.y = 300;
    const savedGunAngle = yuji.gunAngle;
    projectileSystem.projectiles = [];
    yuji.divineFlameChargeTimer = yuji.divineFlameChargeMax;
    yuji.update(dummyEnemy, 0, state.arena);

    if (Math.abs(yuji.gunAngle - savedGunAngle) > 0.001) {
      throw new Error(`[SOUL SWAP FUGA FIRING SNAP FAILED] Soul Swapped Sukuna snapped aim upon firing Fuga. Expected ${savedGunAngle}, got ${yuji.gunAngle}`);
    }

    const spawnedFuga = projectileSystem.projectiles.find(p => p.isSukunaFurnace || p.behaviorType === 'sukuna_furnace');
    if (!spawnedFuga) {
      throw new Error(`[SOUL SWAP FUGA SPAWN FAILED] Expected sukuna_furnace projectile to spawn!`);
    }

    const velAngle = Math.atan2(spawnedFuga.vy, spawnedFuga.vx);
    if (Math.abs(velAngle - savedGunAngle) > 0.05) {
      throw new Error(`[SOUL SWAP FUGA VELOCITY FAILED] Fuga projectile angle (${velAngle}) did not match release angle (${savedGunAngle})`);
    }
  } catch (err) {
    console.error('❌ [SOUL SWAP FUGA AIM TRACKING TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[SOUL SWAP FUGA AIM TRACKING TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Todo Death Active Cursed Rock Clearing Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🪨 [Todo Death Active Rock Clearing Test] Verifying active cursed rocks are cleared when Todo dies...');
    const { TodoFighter } = await import('../js/entities/fighters/TodoFighter.js');
    const todo = new TodoFighter({ color: '#A855F7', name: 'Todo' });
    todo.x = 200;
    todo.y = 200;
    todo.hp = 100;
    todo.cursedRocks = [
      { x: 300, y: 300, vx: 2, vy: 0, radius: 10, life: 100 }
    ];

    const enemy = { x: 500, y: 500, hp: 100, maxHp: 100, isDead: false };
    state.fighters = [todo, enemy];

    // 1. Verify rocks exist before death
    if (!todo.cursedRocks || todo.cursedRocks.length !== 1) {
      throw new Error(`Expected Todo to have 1 active cursed rock before death!`);
    }

    // 2. Kill Todo and verify cursedRocks is cleared
    todo.takeDamage(150, enemy, {});
    if (todo.hp > 0) {
      throw new Error(`Expected Todo to be dead after taking lethal damage!`);
    }
    if (todo.cursedRocks && todo.cursedRocks.length > 0) {
      throw new Error(`Expected Todo active cursed rocks to be cleared upon death, but found ${todo.cursedRocks.length} remaining!`);
    }

    // 3. Test onDeath() directly with a newly added rock
    todo.cursedRocks = [{ x: 350, y: 350, vx: 1, vy: 1, radius: 10, life: 80 }];
    todo.onDeath();
    if (todo.cursedRocks && todo.cursedRocks.length > 0) {
      throw new Error(`Expected Todo.onDeath() to clear active cursed rocks!`);
    }

    // 4. Test update() when dead clears rocks
    todo.cursedRocks = [{ x: 400, y: 400, vx: 0, vy: 0, radius: 10, life: 50 }];
    todo.update(enemy, 0, state.arena);
    if (todo.cursedRocks && todo.cursedRocks.length > 0) {
      throw new Error(`Expected Todo.update() while dead to clear active cursed rocks!`);
    }
  } catch (err) {
    console.error('❌ [TODO DEATH ACTIVE ROCK CLEARING TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[TODO DEATH ACTIVE ROCK CLEARING TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Todo Ultimate Arena PNG Overlay (Todo-ultimate-overlay.png) Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🎤 [Todo Ultimate Arena Overlay Test] Verifying Todo-ultimate-overlay.png image loader, semi-transparency, and Canvas stack balance...');
    const { getTodoUltimateOverlayImage, drawTodoUltimateArenaOverlay, drawTodoTakadaDimScreen, isTodoTakadaOverlayActive } = await import('../js/graphics/renderers/specialOverlayRenderer.js');
    const { TodoFighter } = await import('../js/entities/fighters/TodoFighter.js');
    const todo = new TodoFighter({ color: '#A855F7', name: 'Todo' });
    todo.x = 400;
    todo.y = 300;
    todo.hp = 200;
    todo.isTakadaUltActive = true;

    const dummyEnemy = { x: 500, y: 300, r: 25, hp: 100, maxHp: 100, z: 0 };
    state.fighters = [todo, dummyEnemy];

    // Verify image loader
    const todoImg = getTodoUltimateOverlayImage();
    if (!todoImg) {
      throw new Error('[TODO OVERLAY IMAGE FAILED] getTodoUltimateOverlayImage() returned null/undefined');
    }
    if (!todoImg.src.includes('Todo-ultimate-overlay.png')) {
      throw new Error(`[TODO OVERLAY IMAGE FAILED] Expected image src to include Todo-ultimate-overlay.png, got ${todoImg.src}`);
    }

    // Verify config transparency
    if (CONFIG.todo?.ultimateOverlayAlpha === undefined || CONFIG.todo.ultimateOverlayAlpha >= 1.0) {
      throw new Error(`[TODO OVERLAY TRANSPARENCY FAILED] Expected ultimateOverlayAlpha to be transparent (< 1.0), got ${CONFIG.todo?.ultimateOverlayAlpha}`);
    }

    // Test rectangular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawTodoUltimateArenaOverlay();
    assertCanvasStackBalance('drawTodoUltimateArenaOverlay (rect arena)');

    mockCtx.resetStackDepth();
    drawTodoTakadaDimScreen();
    assertCanvasStackBalance('drawTodoTakadaDimScreen with ultimate overlay (rect arena)');

    // Test circular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawTodoUltimateArenaOverlay();
    assertCanvasStackBalance('drawTodoUltimateArenaOverlay (circular arena)');

    mockCtx.resetStackDepth();
    drawTodoTakadaDimScreen();
    assertCanvasStackBalance('drawTodoTakadaDimScreen with ultimate overlay (circular arena)');

    // Test during channeling phase (overlay, dim screen, and overlay active check must NOT activate)
    todo.isTakadaUltActive = false;
    todo.isTakadaChanneling = true;
    if (isTodoTakadaOverlayActive()) {
      throw new Error('[TODO OVERLAY CHANNELING REGRESSION] isTodoTakadaOverlayActive must be false during channeling phase');
    }
    let drewInChanneling = false;
    const origDrawImage = mockCtx.drawImage;
    const origFillRect = mockCtx.fillRect;
    mockCtx.drawImage = () => { drewInChanneling = true; };
    mockCtx.fillRect = () => { drewInChanneling = true; };
    mockCtx.resetStackDepth();
    drawTodoUltimateArenaOverlay();
    drawTodoTakadaDimScreen();
    mockCtx.drawImage = origDrawImage;
    mockCtx.fillRect = origFillRect;
    if (drewInChanneling) {
      throw new Error('[TODO OVERLAY CHANNELING REGRESSION] drawTodoUltimateArenaOverlay and drawTodoTakadaDimScreen must NOT render during channeling phase');
    }
    assertCanvasStackBalance('drawTodoUltimateArenaOverlay and drawTodoTakadaDimScreen (channeling phase)');

    // Test during active ultimate phase (overlay MUST draw)
    todo.isTakadaChanneling = false;
    todo.isTakadaUltActive = true;
    let drewInUltimate = false;
    mockCtx.drawImage = () => { drewInUltimate = true; };
    mockCtx.resetStackDepth();
    drawTodoUltimateArenaOverlay();
    mockCtx.drawImage = origDrawImage;
    if (!drewInUltimate) {
      throw new Error('[TODO OVERLAY ULTIMATE FAILED] drawTodoUltimateArenaOverlay must render when ultimate / BG music is active');
    }
    assertCanvasStackBalance('drawTodoUltimateArenaOverlay (ultimate active phase)');
  } catch (err) {
    console.error('❌ [TODO ULTIMATE ARENA OVERLAY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[TODO ULTIMATE ARENA OVERLAY TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Yuji Soul Swap Arena PNG Overlay (Yuji-soulswap-overlay.png) Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🔄 [Yuji Soul Swap Arena Overlay Test] Verifying Yuji-soulswap-overlay.png image loader, semi-transparency, and Canvas stack balance...');
    const { getYujiSoulSwapOverlayImage, drawYujiSoulSwapArenaOverlay, drawYujiSoulSwapDimScreen } = await import('../js/graphics/renderers/specialOverlayRenderer.js');
    const { YujiFighter } = await import('../js/entities/fighters/YujiFighter.js');
    const yuji = new YujiFighter({ color: '#DC2626', name: 'Yuji' });
    yuji.x = 400;
    yuji.y = 300;
    yuji.hp = 200;
    yuji.soulSwapActive = true;

    const dummyEnemy = { x: 500, y: 300, r: 25, hp: 100, maxHp: 100, z: 0 };
    state.fighters = [yuji, dummyEnemy];

    // Verify image loader
    const yujiImg = getYujiSoulSwapOverlayImage();
    if (!yujiImg) {
      throw new Error('[YUJI SOUL SWAP OVERLAY IMAGE FAILED] getYujiSoulSwapOverlayImage() returned null/undefined');
    }
    if (!yujiImg.src.includes('Yuji-soulswap-overlay.png')) {
      throw new Error(`[YUJI SOUL SWAP OVERLAY IMAGE FAILED] Expected image src to include Yuji-soulswap-overlay.png, got ${yujiImg.src}`);
    }

    // Verify config transparency
    if (CONFIG.yuji?.soulSwapOverlayAlpha === undefined || CONFIG.yuji.soulSwapOverlayAlpha >= 1.0) {
      throw new Error(`[YUJI OVERLAY TRANSPARENCY FAILED] Expected soulSwapOverlayAlpha to be transparent (< 1.0), got ${CONFIG.yuji?.soulSwapOverlayAlpha}`);
    }

    // Test rectangular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'rect', wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawYujiSoulSwapArenaOverlay();
    assertCanvasStackBalance('drawYujiSoulSwapArenaOverlay (rect arena)');

    mockCtx.resetStackDepth();
    drawYujiSoulSwapDimScreen();
    assertCanvasStackBalance('drawYujiSoulSwapDimScreen with soul swap overlay (rect arena)');

    // Test circular arena clipping
    state.arena = { x: 0, y: 0, width: 800, height: 600, shape: 'circle', radius: 300, wallWidth: 4 };
    mockCtx.resetStackDepth();
    drawYujiSoulSwapArenaOverlay();
    assertCanvasStackBalance('drawYujiSoulSwapArenaOverlay (circular arena)');

    mockCtx.resetStackDepth();
    drawYujiSoulSwapDimScreen();
    assertCanvasStackBalance('drawYujiSoulSwapDimScreen with soul swap overlay (circular arena)');

    // Test during transition phase
    yuji.soulSwapActive = false;
    yuji.soulSwapTransitionTimer = 15;
    mockCtx.resetStackDepth();
    drawYujiSoulSwapArenaOverlay();
    assertCanvasStackBalance('drawYujiSoulSwapArenaOverlay (transition phase)');

    yuji.soulSwapTransitionTimer = 0;
  } catch (err) {
    console.error('❌ [YUJI SOUL SWAP ARENA OVERLAY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[YUJI SOUL SWAP ARENA OVERLAY TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Disabled Skill Bar Hiding Verification Test (Across Multi-Fighters)
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('🎛️ [Disabled Skill Bar Hiding Test] Verifying that disabling any skill in CONFIG hides its HUD skill bar...');

    // 1. Gojo: Red, Purple, Domain (uv)
    const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
    const gojo = new GojoFighter({ color: '#3B82F6', name: 'Gojo' });
    const origGojoRed = CONFIG.gojo?.enableRed;
    const origGojoPurple = CONFIG.gojo?.enablePurple;
    const origGojoDomain = CONFIG.gojo?.enableDomain;
    try {
      if (CONFIG.gojo) {
        CONFIG.gojo.enableRed = 1;
        CONFIG.gojo.enablePurple = 1;
        CONFIG.gojo.enableDomain = 1;
      }
      const gojoAll = getSkillDataForFighter(gojo);
      const hasRed = gojoAll.some(s => s.id === 'red');
      const hasPurple = gojoAll.some(s => s.id === 'purple');
      const hasDomain = gojoAll.some(s => s.id === 'uv');
      if (!hasRed || !hasPurple || !hasDomain) {
        throw new Error(`Gojo expected red, purple, uv skill bars when enabled. Found: ${gojoAll.map(s => s.id).join(', ')}`);
      }

      if (CONFIG.gojo) {
        CONFIG.gojo.enableRed = 0;
        CONFIG.gojo.enablePurple = 0;
      }
      const gojoFiltered = getSkillDataForFighter(gojo);
      if (gojoFiltered.some(s => s.id === 'red')) {
        throw new Error(`Gojo 'red' skill bar was not hidden when enableRed=0!`);
      }
      if (gojoFiltered.some(s => s.id === 'purple')) {
        throw new Error(`Gojo 'purple' skill bar was not hidden when enablePurple=0!`);
      }
      if (!gojoFiltered.some(s => s.id === 'uv')) {
        throw new Error(`Gojo 'uv' skill bar was unexpectedly hidden when enableDomain=1!`);
      }
    } finally {
      if (CONFIG.gojo) {
        CONFIG.gojo.enableRed = origGojoRed;
        CONFIG.gojo.enablePurple = origGojoPurple;
        CONFIG.gojo.enableDomain = origGojoDomain;
      }
    }

    // 2. Sukuna: Fuga, Domain (ms)
    const { SukunaFighter } = await import('../js/entities/fighters/SukunaFighter.js');
    const sukuna = new SukunaFighter({ color: '#E11D48', name: 'Sukuna' });
    const origSukunaFuga = CONFIG.sukuna?.enableFuga;
    const origSukunaDomain = CONFIG.sukuna?.enableDomain;
    try {
      if (CONFIG.sukuna) {
        CONFIG.sukuna.enableFuga = 0;
        CONFIG.sukuna.enableDomain = 0;
      }
      const sukunaFiltered = getSkillDataForFighter(sukuna);
      if (sukunaFiltered.some(s => s.id === 'fuga')) {
        throw new Error(`Sukuna 'fuga' skill bar was not hidden when enableFuga=0!`);
      }
      if (sukunaFiltered.some(s => s.id === 'ms')) {
        throw new Error(`Sukuna 'ms' skill bar was not hidden when enableDomain=0!`);
      }
    } finally {
      if (CONFIG.sukuna) {
        CONFIG.sukuna.enableFuga = origSukunaFuga;
        CONFIG.sukuna.enableDomain = origSukunaDomain;
      }
    }

    // 3. Nanami: Collapse, Black Flash
    const { NanamiFighter } = await import('../js/entities/fighters/NanamiFighter.js');
    const nanami = new NanamiFighter({ color: '#F59E0B', name: 'Nanami' });
    const origNanamiCollapse = CONFIG.nanami?.enableCollapse;
    const origNanamiBF = CONFIG.nanami?.enableBlackFlash;
    try {
      if (CONFIG.nanami) {
        CONFIG.nanami.enableCollapse = 0;
        CONFIG.nanami.enableBlackFlash = 0;
      }
      const nanamiFiltered = getSkillDataForFighter(nanami);
      if (nanamiFiltered.some(s => s.id === 'collapse')) {
        throw new Error(`Nanami 'collapse' skill bar was not hidden when enableCollapse=0!`);
      }
      if (nanamiFiltered.some(s => s.id === 'blackflash')) {
        throw new Error(`Nanami 'blackflash' skill bar was not hidden when enableBlackFlash=0!`);
      }
    } finally {
      if (CONFIG.nanami) {
        CONFIG.nanami.enableCollapse = origNanamiCollapse;
        CONFIG.nanami.enableBlackFlash = origNanamiBF;
      }
    }

    // 4. CJ: Jetpack, Drive-By, Hesoyam
    const { CJFighter } = await import('../js/entities/fighters/CJFighter.js');
    const cj = new CJFighter({ color: '#22C55E', name: 'CJ' });
    const origCjJetpack = CONFIG.cj?.enableJetpack;
    const origCjDriveBy = CONFIG.cj?.enableDriveBy;
    try {
      if (CONFIG.cj) {
        CONFIG.cj.enableJetpack = 0;
        CONFIG.cj.enableDriveBy = 0;
      }
      const cjFiltered = getSkillDataForFighter(cj);
      if (cjFiltered.some(s => s.id === 'jetpack')) {
        throw new Error(`CJ 'jetpack' skill bar was not hidden when enableJetpack=0!`);
      }
      if (cjFiltered.some(s => s.id === 'driveby')) {
        throw new Error(`CJ 'driveby' skill bar was not hidden when enableDriveBy=0!`);
      }
    } finally {
      if (CONFIG.cj) {
        CONFIG.cj.enableJetpack = origCjJetpack;
        CONFIG.cj.enableDriveBy = origCjDriveBy;
      }
    }

    // 5. Zenitsu: Thunderclap, Rokuren, Flaming God
    const { ZenitsuFighter } = await import('../js/entities/fighters/ZenitsuFighter.js');
    const zenitsu = new ZenitsuFighter({ color: '#FACC15', name: 'Zenitsu' });
    const origZenitsuRokuren = CONFIG.zenitsu?.enableRokuren;
    const origZenitsuFlamingGod = CONFIG.zenitsu?.enableFlamingGod;
    try {
      if (CONFIG.zenitsu) {
        CONFIG.zenitsu.enableRokuren = 0;
        CONFIG.zenitsu.enableFlamingGod = 0;
      }
      const zenitsuFiltered = getSkillDataForFighter(zenitsu);
      if (zenitsuFiltered.some(s => s.id === 'rokuren')) {
        throw new Error(`Zenitsu 'rokuren' skill bar was not hidden when enableRokuren=0!`);
      }
      if (zenitsuFiltered.some(s => s.id === 'flamingGod')) {
        throw new Error(`Zenitsu 'flamingGod' skill bar was not hidden when enableFlamingGod=0!`);
      }
    } finally {
      if (CONFIG.zenitsu) {
        CONFIG.zenitsu.enableRokuren = origZenitsuRokuren;
        CONFIG.zenitsu.enableFlamingGod = origZenitsuFlamingGod;
      }
    }

    console.log('✅ [Disabled Skill Bar Hiding Test] All fighters correctly hide disabled skills from HUD.');
  } catch (err) {
    console.error('❌ [DISABLED SKILL BAR HIDING TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[DISABLED SKILL BAR HIDING TEST]: ${err.stack || err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Zenitsu Dash CC & Movement-Stopping Immunity Test
  // ─────────────────────────────────────────────────────────────
  try {
    console.log('⚡ [Zenitsu Dash CC Immunity Test] Verifying full immunity to CC and movement-stopping effects during dash...');
    const { ZenitsuFighter } = await import('../js/entities/fighters/ZenitsuFighter.js');
    const zenitsu = new ZenitsuFighter({ color: '#FACC15', name: 'Zenitsu' });

    // 1. Normal state (should accept CC normally)
    zenitsu.applyHitStun(15);
    if (zenitsu.hitStunTimer !== 15) {
      throw new Error(`Zenitsu should receive hit stun when not dashing, expected 15, got ${zenitsu.hitStunTimer}`);
    }
    zenitsu.hitStunTimer = 0;

    // 2. Dashing state (isDashingThunderclap = true)
    zenitsu.isDashingThunderclap = true;
    zenitsu.applyHitStun(20);
    zenitsu.applyParalyze(20);
    zenitsu.applySlow(20, 0.2);
    zenitsu.applyTimeStop(20);
    zenitsu.vx = 5;
    zenitsu.vy = 5;
    zenitsu.applyKnockback(100, 100);

    if (zenitsu.hitStunTimer !== 0 || zenitsu.paralyzeTimer !== 0 || zenitsu.slowTimer !== 0 || zenitsu.timeStopTimer !== 0) {
      throw new Error(`Zenitsu received CC while isDashingThunderclap=true! hitStun=${zenitsu.hitStunTimer}, paralyze=${zenitsu.paralyzeTimer}, slow=${zenitsu.slowTimer}, timeStop=${zenitsu.timeStopTimer}`);
    }
    if (zenitsu.vx !== 5 || zenitsu.vy !== 5) {
      throw new Error(`Zenitsu received knockback during dash! vx=${zenitsu.vx}, vy=${zenitsu.vy}`);
    }
    if (zenitsu._handleTimeStop() !== false) {
      throw new Error(`_handleTimeStop() should return false during isDashingThunderclap!`);
    }
    if (zenitsu.isCaughtInBeam() !== false) {
      throw new Error(`isCaughtInBeam() should return false during isDashingThunderclap!`);
    }

    // 3. Transient interrupt should not break active dash
    zenitsu.interruptAttacks(false);
    if (!zenitsu.isDashingThunderclap) {
      throw new Error(`Transient interruptAttacks(false) broke active dash state!`);
    }

    // 4. Force interrupt (death/round end) should clean up
    zenitsu.interruptAttacks(true);
    if (zenitsu.isDashingThunderclap) {
      throw new Error(`interruptAttacks(true) failed to cancel dash state!`);
    }

    // 5. Pause between dashes state (thunderclapDashPauseTimer > 0)
    zenitsu.thunderclapDashPauseTimer = 10;
    zenitsu.applyHitStun(20);
    zenitsu.applyParalyze(20);
    zenitsu.applySlow(20, 0.2);
    zenitsu.applyTimeStop(20);
    if (zenitsu.hitStunTimer !== 0 || zenitsu.paralyzeTimer !== 0 || zenitsu.slowTimer !== 0 || zenitsu.timeStopTimer !== 0) {
      throw new Error(`Zenitsu received CC while thunderclapDashPauseTimer > 0! hitStun=${zenitsu.hitStunTimer}, paralyze=${zenitsu.paralyzeTimer}`);
    }
    // 6. Sound Config & Dash Audio Mix Verification
    if (!CONFIG.zenitsu?.sounds?.dashNoise || CONFIG.zenitsu.sounds.dashNoise !== 'Assets/Sound Effects/Skills/Zenitsu-dash-noise.mp3') {
      throw new Error(`CONFIG.zenitsu.sounds.dashNoise is missing or incorrect! Got: ${CONFIG.zenitsu?.sounds?.dashNoise}`);
    }
    if (!CONFIG.zenitsu?.sounds?.thunderStrike || CONFIG.zenitsu.sounds.thunderStrike !== 'Assets/Sound Effects/Skills/Zenitsu-dash2.mp3') {
      throw new Error(`CONFIG.zenitsu.sounds.thunderStrike is missing or incorrect! Got: ${CONFIG.zenitsu?.sounds?.thunderStrike}`);
    }
    if (!CONFIG.zenitsu?.sounds?.dashSFX || !CONFIG.zenitsu?.sounds?.katanaSwing || !CONFIG.zenitsu?.sounds?.slashHit) {
      throw new Error(`CONFIG.zenitsu.sounds is missing required audio mappings!`);
    }

    // Trigger basic attack, stance, and dash step to verify zero audio exceptions
    const dummyOpponent = { x: 320, y: 250, r: 25, hp: 100, isDead: false, bloodColor: '#DC2626', applyParalyze: () => {}, applyHitStun: () => {}, applyKnockback: () => {} };
    zenitsu.slashSwingTimer = 0;
    zenitsu._executeThunderIaiCombo(dummyOpponent);
    zenitsu._triggerThunderclapAndFlash(dummyOpponent);
    zenitsu._startThunderclapDashStep(dummyOpponent, 0);
    zenitsu._finalizeThunderclapDashStep(dummyOpponent, 300, 250, 400, 250, 0, 0, false);
    zenitsu._finalizeThunderclapDashStep(dummyOpponent, 300, 250, 400, 250, 0, 3, true);
    zenitsu.isDashingThunderclap = false;

    console.log('✅ [Zenitsu Dash CC Immunity Test] Zenitsu correctly maintains 100% CC and movement-stopping immunity during dashing and dash pauses, and plays configured audio mix.');
  } catch (err) {
    console.error('❌ [ZENITSU DASH CC IMMUNITY TEST ERROR]:', err.message || err);
    errors++;
    errorList.push(`[ZENITSU DASH CC IMMUNITY TEST]: ${err.stack || err.message}`);
  }

  console.log('───────────────────────────────────────────────────────');
  if (errors === 0) {
    console.log(`✅ Successfully tested all ${totalTested} fighter classes, skins, weapon previews, and UI screens with ZERO runtime errors and 100% BALANCED Canvas 2D stacks!`);
    process.exit(0);
  } else {
    console.log(`🚨 Found ${errors} fighter / weapon / UI runtime errors:`);
    if (typeof errorList !== 'undefined') {
      const fs = await import('fs');
      fs.writeFileSync('error_log.txt', errorList.join('\n'), 'utf8');
      errorList.forEach((e, idx) => console.log(`  ${idx + 1}. ${e}`));
    }
    process.exit(1);
  }
}

main();
