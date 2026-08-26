const fs = require('fs');
const path = require('path');

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

  console.log('───────────────────────────────────────────────────────');
  if (hasErrors) {
    console.error(`🚨 Verification failed: ${totalSyntaxErrors} syntax errors, ${totalDuplicates} duplicate declarations found.`);
    process.exit(1);
  } else {
    console.log(`✅ All ${files.length} JavaScript files verified cleanly! No syntax errors, unbalanced braces, or duplicate declarations.`);
    
    // 3. Run Fighter Runtime & Simulation Suite
    console.log('\n🚀 Running Fighter Simulation & Runtime Test Suite...');
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/testAllFighters.mjs', { stdio: 'inherit' });
      process.exit(0);
    } catch (err) {
      console.error('🚨 Fighter Runtime Simulation failed!');
      process.exit(1);
    }
  }
}

verifyAll();
