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
                "type": "BUFF",
                "key": "turretBuildTime",
                "oldVal": 90,
                "newVal": 200,
                "pct": "+122.2%"
            },
            {
                "type": "BUFF",
                "key": "turretReloadTime",
                "oldVal": 90,
                "newVal": 200,
                "pct": "+122.2%"
            },
            {
                "type": "ADJUST",
                "key": "turretLevel1Damage",
                "oldVal": "2.2",
                "newVal": "1.0",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "turretLevel1Ammo",
                "oldVal": 15,
                "newVal": 10,
                "pct": "-33.3%"
            },
            {
                "type": "NERF",
                "key": "turretLevel2Damage",
                "oldVal": 1.8,
                "newVal": 1.3,
                "pct": "-27.8%"
            },
            {
                "type": "NERF",
                "key": "turretLevel2Ammo",
                "oldVal": 25,
                "newVal": 20,
                "pct": "-20.0%"
            },
            {
                "type": "ADJUST",
                "key": "turretLevel3Damage",
                "oldVal": "2.0",
                "newVal": "1.5",
                "pct": "Mod"
            },
            {
                "type": "BUFF",
                "key": "dispenserBuildTime",
                "oldVal": 110,
                "newVal": 200,
                "pct": "+81.8%"
            }
        ]
    },
    {
        "character": "GENOS",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "selfDestructHpRecoveryPercent",
                "oldVal": "0.15",
                "newVal": "0.50",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "GOJO",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "redChannelTurnRate",
                "oldVal": "0.045",
                "newVal": "0.070",
                "pct": "Mod"
            },
            {
                "type": "NERF",
                "key": "purpleDPS",
                "oldVal": 35,
                "newVal": 30,
                "pct": "-14.3%"
            },
            {
                "type": "BUFF",
                "key": "purpleExplosionDamage",
                "oldVal": 100,
                "newVal": 200,
                "pct": "+100.0%"
            },
            {
                "type": "ADJUST",
                "key": "purpleSecondCastDamageMultiplier",
                "oldVal": "5.0",
                "newVal": "2.0",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "MAKIMA",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "citizenReviveHpPercent",
                "oldVal": "1.00",
                "newVal": "0.70",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "crucifixionExecuteThreshold",
                "oldVal": "0.25",
                "newVal": "0.10",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "NAOYA",
        "deltas": [
            {
                "type": "NERF",
                "key": "frameFreezeChance",
                "oldVal": 0.35,
                "newVal": 0.25,
                "pct": "-28.6%"
            },
            {
                "type": "ADJUST",
                "key": "enableCurseRebirth",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "enableMachGauge",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "enableCurseRamjet",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "enableCurseTurbineCannon",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "enableCurseDomain",
                "oldVal": "true",
                "newVal": "0",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "REZE",
        "deltas": [
            {
                "type": "NERF",
                "key": "damage",
                "oldVal": 22,
                "newVal": 10,
                "pct": "-54.5%"
            },
            {
                "type": "NERF",
                "key": "rocketCooldown",
                "oldVal": 200,
                "newVal": 300,
                "pct": "+50.0%"
            },
            {
                "type": "BUFF",
                "key": "transformationExplosionRadius",
                "oldVal": 175,
                "newVal": 200,
                "pct": "+14.3%"
            },
            {
                "type": "ADJUST",
                "key": "hybridLifestealPercent",
                "oldVal": "0.10",
                "newVal": "0.15",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "revivePinPull",
                "oldVal": "Assets/Sound Effects/Skills/parry.mp3",
                "newVal": "Assets/Sound Effects/RezeSFX/reze_boom_voiceline.mp3",
                "pct": "Mod"
            },
            {
                "type": "ADJUST",
                "key": "pinPull",
                "oldVal": "Assets/Sound Effects/Skills/parry.mp3",
                "newVal": "Assets/Sound Effects/RezeSFX/reze_boom_voiceline.mp3",
                "pct": "Mod"
            }
        ]
    },
    {
        "character": "SUKUNA",
        "deltas": [
            {
                "type": "BUFF",
                "key": "divineFlameCooldown",
                "oldVal": 2500,
                "newVal": 1500,
                "pct": "-40.0%"
            },
            {
                "type": "NERF",
                "key": "divineFlameDomainCooldown",
                "oldVal": 210,
                "newVal": 500,
                "pct": "+138.1%"
            },
            {
                "type": "BUFF",
                "key": "divineFlameExplosionDamage",
                "oldVal": 50,
                "newVal": 100,
                "pct": "+100.0%"
            }
        ]
    },
    {
        "character": "ZEUS",
        "deltas": [
            {
                "type": "ADJUST",
                "key": "stunChance",
                "oldVal": "0.10",
                "newVal": "0.00",
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
