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
        "character": "MAHORAGA",
        "deltas": [
            {
                "type": "BUFF",
                "key": "throwDamage",
                "oldVal": 14,
                "newVal": 20,
                "pct": "+42.9%"
            },
            {
                "type": "NERF",
                "key": "maxRctRegenRate",
                "oldVal": 0.12,
                "newVal": 0.05,
                "pct": "-58.3%"
            }
        ]
    },
    {
        "character": "NAMELESSDEITY",
        "deltas": [
            {
                "type": "NERF",
                "key": "destroyerFlareWindupFrames",
                "oldVal": 200,
                "newVal": 150,
                "pct": "-25.0%"
            },
            {
                "type": "NERF",
                "key": "destroyerFireFrames",
                "oldVal": 500,
                "newVal": 400,
                "pct": "-20.0%"
            },
            {
                "type": "NERF",
                "key": "destroyerTickInterval",
                "oldVal": 50,
                "newVal": 10,
                "pct": "-80.0%"
            }
        ]
    },
    {
        "character": "NAOYA",
        "deltas": [
            {
                "type": "NERF",
                "key": "maxFrameStacks",
                "oldVal": 15,
                "newVal": 5,
                "pct": "-66.7%"
            }
        ]
    },
    {
        "character": "SAITAMA",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "consecutivePunchesEnabled",
                "oldVal": "1",
                "newVal": "true",
                "pct": "Mod"
            },
            {
                "type": "BUFF",
                "key": "counterPunchPoseFrames",
                "oldVal": 100,
                "newVal": 120,
                "pct": "+20.0%"
            },
            {
                "type": "ADJUST",
                "key": "championVoiceline",
                "oldVal": "2.0",
                "newVal": "0.0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "dodgeNoise",
                "oldVal": "0.35   // 35% chance to play dodge grunt/noise on dodge teleport",
                "newVal": "0.0   // 35% chance to play dodge grunt/noise on dodge teleport",
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
