import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execSync } from 'child_process';

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '_archive' && file !== 'libs') {
        results = results.concat(getAllJsFiles(fullPath));
      }
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

// Mock minimal browser globals for Node.js module import execution
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
if (typeof globalThis.addEventListener === 'undefined') globalThis.addEventListener = () => {};
if (typeof globalThis.removeEventListener === 'undefined') globalThis.removeEventListener = () => {};
if (typeof globalThis.dispatchEvent === 'undefined') globalThis.dispatchEvent = () => {};
if (typeof globalThis.matchMedia === 'undefined') globalThis.matchMedia = () => ({ addEventListener: () => {}, removeEventListener: () => {}, matches: false });
if (typeof globalThis.devicePixelRatio === 'undefined') globalThis.devicePixelRatio = 1;

const createMockCanvas = () => ({
  width: 540,
  height: 960,
  style: {},
  getContext: () => ({
    save: () => {}, restore: () => {}, beginPath: () => {}, closePath: () => {},
    moveTo: () => {}, lineTo: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    fillRect: () => {}, strokeRect: () => {}, clearRect: () => {}, drawImage: () => {},
    scale: () => {}, rotate: () => {}, translate: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }), measureText: () => ({ width: 50 }),
    fillText: () => {}, strokeText: () => {}
  }),
  appendChild: () => {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  addEventListener: () => {},
  removeEventListener: () => {}
});

if (typeof globalThis.document === 'undefined') {
  const _mockElements = new Map();
  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return createMockCanvas();
      return {
        id: '',
        tagName: (tag || 'DIV').toUpperCase(),
        style: {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        textContent: '',
        innerHTML: '',
        appendChild: (child) => child,
        removeChild: (child) => child,
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => ({})
      };
    },
    getElementById: (id) => {
      if (id === 'arena' || id === 'topLevelUiCanvas' || id === 'floatingTextCanvas') {
        if (!_mockElements.has(id)) _mockElements.set(id, createMockCanvas());
        return _mockElements.get(id);
      }
      if (!_mockElements.has(id)) {
        const el = globalThis.document.createElement('div');
        el.id = id;
        _mockElements.set(id, el);
      }
      return _mockElements.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

console.log('🔍 [Codebase Integrity Scanner] Scanning all JavaScript files for syntax, brace balance, and duplicate declarations...');

const files = getAllJsFiles('js');
let hasErrors = false;
let totalDuplicates = 0;
let totalSyntaxErrors = 0;

async function verifyAll() {
  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Strict ES Module syntax verification using data URI import
    try {
      const dataUri = `data:text/javascript;base64,${Buffer.from(content).toString('base64')}`;
      await import(dataUri);
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`❌ [SYNTAX ERROR in ${relPath}]:`, err.message);
        hasErrors = true;
        totalSyntaxErrors++;
      }
    }

    // 2. Scan for duplicate top-level identifier declarations in modules & verify brace balance
    const lines = content.split('\n');
    const topLevelDecls = {};
    let braceDepth = 0;
    let inBlockComment = false;
    let inTemplate = false;
    let inSingle = false;
    let inDouble = false;

    for (let idx = 0; idx < lines.length; idx++) {
      let line = lines[idx];
      let lineTrim = line.trim();

      if (inBlockComment) {
        if (lineTrim.includes('*/')) {
          inBlockComment = false;
          lineTrim = lineTrim.substring(lineTrim.indexOf('*/') + 2).trim();
        } else {
          continue;
        }
      }

      if (lineTrim.startsWith('/*')) {
        if (lineTrim.includes('*/')) {
          lineTrim = lineTrim.substring(lineTrim.indexOf('*/') + 2).trim();
        } else {
          inBlockComment = true;
          continue;
        }
      }

      if (lineTrim.startsWith('//')) continue;
      const commentIdx = lineTrim.indexOf('//');
      if (commentIdx >= 0) lineTrim = lineTrim.substring(0, commentIdx).trim();

      // Check top-level declarations (outside any curly brace block)
      if (braceDepth === 0) {
        // Function declarations
        const funcMatch = lineTrim.match(/^(export\s+default\s+|export\s+)?(async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (funcMatch && funcMatch[3]) {
          const name = funcMatch[3];
          topLevelDecls[name] = topLevelDecls[name] || [];
          topLevelDecls[name].push({ line: idx + 1, type: 'function' });
        }

        // Class declarations
        const classMatch = lineTrim.match(/^(export\s+default\s+|export\s+)?class\s+([a-zA-Z0-9_$]+)/);
        if (classMatch && classMatch[2]) {
          const name = classMatch[2];
          topLevelDecls[name] = topLevelDecls[name] || [];
          topLevelDecls[name].push({ line: idx + 1, type: 'class' });
        }

        // Const declarations
        const constMatch = lineTrim.match(/^(export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=/);
        if (constMatch && constMatch[2]) {
          const name = constMatch[2];
          topLevelDecls[name] = topLevelDecls[name] || [];
          topLevelDecls[name].push({ line: idx + 1, type: 'const' });
        }

        // Let declarations
        const letMatch = lineTrim.match(/^(export\s+)?let\s+([a-zA-Z0-9_$]+)\s*(=|;|\s)/);
        if (letMatch && letMatch[2]) {
          const name = letMatch[2];
          topLevelDecls[name] = topLevelDecls[name] || [];
          topLevelDecls[name].push({ line: idx + 1, type: 'let' });
        }
      }

      // Accurate token brace depth tracker
      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        const prev = col > 0 ? line[col - 1] : '';
        const next = col + 1 < line.length ? line[col + 1] : '';

        if (inTemplate) {
          if (char === '`' && prev !== '\\') inTemplate = false;
          continue;
        }
        if (inSingle) {
          if (char === "'" && prev !== '\\') inSingle = false;
          continue;
        }
        if (inDouble) {
          if (char === '"' && prev !== '\\') inDouble = false;
          continue;
        }

        if (char === '/' && next === '/') break;
        if (char === '`') { inTemplate = true; continue; }
        if (char === "'") { inSingle = true; continue; }
        if (char === '"') { inDouble = true; continue; }

        if (char === '{') braceDepth++;
        else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
      }
    }

    if (braceDepth !== 0) {
      console.error(`❌ [UNBALANCED BRACES in ${relPath}]: Unclosed curly brace at EOF (depth: ${braceDepth})`);
      hasErrors = true;
      totalSyntaxErrors++;
    }

    for (const [name, occurrences] of Object.entries(topLevelDecls)) {
      if (occurrences.length > 1) {
        console.error(`❌ [DUPLICATE IDENTIFIER in ${relPath}]: '${name}' declared ${occurrences.length} times at lines: ${occurrences.map(o => o.line).join(', ')}`);
        hasErrors = true;
        totalDuplicates++;
      }
    }
  }

  // 2.5 Asset Integrity and Exact Casing Scanner
  console.log('🔍 [Asset Integrity Scanner] Validating referenced assets against disk with exact casing...');
  let missingAssetsCount = 0;
  const scannedAssets = new Set();

  function verifyAssetPathExact(assetRelPath) {
    const parts = assetRelPath.split('/');
    let cur = process.cwd();
    for (const p of parts) {
      if (!fs.existsSync(cur)) return false;
      const entries = fs.readdirSync(cur);
      if (!entries.includes(p)) return false;
      cur = path.join(cur, p);
    }
    return true;
  }

  const assetRegex = /(?:['"`]|url\(['"]?)(Assets\/[^'"`\r\n\?#]+)/g;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (relPath.includes('patchNotesData.js')) continue; // Historical changelog diff entries
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = assetRegex.exec(content)) !== null) {
      let assetPath = match[1].replace(/\\/g, '/').trim();
      // Remove trailing quotes/spaces if captured
      assetPath = assetPath.replace(/['"`\)]+$/, '');
      if (assetPath.includes('${')) continue; // Dynamic string interpolation
      if (scannedAssets.has(assetPath)) continue;
      scannedAssets.add(assetPath);

      if (!verifyAssetPathExact(assetPath)) {
        console.error(`❌ [MISSING / CASING MISMATCH ASSET in ${relPath}]: '${assetPath}' does not match disk.`);
        hasErrors = true;
        missingAssetsCount++;
      }
    }
  }

  if (missingAssetsCount === 0) {
    console.log(`✅ Verified ${scannedAssets.size} asset paths with exact case sensitivity!`);
  }

  // 2.6 Audio Volume Normalization & Range Validator
  console.log('🔍 [Audio Normalization Scanner] Checking character audio volume definitions...');
  let invalidAudioCount = 0;
  const configFiles = files.filter(f => f.replace(/\\/g, '/').includes('js/configs/characters/') && f.endsWith('Config.js'));

  for (const cfgFile of configFiles) {
    const relPath = path.relative(process.cwd(), cfgFile).replace(/\\/g, '/');
    const content = fs.readFileSync(cfgFile, 'utf8');

    const soundsMatch = content.match(/sounds\s*:\s*\{([^}]+)\}/);
    const volumesMatch = content.match(/soundVolumes\s*:\s*\{([^}]+)\}/);

    if (soundsMatch) {
      const volumeKeys = {};
      if (volumesMatch) {
        const vLines = volumesMatch[1].split('\n');
        vLines.forEach(vl => {
          const vMatch = vl.trim().match(/^([a-zA-Z0-9_$]+)\s*:\s*([0-9.]+)/);
          if (vMatch && vMatch[1]) {
            volumeKeys[vMatch[1]] = parseFloat(vMatch[2]);
          }
        });
      }

      for (const [key, val] of Object.entries(volumeKeys)) {
        if (isNaN(val) || val < 0.0 || val > 5.0) {
          console.error(`❌ [INVALID AUDIO VOLUME in ${relPath}]: '${key}' has out-of-range volume ${val} (expected 0.0 - 5.0).`);
          hasErrors = true;
          invalidAudioCount++;
        }
      }
    }
  }

  if (invalidAudioCount === 0) {
    console.log(`✅ Verified audio volume definitions across ${configFiles.length} character configs!`);
  }

  // 2.7 YouTube Shorts Thumbnail & Vertical Arena Alignment Validator (Rule 28)
  console.log('🔍 [Rule 28 Validator] Checking YouTube Shorts vertical arena alignment...');
  let rule28Errors = 0;
  try {
    const { CONFIG } = await import('../js/core/config.js');
    const { VIEWPORT_CONFIGS, VIEWPORT_MODES } = await import('../js/core/viewportManager.js');

    const expectedVerticalArena = { x: 45, y: 240, width: 450, height: 450 };

    if (
      CONFIG.arena.x !== expectedVerticalArena.x ||
      CONFIG.arena.y !== expectedVerticalArena.y ||
      CONFIG.arena.width !== expectedVerticalArena.width ||
      CONFIG.arena.height !== expectedVerticalArena.height
    ) {
      console.error(`❌ [RULE 28 VIOLATION]: CONFIG.arena is { x: ${CONFIG.arena.x}, y: ${CONFIG.arena.y}, width: ${CONFIG.arena.width}, height: ${CONFIG.arena.height} }. Expected strictly { x: 45, y: 240, width: 450, height: 450 } to maintain YouTube Shorts thumbnail alignment.`);
      hasErrors = true;
      rule28Errors++;
    }

    const vCfg = VIEWPORT_CONFIGS?.[VIEWPORT_MODES.VERTICAL]?.arena;
    if (
      !vCfg ||
      vCfg.x !== expectedVerticalArena.x ||
      vCfg.y !== expectedVerticalArena.y ||
      vCfg.width !== expectedVerticalArena.width ||
      vCfg.height !== expectedVerticalArena.height
    ) {
      console.error(`❌ [RULE 28 VIOLATION]: VIEWPORT_CONFIGS[VERTICAL].arena is { x: ${vCfg?.x}, y: ${vCfg?.y}, width: ${vCfg?.width}, height: ${vCfg?.height} }. Expected strictly { x: 45, y: 240, width: 450, height: 450 } to maintain YouTube Shorts thumbnail alignment.`);
      hasErrors = true;
      rule28Errors++;
    }

    if (rule28Errors === 0) {
      console.log('✅ Verified Rule 28: Vertical arena geometry strictly locked to { x: 45, y: 240, width: 450, height: 450 } for YouTube Shorts thumbnail consistency!');
    }
  } catch (err) {
    console.error('❌ [RULE 28 VALIDATION ERROR]:', err.message);
    hasErrors = true;
  }

  // 2.8 Sprite Sheet Asset Palette & Premultiplication Health Scanner
  console.log('🔍 [Sprite Sheet Palette Health Scanner] Checking themed sprite sheet color palettes and integrity...');
  let paletteErrors = 0;
  let scannedSheetCount = 0;

  function decodePngBuffer(buffer) {
    if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
      throw new Error('Not a PNG file');
    }
    let offset = 8;
    let width = 0, height = 0, colorType = 0, bitDepth = 0;
    const idatChunks = [];

    while (offset < buffer.length) {
      const len = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      const data = buffer.subarray(offset + 8, offset + 8 + len);
      offset += 12 + len;

      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
      } else if (type === 'IDAT') {
        idatChunks.push(data);
      } else if (type === 'IEND') {
        break;
      }
    }

    if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
      throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
    }

    const bpp = colorType === 6 ? 4 : 3;
    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    const stride = width * bpp;
    const pixels = Buffer.alloc(width * height * 4);

    let inOffset = 0;
    let prevRecon = Buffer.alloc(stride);
    let recon = Buffer.alloc(stride);

    for (let y = 0; y < height; y++) {
      const filter = decompressed[inOffset++];
      const scanline = decompressed.subarray(inOffset, inOffset + stride);
      inOffset += stride;

      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? recon[x - bpp] : 0;
        const b = prevRecon[x];
        const c = x >= bpp ? prevRecon[x - bpp] : 0;
        const val = scanline[x];

        if (filter === 0) recon[x] = val;
        else if (filter === 1) recon[x] = (val + a) & 0xff;
        else if (filter === 2) recon[x] = (val + b) & 0xff;
        else if (filter === 3) recon[x] = (val + Math.floor((a + b) / 2)) & 0xff;
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          recon[x] = (val + pr) & 0xff;
        }
      }

      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        const inIdx = x * bpp;
        if (bpp === 4) {
          pixels[outIdx] = recon[inIdx];
          pixels[outIdx + 1] = recon[inIdx + 1];
          pixels[outIdx + 2] = recon[inIdx + 2];
          pixels[outIdx + 3] = recon[inIdx + 3];
        } else {
          pixels[outIdx] = recon[inIdx];
          pixels[outIdx + 1] = recon[inIdx + 1];
          pixels[outIdx + 2] = recon[inIdx + 2];
          pixels[outIdx + 3] = 255;
        }
      }
      prevRecon.set(recon);
    }

    return { width, height, pixels };
  }

  function getThemedPngFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        results = results.concat(getThemedPngFiles(full));
      } else if (ent.name.endsWith('.png')) {
        const nameLower = ent.name.toLowerCase();
        if (nameLower.includes('gold') || nameLower.includes('blue') || nameLower.includes('cyan')) {
          results.push(full);
        }
      }
    }
    return results;
  }

  const themedPngs = getThemedPngFiles('Assets/model');
  for (const pngPath of themedPngs) {
    const relPath = path.relative(process.cwd(), pngPath).replace(/\\/g, '/');
    try {
      const buf = fs.readFileSync(pngPath);
      const { width, height, pixels } = decodePngBuffer(buf);
      scannedSheetCount++;

      const isGold = /gold|golden/i.test(path.basename(pngPath));
      const isBlue = /blue|cyan/i.test(path.basename(pngPath));

      let rogueCount = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 30) continue;

        if (isGold) {
          if (b > 100 && (b - r) > 30 && g > 60) {
            rogueCount++;
          }
        } else if (isBlue) {
          if (r > 120 && (r - b) > 30 && g > 60) {
            rogueCount++;
          }
        }
      }

      if (rogueCount > 0) {
        console.error(`❌ [ROGUE PIXEL PALETTE MISMATCH in ${relPath}]: Found ${rogueCount} off-palette pixels in themed sprite sheet.`);
        hasErrors = true;
        paletteErrors++;
      }
    } catch (err) {
      console.error(`❌ [SPRITE DECODE ERROR in ${relPath}]: ${err.message}`);
      hasErrors = true;
      paletteErrors++;
    }
  }

  if (paletteErrors === 0) {
    console.log(`✅ Verified palette health and zero rogue pixels across ${scannedSheetCount} themed sprite sheets!`);
  }

  console.log('───────────────────────────────────────────────────────');
  if (hasErrors) {
    console.error(`🚨 Verification failed: ${totalSyntaxErrors} syntax errors, ${totalDuplicates} duplicates, ${missingAssetsCount} broken assets, ${invalidAudioCount} invalid audio volumes.`);
    process.exit(1);
  } else {
    console.log(`✅ All ${files.length} JavaScript files verified cleanly! No syntax errors, unbalanced braces, or duplicate declarations.`);
    
    // 3. Run Fighter Runtime & Simulation Suite
    console.log('\n🚀 Running Fighter Simulation & Runtime Test Suite...');
    try {
      execSync('node scripts/testAllFighters.mjs', { stdio: 'inherit' });
      execSync('node scripts/testTagMatch.mjs', { stdio: 'inherit' });
      execSync('node scripts/testInteractions.mjs', { stdio: 'inherit' });
      
      // 4. Automatically synchronize patch notes & live in-game data store
      console.log('\n📝 Synchronizing Live Patch Notes & Changelogs...');
      execSync('node scripts/generatePatchNotes.mjs', { stdio: 'inherit' });

      process.exit(0);
    } catch (err) {
      console.error('🚨 Simulation tests failed!');
      process.exit(1);
    }
  }
}

verifyAll();
