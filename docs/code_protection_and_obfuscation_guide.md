# Game Code Protection & Obfuscation Guide

## 1. Executive Summary & Context

In online and commercial games (such as *GraalOnline Era*), game clients download weapon scripts, animations, and configurations over the network. To protect their intellectual property and prevent client-side cheating, developers compile or obfuscate these files into binary formats (such as Graal's `GRESCR01` encrypted bytecode). When opened in standard text editors, these files display as scrambled symbols (mojibake).

This guide documents how code protection works, the current architecture in **Ramball Fight Simulator**, and how to activate production-grade obfuscation and packaging pipelines.

---

## 2. Why Games Protect & Encrypt Code

| Motivation | Description | Real-World Example |
| :--- | :--- | :--- |
| **Anti-Cheat & Anti-Tamper** | Prevents players from editing stats (damage, cooldowns, bullet speed, HP) in local files using Notepad or basic text editors. | In Graal Era, weapon scripts (`Melee_Chemical_Katana.code`) are encrypted bytecode so swing delays and hitboxes cannot be manually altered. |
| **Intellectual Property Protection** | Prevents competing games or private server owners from stealing proprietary combat algorithms, combo state machines, and skill formulas. | Custom developer scripts (like Chester's Chemical Katana) cannot be easily decompiled or copied to other servers. |
| **Binary Bytecode Performance** | Compiling scripts into abstract syntax trees or bytecode tokens allows game engines to parse and execute logic faster than re-interpreting raw strings. | V8 engine bytecode, WebAssembly (`.wasm`), or Graal's internal bytecode virtual machine. |
| **Network & Asset Compression** | Stripping whitespace, comments, and identifiers reduces download footprints and speeds up asset streaming. | Minified JS bundles and compressed asset archives (`StreamingAssets.zip`). |

---

## 3. Current Protection Architecture in This Project

### 3.1 Development Mode (Active Working Directory)
* **Status:** **Zero Obfuscation / Human-Readable Source.**
* **Structure:** ~430+ individual ES6 JavaScript modules under `js/`, categorized cleanly by systems, entities, graphics, and configs.
* **Purpose:** Maximum developer velocity, instant hot-reloading, readable stack traces, and clean git diff tracking.

### 3.2 Production Web Release (`npm run build:web`)
* **Pipeline:** [`scripts/buildWeb.mjs`](../scripts/buildWeb.mjs) using `esbuild`.
* **Current Protection Level:** **Production Minification & Tree-Shaking.**
  - Consolidates all 430+ source files into a single bundle: `dist/js/game.bundle.js`.
  - Strips all comments, developer notes, and whitespace.
  - Mangles internal variables and function arguments into single-character tokens (`a`, `b`, `c`).
  - Disables source maps (`sourcemap: false`), preventing browser DevTools from reconstructing the original file tree.
  - Automatically packages web distributions into `dist/ramball-fight-simulator-web.zip`.

### 3.3 Standalone Desktop Application (`npm run build`)
* **Pipeline:** [`electron-builder`](../package.json) configured in `package.json`.
* **Protection Level:** **Binary Installer & ASAR Archive Packaging.**
  - Compiles the application into a Windows installer (`.exe`) under `dist/`.
  - Packages source files into an encrypted read-only virtual archive (`app.asar`), hiding loose `.js` files from Windows File Explorer.

---

## 4. Enabling "Graal-Style" Scrambled Obfuscation

The project already has **`javascript-obfuscator`** (`^5.9.0`) pre-installed in [`package.json`](../package.json).

If you want the exported `game.bundle.js` to look completely scrambled with hexadecimal identifiers and tangled control flows, you can hook `javascript-obfuscator` into step 2 of [`scripts/buildWeb.mjs`](../scripts/buildWeb.mjs).

### 4.1 Sample Obfuscation Configuration

```javascript
import JavaScriptObfuscator from 'javascript-obfuscator';

// After esbuild creates game.bundle.js:
const rawBundleCode = fs.readFileSync(bundlePath, 'utf8');

const obfuscatedResult = JavaScriptObfuscator.obfuscate(rawBundleCode, {
  compact: true,
  controlFlowFlattening: true,             // Flattens execution flows into switch-case state machines
  controlFlowFlatteningThreshold: 0.75,
  numbersToExpressions: true,              // Converts numbers (e.g. 100 -> (0x1f + 0x45))
  simplify: true,
  stringArray: true,                        // Extracts all text strings into encrypted lookup arrays
  stringArrayEncoding: ['base64', 'rc4'],   // Encrypts string literals
  stringArrayThreshold: 0.8,
  splitStrings: true,
  deadCodeInjection: false,                 // Keep false for 60 FPS combat performance
  disableConsoleOutput: true               // Prevents DevTools console inspections
});

fs.writeFileSync(bundlePath, obfuscatedResult.getObfuscatedCode(), 'utf8');
```

### 4.2 What the Resulting Code Looks Like

Before obfuscation (readable source):
```javascript
export function applySlashDamage(target, damage) {
  if (target.isInvulnerable) return;
  target.hp -= damage;
}
```

After obfuscation (scrambled like Graal bytecode):
```javascript
var _0x4a12=['\x69\x73\x49\x6e\x76\x75\x6c\x6e\x65\x72\x61\x62\x6c\x65','\x68\x70'];(function(_0x2d1f,_0x4a12a8){...})(_0x4a12,0x1b4);function _0x3b89(_0x1,_0x2){return _0x4a12[_0x1];}function applySlashDamage(_0x5c9a,_0x2f10){if(_0x5c9a[_0x3b89('0x0')])return;_0x5c9a[_0x3b89('0x1')]-=_0x2f10;}
```

---

## 5. Balancing Protection vs. Performance

When configuring code obfuscation for a high-intensity 60 FPS combat engine, consider the following trade-offs:

| Setting | Protection Level | Impact on Game Performance | Recommendation |
| :--- | :--- | :--- | :--- |
| **esbuild Minification** (`minify: true`) | Medium | Zero overhead (improves load times). | **Always Active** (current default). |
| **String Array Encoding** (`base64`/`rc4`) | High | Low impact (negligible memory lookup cost). | **Recommended** for public web releases. |
| **Control Flow Flattening** (`threshold: 0.5`) | Very High | Minor impact on hot simulation loops. | **Use selectively** (exclude tight physics loops). |
| **Dead Code Injection** | Extreme | High (inflates bundle size by 2–4×, reduces FPS). | **Not Recommended** for real-time combat. |

---

## 6. Protecting Game Assets (Art, Sprites & Audio)

1. **Asset Bundling via Webpack/esbuild Data URIs:**
   - Small icons and critical sprites can be inlined directly into JavaScript using Base64 data URLs (`loader: { '.png': 'dataurl' }`), removing loose PNG files from disk.
2. **Sprite Atlasing / Texture Packs:**
   - Packing loose PNG sprites into master spritesheets makes individual asset extraction much harder for casual players.
3. **Electron ASAR Virtual Filesystem:**
   - For PC releases, all sounds (`Assets/audio/`) and character models (`Assets/model/`) reside inside the read-only `app.asar` package.
