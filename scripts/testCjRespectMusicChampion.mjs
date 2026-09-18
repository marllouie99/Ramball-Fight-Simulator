// ─────────────────────────────────────────────────────────────
// CJ RESPECT OVERLAY BG MUSIC CHAMPION ROUND TEST SUITE
// ─────────────────────────────────────────────────────────────

function createMockCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  let _stackDepth = 0;
  return {
    save: () => { _stackDepth++; },
    restore: () => { _stackDepth--; },
    getStackDepth: () => _stackDepth,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    strokeText: noop,
    fillText: noop,
    measureText: () => ({ width: 50 }),
    createLinearGradient: () => grad,
    setTransform: noop,
    resetTransform: noop,
    drawImage: noop,
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
    return { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') return mockCanvas;
    return { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, textContent: '', innerHTML: '', addEventListener: () => {} };
  },
  body: { style: {} }
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

async function runTests() {
  const { state, triggerMissionPassedOverlay } = await import('../js/core/state.js');
  const { stopSound, fadeOutSound, stopSoundBySrc, stopAllSounds, stopAllAudio } = await import('../js/systems/soundSystem.js');
  const { shouldDuckArenaBgm } = await import('../js/systems/arenaBgmSystem.js');
  const { updateGame } = await import('../js/systems/updateSystem.js');
  const { resetMatch, goToTitle } = await import('../js/core/gameFlow.js');
  const { audioSystem } = await import('../js/systems/audioSystem.js');

  console.log('🎵 [CJ Respect Overlay Music Champion Round Test Suite] Starting tests...');
  let errors = 0;

  let playedSounds = [];
  let soundHandles = [];

  const origPlaySFX = audioSystem.playSFX.bind(audioSystem);
  audioSystem.playSFX = (src, vol, speed, offset, delay, onEnded) => {
    playedSounds.push(src);
    const handle = {
      src,
      volume: vol,
      isPlaying: () => true,
      onEnded,
      stopped: false
    };
    soundHandles.push(handle);
    return handle;
  };
  globalThis.audioSystem = audioSystem;

  try {
    // Test 1: Triggering Mission Passed Overlay starts respect music & sets state._isRespectMusicPlaying
    console.log('   1. Testing triggerMissionPassedOverlay sets _isRespectMusicPlaying...');
    state.missionPassedOverlay = null;
    state._isRespectMusicPlaying = false;
    state._hadMissionOverlay = false;

    triggerMissionPassedOverlay({ timer: 180 });

    if (!state._isRespectMusicPlaying) {
      throw new Error('state._isRespectMusicPlaying was not set to true after triggerMissionPassedOverlay');
    }
    if (!playedSounds.some(s => s.includes('cj-respectoverlay-bgmusic'))) {
      throw new Error('cj-respectoverlay-bgmusic.mp3 was not played');
    }
    console.log('      ✅ Respect music played and _isRespectMusicPlaying is true.');

    // Test 2: Double trigger does NOT restart or double-play respect music
    console.log('   2. Testing double trigger protection...');
    const soundCountBefore = playedSounds.length;
    triggerMissionPassedOverlay({ timer: 180 });
    if (playedSounds.length !== soundCountBefore) {
      throw new Error('Respect music was double-triggered while already playing!');
    }
    console.log('      ✅ Respect music prevented double-trigger.');

    // Test 3: stopAllSounds(false) does NOT cut off active respect music
    console.log('   3. Testing stopAllSounds(false) protection for respect music...');
    const respectHandle = state._respectMusicHandle;
    stopAllSounds(false, 0, 0); // Simulate match reset / round transition
    if (!state._isRespectMusicPlaying) {
      throw new Error('stopAllSounds(false) prematurely reset _isRespectMusicPlaying!');
    }
    console.log('      ✅ stopAllSounds(false) preserves active respect music.');

    // Test 4: stopSound and fadeOutSound protection
    console.log('   4. Testing stopSound and fadeOutSound protection...');
    stopSound(respectHandle);
    fadeOutSound(respectHandle, 350);
    stopSoundBySrc('respect');
    if (!state._isRespectMusicPlaying) {
      throw new Error('stopSound/fadeOutSound prematurely stopped respect music!');
    }
    console.log('      ✅ stopSound and fadeOutSound protect respect music.');

    // Test 5: shouldDuckArenaBgm returns true while _isRespectMusicPlaying is active (even after visual overlay ends)
    console.log('   5. Testing shouldDuckArenaBgm while _isRespectMusicPlaying...');
    state.missionPassedOverlay = null; // Visual overlay timer has ended
    if (!shouldDuckArenaBgm()) {
      throw new Error('shouldDuckArenaBgm() returned false while _isRespectMusicPlaying is true!');
    }
    console.log('      ✅ Arena BGM is correctly ducked while respect music plays.');

    // Test 6: updateGame in matchEnd does NOT advance to next match while _isRespectMusicPlaying is true
    console.log('   6. Testing matchEnd auto-advance delay while _isRespectMusicPlaying is true...');
    state.gameState = 'matchEnd';
    state.matchEndTimer = 650; // Past standard 210 or 540 frames
    state.mode = '1v1';
    
    updateGame();
    if (state.gameState !== 'matchEnd') {
      throw new Error('updateGame advanced matchEnd prematurely while _isRespectMusicPlaying was true!');
    }
    console.log('      ✅ MatchEnd held in champion screen until respect music ends naturally.');

    // Test 7: When respect music ends naturally, onEnded resets _isRespectMusicPlaying
    console.log('   7. Testing natural onEnded completion callback...');
    if (typeof respectHandle?.onEnded === 'function') {
      respectHandle.onEnded();
    }
    if (state._isRespectMusicPlaying) {
      throw new Error('onEnded did not set _isRespectMusicPlaying to false!');
    }
    console.log('      ✅ onEnded smoothly released _isRespectMusicPlaying.');

    // Test 8: goToTitle cleanly stops all audio including respect music
    console.log('   8. Testing goToTitle force-stops all audio...');
    state._isRespectMusicPlaying = true;
    goToTitle();
    if (state._isRespectMusicPlaying) {
      throw new Error('goToTitle did not reset _isRespectMusicPlaying!');
    }
    console.log('      ✅ goToTitle cleanly resets all audio and state.');

  } catch (err) {
    console.error('❌ [TEST FAILURE]:', err);
    errors++;
  }

  if (errors > 0) {
    console.error(`\n❌ ${errors} test(s) failed!`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL CJ RESPECT OVERLAY MUSIC CHAMPION ROUND TESTS PASSED (100%)!');
  }
}

runTests();
