# 🥋 Ramball Fight Simulator (Circle Mini-Battle)

A fast-paced, physics-driven 2D arena combat simulator featuring **53 playable anime fighters, sorcerers, brawlers, and tactical operatives**. Built with a high-performance **Canvas 2D + PixiJS WebGL Hybrid Engine** designed specifically for smooth 60 FPS gameplay, desktop play, and 9:16 vertical OBS screen capture.

---

## 🚀 Quick Start & How to Play

You can run Ramball Fight Simulator in **Electron Desktop App** mode or directly in your **Web Browser**:

### Option 1: Desktop App (Electron — Recommended)
```bash
# 1. Clone or download this repository
git clone https://github.com/marllouie99/Ramball-Fight-Simulator.git
cd Ramball-Fight-Simulator

# 2. Install dependencies
npm install

# 3. Launch the game
npm start
```

### Option 2: Web Browser, Phones & Tablets (Cross-Device)
*Note: Because this project uses modern ES6 modules, opening `index.html` via double-click (`file://`) will be blocked by browser CORS security. Always run with a local web server:*

```bash
# Start web server accessible on your local network
npx serve -l 8000 .

# OR using Python
python server.py
# (or python -m http.server 8000)
```

- **Desktop**: Open `http://localhost:8000` in any modern web browser (Chrome, Edge, Firefox, Safari).
- **Phones & Tablets**: Open `http://<YOUR_COMPUTER_IP>:8000` on your mobile device (iOS Safari or Android Chrome) connected to the same Wi-Fi.
- **Install as App (PWA)**: On mobile, tap **Share -> "Add to Home Screen"** (iOS) or **"Install App"** (Android/Chrome) to install it as a standalone, fullscreen native-like app!

---

## 🎮 Controls & Multi-Device Navigation

### Desktop Keyboard & Mouse
| Key / Action | Function |
| :--- | :--- |
| **Mouse / Click** | Select fighters, pick game modes, toggle HUD settings, configure matches |
| **`Esc` / `P`** | Pause / resume match |
| **`R`** | Instant round restart / reset match |
| **`Space` / `Enter`** | Start match / skip face-off screen |
| **`V`** | Toggle dynamic combat camera |
| **`F11`** or **`Alt + Enter`** | Toggle Fullscreen mode |
| **`F10`** | Toggle centered 1920×1080 capture frame (Electron) |
| **Top Window Header** | Click & drag anywhere along the top 50px to reposition window (Electron only) |

### Mobile & Touch Controls
| Control | Action |
| :--- | :--- |
| **Tap Anywhere** | Instant responsive button clicks & character selection |
| **Tap during Face-Off** | Skip intro straight to arena fight countdown |
| **Touch Drag** | Smoothly drag and reposition the in-game Pause Menu on screen |
| **Floating Quick Bar ⏸ / ▶** | Pause / resume active combat |
| **Floating Quick Bar 🔄** | Restart current round / rematch |
| **Floating Quick Bar ⛶** | Toggle browser fullscreen for immersive mobile gameplay |
| **Floating Quick Bar 🎥** | Toggle dynamic combat camera |
| **Floating Quick Bar 🔊 / 🔇** | Mute or unmute all sound effects and BGM |

---

## ⚔️ Game Modes

- **🥊 1 VS 1**: Classic arcade best-of-3 duel with round announcements and tactical AI.
- **👥 2 VS 2 & 1 VS 2 Stand-Off**: Team battles with shared targeting, friendly-fire safeguards, and tag assistance.
- **🔄 3 VS 3 Tag Match (Relay)**: Team relay mode where defeated fighters are dynamically tagged out and replaced by bench fighters in real time.
- **🎯 Tactical Force 4 VS 4**: Tactical military operatives with firearms, recoil physics, bullet calibers, ammo reloads, and CS-style killfeeds.
- **🌪️ FFA (Free-For-All)**: Chaotic battle royale with up to 8 combatants.

---

## 🌟 Playable Roster (53 Characters)

- **Jujutsu Sorcerers & Curses**: Gojo Satoru, Ryomen Sukuna, Yuta Okkotsu & Rika, Toji Fushiguro, Mahoraga, Mahito, Aoi Todo, Yuji Itadori, Kento Nanami, Megumi Fushiguro, Nobara Kugisaki.
- **Anime Legends & Brawlers**: Saitama (Caped Baldy), Ichigo Kurosaki, Genos, Escanor, Denji (Chainsaw Man), Makima, Reze (Bomb Devil), Power, Tanjiro, Nezuko, Zenitsu, Inosuke, Ulquiorra, Uryu Ishida.
- **Tactical Operatives & Icons**: Carl Johnson (CJ - GTA San Andreas), John Wick, Musashi Miyamoto, Layla, Knight, Engineer, Bomber, Grenadier, Rubbick, Zeus, and many more.

---

## 🛠️ Testing & Development

This repository includes a strict integrity and simulation test suite:

```bash
# Run full codebase verification (syntax, brace balance, declarations + fighter tests)
npm run verify

# Run fighter simulation test suite across all 53 character classes
npm test

# Run 3v3 Tag Match relay tests
npm run test:tag

# Build Windows portable / installer executable
npm run build
```

---

## 📁 Project Architecture

```text
├── Assets/                 # Sprites, sound effects, BGM, and visual assets
├── css/                    # Game styles, HUD layouts, and UI animations
├── js/
│   ├── core/               # State manager, game flow, mode configs, and loop
│   ├── entities/           # Base Fighter class, AI systems, and character scripts
│   ├── graphics/           # Canvas 2D / WebGL renderers, HUD cards, particles, VFX
│   └── systems/            # Physics, projectile pools, collision grids, audio
├── scripts/                # Automated verification and runtime simulation test suites
├── electron-main.js        # Electron desktop wrapper and OBS optimization hooks
└── index.html              # Main HTML5 game interface
```

---

## 📄 License
ISC License — Developed for mini-battle simulations and entertainment.
