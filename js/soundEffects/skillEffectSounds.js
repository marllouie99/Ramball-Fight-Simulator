// ─────────────────────────────────────────────
// SKILL EFFECT SOUND EFFECTS CONFIG
// ─────────────────────────────────────────────
// Configure sound effects triggered during specific fighter states
// that aren't basic attacks or full skill activations.
// (e.g., a reload animation, a parry, a charge-up)
//
// Each entry supports:
//   - src:    Path to the sound file (relative to project root)
//   - volume: Playback volume (0.0 – 1.0)
//   - speed:  Playback speed multiplier (e.g., 1.0 is normal, 1.2 is 20% faster)

export const SKILL_EFFECT_SOUNDS = {
  // ── Gun Slinger ─────────────────────────────
  // Pistol reload when the magazine runs out.
  gunslinger: {
    reload: {
      src: 'Assets/Sound Effects/SkillEffects/pistolreload.mp3',
      volume: 0.6,
      speed: 1.0,
    },
  },

  // ── Crimson Sniper ────────────────────────
  crimsonsniper: {
    reload: {
      src: 'Assets/Sound Effects/SkillEffects/energyreloading.mp3',
      volume: 0.8,
      speed: 1.2, // You can adjust this to make the reload sound faster/slower!
    },
  },
  sharpshooter: {
    reload: {
      src: 'Assets/Sound Effects/SkillEffects/energyreloading.mp3',
      volume: 0.8,
      speed: 1.2,
    },
    enhanceready: {
      src: 'Assets/Sound Effects/SkillEffects/enhanceready.mp3',
      volume: 0.75,
      speed: 1.0,
    },
  },

  // ── Alchemist / Grenadier ─────────────────
  // Plays when a fighter gets hit by poison AOE.
  alchemist: {
    poisonsizzle: {
      src: 'Assets/Sound Effects/SkillEffects/poisonsizzle.mp3',
      volume: 0.6,
    },
  },

  // ── Solar Champion ──────────────────────────
  solarchampion: {
    lasercharge: {
      src: 'Assets/Sound Effects/SkillEffects/lasercharge.mp3',
      volume: 0.6,
    },
  },

  // ── Turret ──────────────────────────────────
  turret: {
    death: {
      src: 'Assets/Sound Effects/Skills/machinebroken.mp3',
      volume: 1.0,
    },
  },

  // ── Zeus ────────────────────────────────────
  zeus: {
    thunderstrike: {
      src: 'Assets/Sound Effects/Skills/stormstrike.mp3',
      volume: 8.5,
    },
    thunderstrike2: {
      src: 'Assets/Sound Effects/Skills/thunderstrike.mp3',
      volume: 1.0,
    },
    thundercloud: {
      src: 'Assets/Sound Effects/SkillEffects/thundercloudcoming.mp3',
      volume: 8.8,
    },
  },

  // ── Yuta Okkotsu / Rika ────────────────────
  yuta: {
    groundsmash: {
      src: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
      volume: 1.9,
      speed: 1.0,
    },
    groundtremble: {
      src: 'Assets/Sound Effects/SkillEffects/groundTremble.mp3',
      volume: 1.2,
      speed: 1.0,
    },
  },

  // ── Toji Fushiguro ──────────────────────────
  toji: {
    finalblowcharging: {
      src: 'Assets/Sound Effects/Skills/tojo-finalblow-charging.mp3',
      volume: 4.5,
      delay: -0.10,
    },

    ultimatefinalblow: {
      src: 'Assets/Sound Effects/Skills/toji-ultimate-finalblow.mp3',
      volume: 4.5,
      delay: 0,
    },
    secondweaponattack: {
      src: 'Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3',
      volume: 4.2,
      delay: -0.30,
    },
    backthrust: {
      src: 'Assets/Sound Effects/Skills/toji-backthrust.mp3',
      volume: 4.2,
      delay: -0.20,
    },
    firstseqteleport: {
      src: 'Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3',
      volume: 4.0,
      delay: -0.10,
    },
    ultimatechanneling: {
      src: 'Assets/Sound Effects/Skills/toji-ultimatechanneling.mp3',
      volume: 4.0,
      delay: 0,
    },
    vanish: {
      src: 'Assets/Sound Effects/Skills/woosh.mp3',
      volume: 5.0,
      delay: 0,
    },
    strike: {
      src: 'Assets/Sound Effects/Skills/dash5.mp3',
      volume: 1.0,
      delay: 0,
    },
    dash: {
      src: 'Assets/Sound Effects/Skills/dash5.mp3',
      volume: 1.0,
      delay: 0,
    },
  },
};

/**
 * Get the sound config for a fighter's specific skill effect.
 * @param {string} fighterName - Fighter name or type (e.g. 'Gun Slinger')
 * @param {string} effectName - Name of the effect (e.g. 'reload')
 * @returns {{ src: string, volume: number, speed?: number } | null}
 */
export function getSkillEffectSound(fighterName, effectName) {
  let nameKey = String(fighterName || '').toLowerCase().replace(/\s+/g, '');
  if (nameKey === '1') {
    nameKey = 'sharpshooter';
  }
  const lowerName = nameKey;
  const lowerEffect = String(effectName || '').toLowerCase();

  const fighterConfig = SKILL_EFFECT_SOUNDS[lowerName];
  if (!fighterConfig) return null;

  return fighterConfig[lowerEffect] || null;
}

/**
 * Play a skill effect sound by fighter name and effect name, automatically applying volume, speed, and delay.
 * @param {string} fighterName
 * @param {string} effectName
 */
export function playSkillEffectSound(fighterName, effectName) {
  const sound = getSkillEffectSound(fighterName, effectName);
  if (!sound) return null;
  return playSound(sound);
}

/**
 * Get all skill effect sound file paths for preloading.
 * @returns {string[]}
 */
export function getSkillEffectSoundPaths() {
  const paths = [];
  for (const fighter of Object.values(SKILL_EFFECT_SOUNDS)) {
    for (const effect of Object.values(fighter)) {
      if (effect && effect.src) {
        paths.push(effect.src);
      }
    }
  }
  return paths;
}
