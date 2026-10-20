# 🗡️ Canonical 12-Frame Weapon Slash Attack Animation Template

**Location**: `Assets/effects/Slash Attack/`  
**Standard**: Rule 30 (5-Phase Melee Combat Animation & Impact Lock) & Rule 20/25 Compliant

---

## 1. Overview & Purpose
This directory contains the universal, gold-standard **12-frame animated weapon slash template** for all melee weapons, swords, blades, daggers, scythes, axes, and martial-arts combat slashes in the game engine.

Whenever an agent or developer is asked to:
1. Generate, extract, or format a new weapon attack or slash animation,
2. Scaffold an attack visual effect for a new or existing melee fighter,
3. Calibrate slash angles, scale, and weapon-tip spawn positioning,

**THE AGENT MUST ALWAYS LOOK FOR THIS TEMPLATE IN `Assets/effects/Slash Attack/` FIRST** before searching elsewhere or generating assets from scratch.

---

## 2. Directory Structure & Files
```text
Assets/effects/Slash Attack/
├── slash-1.png              # Frame 1: Initial whip cut initiation behind cutting tip
├── slash-2.png              # Frame 2: Early arc extension trailing the blade
├── slash-3.png              # Frame 3: Mid-sweep hypersonic cutting plane
├── slash-4.png              # Frame 4: Peak impact lock crescent (full extension at kissaki tip)
├── slash-5.png              # Frame 5: Peak impact lock hold (tremor & latch)
├── slash-6.png              # Frame 6: Beginning of recovery settle; tail begins dissolving
├── slash-7.png              # Frame 7: Tail dissolves; core energy dissipates into embers
├── slash-8.png              # Frame 8: Trailing fragmentation
├── slash-9.png              # Frame 9: Leading tip ember puff
├── slash-10.png             # Frame 10: Dispersing Reiatsu / sparks (50% fade)
├── slash-11.png             # Frame 11: Broken residue embers (20% fade)
├── slash-12.png             # Frame 12: Final spark dissolution (0% fade)
├── slash-b.png              # Master horizontal atlas strip (12 cells: 3072 × 256px)
├── attack-1.png ... attack-12.png # Drop-in alias frames for legacy loaders
├── attack-b.png             # Drop-in alias strip (3072 × 256px)
└── slash_template_config.json # Machine-readable calibration parameters
```

---

## 3. Geometric Calibration & Anchoring Standard

| Parameter | Value | Description |
|---|---|---|
| **Frame Dimensions** | `256 × 256 px` | Clean square power-of-two grid per frame. |
| **Master Strip Dimensions** | `3072 × 256 px` | 12 horizontal cells of $256 \times 256\text{px}$. |
| **Pivot Anchor `(anchorX, anchorY)`** | `(95, 135)` | Center of curvature of the crescent arc. Translates 1:1 to weapon rotation pivot. |
| **Leading Edge Kissaki Tip (Frame 4–5)** | `(119, 232)` | Located at local angle `+1.33 rad` (+76.1°) and distance `100px` from pivot. |
| **Inner Concave Boundary** | `58.4 px` | Guarantees $>20\text{px}$ clearance from fighter body ($r = 25$) when scaled. |
| **Outer Convex Boundary** | `130.2 px` | Envelops the full cutting edge reach of the sword blade. |
| **Scale Formula** | `scale = bladeReach / 100` | Maps 100px sprite reach directly to weapon reach (`swordStartX + bladeLen`). |

---

## 4. Mandatory Rendering Rules

1. **Weapon-Tip Spawning**: The slash effect MUST spawn at the very tip of the weapon (`tipPos = getWeaponTipWorldPos(fighter)`). It must NEVER spawn at `(fighter.x, fighter.y)` or wrap over the fighter's head or face.
2. **Blade-Leading Synchronization**: The sword blade leads the strike. In Phase 3, the slash effect must NEVER precede or lead the sword; frames 1–3 expand strictly behind the cleaving edge.
3. **Impact Lock Latch (Phase 4)**: During impact lock, frames 4–5 remain latched at the impact plane with the blade tip, holding full crescent extension with micro-tremor.
4. **Tail-to-Tip Dissolution (Phase 5)**: During recovery, the blade dislodges while frames 6–12 dissolve the trail from tail to tip into discrete embers.
5. **Decoupled World Decay (Rule 25)**: If the fighter flash-steps (Shunpo/dash) or cancels the attack, remaining dissolution frames continue playing smoothly at the world coordinates where the strike occurred without getting stuck or snapping to the body.
