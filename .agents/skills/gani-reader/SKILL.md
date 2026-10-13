---
name: gani-reader
description: Read, decode, parse, and reconstruct GraalOnline animation files (.gani and scrambled .ganisc), extracting sprite coordinates, animation frame durations, embedded GScripts, and mapping combat attack patterns into 60 FPS fighter animations.
---

# 📜 Graal Gani Reader & Animation Extractor Skill (`gani-reader`)

Use this skill whenever reading, decoding, inspecting, reverse-engineering, or converting GraalOnline animation files (`.gani` or scrambled `.ganisc`) from client caches, weapon packages, or community archives.

---

## 1. Graal Animation File Formats & Cache Architecture

### Plaintext `.gani` (`GANI0001`) vs Scrambled `ganisc`
| Attribute | Plaintext `.gani` | Scrambled `ganisc` |
|---|---|---|
| **Header** | `GANI0001` (ASCII) | Encrypted stream header (e.g. `85 AE E1 47...`) |
| **Entropy** | Low (~4.2–5.1 bits/byte) | High (~7.7–7.9 bits/byte) |
| **Tail** | `ANIEND\r\n` | `ANIEND\r\n`, `PTEND\n`, or stream tail |
| **Origin** | Graal v2–v6, Gani-Edit, GraalShop | iOS, Android, Steam (QuattroPlay / Unity) |
| **Location** | `levels/ganis/` | `levels/ganisc/` |
| **Security** | None (human-readable text) | Decrypted in RAM by `Graal3DEngine.dll` (Themida-protected) |

### Cache Directory Layout (GraalOnline Era / Steam)
```text
%LOCALAPPDATA%Low\toonslab\GraalOnline Era\Login_Era_iPhone\
├── levels\
│   └── ganisc\             # Scrambled .gani files (e.g. effect_floatingtext.gani)
├── weblevels\
│   └── ganis\              # Sister .code files (compiled GScript bytecode)
└── URLCACHE.txt            # Maps hashed QuattroPlay URLs to source filenames
```

---

## 2. Canonical `GANI0001` Grammar & File Structure

A valid plaintext `.gani` file is structured in sequential blocks:

```text
GANI0001
[GLOBAL_PROPERTIES]
[SPRITE_DECLARATIONS]
[ATTACHMENTS]
[SCRIPT_BLOCK]
ANI
[FRAME_DATA]
ANIEND
```

### 1. Global Properties
- `SINGLEDIRECTION`: Animation uses the same visual frames regardless of player facing direction (common for floating text, explosions, spells, UI).
- `CONTINUOUS`: Animation loops seamlessly without snapping back to frame 0.
- `SETBACKTO <gani_name>`: When animation finishes, automatically transition to specified gani (e.g. `SETBACKTO idle`).

### 2. Default Sprites & Equipment Binds
```text
DEFAULTHEAD head0.png
DEFAULTBODY body.png
DEFAULTSHIELD shield1.png
DEFAULTSWORD sword1.png
```

### 3. Sprite Definition Table (`SPRITE <id>`)
Declares clipping rectangles mapped from texture sprite sheets:
```text
SPRITE <id> <image_name> <x> <y> <width> <height> [name]
```
- Example:
  ```text
  SPRITE 0 sword.png 0 0 32 32 main_blade
  SPRITE 1 sword.png 32 0 16 16 hilt_grip
  ```

### 4. Embedded GScript Block (`SCRIPT ... SCRIPTEND`)
Contains embedded client-side script code executed during animation playback:
```text
SCRIPT
//#CLIENTSIDE
function onCreated() {
  // Read params passed from showani(id, x, y, dir, gani, param0, param1, ...)
  temp.text = params[0];
  temp.r = (params.size() > 1 ? params[1] : 1.0);
  ...
}
SCRIPTEND
```

### 5. Animation Frames Block (`ANI ... ANIEND`)
Directions are indexed as:
- Direction 0: **Down**
- Direction 1: **Left**
- Direction 2: **Up**
- Direction 3: **Right**

For each frame and direction, sprite placements and sound triggers are declared:
```text
ANI
// Direction 0 (Down)
SPRITE_ID X_OFFSET Y_OFFSET
PLAYSOUND <sound_file> <x> <y>
WAIT <ticks>
ANIEND
```

---

## 3. Reverse-Engineering & Decoding Scrambled `ganisc`

When presented with a scrambled gani from `levels/ganisc/`:

1. **Examine File Size & Tail Bytes**:
   - Inspect the last 16–32 bytes. Often, the final stream cipher block aligns with raw ASCII tags:
     - `...4E 49 45 4E 44 0D 0A` -> `NIEND\r\n` (tail of `ANIEND`)
     - `...50 54 45 4E 44 0A` -> `PTEND\n` (tail of `SCRIPTEND`)
2. **Locate the Bytecode Mirror in `weblevels/`**:
   - Check `Login_Era_iPhone\weblevels\ganis\<name>.code`.
   - If present, strings and identifiers (`params`, `showtext`, `changeimgcolors`, `sleep`, `hideimg`) can be extracted from string tables.
3. **Map the Calling API (`showani` / `setani`)**:
   - Cross-reference how the engine or server invokes the animation:
     - `showani(index, x, y, dir, "gani_name", params...)`
     - `setani("gani_name", params)`
4. **Reconstruct Clean Plaintext Specification**:
   - Generate standard `GANI0001` format compatible with Gani-Edit and GraalShop.

---

## 4. Converting Graal Gani Timing to 60 FPS Combat Engine

GraalOnline engines operate on **20 ticks per second** (50ms per frame) or **40 ticks per second** (25ms per frame) for high-speed weapon swings:

### The Timing Conversion Standard:
$$\text{Engine Frames (60 FPS)} = \text{Graal Ticks} \times 3$$

| Graal Ticks | Graal Milliseconds | 60 FPS Engine Frames |
|---|---|---|
| `1 tick` | `50 ms` | **3 frames** |
| `2 ticks` | `100 ms` | **6 frames** |
| `3 ticks` | `150 ms` | **9 frames** |
| `4 ticks` | `200 ms` | **12 frames** |

### Direct Mapping to Rule 30 (5-Phase Melee Standard):
When extracting a Graal melee attack animation (e.g. Katana, Machete, Chemical Katana) to integrate into a fighter (e.g. Toji, Maki, Musashi):

1. **Phase 1: Coil / Lift (`hit*LiftFrames`)**:
   - Map frames where the weapon blade tilts back (`-1.2` to `-1.5 rad`) and body draws back.
   - Typically 2–3 Graal ticks = **6–9 engine frames**.
2. **Phase 2: Poised Hold (`hit*HoldFrames`)**:
   - Map frames where the weapon pauses at peak lift before cleaving forward.
   - Typically 1 Graal tick = **2–3 engine frames**.
3. **Phase 3: Hypersonic Whip Strike (`hit*StrikeFrames`)**:
   - Map frames where the weapon accelerates through the cleave arc (`PLAYSOUND attack_swordswing`).
   - Deliver hit registration, screen shake, and slap SFX at `sp >= 0.50`.
   - Typically 2 Graal ticks = **6 engine frames**.
4. **Phase 4: Impact Lock / Latch (`hit*ImpactLockFrames`)**:
   - Map the impact frame where the blade reaches maximum extension/cleave plane (`weaponLunge = 24px`, velocity clamped to 0).
   - Typically 2 Graal ticks = **6 engine frames**.
5. **Phase 5: Extraction & Recovery (`hit*RecoveryFrames`)**:
   - Map the return motion back to neutral guard stance with harmonic spring settle.
   - Typically 3–4 Graal ticks = **9–12 engine frames**.

### 4.1 Case Study: The Chemical Katana 2-Hit Combo (`chemical-katana-animator`)
The benchmark melee implementation in this codebase is extracted directly from Graal Era's Chemical Katana:
- **Source Files**:
  - `era_chester-events23-chemicalkatana-attack.gani` (Hit 1: Horizontal Cross Cleave)
  - `era_chester-events23-chemicalkatana-attack2.gani` (Hit 2: Upward Rising Cleave)
  - `Melee%047Chemical_Katana.code` (GScript combo chaining logic)
- **Engine Translation**:
  - **Hit 1**: High Cross Cleave sweeping `-117°` across to `+117°` (7f lift → 2f hold → 5f whip → 6f impact lock → 10f recovery = 30 frames).
  - **Hit 2**: Low-to-High Scoop sweeping `+140°` upward to `-140°` with vertical loft `vy -= 2.5` (6f lift → 2f hold → 5f whip → 7f impact lock → 12f recovery = 32 frames).
  - **Audio Layering**: `attack_swordswing` (0.95 vol) on swing + `attack_fleshhit` (1.0 vol) + `sukuna_slice` (0.90 vol) on impact.
- **Reference Skill**: For full mathematical models, angle calculators, and annular sector canvas ribbon renderers, see [chemical-katana-animator](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/skills/chemical-katana-animator/SKILL.md).

---

## 5. Node.js Plaintext Gani Parser Reference Script

```javascript
/**
 * Simple parser for plaintext GANI0001 files.
 */
export function parseGani(ganiContent) {
  const lines = ganiContent.split(/\r?\n/);
  const result = {
    version: '',
    flags: [],
    sprites: [],
    sounds: [],
    script: '',
    frames: []
  };

  let inScript = false;
  let inAni = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('GANI')) {
      result.version = line;
      continue;
    }

    if (line === 'SCRIPT') {
      inScript = true;
      continue;
    }
    if (line === 'SCRIPTEND') {
      inScript = false;
      continue;
    }
    if (inScript) {
      result.script += lines[i] + '\n';
      continue;
    }

    if (line === 'ANI') {
      inAni = true;
      continue;
    }
    if (line === 'ANIEND') {
      inAni = false;
      continue;
    }

    if (line.startsWith('SPRITE ')) {
      const parts = line.split(/\s+/);
      result.sprites.push({
        id: parseInt(parts[1], 10),
        image: parts[2],
        x: parseInt(parts[3], 10),
        y: parseInt(parts[4], 10),
        w: parseInt(parts[5], 10),
        h: parseInt(parts[6], 10)
      });
      continue;
    }

    if (line === 'SINGLEDIRECTION' || line === 'CONTINUOUS') {
      result.flags.push(line);
      continue;
    }

    if (inAni) {
      result.frames.push(line);
    }
  }

  return result;
}
```

---

## 6. Verification Checklist

When using this skill to decode or reconstruct any Gani file:
- [ ] Confirmed whether file is plaintext (`GANI0001`) or scrambled (`ganisc`).
- [ ] Identified sprite sheet textures and bounding box coordinates (`x, y, w, h`).
- [ ] Extracted embedded GScript parameters and client-side event handlers.
- [ ] Converted Graal tick durations (50ms base) to 60 FPS frames ($\times 3$).
- [ ] Aligned attack swing frames with the Rule 30 5-Phase Melee Lifecycle.
- [ ] Ran `npm run verify` to guarantee zero test or stack depth regressions in the codebase.
