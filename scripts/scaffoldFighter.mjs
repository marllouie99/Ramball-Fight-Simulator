#!/usr/bin/env node

/**
 * Automated Fighter Scaffolding CLI
 * Usage:
 *   node scripts/scaffoldFighter.mjs <characterId> <archetype> [displayName] [themeColor]
 * Example:
 *   node scripts/scaffoldFighter.mjs rengoku brawler "Kyojuro Rengoku" "#f97316"
 *   node scripts/scaffoldFighter.mjs yoriichi swordsman "Yoriichi Tsugikuni" "#ef4444"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const VALID_ARCHETYPES = ['brawler', 'swordsman', 'ranged', 'sorcerer'];

const ARCHETYPE_DEFAULTS = {
  brawler: {
    color: '#f97316',
    hp: 1200,
    speed: 4.8,
    range: 75,
    damage: 38
  },
  swordsman: {
    color: '#ef4444',
    hp: 1050,
    speed: 5.2,
    range: 130,
    damage: 48
  },
  ranged: {
    color: '#38bdf8',
    hp: 950,
    speed: 4.5,
    range: 420,
    damage: 32
  },
  sorcerer: {
    color: '#a855f7',
    hp: 1000,
    speed: 4.6,
    range: 220,
    damage: 42
  }
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function printUsage() {
  console.log(`
🥋 [Fighter Scaffolder CLI]
Usage:
  node scripts/scaffoldFighter.mjs <characterId> <archetype> [displayName] [themeColor]

Arguments:
  <characterId>   Alphanumeric identifier (e.g., 'rengoku', 'yoriichi', 'goku')
  <archetype>     One of: ${VALID_ARCHETYPES.join(', ')}
  [displayName]   Optional UI display name (defaults to Capitalized ID)
  [themeColor]    Optional primary theme hex color (e.g., '#f97316')

Example:
  node scripts/scaffoldFighter.mjs rengoku brawler "Kyojuro Rengoku" "#f97316"
`);
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const rawId = args[0].toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
  const archetype = args[1].toLowerCase().trim();

  if (!rawId) {
    console.error('❌ Invalid character ID.');
    process.exit(1);
  }

  if (!VALID_ARCHETYPES.includes(archetype)) {
    console.error(`❌ Invalid archetype '${archetype}'. Must be one of: ${VALID_ARCHETYPES.join(', ')}`);
    process.exit(1);
  }

  const displayName = args[2] || capitalize(rawId);
  const themeColor = args[3] || ARCHETYPE_DEFAULTS[archetype].color;
  const className = `${capitalize(rawId)}Fighter`;

  console.log(`\n🚀 Scaffolding new ${archetype.toUpperCase()} fighter: '${displayName}' (${rawId})...`);

  // Paths
  const entityFilePath = path.join(rootDir, 'js', 'entities', 'fighters', `${className}.js`);
  const skinFilePath = path.join(rootDir, 'js', 'graphics', 'fighters', `${rawId}Skin.js`);
  const weaponFilePath = path.join(rootDir, 'js', 'graphics', 'weapons', `${rawId}WeaponGraphics.js`);
  const balanceSheetPath = path.join(rootDir, 'js', 'configs', 'fighter-balance-sheet.json');

  // Check if entity file already exists
  if (fs.existsSync(entityFilePath)) {
    console.error(`❌ Entity file already exists: ${entityFilePath}`);
    process.exit(1);
  }

  // 1. Generate Entity Class Code
  const entityCode = generateEntityCode(rawId, className, displayName, archetype, themeColor);
  fs.writeFileSync(entityFilePath, entityCode, 'utf8');
  console.log(`  ✅ Created entity: js/entities/fighters/${className}.js`);

  // 2. Generate Skin Code
  const skinCode = generateSkinCode(rawId, displayName, themeColor);
  fs.writeFileSync(skinFilePath, skinCode, 'utf8');
  console.log(`  ✅ Created skin: js/graphics/fighters/${rawId}Skin.js`);

  // 3. Generate Weapon Code if applicable
  if (archetype === 'swordsman' || archetype === 'ranged') {
    const weaponCode = generateWeaponCode(rawId, displayName, archetype, themeColor);
    fs.writeFileSync(weaponFilePath, weaponCode, 'utf8');
    console.log(`  ✅ Created weapon graphics: js/graphics/weapons/${rawId}WeaponGraphics.js`);
  }

  // 4. Update Balance Sheet
  if (fs.existsSync(balanceSheetPath)) {
    try {
      const balanceData = JSON.parse(fs.readFileSync(balanceSheetPath, 'utf8'));
      if (!balanceData.characters) balanceData.characters = {};
      const archDefaults = ARCHETYPE_DEFAULTS[archetype];
      balanceData.characters[rawId] = {
        name: displayName,
        archetype: archetype,
        color: themeColor,
        hp: archDefaults.hp,
        speed: archDefaults.speed,
        baseRange: archDefaults.range,
        baseDamage: archDefaults.damage,
        multipliers: {
          damage: 1.0,
          speed: 1.0,
          knockback: 1.0,
          cooldown: 1.0
        }
      };
      fs.writeFileSync(balanceSheetPath, JSON.stringify(balanceData, null, 2), 'utf8');
      console.log(`  ✅ Registered in js/configs/fighter-balance-sheet.json`);
    } catch (e) {
      console.warn(`  ⚠️ Could not update balance sheet: ${e.message}`);
    }
  }

  console.log(`\n🎉 Fighter '${displayName}' successfully scaffolded!`);
  console.log(`👉 Next steps:`);
  console.log(`   1. Run 'npm run verify' to test codebase integrity.`);
  console.log(`   2. Customize abilities in js/entities/fighters/${className}.js.`);
  console.log(`   3. Refine hair and clothing in js/graphics/fighters/${rawId}Skin.js.`);
}

function generateEntityCode(id, className, name, archetype, themeColor) {
  const defaults = ARCHETYPE_DEFAULTS[archetype];

  let meleeOrRangedAction = '';
  if (archetype === 'swordsman') {
    meleeOrRangedAction = `
    // Melee Blade Slash Attack (Frontal Arc AOE - Rule 7)
    const reach = this.r + 55;
    const arcAngle = (130 * Math.PI) / 180; // 130 deg blade arc
    this.slashSwingTimer = 18;
    this.executeFrontalArcMelee(opponent, reach, arcAngle, this.damage || ${defaults.damage}, {
      isBladeSlash: true,
      knockbackForce: 12
    });
`;
  } else if (archetype === 'brawler') {
    meleeOrRangedAction = `
    // 2-Handed Martial Arts Punch (Frontal Arc AOE - Rule 8)
    const reach = this.r + 40;
    const arcAngle = (90 * Math.PI) / 180; // 90 deg punch cone
    this.punchAnimTimer = 14;
    this.executeFrontalArcMelee(opponent, reach, arcAngle, this.damage || ${defaults.damage}, {
      isPunch: true,
      knockbackForce: 8
    });
`;
  } else {
    meleeOrRangedAction = `
    // Ranged Projectile Attack
    if (projectileSystem && projectileSystem.fireBasicBullet) {
      projectileSystem.fireBasicBullet(this, ownerIndex, this.damage || ${defaults.damage});
    }
`;
  }

  return `import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { spawnFloatingText, triggerGlobalScreenShake, state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { draw${capitalize(id)}Skin } from '../../graphics/fighters/${id}Skin.js';
import { projectileSystem } from '../../systems/projectileSystem.js';

export class ${className} extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = '${id}';
    this.type = '${id}';
    this.name = '${name}';
    this.themeColor = '${themeColor}';
    this.color = '${themeColor}';
    this.damageNumberColor = '${themeColor}';

    this.hp = ${defaults.hp};
    this.maxHp = ${defaults.hp};
    this.speed = ${defaults.speed};
    this.baseSpeed = ${defaults.speed};

    // Skills & Cooldowns
    this.specialCooldown = 0;
    this.specialCooldownMax = 360; // 6 seconds
    this.isSpecialActive = false;

    // Declarative Skill Registration (Rule 18 HUD Theme Consistency)
    this.skillManager.registerSkills([
      {
        id: 'special',
        name: 'Special Art',
        type: 'basic',
        cooldownKey: 'specialCooldown',
        cooldownMax: () => this.specialCooldownMax,
        color: this.themeColor,
        onActivate: (fighter, opponent) => {
          fighter._castSpecialArt(opponent);
        }
      }
    ]);
  }

  reset() {
    super.reset();
    this.specialCooldown = 0;
    this.isSpecialActive = false;
  }

  _castSpecialArt(opponent) {
    if (!opponent) return;
    this.specialCooldown = this.specialCooldownMax;
    spawnFloatingText(this.x, this.y - this.r - 20, '${name.toUpperCase()} BURST!', this.themeColor);
    triggerGlobalScreenShake(5, 8);
    audioSystem.playSFX('attack_fleshhit', 0.8);
  }

  shoot(ownerIndex, opponent) {
    if (this.isCaughtInBeam()) return;
    ${meleeOrRangedAction}
  }

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory freeze / time-stop guard (Rule 1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    if (this.specialCooldown > 0) this.specialCooldown--;

    // AI Decision Matrix
    if (opponent && this.specialCooldown <= 0) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      if (dist < 220) {
        this._castSpecialArt(opponent);
      }
    }

    // Standard Movement Physics & Wall Clamping (Rule 1.1)
    super.update(opponent, ownerIndex, arena);
  }

  drawSkin(ctx) {
    draw${capitalize(id)}Skin(ctx, this);
  }
}
`;
}

function generateSkinCode(id, name, themeColor) {
  return `/**
 * ${name} - Upright Minimalist Skin Renderer
 * Adheres strictly to Repository Rule 19:
 * - Upright Front-Profile Camera POV (Hair top -Y, Torso bottom +Y)
 * - Strict faceless minimalist aesthetic (NO eyes, mouth, nose)
 * - Vertical scale mirroring when aiming/facing left (ctx.scale(1, -1))
 * - No shadowBlur (Rule 11)
 */

export function draw${capitalize(id)}Skin(ctx, fighter) {
  const r = fighter.r || 25;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  // Vertical mirroring so hair stays top (-Y) when facing left
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Torso & Uniform (+Y Bottom)
  ctx.save();
  ctx.fillStyle = '#1e293b'; // Base uniform
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Torso Accent / Vest
  ctx.save();
  ctx.fillStyle = '${themeColor}';
  ctx.beginPath();
  ctx.arc(0, r * 0.25, r * 0.65, 0, Math.PI);
  ctx.fill();
  ctx.restore();

  // Collar / Robe Opening (+Y Center)
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.15);
  ctx.lineTo(0, r * 0.65);
  ctx.lineTo(r * 0.35, r * 0.15);
  ctx.stroke();
  ctx.restore();

  // 2. Head & Hair Silhouettes (-Y Top)
  // Hair Volume Base
  ctx.save();
  ctx.fillStyle = '${themeColor}';
  ctx.beginPath();
  ctx.arc(0, -r * 0.35, r * 0.85, Math.PI, Math.PI * 2);
  ctx.fill();

  // Crown Hair Spikes extending beyond circle boundary (-r * 1.15)
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.45);
  ctx.lineTo(-r * 0.50, -r * 1.15);
  ctx.lineTo(-r * 0.15, -r * 0.65);
  ctx.lineTo(0, -r * 1.20);
  ctx.lineTo(r * 0.20, -r * 0.65);
  ctx.lineTo(r * 0.55, -r * 1.10);
  ctx.lineTo(r * 0.80, -r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Frontal Hands Layering (+X toward opponent)
  ctx.save();
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;

  // Front Hand
  const punchOffset = fighter.punchAnimTimer > 0 ? (fighter.punchAnimTimer / 14) * 16 : 0;
  ctx.beginPath();
  ctx.arc(r * 0.85 + punchOffset, r * 0.35, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
`;
}

function generateWeaponCode(id, name, archetype, themeColor) {
  return `/**
 * ${name} Weapon Graphics Renderer
 * Adheres strictly to Repository Rules:
 * - Rule 11: No ctx.shadowBlur or ctx.shadowColor
 * - Rule 15: Double-tapered crescent slashes
 */

export function draw${capitalize(id)}Weapon(ctx, fighter) {
  if (!fighter) return;
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(fighter.gunAngle || 0);

  // Weapon Blade / Barrel along +X
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '${themeColor}';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.rect(r * 0.8, -3, 35, 6);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
`;
}

run();
