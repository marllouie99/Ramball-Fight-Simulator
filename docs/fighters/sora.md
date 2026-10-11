# Sora — The King of Elkia (『　　』 Blank)

**Category:** Anime & Mastermind / *No Game No Life*  
**Theme Color:** Radiant Gold (`#F59E0B`), Humanity Yellow (`#FBBF24`), Royal Indigo (`#4338CA`), Crown Amber (`#FCD34D`), Tactical Cyan (`#38BDF8`), and Disboard Magenta (`#EC4899`)  
**Role:** Tactical Center-Board Controller, Chessboard Vector Tactician, RNG Chess Troop Gacha Mastermind  

---

## 📖 Lore & Character Philosophy

**Sora** (空) is the charismatic, brilliant master strategist of the undefeated gaming duo **『　　』 (Blank / Kūhaku)** alongside his sister Shiro. Transported to **Disboard**—a world governed by Tet where all violence is forbidden and every conflict is resolved through games under the **Ten Pledges (Aschente)**—Sora ascends to become the King of Imanity (Elkia).

In the climax of Elkia's tournament (Episodes 1–3), Sora wages an unforgettable battle of **Living Chess** against Kurami Zell, where chess pieces possess literal will, emotions, and combat prowess. Through sheer battlefield charisma, probability manipulation, and tactical foresight, Sora turns low-probability gambits into guaranteed victory.

In the *Circle Mini-Battle* arena, Sora wields the ultimate **Chess Ball & RNG Gacha Mastermind mechanics**: drawing and throwing random **Living Chess Troops** (Pawns, Knights, Bishops, Rooks, and rare Jackpot Queens), commanding the arena center, projecting the vibrant Disboard checkered grid, leaping in $L$-shaped Knight vectors, and declaring an inescapable **"Aschente: Checkmate!"**.

> *"『　　』 (Blank) never loses. In this world governed by games, the weak are the ones with infinite possibilities. Roll the dice, play your hand — Aschente!"*

---

## 🎨 Visual Design & Rendering Standards

### 1. Upright Fighter Body Model (Rule 19 Front POV Standard & Rule 24 Toji Baseline)
Sora's body model, vibrant spiky hair silhouette, and attire strictly adhere to the repository upright pixel-art rasterization standard ($P = 2.0\text{px}$ offscreen canvas buffer architecture):

* **Head & Hair Zone (`-Y` to `Y ~ 0` / Zone 1 Dome)**:
  * **Spiky Gamer Hair (`Assets/model/sora/sora-hair.png`)**: Wild, spiky golden-amber anime hair (`#F59E0B` base with `#D97706` shadow locks and `#FCD34D` radiant crown tips) framing the forehead with energetic anime spikes.
  * **Faceless Minimalist Standard (Rule 19 / Rule 3.2)**: Warm fair skin dome (`#FFF0DE`) with soft side cheek contours (`#F5D0A9`). Zero drawn eyes, pupils, nose, or mouth.
  * **Elkia Crown Accessory**: A regal golden miniature crown (`#FCD34D` with `#F59E0B` jewels) worn stylishly around his left upper arm / sleeve collar.
* **Torso & T-Shirt (`r * 0.28 <= ry < r * 0.64` / Zone 2)**:
  * Vibrant yellow loose t-shirt (`#FBBF24`) layered over a royal indigo/deep violet long-sleeve undershirt (`#4338CA` to `#312E81`).
  * Chest emblem: Crisp pixel-art representation of the iconic **"I ❤️ 人類"** (I ❤️ Humanity) print.
* **Waistband & Trousers (`ry >= r * 0.64` / Zone 3 & 4)**:
  * Dark burgundy/slate trousers (`#475569` / `#334155`) with folded cuffs and lightweight yellow running sneakers.
* **Hands & Weapon Stance (Rule 20 Canonical Symmetrical Lower Flank Standard)**:
  * **Left Hand (`x: -r * 0.82, y: +r * 0.38`)**: Holds his velvety **Gacha Chess Piece Pouch / Elkia Race Piece** (`#FCD34D` marble core with glowing cyan aura).
  * **Right Hand (`x: +r * 0.82, y: +r * 0.38`)**: Raised in the iconic two-finger **"Aschente" Pledge Stance** (`#FFF0DE`), flicking random drawn chess pieces with tactical sparkle trails.

---

## 🛡️ Baseline Stats

| Attribute | Base Value | Notes |
| :--- | :--- | :--- |
| **HP** | `340` | Strategic Mastermind Brawler |
| **Base Speed** | `5.6` | Agile calculated sliding movement |
| **Body Radius** | `25px` | Standard humanoid radius (Rule 24 compliant) |
| **Center Dash Velocity** | `28.0 px/frame` | Instantaneous slide to `(arena.centerX, arena.centerY)` |
| **Pawn Range / Speed** | `450px` / `18.0 px/frame` | High-velocity straight-line Pawn piece projectiles |
| **Minion Troop Lifespan** | `Permanent (HP-Based)` | Troops stay on the board indefinitely until destroyed by enemy attacks |
| **Max Active Minions** | `4 troops` | Maximum 4 concurrent living chess pieces defending the board |
| **Board Grid Duration** | `Persistent` | Active illuminated Disboard checkered grid while living troops are on board |
| **Pity / Loaded Dice** | `Every 4th Throw` | Guaranteed high-tier roll (Rook or Queen) after 3 common/uncommon rolls |

---

## ⚡ Passives & Inherent Mechanics

### 1. 🎯 Center-Board Dominance (*Chūō Shihai — 中央支配*)
Whenever Sora activates any special skill or defensive maneuver:
* Sora instantly performs a high-speed crouched slide directly to the **exact center of the arena** (`arena.x + width / 2, arena.y + height / 2`).
* An illuminated $8 \times 8$ classic checkered **Black & White Chessboard** (deep obsidian black `rgba(14, 15, 20, 0.52)` and pure ivory white `rgba(248, 250, 252, 0.22)`) illuminates the arena floor.
* While occupying the center zone (within 45px of center), Sora gains:
  * **Omnidirectional Aiming:** Basic attacks automatically track and predict the nearest opponent's velocity vector.
  * **Damage Reduction:** `20% Poise / Super-Armor` against incoming knockback.

---

### 2. 🎲 Probability Calculation & Loaded Dice (*Kakuritsu Sōsa — 確率操作*)
* Sora calculates odds in real-time. Every standard basic attack throw adds `+25%` to his **Loaded Dice Pity Meter**.
* **Pity Roll Guarantee**: On every 4th throw (or when landing a full combo), the next piece drawn is guaranteed to be a **Rare Rook (♜)** or **Legendary Queen (♛)** with an audible golden dice roll chime!

---

### 3. 🧠 『　　』 (Blank) Never Loses (*Kūhaku wa Haiboku Shinai — 『　　』は敗北しない*)
* Opponents that cross active chess trajectory lines (Rook cardinal beams, Bishop diagonals, or Knight landing zones) are tagged with the **"Check!" (*Oute — 王手*)** debuff for 3 seconds, taking `+20% bonus damage` from all chess piece strikes and suffering increased hit-stun.

---

## ⚔️ Active Skills & Moveset

### 🎲 Basic Attack: RNG Chess Troop Gacha Throw (*Gacha Fu no Shōkan — ガチャ歩の召喚*)
* **Type**: RNG Weighted Projectile Draw ➔ Permanent Living Tactical Minion (HP-Based)
* **Cooldown**: `75 frames` (~1.25s deliberate turn cadence)
* **Minion Lifespan**: **Permanent until destroyed** by enemy damage / projectiles
* **Max Concurrency**: `4 active minions` maximum on screen
* **Tile-Center Planting Snap**: Upon striking an enemy (or landing), the projectile automatically snaps and plants squarely at the **exact center of the nearest unoccupied 8x8 chessboard tile**, maintaining clean grid alignment!
* **Friendly Tile Occupancy & Line-of-Sight Blocking**:
  * **Zero Friendly Stacking**: Troops cannot move to, land on, or capture a square already occupied by another friendly living piece.
  * **Line-of-Sight Obstruction**: Sliding linear pieces (**Bishop, Rook, Queen**) cannot pass through or jump over intervening friendly pieces.
  * **Knight Jumping Exception**: As in authentic chess, the **Knight** leaps over intermediate obstacles, but cannot land on an occupied friendly square.
* **Authentic 1-by-1 Chess Move Turn Cadence & Focused Attack-Only Tile Reticles**:
  * Just like authentic chess where players move pieces one at a time, living troops execute attacks **strictly 1-by-1**.
  * If multiple pieces simultaneously threaten an opponent's tile, only the single highest-priority piece (Queen > Rook > Bishop > Knight > Pawn) initiates its move.
  * While any piece is actively moving, all other pieces hold position until the active piece completes its move, followed by a brief turn cadence (`turnCooldown: 14`).
  * **Zero Idle Clutter**: Highlighted tile reticles and trajectory rays are rendered **exclusively for the piece that is actively executing an attack**, keeping the board crisp and clean during idle periods.

When Sora uses his basic attack, he flicks a **randomly drawn Chess Piece** from his reserve with distinct projectile physics and permanent stationary minion behaviors:

```
[ Sora Basic Attack: Gacha Piece Draw ]
  ├── ♙ Pawn    (50% Common)    ➔ Straight shot ➔ Permanent Pawn (60 HP / Diagonal lunge capture)
  ├── ♞ Knight  (20% Uncommon)  ➔ Arcing L-hop ➔ Permanent Knight (80 HP / 8 L-tile leap slam)
  ├── ♝ Bishop  (15% Uncommon)  ➔ 45° Diagonal bounce ➔ Permanent Bishop (75 HP / Diagonal glide slice)
  ├── ♜ Rook    (10% Rare)      ➔ Heavy piercing ram ➔ Permanent Rook (150 HP Bulwark / Cardinal charge ram + shields)
  └── ♛ Queen   ( 5% Jackpot!)  ➔ Golden homing star ➔ Permanent Queen (130 HP / 8-Way royal glide whirlwind)
```

#### Detailed Breakdown of the 5 Chess Troop Pieces:

1. **♙ Pawn (50% Chance — Common)**:
   * **Projectile**: Fast straight-line ivory shot (`12 damage`, `speed: 18 px/frame`).
   * **Living Minion (60 HP — Diagonal Lunge Capture)**: Stands firmly on its tile when idle. When an enemy steps into its **4 diagonal neighbor tiles**, lunges physically into the enemy's square with a **Diagonal Capture Strike** (`14 damage`, `10f stun`), capturing the tile.
2. **♞ Knight (20% Chance — Uncommon)**:
   * **Projectile**: Arcing high lob that hops clean over ground obstacles (`18 damage`).
   * **Living Minion (80 HP — Piecewise L-Jump Leap Slam)**: Stands firmly on its square when idle. When an enemy steps onto any of its **8 valid L-jump tiles** (`dCol=1, dRow=2` or `dCol=2, dRow=1`), the Knight vaults along a true piecewise 2-segment $L$-shaped aerial trajectory (traveling 2 squares along its major axis to a corner waypoint, turning $90^\circ$, then traveling 1 square along its minor axis to the target tile) with a dashed glowing waypoint trail and parabolic jump height ($Z = 45\text{px}$), landing with an explosive ground slam (`22 damage`, `16f knockup stun`, screen shake).
3. **♝ Bishop (15% Chance — Uncommon)**:
   * **Projectile**: High-velocity shot that ricochets off arena walls at $45^\circ$ angles (`16 damage`).
   * **Living Minion (75 HP — Diagonal Glide Slice)**: Stands firmly on its square when idle. When an enemy enters any square along its **4 diagonal rays** (`dCol === dRow`), glides at high speed along the diagonal directly into the enemy's square with a crescent blade slice (`18 damage`, `12f stun`), taking the new square.
4. **♜ Rook (10% Chance — Rare)**:
   * **Projectile**: Heavy piercing castle battlement that punches straight through all entities (`24 damage`, heavy knockback).
   * **Living Minion (150 HP — Cardinal Charge Ram)**: Stands firmly on its square when idle while blocking incoming enemy linear projectiles. When an enemy enters its **row or column**, charges at high speed along the rank/file into the enemy's square with a devastating battering ram strike (`24 damage`, heavy knockback push).
5. **♛ Queen (5% Chance — Jackpot!)**:
   * **Projectile**: Radiant golden homing star trailing rainbow Disboard sparkles (`28 damage`).
   * **Living Minion (130 HP — Royal Glide Whirlwind)**: Stands firmly on her royal square when idle. When an enemy enters any tile along **Queen lines** (cardinals or diagonals), glides instantaneously across the board into the enemy's square, executing an omnidirectional whirlwind slice (`34 damage`, `14f stun`).

---

## 🔊 Audio & Sound Design

| Sound Event | Sound Description / Asset Target |
| :--- | :--- |
| **Gacha Piece Flick** | Fast shuriken / card flick sound (`Assets/Sound Effects/Attacks/shurikenthrow.mp3`) |
| **Tile Snap / Plant** | Crisp marble chess piece snapping onto the board (`chess_snap.mp3`) |
| **Loaded Dice Chime** | Shimmering dice roll chime (`dice_roll.mp3`) |
| **Jackpot Queen Chime** | Rare golden fanfare chime (`queen_jackpot.mp3`) |
| **Pawn Thrust** | Sharp rapier blade thrust (`pawn_thrust.mp3`) |
| **Knight Stomp** | Heavy thunderous marble impact shockwave (`knight_slam.mp3`) |
| **Queen Whirlwind Slice** | Resonant magical ring slash (`queen_slice.mp3`) |

---

## 🔄 Special Fighter Interactions

* **The Conductor (Roblox Ball vs Ball)**: Sora challenges The Conductor to a strategic duel. When The Conductor lays perimeter railway tracks, Sora's planted Rook and Bishop minions shoot across the tracks, while Queen minions intercept the train head-on!
* **Gojo Satoru (Limitless Infinity)**: Sora analyzes Infinity's spatial barrier and uses Bishop diagonal snipes and Queen multi-directional slashes to test its limits.
* **Saitama**: Sora analyzes Saitama's stats and declares: *"A raid boss with impossible stats... our favorite kind of puzzle!"*, commanding all 5 pieces to swarm Saitama simultaneously.

---

## 📁 File Structure & Registration Plan

When implementing Sora into the engine, the following files will be created/updated:

1. **Config**: `js/configs/characters/soraConfig.js` (Stats, RNG drop rates, 3.0s minion lifetimes, cooldowns, audio paths).
2. **Entity Class**: `js/entities/fighters/SoraFighter.js` (Center-dash AI, RNG piece draw manager, living chess troop entities, pity counter).
3. **Renderer & Skin**: `js/graphics/fighters/soraSkin.js` (Toji-standard body model, "I ❤️ Humanity" yellow shirt, crown armband, race piece hands).
4. **VFX & Board Graphics**: `js/graphics/weapons/soraChessGraphics.js` (Checkered Disboard grid renderer, 5 animated Chess Troop sprites, beam crosses).
5. **Hair Asset**: `Assets/model/sora/sora-hair.png` (Spiky golden-amber anime hair).
6. **Factory & Registry**: `js/entities/factories/fighterFactory.js` and `js/core/config.js`.
