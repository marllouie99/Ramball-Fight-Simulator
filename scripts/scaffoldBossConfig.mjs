#!/usr/bin/env node

/**
 * Automated Boss Configuration Scaffolding CLI
 * Usage:
 *   node scripts/scaffoldBossConfig.mjs <characterId> [bossTitle] [bossSubtitle]
 * Example:
 *   node scripts/scaffoldBossConfig.mjs mahoraga "DIVINE GENERAL" "EIGHT-HANDLED SWORD DIVERGENT SILA"
 *   node scripts/scaffoldBossConfig.mjs toji "SORCERER KILLER" "HEAVENLY RESTRICTION"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function printUsage() {
  console.log(`
👑 [Boss Config Scaffolder CLI]
Usage:
  node scripts/scaffoldBossConfig.mjs <characterId> [bossTitle] [bossSubtitle]

Examples:
  node scripts/scaffoldBossConfig.mjs mahoraga "DIVINE GENERAL" "EIGHT-HANDLED SWORD DIVERGENT SILA"
  node scripts/scaffoldBossConfig.mjs toji "SORCERER KILLER" "HEAVENLY RESTRICTION"
  node scripts/scaffoldBossConfig.mjs escanor "LION SIN OF PRIDE" "THE PINNACLE OF ALL RACES"
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const rawId = args[0].trim();
  const characterId = rawId.toLowerCase();
  const capId = capitalize(characterId);
  const targetBossFile = path.join(rootDir, 'js', 'configs', 'bosses', `${characterId}BossConfig.js`);

  if (fs.existsSync(targetBossFile)) {
    console.error(`❌ Boss config already exists at: ${targetBossFile}`);
    process.exit(1);
  }

  // 1. Locate character config in js/configs/characters/
  const charConfigsDir = path.join(rootDir, 'js', 'configs', 'characters');
  const possibleFilenames = [
    `${characterId}Config.js`,
    `${rawId}Config.js`,
    `${characterId.toLowerCase()}Config.js`
  ];

  let originalConfigPath = null;
  for (const filename of possibleFilenames) {
    const fullPath = path.join(charConfigsDir, filename);
    if (fs.existsSync(fullPath)) {
      originalConfigPath = fullPath;
      break;
    }
  }

  if (!originalConfigPath) {
    // Search directory for case-insensitive match
    const files = fs.readdirSync(charConfigsDir);
    const match = files.find(f => f.toLowerCase() === `${characterId}config.js`);
    if (match) {
      originalConfigPath = path.join(charConfigsDir, match);
    }
  }

  if (!originalConfigPath) {
    console.error(`❌ Could not locate source character config in: ${charConfigsDir}`);
    console.error(`   Searched for: ${characterId}Config.js`);
    process.exit(1);
  }

  console.log(`📖 Reading source character config from: ${path.relative(rootDir, originalConfigPath)}`);
  const originalContent = fs.readFileSync(originalConfigPath, 'utf8');

  // 2. Extract configuration body
  const exportMatch = originalContent.match(/export\s+const\s+\w+\s*=\s*\{([\s\S]*)\};?\s*$/);
  if (!exportMatch) {
    console.error(`❌ Could not parse export const object from: ${originalConfigPath}`);
    process.exit(1);
  }

  const innerConfig = exportMatch[1].trim();

  // Extract themeColor or color from original config if present
  const colorMatch = innerConfig.match(/(?:themeColor|color)\s*:\s*['"]([^'"]+)['"]/);
  const detectedColor = colorMatch ? colorMatch[1] : '#EF4444';

  const bossTitle = args[1] || `SUPREME ${characterId.toUpperCase()}`;
  const bossSubtitle = args[2] || 'DREADED ARENA OVERLORD';

  // 3. Generate boss config content mirroring the original config structure
  const generatedBossConfig = `// ─────────────────────────────────────────────
// ${capId} — Boss Configuration
// ─────────────────────────────────────────────
import { baseBossConfig } from './baseBossConfig.js';

export const ${characterId}BossConfig = {
  ...baseBossConfig,

  // ── Boss Presentation & Metadata ──
  bossTitle: '${bossTitle}',
  bossSubtitle: '${bossSubtitle}',
  entranceAuraColor: '${detectedColor}',

  ${innerConfig}
};
`;

  // 4. Write new boss config file
  fs.writeFileSync(targetBossFile, generatedBossConfig, 'utf8');
  console.log(`✅ Created boss config: ${path.relative(rootDir, targetBossFile)}`);

  // 5. Update js/configs/bosses/bossConfigRegistry.js
  const registryFile = path.join(rootDir, 'js', 'configs', 'bosses', 'bossConfigRegistry.js');
  if (fs.existsSync(registryFile)) {
    let regContent = fs.readFileSync(registryFile, 'utf8');
    const importLine = `import { ${characterId}BossConfig } from './${characterId}BossConfig.js';\n`;

    // Add import before _bossConfigs map
    if (!regContent.includes(importLine)) {
      regContent = regContent.replace(
        /(import\s+.*?from\s+['"].*?['"];\s*\n)(const\s+_bossConfigs)/,
        `$1${importLine}$2`
      );
    }

    // Add to _bossConfigs map
    const mapEntry = `  ['${characterId}', ${characterId}BossConfig],\n`;
    if (!regContent.includes(`'${characterId}'`)) {
      regContent = regContent.replace(
        /(const\s+_bossConfigs\s*=\s*new\s+Map\(\[\s*\n)([\s\S]*?)(\]\);)/,
        `$1$2${mapEntry}$3`
      );
    }

    fs.writeFileSync(registryFile, regContent, 'utf8');
    console.log(`✅ Registered in: ${path.relative(rootDir, registryFile)}`);
  }

  // 6. Update js/configs/bosses/index.js
  const barrelFile = path.join(rootDir, 'js', 'configs', 'bosses', 'index.js');
  if (fs.existsSync(barrelFile)) {
    let barrelContent = fs.readFileSync(barrelFile, 'utf8');
    const exportLine = `export { ${characterId}BossConfig } from './${characterId}BossConfig.js';\n`;
    if (!barrelContent.includes(exportLine)) {
      barrelContent = barrelContent.replace(
        /(export\s*\{\s*getBossConfig)/,
        `${exportLine}$1`
      );
      fs.writeFileSync(barrelFile, barrelContent, 'utf8');
      console.log(`✅ Exported in: ${path.relative(rootDir, barrelFile)}`);
    }
  }

  // 7. Update js/bosses/registry/BossRegistry.js
  const bossRegistryFile = path.join(rootDir, 'js', 'bosses', 'registry', 'BossRegistry.js');
  if (fs.existsSync(bossRegistryFile)) {
    let bossRegContent = fs.readFileSync(bossRegistryFile, 'utf8');
    if (!bossRegContent.includes(`id: '${characterId}'`)) {
      const rosterEntry = `  {\n    id: '${characterId}',\n    name: '${capId}',\n    title: '${bossTitle}',\n    subtitle: '${bossSubtitle}',\n    themeColor: '${detectedColor}',\n    isFeatured: true\n  },\n`;
      bossRegContent = bossRegContent.replace(
        /(export\s+const\s+BOSS_ROSTER\s*=\s*\[\s*\n)([\s\S]*?)(\];)/,
        `$1$2${rosterEntry}$3`
      );
      fs.writeFileSync(bossRegistryFile, bossRegContent, 'utf8');
      console.log(`✅ Added to BOSS_ROSTER in: ${path.relative(rootDir, bossRegistryFile)}`);
    }
  }

  console.log(`\n🎉 Successfully scaffolded ${characterId.toUpperCase()} as a Boss!`);
}

main().catch(err => {
  console.error('🚨 Error scaffolding boss config:', err);
  process.exit(1);
});
