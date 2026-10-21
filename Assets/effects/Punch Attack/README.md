# 👊 Canonical 12-Frame Punch Attack Animation Template

**Location**: `Assets/effects/Punch Attack/`  
**Reference Video**: `C:\Users\asus\Videos\Screen Recorder\Recording 2026-10-21 112626.mp4`  
**Standards**: Rule 25 (Non-Freezing Particle Decay), Rule 26 (Concentric Shockwaves), Rule 30 (Kinematic Combat & Impact Physics)

---

## 1. Overview & Purpose
This directory contains the universal, gold-standard **12-frame animated punch attack template** for all fighters that strike using their hands, fists, gauntlets, and unarmed martial arts combos (e.g. Yuji Itadori, Todo Aoi, Gojo Satoru, Sukuna, Saitama, Pe-k-k-a, Mahoraga).

Whenever an agent or developer is asked to:
1. Render a high-impact concussive punch or physical fist strike,
2. Scaffold or integrate visual effects for a hand-to-hand brawler,
3. Align fist contact epicenters with combat collision coordinates,

**THE AGENT MUST ALWAYS USE THIS TEMPLATE IN `Assets/effects/Punch Attack/` FIRST** before generating custom procedural shapes.

---

## 2. Directory Structure & Files
```text
Assets/effects/Punch Attack/
├── punch-1.png              # Frame 1: Point-of-contact ignition spark (sharp diamond flash flare)
├── punch-2.png              # Frame 2: Expanding golden starburst contact disc bloom
├── punch-3.png              # Frame 3: Peak volumetric starburst with brilliant cyan & golden flare points
├── punch-4.png              # Frame 4: High-pressure purple core compression disc with white cross and orange tension spokes
├── punch-5.png              # Frame 5: Supersonic Mach compression ring with vibrant orange ionization rim
├── punch-6.png              # Frame 6: Expanding shockwave wavefront with velocity particulate debris
├── punch-7.png              # Frame 7: High-velocity directional kinetic cleave lines through target flesh
├── punch-8.png              # Frame 8: Expanding force cleave pushing outward across the impact plane
├── punch-9.png              # Frame 9: Concussive ember and spark scatter bursting outward
├── punch-10.png             # Frame 10: Centralized concussive impact smoke cloud with cooling sparks
├── punch-11.png             # Frame 11: Dissolving smoke clumps breaking into micro-particulates
├── punch-12.png             # Frame 12: Final residue embers dispersing into nothingness
├── punch-b.png              # Master horizontal atlas strip (12 cells: 3072 × 256px)
├── attack-1.png ... attack-12.png # Drop-in alias frames for legacy loaders
├── attack-b.png             # Drop-in alias strip (3072 × 256px)
└── punch_template_config.json # Machine-readable calibration parameters
```

---

## 3. Geometric Calibration & Anchoring Standard

| Parameter | Value | Description |
|---|---|---|
| **Frame Dimensions** | `256 × 256 px` | Clean square power-of-two grid per frame. |
| **Master Strip Dimensions** | `3072 × 256 px` | 12 horizontal cells of $256 \times 256\text{px}$. |
| **Pivot Anchor `(anchorX, anchorY)`** | `(128, 128)` | True geometric center of curvature and impact epicenter. Aligns 1:1 with fist contact point. |
| **Detonation Core Radius** | `115 px` | Concentric high-pressure shock boundary enveloped in $256 \times 256$ bounds with zero edge clipping. |
| **Scale Formula** | `scale = (fighterRadius / 25.0) * (isHeavy ? 1.25 : 1.0)` | Scales 1:1 with humanoid fighter radius ($r = 25$). |

---

## 4. Mandatory Rendering Rules

1. **Fist Contact Spawning**: Punch impact visual effects MUST spawn at the impact contact point between the attacker's striking fist (`(x: ±r * 0.82, y: +r * 0.38)` rotated into world space) and the opponent's body edge. It must NEVER spawn centered inside the attacker's own body.
2. **Directional Aim Alignment**: The punch impact can be rotated by `hitAngle = Math.atan2(target.y - puncher.y, target.x - puncher.x)` so the supersonic cleave lines (Frames 7–8) slice through the target along the striking vector.
3. **Decoupled World Decay (Rule 25)**: Once spawned, punch impact frames MUST decay at their world-space location even if the punching fighter is hit-paused, moves, or gets interrupted.
4. **Single-Source Hand Standard (Rule 20)**: Fists and hands are drawn strictly via `drawPixelHand` on the character layer; punch VFX frames MUST NOT bake or render extraneous detached hands.

