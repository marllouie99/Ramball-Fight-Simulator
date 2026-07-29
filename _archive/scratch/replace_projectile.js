const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'js/graphics/renderers/projectileRenderer.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { drawCrimsonSniperBullet } from '../weapons/crimsonsniperWeaponGraphics.js';",
  "import { drawCrimsonSniperBullet } from '../weapons/crimsonsniperWeaponGraphics.js';\nimport { drawSukunaSlash, drawGhostBlade, drawSukunaCleave, drawSukunaFurnaceArrow, drawDivineFlameArrowConstruct } from '../weapons/sukunaWeaponGraphics.js';\nimport { drawMahoragaThrow } from '../weapons/mahoragaWeaponGraphics.js';\nimport { drawPoisonSpill } from '../weapons/alchemistWeaponGraphics.js';"
);

// 2. Replace Poison Spill
const poisonRegex = /\/\/\s*[\u2500]+\s*POISON SPILL: boiling liquid pool.*?if\s*\(p\.isPoisonSpill\)\s*\{.*?return;\s*\}/s;
content = content.replace(poisonRegex, "// ─── POISON SPILL ───\n    if (p.isPoisonSpill) {\n      drawPoisonSpill(ctx, p);\n      return;\n    }");

// 3. Replace Sukuna Slash
const sukunaSlashRegex = /\/\/\s*Sukuna slash visual - Crimson Black Crescent Blade Arc \(Basic Attack\)\s*if\s*\(p\.visual\s*===\s*'sukunaSlash'\)\s*\{.*?ctx\.restore\(\);\s*\}/s;
content = content.replace(sukunaSlashRegex, "// Sukuna slash visual\n    if (p.visual === 'sukunaSlash') {\n      drawSukunaSlash(ctx, p);\n    }");

// 4. Replace Mahoraga Throws
const mahoragaRegex = /\/\/\s*[\u2500]+\s*MAHORAGA SHIBUYA ANIME RUIN THROWS:.*?if\s*\(p\.visual === 'mahoragaBasaltMonolith' \|\| p\.visual === 'mahoragaRuinConcrete' \|\| p\.visual === 'mahoragaLavaRubble'\)\s*\{.*?return;\s*\}/s;
content = content.replace(mahoragaRegex, "// Mahoraga Throws\n    if (p.visual === 'mahoragaBasaltMonolith' || p.visual === 'mahoragaRuinConcrete' || p.visual === 'mahoragaLavaRubble') {\n      drawMahoragaThrow(ctx, p);\n      return;\n    }");

// 5. Replace Ghost Blade
const ghostBladeRegex = /\/\/\s*Ghost Blade visual - Ethereal translucent blade with trailing effect\s*if\s*\(p\.visual === 'ghostBlade'\)\s*\{.*?ctx\.restore\(\);\s*\}/s;
content = content.replace(ghostBladeRegex, "// Ghost Blade visual\n    if (p.visual === 'ghostBlade') {\n      drawGhostBlade(ctx, p);\n    }");

// 6. Replace Sukuna Cleave
const cleaveRegex = /\/\/\s*Sukuna Cleave visual - Pure White Slash with Dark Drop Shadow\s*if\s*\(p\.visual === 'sukunaCleave'\)\s*\{.*?ctx\.restore\(\);\s*\}/s;
content = content.replace(cleaveRegex, "// Sukuna Cleave visual\n    if (p.visual === 'sukunaCleave') {\n      drawSukunaCleave(ctx, p);\n    }");

// 7. Replace Sukuna Furnace Arrow (inside loop)
const furnaceRegex = /\/\/\s*Sukuna Furnace \(Fuga\) Arrow visual - supernatural velocity.*?if\s*\(p\.visual === 'sukunaFurnaceArrow' \|\| p\.isSukunaFurnace\)\s*\{.*?return;\s*\}/s;
content = content.replace(furnaceRegex, "// Sukuna Furnace Arrow\n    if (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace) {\n      drawSukunaFurnaceArrow(ctx, p);\n      return;\n    }");

// 8. Remove drawDivineFlameArrowConstruct
const constructRegex = /\/\*\*\s*\*\s*Draws Sukuna's Furnace.*?\*\/\s*export function drawDivineFlameArrowConstruct\([^}]*?\}\s*\}\s*\n\s*\}/s;
// The regex for drawDivineFlameArrowConstruct needs to be extremely robust or we can just cut it using a simpler regex.
// Since we know where drawDivineFlameArrowConstruct starts and ends (it ends right before drawBlackHoleVisual)
const constructAltRegex = /\/\*\*\s*\*\s*Draws Sukuna's Furnace.*?export function drawDivineFlameArrowConstruct\(.*?\)\s*\{.*?\n\}\n\n\n\/\/\s*â”€â”€â”€â”€â”€/s;
content = content.replace(constructAltRegex, "// ────");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replacements done!");
