const fs = require('fs');
const lines = fs.readFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/draw.js', 'utf8').split('\n');

const projLines = lines.slice(1246, 2322);

const content = `
import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { getNow } from '../../core/utils.js';
import { drawBomberExplosionGraphic } from '../weapons/bomberWeaponGraphics.js';
import { drawShurikenProjectile, drawGraySwordProjectile, drawPoisonBottleCore, drawRedSniperGun, drawBlueAimbotGun } from '../weaponVisuals.js';
import { drawDopplegangerPurpleSword, drawDopplegangerBodyEffect } from '../weapons/dopplegangerWeaponGraphics.js';
import { drawTricksterBolt } from '../weapons/tricksterWeaponGraphics.js';
import { drawCursedEnergySlash, drawPhantomFlurryClones, drawSukunaDismantleGlow } from '../fighters/sukunaSkin.js';
import { drawLimitlessRedOrb, drawLimitlessBlueOrb, drawHollowPurpleOrb, drawGojoBodyGlow } from '../fighters/gojoSkin.js';
import { drawDivineFlameArrowConstruct } from '../draw.js';
import { drawGunSlingerBullet, drawGunSlingerMuzzleFlash } from '../weapons/gunSlingerWeaponGraphics.js';
import { drawEngineerBullet } from '../engineerWeaponGraphics.js';

${projLines.join('\n')}
`;

fs.writeFileSync('c:/Users/asus/OneDrive/Desktop/Circle Mini-Battle/js/graphics/renderers/projectileRenderer.js', content);
console.log('Done!');
