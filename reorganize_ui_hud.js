const fs = require('fs');

// 1. Reorganize HUD and UI
const hudPath = 'c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/hudManager.js';
const uiPath = 'c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/ui.js';

let hudContent = fs.readFileSync(hudPath, 'utf8');
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Remove _clearButtons() from drawHUD in hudManager
hudContent = hudContent.replace('  _clearButtons(); // We might not have buttons here, but good practice\n', '');
hudContent = hudContent.replace('  _clearButtons();\n', '');

// Find where screen overlays start in hudManager (drawPauseScreen)
const pauseIndex = hudContent.indexOf('export function drawPauseScreen()');
if (pauseIndex !== -1) {
  const screensContent = hudContent.substring(pauseIndex);
  hudContent = hudContent.substring(0, pauseIndex);

  // Append screens back to ui.js
  uiContent += '\n\n' + screensContent;
}

fs.writeFileSync(hudPath, hudContent);

// Fix ui.js imports & exports
uiContent = uiContent.replace(
  "import { drawHUD, clearHealthHud, drawPauseScreen, drawRoundEndScreen, drawMatchEndScreen, drawCountdown } from './hudManager.js';",
  "import { drawHUD, clearHealthHud } from './hudManager.js';"
);

fs.writeFileSync(uiPath, uiContent);
console.log('Successfully reorganized UI and HUD modules');

// 2. Fix GojoFighter.js missing myTeam
const gojoPath = 'c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/entities/fighters/GojoFighter.js';
let gojoContent = fs.readFileSync(gojoPath, 'utf8');

const oldCode = `    // Repel + damage + slow all enemies in radius
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;`;

const newCode = `    // Repel + damage + slow all enemies in radius
    const myTeam = state.getFighterTeam(this.fighterIndex ?? state.fighters.indexOf(this));
    state.fighters.forEach((f, idx) => {
      if (f && f !== this && f.hp > 0) {
        const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;`;

if (gojoContent.includes(oldCode)) {
  gojoContent = gojoContent.replace(oldCode, newCode);
  fs.writeFileSync(gojoPath, gojoContent);
  console.log('Successfully fixed myTeam in GojoFighter.js');
} else {
  console.log('Could not find oldCode pattern in GojoFighter.js');
}
