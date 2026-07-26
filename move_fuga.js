const fs = require('fs');

const drawContent = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', 'utf8');
const lines = drawContent.split('\n');

const startTag = 'export function drawDivineFlameArrowConstruct(ctx, {';
const startIndex = drawContent.indexOf(startTag);

const endTag = 'export function drawCronosSphereVisual({';
const endIndex = drawContent.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log('Tags not found');
  process.exit(1);
}

// Find the docblock start before drawDivineFlameArrowConstruct
let actualStartIndex = drawContent.lastIndexOf('/**', startIndex);
if (actualStartIndex === -1 || actualStartIndex < startIndex - 500) {
  actualStartIndex = startIndex;
}

const funcContent = drawContent.substring(actualStartIndex, endIndex);

// Replace in projectileRenderer.js
let projContent = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/renderers/projectileRenderer.js', 'utf8');
projContent = projContent.replace("import { drawDivineFlameArrowConstruct } from '../draw.js';", "");
projContent += '\n\n' + funcContent;
fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/renderers/projectileRenderer.js', projContent);

// Remove from draw.js
const newDrawContent = drawContent.substring(0, actualStartIndex) + drawContent.substring(endIndex);
fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', newDrawContent);

console.log('Moved Fuga construct');
