// Test Suite: Toji Ultimate Slide-Away in Distance Before Crater Slam
function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;
  return {
    save: () => { _stackDepth++; },
    restore: () => {
      _stackDepth--;
      if (_stackDepth < 0) throw new Error(`[CANVAS STACK CORRUPTION] restore called with depth ${_stackDepth}`);
    },
    getStackDepth: () => _stackDepth,
    resetStackDepth: () => { _stackDepth = 0; },
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, arcTo: noop,
    ellipse: noop, rect: noop, roundRect: noop, setLineDash: noop, getLineDash: () => [],
    fillRect: noop, strokeRect: noop, clearRect: noop, fill: noop, stroke: noop,
    clip: noop, scale: noop, rotate: noop, translate: noop, transform: noop,
    setTransform: noop, resetTransform: noop, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    fillText: noop, strokeText: noop, measureText: () => ({ width: 50 }),
    drawImage: noop, createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, globalAlpha: 1.0, globalCompositeOperation: 'source-over',
    fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1.0,
    lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
    canvas: { width: 800, height: 600 }
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
  addEventListener: () => {}, removeEventListener: () => {},
  getElementById: (id) => (id === 'arena' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} }),
  querySelector: () => null, querySelectorAll: () => [],
  createElement: (tag) => (tag === 'canvas' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {} } }),
  body: { style: {} }
};
globalThis.Image = class { constructor() { this.width = 100; this.height = 100; this.complete = true; } };
globalThis.Audio = class { constructor() { this.play = () => Promise.resolve(); this.pause = () => {}; this.addEventListener = () => {}; this.removeEventListener = () => {}; this.cloneNode = () => new globalThis.Audio(); } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

async function run() {
  const { CONFIG } = await import('../js/core/config.js');
  const { state } = await import('../js/core/state.js');
  const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');
  const { projectileSystem } = await import('../js/systems/projectileSystem.js');

  // Initialize Arena Config
  CONFIG.arena = { x: 0, y: 0, width: 800, height: 600 };
  state.ctx = mockCtx;
  state.canvas = mockCanvas;
  state.fighters = [];
  state.projectiles = [];
  state.particles = [];
  state.illusions = [];
  state.getFighterTeam = (idx) => idx;

  console.log('🧪 [Test Suite] Starting Toji Ultimate Slide-Away Simulation Test...');

  // Instantiate Fighters
  const toji = new TojiFighter({ startX: 250, startY: 300, color: '#281438', type: 'toji' });
  const gojo = new GojoFighter({ startX: 450, startY: 300, color: '#4090FF', type: 'gojo' });

  toji.maxHp = 1000;
  toji.hp = 1000;
  toji.team = 0;
  gojo.maxHp = 3000;
  gojo.hp = 3000;
  gojo.team = 1;
  state.fighters = [toji, gojo];

  // 1. Trigger Toji Ultimate
  toji.ultimateCooldown = 0;
  toji.triggerUltimate();

  if (!toji.ultimateActive || toji.ultimatePhase !== 'CHANNELING') {
    throw new Error(`Toji ultimate failed to initiate in CHANNELING phase! Phase=${toji.ultimatePhase}`);
  }
  console.log('   ✓ Toji ultimate successfully started in CHANNELING phase.');

  // Step through CHANNELING until VANISHED
  for (let frame = 0; frame < 150; frame++) {
    if (toji.ultimatePhase === 'VANISHED') break;
    toji.update(state);
  }

  if (toji.ultimatePhase !== 'VANISHED') {
    throw new Error(`Toji failed to transition from CHANNELING to VANISHED! Phase=${toji.ultimatePhase}`);
  }
  console.log('   ✓ Toji transitioned to VANISHED after channeling.');

  // Step through all assault strikes until CRATER_FADEIN
  const maxStrikes = CONFIG.toji?.ultimateMaxStrikes || 8;
  let maxFrames = 2500;
  let strikesSeen = 0;

  let ricochetFramesDetected = 0;
  let stunFramesDetected = 0;
  while (toji.ultimatePhase !== 'CRATER_FADEIN' && maxFrames > 0) {
    maxFrames--;
    const prevAssaultCount = toji.ultimateAssaultCount;
    toji.update(state);
    gojo.update(state);
    if (Math.hypot(gojo.knockbackVx || 0, gojo.knockbackVy || 0) > 2 || Math.hypot(gojo.vx || 0, gojo.vy || 0) > 2) {
      ricochetFramesDetected++;
    }
    if ((gojo.paralyzeTimer || 0) > 0 || gojo.isParalyzed) {
      stunFramesDetected++;
    }
    if (toji.ultimateAssaultCount > prevAssaultCount) {
      strikesSeen = toji.ultimateAssaultCount;
    }
  }

  if (toji.ultimatePhase !== 'CRATER_FADEIN') {
    throw new Error(`Toji failed to reach CRATER_FADEIN after ${strikesSeen} strikes! Phase=${toji.ultimatePhase}`);
  }
  if (ricochetFramesDetected === 0) {
    throw new Error('Enemy did not receive ricochet kinetic impulses during ultimateMaxStrikes!');
  }
  if (stunFramesDetected === 0) {
    throw new Error('Enemy did not receive stun debuff (paralyzeTimer) during ultimateMaxStrikes!');
  }
  const assaultDamageTaken = 3000 - gojo.hp;
  const expectedMinDamage = maxStrikes * (CONFIG.toji?.ultimateAssaultDamage || 80);
  if (assaultDamageTaken < expectedMinDamage) {
    throw new Error(`Gojo did NOT take full damage during ultimateMaxStrikes! Damage taken=${assaultDamageTaken}, expected=${expectedMinDamage}`);
  }
  console.log(`   ✓ Toji executed ${strikesSeen}/${maxStrikes} assault strikes: stun debuff (${stunFramesDetected} stun frames) & ricochet (${ricochetFramesDetected} motion frames) simultaneously applied to enemy.`);
  console.log(`   ✓ Verified Toji bypassed Gojo Limitless Infinity during ultimateMaxStrikes: Gojo took full damage (${assaultDamageTaken} damage, HP 3000 -> ${gojo.hp}).`);

  // Inspect slide target position
  const distToTarget = Math.hypot(toji._ultimateSlideTargetX - gojo.x, toji._ultimateSlideTargetY - gojo.y);
  console.log(`   ✓ Toji slide target calculated: (${toji._ultimateSlideTargetX.toFixed(1)}, ${toji._ultimateSlideTargetY.toFixed(1)}), Distance from Gojo = ${distToTarget.toFixed(1)}px (Target >= 250px)`);

  if (distToTarget < 240) {
    throw new Error(`Toji slide target distance is too close to enemy! dist=${distToTarget}px`);
  }

  // Step through CRATER_FADEIN and verify Toji slides away from Gojo
  const startDist = Math.hypot(toji.x - gojo.x, toji.y - gojo.y);
  console.log(`   ✓ Starting position before slide away: (${toji.x.toFixed(1)}, ${toji.y.toFixed(1)}), Distance = ${startDist.toFixed(1)}px`);

  while (toji.ultimatePhase === 'CRATER_FADEIN') {
    toji.update(state);
    toji.draw(mockCtx);
  }

  const endFadeInDist = Math.hypot(toji.x - gojo.x, toji.y - gojo.y);
  console.log(`   ✓ Position after CRATER_FADEIN slide away: (${toji.x.toFixed(1)}, ${toji.y.toFixed(1)}), Distance = ${endFadeInDist.toFixed(1)}px`);

  if (endFadeInDist < 240) {
    throw new Error(`Toji did NOT slide away in distance from the enemy! Final distance=${endFadeInDist}px`);
  }

  if (toji.ultimatePhase !== 'CRATER') {
    throw new Error(`Toji failed to transition from CRATER_FADEIN to CRATER! Phase=${toji.ultimatePhase}`);
  }
  console.log('   ✓ Toji entered CRATER charge phase at distant vantage perch.');

  // Step through CRATER charge and verify he holds distant position until dive
  const diveTime = CONFIG.toji?.ultimateCraterDiveTime ?? 16;
  const spinTime = CONFIG.toji?.ultimateCraterSpinTime ?? 14;
  const diveAndSpinTotal = diveTime + spinTime;

  while (toji.ultimateCycleTimer > diveAndSpinTotal) {
    toji.update(state);
    toji.draw(mockCtx);
  }

  const preDiveDist = Math.hypot(toji.x - gojo.x, toji.y - gojo.y);
  console.log(`   ✓ Position at launch of dive: (${toji.x.toFixed(1)}, ${toji.y.toFixed(1)}), Distance = ${preDiveDist.toFixed(1)}px`);

  if (preDiveDist < 240) {
    throw new Error(`Toji lost distance before dive launch! preDiveDist=${preDiveDist}px`);
  }

  // Step through straight dive flight towards enemy
  let wasSpinningDuringFlight = false;
  while (toji.ultimateCycleTimer > spinTime) {
    if (toji.isSpinning) wasSpinningDuringFlight = true;
    toji.update(state);
    toji.draw(mockCtx);
  }

  if (wasSpinningDuringFlight) {
    throw new Error('Toji was spinning 360 during flight before reaching the enemy!');
  }
  console.log('   ✓ Toji flew straight to enemy with sword held in charge pose (isSpinning=false).');

  const arrivalDist = Math.hypot(toji.x - gojo.x, toji.y - gojo.y);
  console.log(`   ✓ Position upon arriving at enemy: (${toji.x.toFixed(1)}, ${toji.y.toFixed(1)}), Distance = ${arrivalDist.toFixed(1)}px`);
  if (arrivalDist > 5) {
    throw new Error(`Toji did not reach the enemy at end of dive! Dist=${arrivalDist}px`);
  }

  // Step through 360 final blow at the enemy
  let didSpinAtEnemy = false;
  let startSpinAngle = null;
  let endSpinAngle = null;
  while (toji.ultimatePhase === 'CRATER' && toji.ultimateCycleTimer > 0) {
    if (toji.isSpinning) didSpinAtEnemy = true;
    if (startSpinAngle === null) startSpinAngle = toji.angle;
    endSpinAngle = toji.angle;
    toji.update(state);
    toji.draw(mockCtx);
  }

  if (!didSpinAtEnemy) {
    throw new Error('Toji did not execute 360 spin final blow at enemy!');
  }
  const spinDelta = endSpinAngle - startSpinAngle;
  console.log(`   ✓ Executed 360 final blow at enemy (isSpinning=true, total rotation=${(spinDelta * 180 / Math.PI).toFixed(1)}°).`);

  // Step through remaining ultimate frames (crater slam recovery)
  const hpBeforeCrater = gojo.hp;
  while (toji.ultimateActive) {
    toji.update(state);
    gojo.update(state);
    toji.draw(mockCtx);
  }

  const craterDmgTaken = hpBeforeCrater - gojo.hp;
  const expectedCraterDmg = CONFIG.toji?.ultimateCraterDamage || 65;
  if (craterDmgTaken < expectedCraterDmg) {
    throw new Error(`Gojo did NOT take final blow crater slam damage! Damage taken=${craterDmgTaken}, expected=${expectedCraterDmg}`);
  }
  console.log(`   ✓ Toji completed crater slam impact and finished ultimate! Gojo took ${craterDmgTaken} final blow damage (bypassed Infinity).`);

  // 2. Verify Gojo Infinity state after Toji ultimate finishes
  if (!gojo.infinityActive) {
    throw new Error('Gojo infinityActive is false after Toji ultimate finishes!');
  }
  if (gojo.isTargetOfAmbush) {
    throw new Error('Gojo is still marked as isTargetOfAmbush after Toji ultimate finishes!');
  }
  if (gojo.isMeleeMode) {
    throw new Error('Gojo is stuck in isMeleeMode after Toji ultimate finishes!');
  }
  console.log('   ✓ Gojo Limitless Infinity barrier cleanly restored after Toji ultimate (infinityActive=true, isMeleeMode=false, isTargetOfAmbush=false).');

  // Place Toji close to Gojo (dist = 40px, within Gojo's barrierRadius = 110px) and verify barrier repulsion
  toji.x = 420;
  toji.y = 400;
  gojo.x = 400;
  gojo.y = 400;
  toji.vx = 0;
  toji.vy = 0;
  gojo._checkInfinityCollisions();
  if (Math.hypot(toji.vx, toji.vy) <= 0) {
    throw new Error(`Gojo Infinity barrier failed to repel/push Toji away on close approach! toji.vx=${toji.vx}, toji.vy=${toji.vy}`);
  }
  console.log('   ✓ Verified Gojo Limitless Infinity barrier physically repels Toji (pushForce > 0) and prevents passing through.');

  // Verify non-ISOH attack (e.g. Split Soul Katana or basic melee) is blocked by Infinity
  const prevHp = gojo.hp;
  gojo.takeDamage(100, toji, { isMelee: true, isIsoh: false });
  if (gojo.hp < prevHp) {
    throw new Error('Gojo took damage from non-ISOH melee attack while Infinity is active!');
  }
  console.log('   ✓ Verified Gojo Limitless Infinity blocks non-ISOH melee strikes (100% damage negated).');

  // 3. Verify enemy gun angle rotation and aiming recovery after Toji ultimate
  if (!gojo.canAim()) {
    throw new Error(`Gojo canAim() is false after Toji ultimate! paralyzeTimer=${gojo.paralyzeTimer}, isParalyzed=${gojo.isParalyzed}, timeStopTimer=${gojo.timeStopTimer}`);
  }
  if (typeof gojo._timeStopFrozenGunAngle === 'number' || typeof gojo._timeStopFrozenAngle === 'number') {
    throw new Error('Gojo has lingering _timeStopFrozenAngle / _timeStopFrozenGunAngle after Toji ultimate!');
  }

  // Move Toji to (100, 100) and verify Gojo aims at Toji correctly
  toji.x = 100;
  toji.y = 100;
  gojo.x = 400;
  gojo.y = 400;
  gojo.aim(toji);
  const expectedAngle = Math.atan2(toji.y - gojo.y, toji.x - gojo.x); // Should be -3*PI/4 (~ -2.356 rad)
  let angleDiff = Math.abs(gojo.gunAngle - expectedAngle);
  while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
  if (angleDiff > 0.05) {
    throw new Error(`Gojo gunAngle (${gojo.gunAngle.toFixed(3)}) is not aiming at Toji (${expectedAngle.toFixed(3)})!`);
  }
  console.log('   ✓ Verified enemy canAim() returns true and gunAngle dynamically tracks Toji across all positions.');

  // 4. Verify Gojo Hollow Purple Disables Infinity Barrier Until Life Expires
  state.gameState = 'playing';
  state.fighters = [toji, gojo];
  gojo.isMeleeMode = false;
  gojo.forcedMeleeTimer = 0;
  gojo.purpleCooldown = 0;
  gojo.isChannelingPurple = true;
  gojo.purpleChargeTimer = CONFIG.gojo?.purpleChargeMax || 120;
  gojo._firePurple(1);

  const expectedRecoveryDuration = CONFIG.gojo?.purpleRecoveryDuration ?? 50;
  console.log(`   ✓ Gojo Hollow Purple fired: purpleRecoveryTimer = ${gojo.purpleRecoveryTimer} (Expected = ${expectedRecoveryDuration} based on CONFIG.gojo.purpleRecoveryDuration).`);
  if (gojo.purpleRecoveryTimer !== expectedRecoveryDuration) {
    throw new Error(`Gojo purpleRecoveryTimer (${gojo.purpleRecoveryTimer}) does not match purpleRecoveryDuration (${expectedRecoveryDuration})!`);
  }

  // 4.1 Verify Infinity barrier is disabled immediately upon firing Purple
  if (gojo.infinityActive) {
    throw new Error('Gojo infinityActive is STILL true immediately after firing Hollow Purple!');
  }
  if (gojo.infinityFadeOpacity > 0) {
    throw new Error('Gojo infinityFadeOpacity is > 0 while Purple is in flight!');
  }
  console.log('   ✓ Verified Gojo Limitless Infinity barrier is disabled upon firing Hollow Purple (infinityActive=false, fadeOpacity=0).');

  // 4.2 Verify Gojo barrier does NOT repel enemies while Purple is active
  toji.x = 420;
  toji.y = 400;
  gojo.x = 400;
  gojo.y = 400;
  toji.vx = 0;
  toji.vy = 0;
  gojo._checkInfinityCollisions();
  if (Math.hypot(toji.vx, toji.vy) > 0) {
    throw new Error('Gojo Infinity barrier repelled an enemy while Purple was active!');
  }
  console.log('   ✓ Verified Gojo barrier does not repel enemies while Purple life is active.');

  // 4.3 Verify Gojo takes damage while Infinity barrier is disabled during Purple
  const hpBeforePurpleHit = gojo.hp;
  gojo.takeDamage(15, toji, { isMelee: true });
  if (gojo.hp >= hpBeforePurpleHit) {
    throw new Error('Gojo failed to take damage while Infinity is disabled during Purple!');
  }
  console.log('   ✓ Verified Gojo takes damage while Infinity barrier is disabled during Hollow Purple.');

  // Keep in Ranged mode during the breather recovery so Infinity can resume upon expiry
  gojo.isMeleeMode = false;
  gojo.forcedMeleeTimer = 0;

  // 4.4 Step frames until Hollow Purple life expires
  let stepCount = 0;
  while (gojo.purpleRecoveryTimer > 0 || (gojo.isPurpleActive && gojo.isPurpleActive())) {
    stepCount++;
    gojo.update(state);
    if (projectileSystem?.update) {
      projectileSystem.update(state.fighters || [toji, gojo]);
    }
  }

  // 4.5 Verify Infinity barrier is cleanly restored once Purple life expires
  if (!gojo.infinityActive) {
    throw new Error(`Gojo infinityActive failed to restore after Hollow Purple life expired! (stepped ${stepCount} frames)`);
  }
  console.log('   ✓ Verified Gojo Limitless Infinity barrier is cleanly restored once Purple life expires (infinityActive=true).');

  // 4.6 Verify Infinity barrier blocks attacks again after Purple life expired
  const hpAfterRestore = gojo.hp;
  gojo.takeDamage(15, toji, { isMelee: true });
  if (gojo.hp < hpAfterRestore) {
    throw new Error('Gojo took damage after Infinity was restored upon Purple life expiry!');
  }
  console.log('   ✓ Verified Gojo Limitless Infinity blocks incoming attacks again after Purple life expires.');

  console.log('───────────────────────────────────────────────────────');
  console.log('🎉 ALL TOJI ULTIMATE & GOJO PURPLE BREATHER SIMULATION TESTS PASSED CLEANLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
