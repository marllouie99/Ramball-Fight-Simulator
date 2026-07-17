// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SKILL SOUND EFFECTS CONFIG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Configure sound effects for fighter skills and abilities.

export const SKILL_SOUNDS = {
  // â”€â”€ Berserker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  10: {
    rage: {
      src: 'Assets/Sound Effects/Skills/ragescream.mp3',
      volume: 0.4,
    }
  },

  // ── Cronos ─────────────────────────────────
  // Plays when Cronos deploys the time-stop sphere.
  11: {
    sphere: {
      src: 'Assets/Sound Effects/Skills/cronosphere.mp3',
      volume: 0.7,
    },
  },

  // ── Sharpshooter ───────────────────────────
  // Plays when the Sharpshooter fires the enhanced pierce bullet.
  1: {
    enhance: {
      src: 'Assets/Sound Effects/Skills/enhance.mp3',
      volume: 0.8,
    },
  },

  // ── Knight ─────────────────────────────────
  // Plays when the Knight's shield successfully blocks a hit.
  6: {
    shieldblock: {
      src: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
      volume: 0.8,
    },
  },

  // ── Doppelganger ─────────────────────────────
  // Plays when Doppelganger summons an illusion.
  14: {
    summonillusion: {
      src: 'Assets/Sound Effects/Skills/summinillusion.mp3',
      volume: 0.65,
    },
  },

  // â”€â”€ Ninja / Assassin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  8: {
    stealthmode: {
      src: 'Assets/Sound Effects/Skills/woosh.mp3',
      volume: 0.6,
    },
    shadowmode: {
      src: 'Assets/Sound Effects/Skills/woosh.mp3',
      volume: 0.6,
    },
    backstab: {
      src: 'Assets/Sound Effects/Skills/backstab.mp3',
      volume: 0.7,
    },
  },

  // ── Void Master ──────────────────────────────
  7: {
    blackhole: {
      src: 'Assets/Sound Effects/Skills/gravitypull.mp3',
      volume: 0.7,
    },
  },

  // ── Engineer ─────────────────────────────────
  15: {
    build: {
      src: 'Assets/Sound Effects/Skills/hammer.mp3',
      volume: 0.6,
    },
    repair: {
      src: 'Assets/Sound Effects/Skills/repair.mp3',
      volume: 0.8,
    },
  },

  // ── Ruby ───────────────────────────────
  16: {
    spin: {
      src: 'Assets/Sound Effects/Skills/spinslash.mp3',
      volume: 0.7,
    },
    pull: {
      src: 'Assets/Sound Effects/Skills/hookchain.mp3',
      volume: 0.7,
    },
    dash: {
      src: 'Assets/Sound Effects/Skills/dash1.mp3',
      volume: 0.4,
    },
  },

  // ── Trickster ─────────────────────────────
  trickster: {
    telekinesis: {
      src: 'Assets/Sound Effects/Attacks/magic_cast.mp3',
      volume: 0.8
    },
    telekinesisDrop: {
      src: 'Assets/Sound Effects/Attacks/heavyhit.mp3',
      volume: 0.9
    },
    spellSteal: {
      src: 'Assets/Sound Effects/Attacks/magic_drain.mp3', // Assume this exists or fallback
      volume: 0.9
    }
  },

  // ── Zeus ─────────────────────────────
  zeus: {
    aegis: {
      src: 'Assets/Sound Effects/Attacks/electric_shock.mp3', // Will use fallback if doesn't exist
      volume: 0.7
    },
    storm: {
      src: 'Assets/Sound Effects/Attacks/thunder_strike.mp3', // Fallback to heavyhit or magic
      volume: 1.0
    }
  }
};

/**
 * Get the sound config for a fighter's specific skill.
 * @param {number} fighterId - Fighter ID
 * @param {string} skillName - Name of the skill (e.g. 'rage')
 * @returns {{ src: string, volume: number } | null}
 */
export function getSkillSound(fighterId, skillName) {
  const lowerSkill = String(skillName || '').toLowerCase();

  const fighterConfig = SKILL_SOUNDS[fighterId];
  if (!fighterConfig) return null;

  return fighterConfig[lowerSkill] || null;
}

/**
 * Get all skill sound file paths for preloading.
 * @returns {string[]}
 */
export function getSkillSoundPaths() {
  const paths = [];
  for (const fighter of Object.values(SKILL_SOUNDS)) {
    for (const skill of Object.values(fighter)) {
      if (skill && skill.src) {
        paths.push(skill.src);
      }
    }
  }
  return paths;
}
