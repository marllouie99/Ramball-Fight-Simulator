import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 [Dim Effects Setting Test] Verifying Settings Menu UI and Dim Screen suppression...');

// 1. Verify index.html contains toggle-dimeffects and btn-dimeffects
const htmlContent = fs.readFileSync('index.html', 'utf8');
assert.ok(htmlContent.includes('data-action="toggle-dimeffects"'), 'index.html must include data-action="toggle-dimeffects"');
assert.ok(htmlContent.includes('id="btn-dimeffects"'), 'index.html must include id="btn-dimeffects"');
assert.ok(htmlContent.includes('DIM EFFECTS'), 'index.html must display DIM EFFECTS title');
console.log('✅ index.html Settings markup verified.');

// 2. Verify state.js contains disableDimEffects property
const stateContent = fs.readFileSync('js/core/state.js', 'utf8');
assert.ok(stateContent.includes('disableDimEffects:'), 'state.js must define disableDimEffects');
console.log('✅ state.js disableDimEffects definition verified.');

// 3. Verify main.js contains toggle-dimeffects handlers
const mainContent = fs.readFileSync('js/core/main.js', 'utf8');
assert.ok(mainContent.includes("action === 'toggle-dimeffects'"), 'main.js must handle toggle-dimeffects action');
assert.ok(mainContent.includes("getElementById('btn-dimeffects')"), 'main.js must query and update btn-dimeffects');
console.log('✅ main.js toggle handler and event listener verified.');

// 4. Verify renderSystem.js guards dim drawing
const renderSystemContent = fs.readFileSync('js/systems/renderSystem.js', 'utf8');
assert.ok(renderSystemContent.includes('!state.disableDimEffects'), 'renderSystem.js must check !state.disableDimEffects');
console.log('✅ renderSystem.js dim rendering guard verified.');

// 5. Verify hybridEnvironmentRenderer.js cleans up and returns early when dim effects are disabled
const hybridEnvContent = fs.readFileSync('js/graphics/renderers/hybridEnvironmentRenderer.js', 'utf8');
assert.ok(hybridEnvContent.includes('state.disableDimEffects'), 'hybridEnvironmentRenderer.js must check state.disableDimEffects');
console.log('✅ hybridEnvironmentRenderer.js cleanup guard verified.');

// 6. Verify individual dim functions have early return guards
const domainDimContent = fs.readFileSync('js/graphics/renderers/domainDimOverlays.js', 'utf8');
assert.ok(domainDimContent.includes('if (typeof state !== \'undefined\' && state.disableDimEffects) return;'), 'domainDimOverlays.js must have early return checks');

const envContent = fs.readFileSync('js/graphics/renderers/environmentalRenderer.js', 'utf8');
assert.ok(envContent.includes('if (typeof state !== \'undefined\' && state.disableDimEffects) return;'), 'environmentalRenderer.js must have early return checks');

const drawContent = fs.readFileSync('js/graphics/draw.js', 'utf8');
assert.ok(drawContent.includes('if (typeof state !== \'undefined\' && state.disableDimEffects) return;'), 'draw.js must have early return check in drawThinIceBreakerDimScreen');

const specialOverlayContent = fs.readFileSync('js/graphics/renderers/specialOverlayRenderer.js', 'utf8');
assert.ok(specialOverlayContent.includes('state.disableDimEffects'), 'specialOverlayRenderer.js must check disableDimEffects');

console.log('✅ All individual dim renderer early-return checks verified.');
console.log('🎉 ALL DIM EFFECTS SETTINGS TESTS PASSED SUCCESSFULLY!');
