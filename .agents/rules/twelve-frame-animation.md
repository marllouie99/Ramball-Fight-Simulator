---
description: Mandatory 12-frame visual animation creation workflow, directory navigation, and file storage standard.
alwaysApply: true
---

# 12-Frame Visual Animation Creation & Directory Standard

Whenever the user asks to create, generate, extract, format, or implement a **12-frame animation** (explosions, bursts, slashes, fireballs, flame blasts, projectile travels, beam travels, shockwaves, or spell impacts):

## 1. Mandatory Workflow & Directory Protocol
1. **Activate Skill**: Always invoke and adhere to [`twelve-frame-animation-generator`](file:///c:/Users/asus/OneDrive/Desktop/Circle%20Mini-Battle/.agents/skills/twelve-frame-animation-generator/SKILL.md).
2. **Go to `Assets/model/`**: Navigate to the fighter's dedicated model directory:
   - `Assets/model/<characterId>/`
   - Examples: `Assets/model/gojo/`, `Assets/model/sukuna/`, `Assets/model/reze/`, `Assets/model/ash/pokemon/charizard/`.
3. **Create Visual Effect Folder**: Inside that fighter's model folder, CREATE a dedicated subfolder specifically named for that certain visual animation:
   - Path: `Assets/model/<characterId>/<visualName>/`
   - Canonical examples:
     - `Assets/model/reze/explosion/`
     - `Assets/model/gojo/Purple_idle_travel/`
     - `Assets/model/sukuna/Fuga_explosion/`
     - `Assets/model/sukuna/Fuga_idle_travel/`
     - `Assets/model/ash/pokemon/charizard/Flame/`
     - `Assets/model/ash/pokemon/pikachu/Thunderbolt/`
     - `Assets/model/ash/pokemon/pikachu/Thunderbolt_impact/`
4. **Put the Animation Files in That Folder**:
   - Save all 12 individual frames as `<visualName>-1.png`, `<visualName>-2.png`, ..., `<visualName>-12.png`.
   - Save the master 12-cell horizontal strip as `<visualName>-b.png` ($12 \times \text{cellWidth}$ by $\text{cellHeight}$, e.g. $3072 \times 256\text{px}$).
5. **Config & Weapon Renderer Integration**:
   - Register the asset path in `js/configs/characters/<name>Config.js` under `assets.<visualName>`.
   - Implement the frame loader `_get[Name][Visual]Frames()` and nearest-neighbor sprite renderer in `js/graphics/weapons/<name>WeaponGraphics.js`.

## 2. Strict Prohibitions
- **NEVER** save 12-frame animations in arbitrary root directories, global assets folders, or temporary folders.
- **NEVER** dump loose frame files into `Assets/model/<characterId>/` without creating the dedicated `<visualName>/` subfolder.
- **NEVER** violate Rule 31 (Anti-Box & Feathered Boundary Standard): all frames must maintain at least 15–30px of transparent alpha padding to prevent rectangular clipping artifacts.
