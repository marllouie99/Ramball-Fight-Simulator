import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'Assets');
const catalogOutPath = path.join(assetsDir, 'catalog.json');

const SHARED_MODEL_DIRS = new Set(['Attack-Effects', 'Sprites', 'Tiles']);

function walkFiles(dir, baseDir = rootDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, baseDir));
    } else {
      const stat = fs.statSync(fullPath);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({
        name: entry.name,
        path: relPath,
        size: stat.size,
        ext: path.extname(entry.name).toLowerCase()
      });
    }
  }
  return results;
}

function buildFighterEntry(dirName, index) {
  const charDir = path.join(assetsDir, 'model', dirName);
  const files = walkFiles(charDir);
  const paths = files.map(f => f.path);

  const hair = paths.find(p => /hair/i.test(path.basename(p))) || null;
  const skin = paths.find(p => /(skin|model|torso|body)/i.test(path.basename(p)) && !/hair|weapon|sword|axe|slash/i.test(path.basename(p))) || null;
  const weapons = paths.filter(p => /(weapon|sword|katana|blade|axe|scythe|gun|pistol|shotgun|m4|spear|bow|arrow|knuckle|chainsaw)/i.test(path.basename(p)));

  // Group subfolder sequences (e.g., explosion/, Burst_explosion/, Animations/, attack/)
  const animations = {};
  const subEntries = fs.readdirSync(charDir, { withFileTypes: true });
  for (const sub of subEntries) {
    if (sub.isDirectory()) {
      const subFiles = walkFiles(path.join(charDir, sub.name)).map(f => f.path);
      if (subFiles.length > 0) {
        animations[sub.name] = {
          frameCount: subFiles.length,
          frames: subFiles
        };
      }
    } else if (/sprite[-_\s]?sheet|anim/i.test(sub.name)) {
      const rel = `Assets/model/${dirName}/${sub.name}`;
      animations[path.basename(sub.name, path.extname(sub.name))] = {
        type: 'spritesheet',
        path: rel
      };
    }
  }

  return {
    index: String(index + 1).padStart(4, '0'),
    id: dirName,
    sourcePath: `Assets/model/${dirName}`,
    fileCount: files.length,
    totalBytes: files.reduce((sum, f) => sum + f.size, 0),
    assets: {
      hair,
      skin,
      weapons,
      animations,
      allFiles: paths
    }
  };
}

function buildEffectsCatalog() {
  const effectsRoot = path.join(assetsDir, 'effects');
  const effects = {};
  if (!fs.existsSync(effectsRoot)) return effects;

  for (const entry of fs.readdirSync(effectsRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const files = walkFiles(path.join(effectsRoot, entry.name));
      effects[entry.name] = {
        path: `Assets/effects/${entry.name}`,
        frameCount: files.length,
        files: files.map(f => f.path)
      };
    }
  }
  return effects;
}

function buildAudioCatalog() {
  const sfxRoot = path.join(assetsDir, 'Sound Effects');
  const categories = {
    bgm: [],
    announcer: [],
    attacks: [],
    skills: [],
    skillEffects: [],
    environment: [],
    fighters: {}
  };

  if (!fs.existsSync(sfxRoot)) return categories;

  const folderMap = {
    'ARENA-BGMUSIC': 'bgm',
    'Announcer': 'announcer',
    'Attacks': 'attacks',
    'Skills': 'skills',
    'SkillEffects': 'skillEffects',
    'Sprites SFX': 'environment',
    'Boss Voiceline SFX': 'environment',
    'RESOURCES': 'environment'
  };

  for (const entry of fs.readdirSync(sfxRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const files = walkFiles(path.join(sfxRoot, entry.name))
      .filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f.ext))
      .map(f => f.path);

    const targetCategory = folderMap[entry.name];
    if (targetCategory) {
      categories[targetCategory].push(...files);
    } else {
      const cleanFighterKey = entry.name.replace(/SFX$/i, '');
      categories.fighters[cleanFighterKey] = {
        folder: `Assets/Sound Effects/${entry.name}`,
        count: files.length,
        files
      };
    }
  }

  return categories;
}

function generateCatalog() {
  const allAssetFiles = walkFiles(assetsDir).filter(f => f.name !== 'catalog.json');
  const modelRoot = path.join(assetsDir, 'model');
  const modelDirs = fs.existsSync(modelRoot)
    ? fs.readdirSync(modelRoot, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort((a, b) => a.localeCompare(b))
    : [];

  const fighterDirs = modelDirs.filter(d => !SHARED_MODEL_DIRS.has(d));
  const sharedModelDirs = modelDirs.filter(d => SHARED_MODEL_DIRS.has(d));

  const fighters = fighterDirs.map((dir, idx) => buildFighterEntry(dir, idx));
  const sharedModels = {};
  for (const sDir of sharedModelDirs) {
    const files = walkFiles(path.join(modelRoot, sDir));
    sharedModels[sDir] = {
      path: `Assets/model/${sDir}`,
      count: files.length,
      files: files.map(f => f.path)
    };
  }

  const effects = buildEffectsCatalog();
  const audio = buildAudioCatalog();

  const totalBytes = allAssetFiles.reduce((sum, f) => sum + f.size, 0);
  const imageCount = allAssetFiles.filter(f => /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(f.ext)).length;
  const audioCount = allAssetFiles.filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f.ext)).length;
  const fontCount = allAssetFiles.filter(f => /\.(ttf|otf|woff|woff2)$/i.test(f.ext)).length;

  const catalog = {
    project: 'Circle Mini-Battle (Fight of Larpers 101)',
    schemaVersion: '1.0.0',
    summary: {
      totalFiles: allAssetFiles.length,
      totalSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
      fighterCount: fighters.length,
      imageFiles: imageCount,
      audioFiles: audioCount,
      fontFiles: fontCount
    },
    fighters,
    sharedModels,
    effects,
    audio,
    ui: {
      overlays: walkFiles(path.join(assetsDir, 'Overlays')).map(f => f.path),
      brushes: walkFiles(path.join(assetsDir, 'Brush Type')).map(f => f.path),
      fonts: walkFiles(path.join(assetsDir, 'Font')).filter(f => /\.(ttf|otf|woff|woff2)$/i.test(f.ext)).map(f => f.path),
      weapons: walkFiles(path.join(assetsDir, 'weapon')).map(f => f.path)
    }
  };

  fs.writeFileSync(catalogOutPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✅ [Asset Catalog] Generated Assets/catalog.json (${catalog.summary.totalFiles} files, ${catalog.summary.fighterCount} fighter directories, ${catalog.summary.totalSizeMB} MB).`);
}

generateCatalog();
