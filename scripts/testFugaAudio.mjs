// Browser mock environment for Node.js
function createMockCtx() {
  const noop = () => {};
  return {
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop, fill: noop, stroke: noop,
    drawImage: noop, createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    setTransform: noop, resetTransform: noop, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    canvas: { width: 540, height: 960 }
  };
}

const mockCtx = createMockCtx();
const mockCanvas = mockCtx.canvas;
mockCanvas.style = {};
mockCanvas.getContext = () => mockCtx;

globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = {
  addEventListener: () => {}, removeEventListener: () => {},
  getElementById: (id) => (id === 'arena' ? mockCanvas : { style: {}, classList: { add: () => {}, remove: () => {} } }),
  querySelector: () => null, querySelectorAll: () => [],
  createElement: (tag) => ({ tagName: tag.toUpperCase(), style: {}, getContext: () => createMockCtx() }),
  body: { appendChild: () => {}, removeChild: () => {}, style: {} }
};

import assert from 'assert';
const { audioSystem } = await import('../js/systems/audioSystem.js');
const { projectileSystem } = await import('../js/systems/projectileSystem.js');
const { state } = await import('../js/core/state.js');

console.log('🧪 [Fuga Explosion Audio Test] Verifying audio playback on Fuga impact and explosion...');

let playedSounds = [];
audioSystem.playSFX = (src, vol) => {
  playedSounds.push({ src, vol });
  return { id: 'mock_audio' };
};

state.fighters = [
  { id: 0, characterId: 'sukuna', type: 'sukuna', hp: 1000, x: 200, y: 200, _def: { id: 'sukuna' }, domainActive: false },
  { id: 1, characterId: 'todo', type: 'todo', hp: 500, x: 230, y: 200, _def: { id: 'todo' }, takeDamage: () => {} }
];

// Trigger thermobaric explosion
playedSounds = [];
projectileSystem.triggerThermobaricExplosion(220, 200, 0, 300);

assert.strictEqual(playedSounds.length >= 1, true, 'At least one explosion sound must be played via audioSystem.playSFX');
const hasFugaExplode = playedSounds.some(s => s.src.includes('fugaexplode.mp3'));
assert.strictEqual(hasFugaExplode, true, 'fugaexplode.mp3 must be played on Fuga explosion');

console.log('Played sounds during Fuga explosion:', playedSounds);
console.log('✅ FUGA EXPLOSION AUDIO TEST PASSED!');
