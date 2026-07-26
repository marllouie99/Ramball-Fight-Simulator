const fs = require('fs');

const uiContent = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/ui.js', 'utf8');
const lines = uiContent.split('\n');

const startTag = 'export function drawHUD() {';
const startIndex = uiContent.indexOf(startTag);

if (startIndex === -1) {
  console.log('drawHUD not found');
  process.exit(1);
}

// Extract everything from drawHUD to the end of the file
let actualStartIndex = uiContent.lastIndexOf('/**', startIndex);
if (actualStartIndex === -1 || actualStartIndex < startIndex - 1000) {
  actualStartIndex = startIndex;
}

const hudContent = uiContent.substring(actualStartIndex);

// Create hudManager.js
let newContent = `import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { drawBlueAimbotGun } from '../weaponVisuals.js';

${hudContent}
`;

fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/hudManager.js', newContent);

// Remove from ui.js
const newUiContent = uiContent.substring(0, actualStartIndex) + `\nexport { drawHUD, clearHealthHud } from './hudManager.js';\n`;
fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/ui.js', newUiContent);

console.log('Moved HUD functions to hudManager.js');
