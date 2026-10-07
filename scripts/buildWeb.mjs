import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('🛡️  [Web Build & Release Pipeline] Starting automated bundling, WASM optimization & code protection...\n');

// 1. Clean and initialize dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'js'), { recursive: true });

// Excluded junk file patterns for clean asset distribution
const JUNK_FILE_PATTERNS = [
  /^\.DS_Store$/i,
  /^Thumbs\.db$/i,
  /^\.gitkeep$/i,
  /\.map$/i,
  /\.psd$/i,
  /\.aseprite$/i,
  /\.bak$/i,
  /~$/
];

function isJunkFile(filename) {
  return JUNK_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

let totalAssetsCopied = 0;
let totalAudioFiles = 0;
let totalImageFiles = 0;
let totalAssetBytes = 0;

// Helper to copy directory recursively with asset optimization & junk filtering
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (isJunkFile(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      const stat = fs.statSync(destPath);
      totalAssetsCopied++;
      totalAssetBytes += stat.size;
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg')) {
        totalAudioFiles++;
      } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.svg')) {
        totalImageFiles++;
      }
    }
  }
}

// 1.5. Validate Master Skin Customizations Database
console.log('🗄️  [1/5] Verifying and bundling Master Skin Customizations Database...');
const dbModulePath = path.join(rootDir, 'js', 'configs', 'skinCustomizationsDatabase.js');
if (!fs.existsSync(dbModulePath)) {
  console.error('❌ skinCustomizationsDatabase.js not found at', dbModulePath);
  process.exit(1);
}
const { SKIN_CUSTOMIZATIONS_DATABASE } = await import(`file://${dbModulePath.replace(/\\/g, '/')}`);
const fighterCount = Object.keys(SKIN_CUSTOMIZATIONS_DATABASE || {}).length;
console.log(`   ✅ Database verified: ${fighterCount} calibrated fighter & boss subpart presets ready.`);

// 2. Bundle ES modules with esbuild (Clean Production Minification)
console.log('📦 [2/5] Bundling and optimizing ES6 modules with esbuild...');
const bundlePath = path.join(distDir, 'js', 'game.bundle.js');

try {
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'js', 'core', 'main.js')],
    bundle: true,
    outfile: bundlePath,
    format: 'esm',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    sourcemap: false,
    treeShaking: true,
    loader: {
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.mp3': 'file',
      '.wasm': 'binary'
    }
  });
  const bundleSizeKB = (fs.statSync(bundlePath).size / 1024).toFixed(1);
  console.log(`   ✅ Bundled successfully: dist/js/game.bundle.js (${bundleSizeKB} KB)`);
} catch (err) {
  console.error('❌ esbuild bundling failed:', err);
  process.exit(1);
}

// 3. Copy static assets (Assets/, css/, libs/, Tactical Force/, manifest.json)
console.log('🎨 [3/5] Optimizing and copying game assets, styles, and libraries...');
const assetFolders = ['Assets', 'css', 'libs', 'Tactical Force'];
for (const folder of assetFolders) {
  const src = path.join(rootDir, folder);
  const dest = path.join(distDir, folder);
  if (fs.existsSync(src)) {
    copyDirSync(src, dest);
    console.log(`   📂 Copied ${folder}/`);
  }
}

const singleFiles = ['manifest.json', 'favicon.ico'];
for (const file of singleFiles) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

console.log(`   📊 Asset Summary: ${totalAssetsCopied} assets processed (${totalAudioFiles} audio tracks, ${totalImageFiles} textures/sprites, ${(totalAssetBytes / (1024 * 1024)).toFixed(2)} MB).`);

// 4. Generate production index.html referencing bundled script
console.log('📄 [4/5] Generating production index.html...');
const originalHtmlPath = path.join(rootDir, 'index.html');
let html = fs.readFileSync(originalHtmlPath, 'utf-8');

// Replace the original development module script tag with the production bundle
html = html.replace(
  /<script\s+type=["']module["']\s+src=["']js\/core\/main\.js(\?v=\d+)?["']\s*><\/script>/i,
  '<script type="module" src="js/game.bundle.js"></script>'
);

fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
console.log('   ✅ Production index.html written.');

// 5. Generate ready-to-upload Web Release ZIP file
console.log('📦 [5/5] Generating distribution ZIP archive (dist/ramball-fight-simulator-web.zip)...');

function createZipArchive(sourceDir, outZipPath) {
  const entries = [];
  const CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c >>> 0;
  }

  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
    }
    return (c ^ -1) >>> 0;
  }

  function walk(currentDir, zipPrefix) {
    const list = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of list) {
      if (item.name.endsWith('.zip')) continue;
      const fullPath = path.join(currentDir, item.name);
      const zipPath = zipPrefix ? (zipPrefix + '/' + item.name) : item.name;
      if (item.isDirectory()) {
        walk(fullPath, zipPath);
      } else {
        const rawData = fs.readFileSync(fullPath);
        const crc = crc32(rawData);
        const compressedData = zlib.deflateRawSync(rawData, { level: 9 });
        entries.push({
          name: zipPath.replace(/\\/g, '/'),
          compressedData,
          crc,
          size: rawData.length,
          compressedSize: compressedData.length
        });
      }
    }
  }

  walk(sourceDir, '');

  const chunks = [];
  const cdEntries = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(entry.crc, 14);
    header.writeUInt32LE(entry.compressedSize, 18);
    header.writeUInt32LE(entry.size, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    chunks.push(header, nameBuf, entry.compressedData);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(entry.crc, 16);
    cd.writeUInt32LE(entry.compressedSize, 20);
    cd.writeUInt32LE(entry.size, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);

    cdEntries.push(cd, nameBuf);
    offset += header.length + nameBuf.length + entry.compressedData.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const b of cdEntries) {
    chunks.push(b);
    cdSize += b.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  chunks.push(eocd);
  const finalZip = Buffer.concat(chunks);
  fs.writeFileSync(outZipPath, finalZip);
  return { filesCount: entries.length, zipSize: finalZip.length };
}

const outZip = path.join(distDir, 'ramball-fight-simulator-web.zip');
const zipStats = createZipArchive(distDir, outZip);
const zipSizeMB = (zipStats.zipSize / (1024 * 1024)).toFixed(2);
console.log(`   ✅ Release ZIP generated: dist/ramball-fight-simulator-web.zip (${zipSizeMB} MB, ${zipStats.filesCount} compressed files).`);

console.log('\n🎉 [BUILD & RELEASE COMPLETE] Protected web distribution is ready in dist/ !');
console.log('   1. Upload "dist/ramball-fight-simulator-web.zip" directly to itch.io or web hosting.');
console.log('   2. Run "npm run preview:web" to test locally.\n');
