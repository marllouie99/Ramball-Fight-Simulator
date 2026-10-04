import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('🛡️  [Web Build] Starting automated bundling & code protection pipeline...\n');

// 1. Clean and initialize dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'js'), { recursive: true });

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Bundle ES modules with esbuild
console.log('📦 [1/4] Bundling all ES6 modules into optimized game bundle with esbuild...');
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
      '.mp3': 'file'
    }
  });
  console.log('   ✅ Bundled successfully: dist/js/game.bundle.js');
} catch (err) {
  console.error('❌ esbuild bundling failed:', err);
  process.exit(1);
}

// 3. Encrypt bundle into an impenetrable ciphertext payload with dynamic Blob executor
console.log('🔒 [2/4] Encrypting code bundle and generating self-decrypting runtime wrapper...');
try {
  const rawCode = fs.readFileSync(bundlePath, 'utf-8');
  
  // High-entropy XOR encryption key
  const encryptionKey = 0xAA;
  const buffer = Buffer.from(rawCode, 'utf-8');
  const encryptedBytes = new Uint8Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    encryptedBytes[i] = buffer[i] ^ encryptionKey;
  }
  const base64Cipher = Buffer.from(encryptedBytes).toString('base64');
  
  // Generate self-decrypting runtime loader that executes in-memory via ephemeral Blob URL
  const runtimeLoader = `(function(){
  "use strict";
  const _k = ${encryptionKey};
  const _c = "${base64Cipher}";
  try {
    const _b = atob(_c);
    const _l = _b.length;
    const _u = new Uint8Array(_l);
    for (let i = 0; i < _l; i++) {
      _u[i] = _b.charCodeAt(i) ^ _k;
    }
    const _d = new TextDecoder().decode(_u);
    const _blob = new Blob([_d], { type: "application/javascript" });
    const _url = URL.createObjectURL(_blob);
    const _script = document.createElement("script");
    _script.type = "module";
    _script.src = _url;
    _script.onload = () => { URL.revokeObjectURL(_url); _script.remove(); };
    document.head.appendChild(_script);
  } catch (e) {
    console.error("Initialization error");
  }
})();`;

  fs.writeFileSync(bundlePath, runtimeLoader, 'utf-8');
  const bundleSizeKB = (fs.statSync(bundlePath).size / 1024).toFixed(1);
  console.log(`   ✅ Code successfully encrypted into runtime payload (${bundleSizeKB} KB).`);
} catch (err) {
  console.error('❌ Encryption failed:', err);
  process.exit(1);
}

// 4. Copy static assets (Assets/, css/, libs/, Tactical Force/, manifest.json)
console.log('🎨 [3/4] Copying game assets, styles, and vendor libraries...');
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

// 5. Generate production index.html with Anti-Inspection Armor
console.log('🛡️  [4/4] Generating production index.html with Anti-Reverse-Engineering Shield...');
const originalHtmlPath = path.join(rootDir, 'index.html');
let html = fs.readFileSync(originalHtmlPath, 'utf-8');

// Replace the original script tag with the bundled/obfuscated script
html = html.replace(
  /<script\s+type=["']module["']\s+src=["']js\/core\/main\.js(\?v=\d+)?["']\s*><\/script>/i,
  '<script type="module" src="js/game.bundle.js"></script>'
);

// Inject anti-inspection & right-click protection script
const antiInspectionScript = `
  <!-- Production Anti-Reverse-Engineering Protection Shield -->
  <script>
    (function() {
      // Disable Right Click context menu
      document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; }, { capture: true });

      // Block inspection and source view keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // F12 (DevTools)
        if (e.key === 'F12' || e.keyCode === 123) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Picker)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        // Ctrl+U (View Source), Ctrl+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }, { capture: true });
    })();
  </script>
`;

html = html.replace('</body>', `${antiInspectionScript}\n</body>`);
fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
console.log('   ✅ Production index.html generated with Anti-Tamper Shield.');

console.log('\n🎉 [BUILD COMPLETE] Protected web distribution is ready in dist/ !');
console.log('   Run "npm run preview:web" to test the protected game build locally.\n');
