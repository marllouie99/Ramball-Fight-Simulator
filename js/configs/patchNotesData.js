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
        "character": "AVATAROFEMPTINESS",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "displayName",
                "oldVal": "AVATAR OF EMPTINESS",
                "newVal": "Avatar of Emptiness",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "DRAEDON",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "displayName",
                "oldVal": "DRAEDON",
                "newVal": "Draedon",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "NAOYA",
        "deltas": [
            {
                "type": "BUFF",
                "key": "moveSpeed",
                "oldVal": 10.6,
                "newVal": 12.6,
                "pct": "+18.9%"
            },
            {
                "type": "NERF",
                "key": "maxFrameStacks",
                "oldVal": 30,
                "newVal": 15,
                "pct": "-50.0%"
            },
            {
                "type": "BUFF",
                "key": "maxDisruptionsForStasis",
                "oldVal": 3,
                "newVal": 20,
                "pct": "+566.7%"
            },
            {
                "type": "NERF",
                "key": "basicComboHits",
                "oldVal": 30,
                "newVal": 20,
                "pct": "-33.3%"
            },
            {
                "type": "NERF",
                "key": "tantoCooldown",
                "oldVal": 40,
                "newVal": 500,
                "pct": "+1150.0%"
            },
            {
                "type": "BUFF",
                "key": "maxStacksPerFlurry",
                "oldVal": 4,
                "newVal": 5,
                "pct": "+25.0%"
            },
            {
                "type": "NERF",
                "key": "ultPostStrikeBreatherFrames",
                "oldVal": 100,
                "newVal": 24,
                "pct": "-76.0%"
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
