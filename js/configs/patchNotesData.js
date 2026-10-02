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
        "character": "CJ",
        "deltas": [
            {
                "type": "NERF",
                "key": "jetpackUziBulletDamage",
                "oldVal": 5,
                "newVal": 2,
                "pct": "-60.0%"
            },
            {
                "type": "NERF",
                "key": "driveByBulletDamage",
                "oldVal": 5,
                "newVal": 2,
                "pct": "-60.0%"
            }
        ]
    },
    {
        "character": "NAMELESSDEITY",
        "deltas": [
            {
                "type": "NERF",
                "key": "dartDamage",
                "oldVal": 14,
                "newVal": 3,
                "pct": "-78.6%"
            },
            {
                "type": "BUFF",
                "key": "dartHomingStrength",
                "oldVal": 0.06,
                "newVal": 0.075,
                "pct": "+25.0%"
            },
            {
                "type": "BUFF",
                "key": "enableSuperclusterStars",
                "oldVal": 0,
                "newVal": 1,
                "pct": "+0%"
            },
            {
                "type": "BUFF",
                "key": "superclusterCooldown",
                "oldVal": 400,
                "newVal": 300,
                "pct": "-25.0%"
            },
            {
                "type": "BUFF",
                "key": "destroyerTickInterval",
                "oldVal": 10,
                "newVal": 50,
                "pct": "+400.0%"
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
