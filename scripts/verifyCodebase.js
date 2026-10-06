import fs from 'fs';
import path from 'path';
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
