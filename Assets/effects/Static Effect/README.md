# ⚡ Canonical 12-Frame Static Electricity Effect Animation Template

**Location**: `Assets/effects/Static Effect/`  
**Reference Source**: `C:\Users\asus\OneDrive\Documents\Gani References\1OQOh2.gif` (Graal VFX 6 Lightning Effect)  
**Standards**: Rule 25 (Non-Freezing Particle Decay), Rule 26 (Anti-Cobweb Concentric Shockwaves) & 12-Frame Visual Animation Standard

---

## 1. Overview & Purpose
This directory contains the universal, gold-standard **12-frame animated static electricity effect template** extracted and calibrated directly from the canonical Graal reference `1OQOh2.gif`.

It features sharp, stylized, jagged anime lightning arcs with a luminous white-hot electric core filament (`#FFFFFF`) and vibrant colored ionization aura that crackles dynamically around an afflicted entity's body perimeter ($r = 25\text{px}$).

---

## 2. Directory Structure & Files
```text
Assets/effects/Static Effect/
├── static-1.png ... static-12.png           # Cyan electric frames (Zeus / Default)
├── static-b.png                             # Master horizontal atlas strip (3072 × 256px)
├── static-gold-1.png ... static-gold-12.png # Golden lightning frames (Zenitsu)
├── static-gold-b.png                        # Master golden horizontal atlas strip (3072 × 256px)
├── static-dual-1.png ... static-dual-12.png # Dual-color frames directly from 1OQOh2.gif
├── static-dual-b.png                        # Master dual-color atlas strip (3072 × 256px)
├── explosion-1.png ... explosion-12.png      # Drop-in aliases for legacy 12-frame loaders
├── explosion-b.png                          # Drop-in alias strip (3072 × 256px)
├── static_effect_config.json                # Machine-readable calibration parameters
└── README.md                                # Documentation & usage specifications
```

---

## 3. Geometric Calibration & Anchoring Standard

| Parameter | Value | Description |
|---|---|---|
| **Frame Dimensions** | `256 × 256 px` | Clean square power-of-two grid per frame cell. |
| **Master Strip Dimensions** | `3072 × 256 px` | 12 horizontal cells of $256 \times 256\text{px}$. |
| **Epicenter Anchor `(cx, cy)`** | `(128, 128)` | Center of the electrical field. Aligns 1:1 with fighter body center `(x, y)`. |
| **Entity Base Radius** | `25.0 px` | Calibrated to fit standard humanoid body circles ($r = 25\text{px}$). |
| **Render Scale Formula** | `drawSize = (fighterRadius * 3.20)` | Envelops the body circle ($80\text{px}$ box for $r=25$), with lightning bolts hugging the crown, flanks, and base. |
| **Draw Anchor Offsets** | `(-drawSize / 2, -drawSize / 2)` | Centers the sprite perfectly over the entity. |
| **Cadence Speed** | $\approx 30\text{ FPS}$ ($33\text{ms/frame}$) | Derived from `performance.now()` (`const frameIndex = Math.floor((now * 0.030) % 12)`). |

---

## 4. The 12-Phase Electric Cycle Progression (From 1OQOh2.gif)

| Frame | Electrical Phase | Visual Features | Loop Cadence |
|---|---|---|---|
| **1** | Left Flank Strike | Single sharp Z-shaped lightning bolt crackling along the left flank. | Initial charge |
| **2** | Left Flank Jitter | Lightning bolt jitters with intense white core along left body edge. | High voltage |
| **3** | Lower-Left Arc | Curved lightning arc leaping around the lower-left flank. | Orbiting arc |
| **4** | Dual Crown & Cleave | Intense dual strike: upper crown bolt over head + large jagged burst across lower torso. | Dual burst |
| **5** | Peak Cross-Body Cleave | Peak electrical burst with multi-fork lightning enveloping top and bottom. | Maximum voltage |
| **6** | Discharge & Decay | Electrical discharge sustains high luminance across upper and lower fields. | Field ionization |
| **7** | Crown-Right Bolt | Sharp jagged bolt snapping at the top-right crown of the head. | Leaping discharge |
| **8** | Right Crown Vibration | Crown bolt vibrates and shifts angle along right shoulder perimeter. | Voltage ripple |
| **9** | Twin Flank Bolts | Twin electric bolts leaping simultaneously at right flank and bottom flank. | Bifurcated snap |
| **10** | Floor Zigzag Arc | Jagged horizontal lightning bolt crackling along the feet / arena floor. | Grounding arc |
| **11** | Floor Arc Jitter | Floor arc contracts with localized spark nodes. | Grounding jitter |
| **12** | Bottom-Right Exit Bolt | Final electric snap at bottom-right, seamlessly looping back into Frame 1! | Loop reset |
