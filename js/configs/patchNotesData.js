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
        "character": "DENJI",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "speed",
                "oldVal": "5.8",
                "newVal": "6.0",
                "pct": "Mod"
            },
            {
                "type": "BUFF",
                "key": "r",
                "oldVal": 25,
                "newVal": 26,
                "pct": "+4.0%"
            },
            {
                "type": "NERF",
                "key": "damage",
                "oldVal": 24,
                "newVal": 5,
                "pct": "-79.2%"
            },
            {
                "type": "ADJUST",
                "key": "enablePochitaRevive",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "enableHemorrhage",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "ruptureDamage",
                "oldVal": 28,
                "newVal": 10,
                "pct": "-64.3%"
            },
            {
                "type": "NERF",
                "key": "shredDamagePerTooth",
                "oldVal": 5,
                "newVal": 3,
                "pct": "-40.0%"
            },
            {
                "type": "NERF",
                "key": "shredHitPauseFrames",
                "oldVal": 3,
                "newVal": 2,
                "pct": "-33.3%"
            }
        ]
    },
    {
        "character": "MAKIMA",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "maxHpRatio",
                "oldVal": "1.00",
                "newVal": "0.50",
                "pct": "Mod"
            },
            {
                "type": "BUFF",
                "key": "damage",
                "oldVal": 40,
                "newVal": 50,
                "pct": "+25.0%"
            },
            {
                "type": "ADJUST",
                "key": "citizenReviveHpPercent",
                "oldVal": "0.50",
                "newVal": "1.00",
                "pct": "Mod"
            },
            {
                "type": "BUFF",
                "key": "bangDamage",
                "oldVal": 40,
                "newVal": 70,
                "pct": "+75.0%"
            },
            {
                "type": "ADJUST",
                "key": "chainVoiceline",
                "oldVal": "3.5",
                "newVal": "2.0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "crucifixionVoiceline",
                "oldVal": "3.2",
                "newVal": "2.0",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "REZE",
        "deltas": [
            {
                "type": "NERF",
                "key": "punchDamage",
                "oldVal": 18,
                "newVal": 10,
                "pct": "-44.4%"
            },
            {
                "type": "BUFF",
                "key": "rocketCooldown",
                "oldVal": 800,
                "newVal": 200,
                "pct": "-75.0%"
            },
            {
                "type": "NERF",
                "key": "rocketHitDamage",
                "oldVal": 35,
                "newVal": 30,
                "pct": "-14.3%"
            },
            {
                "type": "ADJUST",
                "key": "hybridLifestealPercent",
                "oldVal": "0.35",
                "newVal": "0.10",
                "pct": "Mod"
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
