# Shiro — The Queen of Elkia (『　　』 Blank)

**Category:** Anime & Mastermind / *No Game No Life*  
**Theme Color:** Royal Violet (`#8B5CF6`), Lavender (`#A855F7`), Tactical Cyan (`#38BDF8`), Elkia Gold (`#FCD34D`), and Pastel Magenta (`#EC4899`)  
**Role:** Tactical Center-Board Controller, Chessboard Vector Tactician, RNG Chess Troop Gacha Mastermind  

---

## 📖 Lore & Character Philosophy

**Shiro** (白) is the 11-year-old chess grandmaster and computational prodigy of the undefeated gaming duo **『　　』 (Blank / Kūhaku)** alongside her brother Sora. Having solved chess completely and able to calculate all $10^{120}$ possible game variations, Shiro rules as the Queen of Elkia (Imanity) in **Disboard**—a world governed by the god Tet under the **Ten Pledges (Aschente)**.

In the *Circle Mini-Battle* arena, Shiro wields the ultimate **Living Chess Troop Summoner mechanics**: flicking calculated **Living Chess Troops** (Pawns, Knights, Bishops, Rooks, and rare Jackpot Queens) across the board, executing an authentic 1-by-1 turn-based chess decision matrix, commanding the arena center, and illuminating the classic Black & White Disboard floor grid with cardinal and diagonal threat rays.

> *"『　　』 (Blank) never loses. Chess is just a game of calculation — and in calculation, I have never been defeated. Aschente!"*

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard & Rule 24 Toji Baseline)
Shiro's body model, voluminous flowing hair silhouette, and attire strictly adhere to the repository upright pixel-art rasterization standard ($P = 2.0\text{px}$ offscreen canvas buffer architecture):

* **Head & Hair Zone (`-Y` to `Y ~ 0` / Zone 1 Dome)**:
  * **Flowing Anime Hair (`Assets/model/shiro/shiro-hair.png`)**: Voluminous pastel lavender/white hair (`#FFFFFF` to `#EDE9FE` with `#C4B5FD` shadows and gradient cyan `#38BDF8` / pink `#F472B6` tips) cascading around both flanks with an ahoge at the crown.
  * **Faceless Minimalist Standard (Rule 19 / Rule 3.2)**: Porcelain fair skin dome (`#FFF5EB`) with soft peach side contours (`#FED7AA`). Zero drawn eyes, pupils, nose, or mouth.
  * **Queen's Golden Crown**: Miniature golden Elkia queen crown (`#FCD34D` with ruby jewel `#EF4444` and cyan gems) perched gracefully on the top crown of her hair.
* **Torso & Sailor Fuku (`r * 0.28 <= ry < r * 0.64` / Zone 2)**:
  * Oversized midnight navy sailor uniform (`#1E1B4B` / `#312E81`) with a wide crisp white collar (`#F8FAFC`), cyan trim, and a bright ruby red neckerchief ribbon (`#EF4444`).
* **Waistband & Pleated Skirt (`r * 0.64 <= ry < r * 0.78` / Zone 3)**:
  * Midnight navy pleated skirt with golden hem trim (`#FCD34D`).
* **Thigh-High Stockings & Shoes (`ry >= r * 0.78` / Zone 4)**:
  * Dark navy thigh-high stockings (`#0F172A`) paired with shiny violet Mary Jane shoes (`#6D28D9`).
* **Living Chess Troop Sprite Sheet (`Assets/model/shiro/Pixel Chess Set Sprite Sheet.png`)**:
  * High-fidelity pixel-art chess piece sprite sheet for all 6 Living Chess Troop classes (Pawn, Rook, Knight, Bishop, Queen, King).
  * Smooth discrete nearest-neighbor rendering with individual tactical under-glow auras and procedural vector fallback.
* **Hands & Weapon Stance (Rule 20 Canonical Symmetrical Lower Flank Standard)**:
  * **Left Hand (`x: -r * 0.82, y: +r * 0.38`)**: Holds her golden **Elkia Race King Piece** (`#FCD34D`).
  * **Right Hand (`x: +r * 0.82, y: +r * 0.38`)**: Raised in the tactical **Piece-Flicking Stance** (`#FFF5EB`) with crystalline cyan sparkle trails (`#38BDF8`).

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Notes |
| :--- | :--- | :--- |
| **HP** | `340` | Strategic Mastermind Tactician |
| **Base Speed** | `5.6` | Agile calculated sliding movement |
| **Body Radius** | `25px` | Standard humanoid radius (Rule 24 compliant) |
| **Turn Cadence** | `14 frames (~0.23s)` | Authentic 1-by-1 turn timing between piece attacks |
| **Minion Lifespan** | `Permanent (HP-Based)` | Troops stay on the board indefinitely until destroyed by enemy attacks |
| **Max Active Minions** | `4 troops` | Maximum 4 concurrent living chess pieces defending the board |
| **Board Grid Duration** | `Persistent` | Active illuminated Disboard checkered grid while living troops are on board |
| **Pity / Loaded Dice** | `Every 4th Throw` | Guaranteed high-tier roll (Rook or Queen) after 3 common/uncommon rolls |

---

## ⚡ Chess Mechanics & Living Troops

### 1. 🎯 Authentic 1-by-1 Chess Turn Engine
Living Chess Troops on the board do not attack haphazardly. Shiro evaluates the board state and executes one single coordinated tactical move at a time with dedicated cooldown cadence (`turnCooldown: 14`).

### 2. ♟️ Living Chess Troop Archetypes
* **Pawn (50% Common)**: Flung as straight-line projectile, snaps onto tile center. Attacks diagonally into adjacent enemy squares with thrusting spear thrusts (`14 DMG`, `10 hitstun`).
* **Knight (20% Uncommon)**: Traverses in authentic piecewise $2 \times 1$ $L$-shaped leaps with parabolic $45\text{px}$ jump elevation. Slams down on target tile causing an AOE shockwave (`22 DMG`, `16 hitstun`, screen shake).
* **Bishop (15% Uncommon)**: Bounces off arena walls up to 2 times at 45° angles. Slides diagonally along clear line-of-sight rays to execute double-tapered crescent slashes (`18 DMG`, `12 hitstun`).
* **Rook (10% Rare)**: Sturdy bulwark (`150 HP`). Projects full cardinal cross threat rays (rank & file) and charges in straight orthogonal lines with high-momentum fortress ram impulse (`22 DMG`, `16 hitstun`, knockback push).
* **Queen (5% Legendary Jackpot)**: Champion piece (`130 HP`). Dominates 8-directional royal star rays (rank, file, and diagonals) and unleashes sweeping 8-way whirlwind crescent blades (`34 DMG`, `14 hitstun`).

### 3. 🏁 Black & White Disboard Floor Grid & Threat Reticles
* **Floor Grid**: Classic 8x8 marble white (`rgba(248, 250, 252, 0.22)`) and obsidian black (`rgba(14, 15, 20, 0.52)`) checkered floor. Rendered strictly on the bottom layer pass beneath all fighters.
* **Threat Reticles**: When a piece prepares to attack, its active movement lane, cross rays, waypoint markers, and primary target crosshairs light up exclusively for that attacking piece.
