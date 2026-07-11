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

  // â”€â”€ Cronos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Plays when Cronos deploys the time-stop sphere.
  11: {
    sphere: {
      src: 'Assets/Sound Effects/Skills/cronosphere.mp3',
      volume: 0.7,
    },
  },

  // â”€â”€ Knight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Plays when the Knight's shield successfully blocks a hit.
  6: {
    shieldblock: {
      src: 'Assets/Sound Effects/Skills/shieldblock.mp3',
      volume: 0.8,
    },
  },

  // â”€â”€ Doppelganger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Void Master â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  7: {
    blackhole: {
      src: 'Assets/Sound Effects/Skills/gravitypull.mp3',
      volume: 0.7,
    },
  },
};

/**
 * Get the sound config for a fighter's specific skill.
 * @param {number} fighterId - Fighter ID
 * @param {string} skillName - Name of the skill (e.g. 'rage')
 * @returns {{ src: string, volume: number } | null}
 */
export function getSkillSound(fighterId, skillName) {
  const lowerSkill = (skillName || '').toLowerCase();

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
