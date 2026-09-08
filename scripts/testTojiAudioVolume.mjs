// Test Suite: Toji Audio Volume Configuration and Mute Verification
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
  const { getSkillEffectSound } = await import('../js/soundEffects/skillEffectSounds.js');
  const { audioSystem } = await import('../js/systems/audioSystem.js');
  const { TojiFighter } = await import('../js/entities/fighters/TojiFighter.js');
  const { GojoFighter } = await import('../js/entities/fighters/GojoFighter.js');

  console.log('🧪 [Test Suite] Starting Toji Audio Volume Configuration Verification...');

  // Track all sounds played through audioSystem
  const playedSounds = [];
  audioSystem.on('playSFX', (id, vol, spd, off, del) => {
    playedSounds.push({ id, vol, spd, off, del });
  });

  // 1. Test getSkillEffectSound with ultimateChanneling: 0.0
  CONFIG.toji.soundVolumes.ultimateChanneling = 0.0;
  const mutedSound = getSkillEffectSound('toji', 'ultimatechanneling');
  if (!mutedSound) {
    throw new Error('getSkillEffectSound returned null for ultimatechanneling!');
  }
  if (mutedSound.volume !== 0.0) {
    throw new Error(`Expected mutedSound.volume === 0.0, got ${mutedSound.volume}`);
  }
  console.log('   ✓ getSkillEffectSound correctly returns volume 0.0 when CONFIG.toji.soundVolumes.ultimateChanneling = 0.0.');

  // 2. Test getSkillEffectSound with custom non-zero volume (e.g. 2.5)
  CONFIG.toji.soundVolumes.ultimateChanneling = 2.5;
  const customSound = getSkillEffectSound('toji', 'ultimatechanneling');
  if (customSound.volume !== 2.5) {
    throw new Error(`Expected customSound.volume === 2.5, got ${customSound.volume}`);
  }
  console.log('   ✓ getSkillEffectSound correctly returns custom volume 2.5 when CONFIG.toji.soundVolumes.ultimateChanneling = 2.5.');

  // 3. Test audioSystem.playSFX with volume: 0.0
  const resultMute = audioSystem.playSFX('Assets/Sound Effects/Skills/toji-ultimatechanneling.mp3', 0.0);
  if (resultMute !== null) {
    throw new Error(`Expected audioSystem.playSFX to return null on volume 0.0, got ${resultMute}`);
  }
  console.log('   ✓ audioSystem.playSFX strictly aborts playback (returns null) on volume 0.0.');

  // 4. Test Toji triggerUltimate() with ultimateChanneling = 0.0
  CONFIG.toji.soundVolumes.ultimateChanneling = 0.0;
  CONFIG.arena = { x: 0, y: 0, width: 800, height: 600 };
  state.ctx = mockCtx;
  state.canvas = mockCanvas;
  state.fighters = [];
  state.projectiles = [];
  state.particles = [];
  state.illusions = [];

  const toji = new TojiFighter({ startX: 250, startY: 300, color: '#281438', type: 'toji' });
  const gojo = new GojoFighter({ startX: 450, startY: 300, color: '#4090FF', type: 'gojo' });
  state.fighters = [toji, gojo];

  playedSounds.length = 0;
  toji.triggerUltimate();

  // Find the ultimatechanneling sound in playedSounds
  const chanPlay = playedSounds.find(s => typeof s.id === 'string' && s.id.includes('ultimatechanneling'));
  if (chanPlay && chanPlay.vol > 0) {
    throw new Error(`Ultimate channeling sound was played with non-zero volume ${chanPlay.vol} despite being muted!`);
  }
  console.log('   ✓ Toji triggerUltimate() cleanly mutes channeling audio when ultimateChanneling: 0.0.');

  // 5. Test all other Toji sound volumes
  const soundKeys = [
    { effect: 'firstseqteleport', cfg: 'firstSeqTeleport' },
    { effect: 'backthrust', cfg: 'backThrust' },
    { effect: 'secondweaponattack', cfg: 'secondWeaponAttack' },
    { effect: 'phantomflurry', cfg: 'phantomFlurry' },
    { effect: 'vanish', cfg: 'vanish' },
    { effect: 'strike', cfg: 'dashStrike' },
    { effect: 'finalblowcharging', cfg: 'finalBlowCharging' },
    { effect: 'ultimatefinalblow', cfg: 'ultimateFinalBlow' }
  ];

  for (const { effect, cfg } of soundKeys) {
    CONFIG.toji.soundVolumes[cfg] = 0.0;
    const snd = getSkillEffectSound('toji', effect);
    if (!snd || snd.volume !== 0.0) {
      throw new Error(`getSkillEffectSound('toji', '${effect}') did not respect 0.0 volume! volume=${snd?.volume}`);
    }
    CONFIG.toji.soundVolumes[cfg] = 3.33;
    const snd2 = getSkillEffectSound('toji', effect);
    if (!snd2 || Math.abs(snd2.volume - 3.33) > 0.001) {
      throw new Error(`getSkillEffectSound('toji', '${effect}') did not respect custom volume 3.33! volume=${snd2?.volume}`);
    }
  }
  console.log('   ✓ Verified all 8 Toji sound effect configs dynamically sync with CONFIG.toji.soundVolumes.');

  console.log('───────────────────────────────────────────────────────');
  console.log('🎉 ALL TOJI AUDIO VOLUME & MUTE VERIFICATION TESTS PASSED CLEANLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
