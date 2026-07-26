const fs = require('fs');
let content = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', 'utf8');

// Add import
const importStr = "import { drawStormDimScreen, drawFurnaceDimScreen, drawRikaSummonDimScreen } from './renderers/environmentalRenderer.js';\n";
content = content.replace("import { drawThermobaricExplosions as modDrawThermobaricExplosions } from './renderers/explosionRenderer.js';", "import { drawThermobaricExplosions as modDrawThermobaricExplosions } from './renderers/explosionRenderer.js';\n" + importStr);

const startTag = 'export function drawStormDimScreen() {';
const endTag = 'export function drawDivineFlameArrowConstruct(ctx, {';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find start or end tags');
  process.exit(1);
}

// Find the last doc comment or block before drawDivineFlameArrowConstruct
let replacementEndIndex = content.lastIndexOf('/**', endIndex);
if (replacementEndIndex < startIndex) replacementEndIndex = endIndex;

const part1 = content.substring(0, startIndex);
// Remove the functions from the exports list if they were there
// Actually we can just leave the export of the ones that were there, wait, they are exported directly from draw.js!
// If we re-export them, we can do:
const newFunc = `export { drawStormDimScreen, drawFurnaceDimScreen, drawRikaSummonDimScreen };\n\n`;
const part2 = content.substring(replacementEndIndex);

fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', part1 + newFunc + part2);
console.log('draw.js updated successfully!');
