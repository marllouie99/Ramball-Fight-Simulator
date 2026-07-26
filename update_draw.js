const fs = require('fs');
let content = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', 'utf8');

// Add import
const importStr = "import { drawProjectiles as modDrawProjectiles } from './renderers/projectileRenderer.js';\n";
content = content.replace("import { drawThermobaricExplosions as modDrawThermobaricExplosions } from './renderers/explosionRenderer.js';", "import { drawThermobaricExplosions as modDrawThermobaricExplosions } from './renderers/explosionRenderer.js';\n" + importStr);

// Use regex to replace the entire drawProjectiles function
const startTag = 'export function drawProjectiles() {';
const endTag = 'export function drawBlackHoleEffects() {';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find start or end tags');
  process.exit(1);
}

// Find the last '}' before drawBlackHoleEffects
let replacementEndIndex = content.lastIndexOf('}', endIndex);

const part1 = content.substring(0, startIndex);
// The replacement
const newFunc = `export function drawProjectiles() {
  modDrawProjectiles();
}

// ──────────────────────────────────────────
// DRAW — BLACK HOLE EFFECTS (drawn BEFORE fighters)
// ──────────────────────────────────────────

`;
const part2 = content.substring(endIndex);

fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', part1 + newFunc + part2);
console.log('draw.js updated successfully!');
