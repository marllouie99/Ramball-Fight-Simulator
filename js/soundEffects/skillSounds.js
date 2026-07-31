// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SKILL SOUND EFFECTS CONFIG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Configure sound effects for fighter skills and abilities.
// Properties:
//   - src:      File path to the audio file
//   - volume:   Playback volume (0.0 to 1.0, can be >1.0 for gain)
//   - delay:    Seconds (or frames, depending on skill logic) to wait before playing the sound

export const SKILL_SOUNDS = {
  // â”€â”€ Berserker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  10: {
    rage: {
      src: 'Assets/Sound Effects/Skills/ragescream.mp3',
      volume: 0.4,
      delay: 0
    }
  },

  // ── Cronos ─────────────────────────────────
  // Plays when Cronos deploys the time-stop sphere.
  11: {
    sphere: {
      src: 'Assets/Sound Effects/Skills/cronosphere.mp3',
      volume: 0.7,
      delay: 0
    },
  },

  // ── Sharpshooter ───────────────────────────
  // Plays when the Sharpshooter fires the enhanced pierce bullet.
  1: {
    enhance: {
      src: 'Assets/Sound Effects/Skills/enhance.mp3',
      volume: 0.8,
      delay: 0
    },
  },

  // ── Knight ─────────────────────────────────
  // Plays when the Knight's shield successfully blocks a hit.
  6: {
    shieldblock: {
      src: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
      volume: 0.8,
      delay: 0
    },
  },

  // ── Doppelganger ─────────────────────────────
  // Plays when Doppelganger summons an illusion.
  14: {
    summonillusion: {
      src: 'Assets/Sound Effects/Skills/summinillusion.mp3',
      volume: 0.65,
      delay: 0
    },
  },

  // â”€â”€ Ninja / Assassin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  8: {
    stealthmode: {
      src: 'Assets/Sound Effects/Skills/woosh.mp3',
      volume: 0.6,
      delay: 0
    },
    shadowmode: {
      src: 'Assets/Sound Effects/Skills/woosh.mp3',
      volume: 0.6,
      delay: 0
    },
    backstab: {
      src: 'Assets/Sound Effects/Skills/backstab.mp3',
      volume: 0.7,
      delay: 0
    },
  },

  // ── Void Master ──────────────────────────────
  7: {
    blackhole: {
      src: 'Assets/Sound Effects/Skills/gravitypull.mp3',
      volume: 0.7,
      delay: 0
    },
  },

  // ── Engineer ─────────────────────────────────
  15: {
    build: {
      src: 'Assets/Sound Effects/Skills/hammer.mp3',
      volume: 0.6,
      delay: 0
    },
    repair: {
      src: 'Assets/Sound Effects/Skills/repair.mp3',
      volume: 0.8,
      delay: 0
    },
  },

  // ── Ruby ───────────────────────────────
  16: {
    spin: {
      src: 'Assets/Sound Effects/Skills/spinslash.mp3',
      volume: 0.7,
      delay: 0
    },
    pull: {
      src: 'Assets/Sound Effects/Skills/hookchain.mp3',
      volume: 0.7,
      delay: 0
    },
    dash: {
      src: 'Assets/Sound Effects/Skills/dash1.mp3',
      volume: 0.4,
      delay: 0
    },
  },

  // ── Zeus (ID 19) ─────────────────────────────
  19: {
    aegis: {
      src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
      volume: 0.7
      ,
      delay: 0
    },
    storm: {
      src: 'Assets/Sound Effects/Skills/stormstrike.mp3',
      volume: 3.5
      ,
      delay: 0
    }
  },

  // ── Musashi ──────────────────────────────
  musashi: {
    dash: {
      src: 'Assets/Sound Effects/Skills/dash3.mp3',
      volume: 1.0
      ,
      delay: 0
    }
  },

  // ── Trickster ─────────────────────────────
  trickster: {
    telekinesis: {
      src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
      volume: 0.8
      ,
      delay: 0
    },
    telekinesisDrop: {
      src: 'Assets/Sound Effects/Attacks/fleshhit.mp3',
      volume: 0.9
      ,
      delay: 0
    },
    spellSteal: {
      src: 'Assets/Sound Effects/Attacks/laserpew.mp3',
      volume: 0.9
      ,
      delay: 0
    }
  },

  // ── Zeus ─────────────────────────────
  zeus: {
    aegis: {
      src: 'Assets/Sound Effects/Attacks/spaceshot.mp3',
      volume: 0.7
      ,
      delay: 0
    },
    storm: {
      src: 'Assets/Sound Effects/Skills/stormstrike.mp3',
      volume: 1.0
      ,
      delay: 0
    }
  },

  // ── Gojo ─────────────────────────────
  21: {
    domain_channel: {
      src: 'Assets/Sound Effects/Skills/gojodomain.mp3',
      volume: 5.0
      ,
      delay: 0
    },
    domain_expansion: {
      src: 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
      volume: 5.0
      ,
      delay: 0
    },
    domain_activate: {
      src: 'Assets/Sound Effects/Skills/gojodomaindeploy.mp3',
      volume: 5.0
      ,
      delay: -0.10
    },
    purple_charge: {
      src: 'Assets/Sound Effects/Skills/mixing.mp3',
      volume: 5.0
      ,
      delay: -0.10
    },
    purple_fire: {
      src: 'Assets/Sound Effects/Skills/hollowpurple.mp3',
      volume: 1.0,
      delay: 0
    },
    purple_deploy: {
      src: 'Assets/Sound Effects/Skills/purpledeploy.mp3',
      volume: 2.5,
      delay: 0
    },
    red_charging: {
      src: 'Assets/Sound Effects/Skills/redcharging.mp3',
      volume: 2.0,
      delay: 0
    },
    red_channeling: {
      src: 'Assets/Sound Effects/Skills/redchanneling.mp3',
      volume: 1.8,
      delay: 0
    },
    red_deploy: {
      src: 'Assets/Sound Effects/Skills/reddeploy.mp3',
      volume: 2.0,
      delay: 0
    },
    red_blast: {
      src: 'Assets/Sound Effects/Skills/redblast.mp3',
      volume: 2.5,
      delay: 0
    }
  },

  // ── Sukuna ───────────────────────────
  22: {
    domain_channel: {
      src: 'Assets/Sound Effects/Skills/domainexpansion.mp3',
      volume: 5.5
      ,
      delay: 0
    },
    domain_activate: {
      src: 'Assets/Sound Effects/Skills/shrine.mp3',
      volume: 1.5
      ,
      delay: 0
    },
    divineflame: {
      src: 'Assets/Sound Effects/Skills/fugaignite.mp3',
      volume: 2.0
      ,
      delay: 0
    },
    fuga_fire: {
      src: 'Assets/Sound Effects/Skills/fuga.mp3',
      volume: 3.5
      ,
      delay: 0
    },
    fuga_travel: {
      src: 'Assets/Sound Effects/Skills/fugatravel.mp3',
      volume: 1.5
      ,
      delay: 0
    },
    fuga_explode: {
      src: 'Assets/Sound Effects/Skills/fugaexplode.mp3',
      volume: 1.5,
      delay: 0
    }
  },

  // ── Yuta ─────────────────────────────
  23: {
    come_rika: {
      src: 'Assets/Sound Effects/Skills/comerika.mp3',
      volume: 2.5,
      delay: 0
    },
    domain_channel: {
      src: 'Assets/Sound Effects/Skills/yutadomainexpansion.mp3',
      volume: 3.0,
      delay: 0
    },
    domain_activate: {
      src: 'Assets/Sound Effects/Skills/gojodomaindeploy.mp3', // Generic domain deploy sound instead of Sukuna's shrine
      volume: 2.0,
      delay: 0
    },
    rika_appearance: {
      src: 'Assets/Sound Effects/Skills/rikaAppearance1.mp3', // Rika's roar when she arises
      volume: 1.5,
      delay: 0
    },
    rika_attack: {
      src: 'Assets/Sound Effects/Skills/backstab.mp3',
      volume: 1.2,
      delay: 0
    },
    rika_ground_smash: {
      src: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
      volume: 1.5,
      delay: 0
    },
    rika_attack_noises: [
      { src: 'Assets/Sound Effects/Attacks/rikanoise1.mp3', volume: 1.8 },
      { src: 'Assets/Sound Effects/Attacks/rikanoise2.mp3', volume: 1.8 },
      { src: 'Assets/Sound Effects/Attacks/rikanoise3.mp3', volume: 1.8 }
    ],
    rika_ground_tremble: {
      src: 'Assets/Sound Effects/SkillEffects/groundTremble.mp3',
      volume: 1.2,
      delay: 0
    },
    parry: {
      src: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
      volume: 0.8,
      delay: 0
    }
  },
  // ── Todo ──────────────────────────────
  24: {
    blackflash: {
      src: 'Assets/Sound Effects/Skills/blackflash.mp3',
      volume: 0.5,
      delay: 0
    }
  },
  // ── Yuji ──────────────────────────────
  25: {
    blackflash: {
      src: 'Assets/Sound Effects/Skills/blackflash.mp3',
      volume: 0.5,
      delay: 0
    }
  },
  // ── Mahoraga ──────────────────────────
  100: {
    parry: {
      src: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
      volume: 0.8,
      delay: 0
    },
    shieldblock: {
      src: 'Assets/Sound Effects/Skills/shieldblock2.mp3',
      volume: 0.7,
      delay: 0
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

  let key = fighterId;
  let fighterConfig = SKILL_SOUNDS[key];

  if (!fighterConfig && (typeof key === 'string' || typeof key === 'number')) {
    const strKey = String(key).toLowerCase();
    const parsedNum = parseInt(strKey, 10);
    if (!isNaN(parsedNum) && SKILL_SOUNDS[parsedNum]) {
      fighterConfig = SKILL_SOUNDS[parsedNum];
    } else if (strKey.includes('gojo')) {
      fighterConfig = SKILL_SOUNDS[21];
    } else if (strKey.includes('sukuna')) {
      fighterConfig = SKILL_SOUNDS[22];
    } else if (strKey.includes('yuta') || strKey.includes('rika')) {
      fighterConfig = SKILL_SOUNDS[23];
    } else if (strKey.includes('toji')) {
      fighterConfig = SKILL_SOUNDS[99];
    } else if (strKey.includes('todo')) {
      fighterConfig = SKILL_SOUNDS[24];
    } else if (strKey.includes('yuji')) {
      fighterConfig = SKILL_SOUNDS[25];
    } else if (strKey.includes('mahoraga')) {
      fighterConfig = SKILL_SOUNDS[100];
    }
  }

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
      if (Array.isArray(skill)) {
        for (const item of skill) {
          if (item && item.src) paths.push(item.src);
        }
      } else if (skill && skill.src) {
        paths.push(skill.src);
      }
    }
  }
  return paths;
}
