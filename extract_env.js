const fs = require('fs');
const lines = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', 'utf8').split('\n');

const envLines = lines.slice(56, 228);

const content = `import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

${envLines.join('\n')}
`;

fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/renderers/environmentalRenderer.js', content);
console.log('Created environmentalRenderer.js');
