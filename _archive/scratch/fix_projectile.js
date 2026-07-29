const fs = require('fs');
const lines = fs.readFileSync('js/graphics/renderers/projectileRenderer.js', 'utf8').split('\n');
lines.splice(423, 127, '    // Sukuna Cleave visual', "    if (p.visual === 'sukunaCleave') {", '      drawSukunaCleave(ctx, p);', '      return;', '    }', '', '    // Sukuna Furnace Arrow', "    if (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace) {", '      drawSukunaFurnaceArrow(ctx, p);', '      return;', '    }');
fs.writeFileSync('js/graphics/renderers/projectileRenderer.js', lines.join('\n'));
