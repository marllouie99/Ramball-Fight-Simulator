// ─────────────────────────────────────────────
// Ramball Fight Simulator — Live Patch Notes Data Store
// Automatically updated by: npm run patch-notes
// ─────────────────────────────────────────────

export const patchNotesData = {
  version: 'v2.5.0',
  date: 'OCTOBER 2026',
  title: 'VOID TITAN & LIVE BALANCE UPDATES',
  description: 'Ender Dragon Boss Battle, modular Katana assembly, Escanor Cruel Sun VFX, and live combat tuning.',
  highlights: [
    {
        "tag": "NEW",
        "type": "new",
        "title": "Ender Dragon Articulated Tail & Flight Animation",
        "desc": "Added 6-frame articulated tail sprite sheet with rear spine socket anchoring, dynamic swishing physics, and swooping afterimages."
    },
    {
        "tag": "REWORK",
        "type": "rework",
        "title": "Modular Katana Assembly (Weapon Studio)",
        "desc": "Granular sub-part tuning for Zenitsu's Nichirin blade across Nagasa (Blade), Tsuba (Guard), Habaki (Collar), Tsuka (Handle), and grip spacing."
    },
    {
        "tag": "VFX",
        "type": "vfx",
        "title": "Escanor Cruel Sun & Solar Poise",
        "desc": "6-frame sprite animations, ambient arena floor lighting, and total immunity to gravitational vortexes and suction fields while channeling."
    }
],
  balanceChanges: [
    {
        "character": "CRAZYDAVE",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "wallnutSpriteSrc",
                "oldVal": "Assets/model/Sprites/Wallnut-sprite-sheet.png",
                "newVal": "Assets/model/crazyDave/Wallnut-sprite-sheet.png",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "torchwoodSpriteSrc",
                "oldVal": "Assets/model/Sprites/torchwood-sprite-sheet.png",
                "newVal": "Assets/model/crazyDave/torchwood-sprite-sheet.png",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "potatoMineSpriteSrc",
                "oldVal": "Assets/model/Sprites/potato-mine-sprite-sheet.png",
                "newVal": "Assets/model/crazyDave/potato-mine-sprite-sheet.png",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "lawnmowerSpriteSrc",
                "oldVal": "Assets/model/Sprites/lawnmower-sprite-sheet.png",
                "newVal": "Assets/model/crazyDave/lawnmower-sprite-sheet.png",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "lawnmowerSpriteSrc",
                "oldVal": "Assets/model/Sprites/lawnmower-sprite-sheet.png",
                "newVal": "Assets/model/crazyDave/lawnmower-sprite-sheet.png",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "potatoMineSpriteSrc",
                "oldVal": "Assets/model/Sprites/potato-mine-sprite-sheet.png",
                "newVal": "Assets/model/crazyDave/potato-mine-sprite-sheet.png",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "GENOS",
        "deltas": [
            {
                "type": "BUFF",
                "key": "ultBeamWidth",
                "oldVal": 60,
                "newVal": 140,
                "pct": "+133.3%"
            }
        ]
    },
    {
        "character": "MAHITO",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "maceSmash",
                "oldVal": "Assets/Sound Effects/Attacks/groundsmash.mp3",
                "newVal": "Assets/Sound Effects/Attacks/groundSmash.mp3",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "MAKIMA",
        "deltas": [
            {
                "type": "NERF",
                "key": "crucifixionCooldown",
                "oldVal": 1000,
                "newVal": 2000,
                "pct": "+100.0%"
            },
            {
                "type": "NERF",
                "key": "crucifixionRift",
                "oldVal": 1.25,
                "newVal": 0,
                "pct": "-100.0%"
            }
        ]
    },
    {
        "character": "NAOYA",
        "deltas": [
            {
                "type": "BUFF",
                "key": "maxFrameStacks",
                "oldVal": 5,
                "newVal": 20,
                "pct": "+300.0%"
            },
            {
                "type": "ADJUST",
                "key": "movementAfterimageShockwaves",
                "oldVal": "true",
                "newVal": "false",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "maxDisruptionsForStasis",
                "oldVal": 20,
                "newVal": 1,
                "pct": "-95.0%"
            },
            {
                "type": "NERF",
                "key": "basicComboHits",
                "oldVal": 20,
                "newVal": 10,
                "pct": "-50.0%"
            },
            {
                "type": "BUFF",
                "key": "punchDamage",
                "oldVal": 4,
                "newVal": 5,
                "pct": "+25.0%"
            },
            {
                "type": "BUFF",
                "key": "tantoComboFinisherDamage",
                "oldVal": 18,
                "newVal": 30,
                "pct": "+66.7%"
            },
            {
                "type": "BUFF",
                "key": "enableSonicKick",
                "oldVal": 0,
                "newVal": 1,
                "pct": "+0%"
            },
            {
                "type": "BUFF",
                "key": "runwayAfterimageShockwave",
                "oldVal": 0.85,
                "newVal": 1.85,
                "pct": "+117.6%"
            }
        ]
    },
    {
        "character": "SUKUNA",
        "deltas": [
            {
                "type": "BUFF",
                "key": "divineFlameExplosionRadius",
                "oldVal": 200,
                "newVal": 400,
                "pct": "+100.0%"
            }
        ]
    }
],
  engineNotes: [
    {
        "tag": "PERF",
        "type": "perf",
        "title": "Zero Layout Thrashing (Weapon & Skin Studio)",
        "desc": "Cached DOM bounding rects during dragging; fixed 13px vertical discrepancy in drag handle registration for butter-smooth 60 FPS live tuning."
    },
    {
        "tag": "SYSTEM",
        "type": "ai",
        "title": "AI Agent Design & Quality Skills",
        "desc": "Configured workspace playbooks: <code>improve-ui</code>, <code>fixing-motion-performance</code>, <code>baseline-ui</code>, and <code>patch-notes-generator</code>."
    }
]
};
