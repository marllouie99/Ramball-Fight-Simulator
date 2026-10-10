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
        "character": "ENGINEER",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "shotgunDamage",
                "oldVal": "5.20",
                "newVal": "2.20",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "dispenserTickInterval",
                "oldVal": 30,
                "newVal": 10,
                "pct": "-66.7%"
            }
        ]
    },
    {
        "character": "GENOS",
        "deltas": [
            {
                "type": "NERF",
                "key": "ultBeamWidth",
                "oldVal": 150,
                "newVal": 130,
                "pct": "-13.3%"
            }
        ]
    },
    {
        "character": "GOJO",
        "deltas": [
            {
                "type": "NERF",
                "key": "initialMeleeDuration",
                "oldVal": 120,
                "newVal": 100,
                "pct": "-16.7%"
            }
        ]
    },
    {
        "character": "MAHORAGA",
        "deltas": [
            {
                "type": "BUFF",
                "key": "enableThrowBarrage",
                "oldVal": 0,
                "newVal": 1,
                "pct": "+0%"
            }
        ]
    },
    {
        "character": "MAKIMA",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "citizenReviveHpPercent",
                "oldVal": "0.70",
                "newVal": "1.00",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "bangCooldown",
                "oldVal": 300,
                "newVal": 380,
                "pct": "+26.7%"
            }
        ]
    },
    {
        "character": "RUBBICK",
        "deltas": [
            {
                "type": "BUFF",
                "key": "spellStealCastDelay",
                "oldVal": 45,
                "newVal": 300,
                "pct": "+566.7%"
            }
        ]
    },
    {
        "character": "SANS",
        "deltas": [
            {
                "type": "BUFF",
                "key": "dodgeStaminaCost",
                "oldVal": 2,
                "newVal": 10,
                "pct": "+400.0%"
            },
            {
                "type": "BUFF",
                "key": "basicBoneCooldown",
                "oldVal": 100,
                "newVal": 50,
                "pct": "-50.0%"
            },
            {
                "type": "NERF",
                "key": "blasterCooldown",
                "oldVal": 320,
                "newVal": 500,
                "pct": "+56.3%"
            },
            {
                "type": "BUFF",
                "key": "blasterSpawnInterval",
                "oldVal": 4,
                "newVal": 6,
                "pct": "+50.0%"
            },
            {
                "type": "NERF",
                "key": "gravitySlamCooldown",
                "oldVal": 580,
                "newVal": 800,
                "pct": "+37.9%"
            }
        ]
    },
    {
        "character": "SUKUNA",
        "deltas": [
            {
                "type": "NERF",
                "key": "initialMeleeDuration",
                "oldVal": 150,
                "newVal": 100,
                "pct": "-33.3%"
            }
        ]
    },
    {
        "character": "URYU",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "hair",
                "oldVal": "Assets/model/uryu/Uryu-ishida.png",
                "newVal": "Assets/model/uryu/Ishida-hair.png",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "YUJI",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "soulSwapDamageMultiplier",
                "oldVal": "2.0",
                "newVal": "1.2",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "soulSwapFugaDamage",
                "oldVal": 220,
                "newVal": 150,
                "pct": "-31.8%"
            }
        ]
    },
    {
        "character": "ZENITSU",
        "deltas": [
            {
                "type": "NERF",
                "key": "thunderclapFinisherDamage",
                "oldVal": 50,
                "newVal": 30,
                "pct": "-40.0%"
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
