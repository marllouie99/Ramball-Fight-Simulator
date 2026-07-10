// ─────────────────────────────────────────────
// SKILL SOUND EFFECTS CONFIG
// ─────────────────────────────────────────────
// Configure sound effects for fighter skills and abilities.

export const SKILL_SOUNDS = {
  // ── Berserker ─────────────────────────────
  berserker: {
    rage: {
      src: 'assets/Sound Effects/Skills/ragescream.mp3',
      volume: 0.4,
    }
  },

  // ── Cronos ─────────────────────────────────
  // Plays when Cronos deploys the time-stop sphere.
  cronos: {
    sphere: {
      src: 'Assets/Sound Effects/Skills/cronosphere.mp3',
      volume: 0.7,
    },
  },

  // ── Knight ─────────────────────────────────
  // Plays when the Knight's shield successfully blocks a hit.
  knight: {
    shieldblock: {
      src: 'Assets/Sound Effects/Skills/shieldblock.mp3',
      volume: 0.8,
    },
  },

  // ── Doppelganger ─────────────────────────────
  // Plays when Doppelganger summons an illusion.
  doppelganger: {
    summonillusion: {
      src: 'Assets/Sound Effects/Skills/summinillusion.mp3',
      volume: 0.65,
    },
  },

  // ── Ninja / Assassin ─────────────────────────
  ninja: {
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
  voidmaster: {
    blackhole: {
      src: 'Assets/Sound Effects/Skills/gravitypull.mp3',
      volume: 0.7,
    },
  },
};

/**
 * Get the sound config for a fighter's specific skill.
 * @param {string} fighterName - Fighter name or type (e.g. 'Berserker')
 * @param {string} skillName - Name of the skill (e.g. 'rage')
 * @returns {{ src: string, volume: number } | null}
 */
export function getSkillSound(fighterName, skillName) {
  const lowerName = (fighterName || '').toLowerCase().replace(/\s+/g, '');
  const lowerSkill = (skillName || '').toLowerCase();

  // Try exact name match (ignoring spaces and case)
  const fighterConfig = SKILL_SOUNDS[lowerName];
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
