import { playSound } from '../systems/soundSystem.js';
import { CONFIG } from '../core/config.js';

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
      src: CONFIG.toji?.sounds?.finalBlowCharging || 'Assets/Sound Effects/Skills/tojo-finalblow-charging.mp3',
      volume: CONFIG.toji?.soundVolumes?.finalBlowCharging !== undefined ? CONFIG.toji.soundVolumes.finalBlowCharging : 4.5,
      delay: CONFIG.toji?.soundDelays?.finalBlowCharging !== undefined ? CONFIG.toji.soundDelays.finalBlowCharging : -0.10,
    },
    ultimatefinalblow: {
      src: CONFIG.toji?.sounds?.ultimateFinalBlow || 'Assets/Sound Effects/Skills/toji-ultimate-finalblow.mp3',
      volume: CONFIG.toji?.soundVolumes?.ultimateFinalBlow !== undefined ? CONFIG.toji.soundVolumes.ultimateFinalBlow : 4.5,
      delay: CONFIG.toji?.soundDelays?.ultimateFinalBlow !== undefined ? CONFIG.toji.soundDelays.ultimateFinalBlow : 0,
    },
    secondweaponattack: {
      src: CONFIG.toji?.sounds?.secondWeaponAttack || 'Assets/Sound Effects/Skills/toji-2stseq-2ndweaponAttack.mp3',
      volume: CONFIG.toji?.soundVolumes?.secondWeaponAttack !== undefined ? CONFIG.toji.soundVolumes.secondWeaponAttack : 4.2,
      delay: CONFIG.toji?.soundDelays?.secondWeaponAttack !== undefined ? CONFIG.toji.soundDelays.secondWeaponAttack : -0.30,
    },
    backthrust: {
      src: CONFIG.toji?.sounds?.backThrust || 'Assets/Sound Effects/Skills/toji-backthrust.mp3',
      volume: CONFIG.toji?.soundVolumes?.backThrust !== undefined ? CONFIG.toji.soundVolumes.backThrust : 4.2,
      delay: CONFIG.toji?.soundDelays?.backThrust !== undefined ? CONFIG.toji.soundDelays.backThrust : -0.20,
    },
    firstseqteleport: {
      src: CONFIG.toji?.sounds?.firstSeqTeleport || 'Assets/Sound Effects/Skills/toji-firstseq-teleport.mp3',
      volume: CONFIG.toji?.soundVolumes?.firstSeqTeleport !== undefined ? CONFIG.toji.soundVolumes.firstSeqTeleport : 4.0,
      delay: CONFIG.toji?.soundDelays?.firstSeqTeleport !== undefined ? CONFIG.toji.soundDelays.firstSeqTeleport : -0.10,
    },
    ultimatechanneling: {
      src: CONFIG.toji?.sounds?.ultimateChanneling || 'Assets/Sound Effects/Skills/toji-ultimatechanneling.mp3',
      volume: CONFIG.toji?.soundVolumes?.ultimateChanneling !== undefined ? CONFIG.toji.soundVolumes.ultimateChanneling : 4.0,
      delay: CONFIG.toji?.soundDelays?.ultimateChanneling !== undefined ? CONFIG.toji.soundDelays.ultimateChanneling : 0,
    },
    vanish: {
      src: CONFIG.toji?.sounds?.vanish || 'Assets/Sound Effects/Skills/woosh.mp3',
      volume: CONFIG.toji?.soundVolumes?.vanish !== undefined ? CONFIG.toji.soundVolumes.vanish : 5.0,
      delay: CONFIG.toji?.soundDelays?.vanish !== undefined ? CONFIG.toji.soundDelays.vanish : 0,
    },
    strike: {
      src: CONFIG.toji?.sounds?.dashStrike || 'Assets/Sound Effects/Skills/dash5.mp3',
      volume: CONFIG.toji?.soundVolumes?.dashStrike !== undefined ? CONFIG.toji.soundVolumes.dashStrike : 1.0,
      delay: CONFIG.toji?.soundDelays?.dashStrike !== undefined ? CONFIG.toji.soundDelays.dashStrike : 0,
    },
    phantomflurry: {
      src: CONFIG.toji?.sounds?.phantomFlurry || 'Assets/Sound Effects/Skills/toji-3rdseq-phantomflurry.mp3',
      volume: CONFIG.toji?.soundVolumes?.phantomFlurry !== undefined ? CONFIG.toji.soundVolumes.phantomFlurry : 4.0,
      delay: CONFIG.toji?.soundDelays?.phantomFlurry !== undefined ? CONFIG.toji.soundDelays.phantomFlurry : 0,
    },
    dash: {
      src: CONFIG.toji?.sounds?.dashStrike || 'Assets/Sound Effects/Skills/dash5.mp3',
      volume: CONFIG.toji?.soundVolumes?.dashStrike !== undefined ? CONFIG.toji.soundVolumes.dashStrike : 1.0,
      delay: CONFIG.toji?.soundDelays?.dashStrike !== undefined ? CONFIG.toji.soundDelays.dashStrike : 0,
    },
  },

  // ── Mahoraga ──────────────────────────────
  mahoraga: {
    wheelclick: {
      src: 'Assets/Sound Effects/Skills/mahoraga-wheelclick.mp3',
      volume: 1.5,
      speed: 1.0,
    },
    shout: {
      src: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
      volume: 2.2,
      speed: 1.0,
    },
    shout_impact: {
      src: 'Assets/Sound Effects/Attacks/groundSmash.mp3',
      volume: 1.8,
      speed: 1.0,
    },
    punch: {
      src: [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3',
      ],
      volume: 1.0,
    },
    heavypunch: {
      src: [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3',
      ],
      volume: 1.0,
    },
    dash: {
      src: 'Assets/Sound Effects/Skills/dash5.mp3',
      volume: 1.0,
    },
    teleport: {
      src: 'Assets/Sound Effects/Skills/dash5.mp3',
      volume: 1.0,
    },
  },

  // ── Todo ──────────────────────────────
  todo: {
    clap: {
      src: 'Assets/Sound Effects/Skills/todo-clap.mp3',
      volume: 1.2,
      speed: 1.0,
    },
    blackflash: {
      src: 'Assets/Sound Effects/Skills/blackflash1.mp3',
      src2: 'Assets/Sound Effects/SkillEffects/blackflash-electric.mp3',
      volume: 1.5,
      speed: 1.0,
    },
    heavypunch: {
      src: 'Assets/Sound Effects/Attacks/punch.mp3', // Gojo punch attack audio
      volume: 2.8,
    },
    punch: {
      src: 'Assets/Sound Effects/Attacks/punch.mp3', // Gojo punch attack audio
      volume: 2.8,
    }
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

  // Dynamic overrides for Mahoraga from mahoragaConfig.js
  if (lowerName.includes('mahoraga') && CONFIG.mahoraga) {
    if (lowerEffect === 'wheelclick') {
      return {
        src: CONFIG.mahoraga.sounds?.wheelClick || 'Assets/Sound Effects/Skills/mahoraga-wheelclick.mp3',
        volume: CONFIG.mahoraga.soundVolumes?.wheelClick !== undefined ? CONFIG.mahoraga.soundVolumes.wheelClick : 1.5,
        speed: 1.0
      };
    }
    if (lowerEffect === 'shout') {
      return {
        src: CONFIG.mahoraga.sounds?.shout || 'Assets/Sound Effects/Attacks/groundSmash.mp3',
        volume: CONFIG.mahoraga.soundVolumes?.shout !== undefined ? CONFIG.mahoraga.soundVolumes.shout : 2.2,
        speed: 1.0
      };
    }
    if (lowerEffect === 'shout_impact') {
      return {
        src: CONFIG.mahoraga.sounds?.shoutImpact || 'Assets/Sound Effects/Attacks/groundSmash.mp3',
        volume: CONFIG.mahoraga.soundVolumes?.shoutImpact !== undefined ? CONFIG.mahoraga.soundVolumes.shoutImpact : 1.8,
        speed: 1.0
      };
    }
    if (lowerEffect === 'punch' || lowerEffect === 'heavypunch') {
      return {
        src: CONFIG.mahoraga.sounds?.punchSounds || [
          'Assets/Sound Effects/Attacks/heavypunch1.mp3',
          'Assets/Sound Effects/Attacks/heavypunch2.mp3',
          'Assets/Sound Effects/Attacks/heavypunch3.mp3'
        ],
        volume: CONFIG.mahoraga.soundVolumes?.punch !== undefined ? CONFIG.mahoraga.soundVolumes.punch : 1.0,
        speed: 1.0
      };
    }
    if (lowerEffect === 'dash' || lowerEffect === 'teleport') {
      return {
        src: CONFIG.mahoraga.sounds?.dash || 'Assets/Sound Effects/Skills/dash5.mp3',
        volume: CONFIG.mahoraga.soundVolumes?.dash !== undefined ? CONFIG.mahoraga.soundVolumes.dash : 1.0,
        speed: 1.0
      };
    }
  }

  // Dynamic overrides for Toji from tojiConfig.js
  if (lowerName.includes('toji') && CONFIG.toji) {
    const tojiKeyMap = {
      ultimatechanneling: 'ultimateChanneling',
      finalblowcharging: 'finalBlowCharging',
      ultimatefinalblow: 'ultimateFinalBlow',
      secondweaponattack: 'secondWeaponAttack',
      backthrust: 'backThrust',
      firstseqteleport: 'firstSeqTeleport',
      phantomflurry: 'phantomFlurry',
      vanish: 'vanish',
      strike: 'dashStrike',
      dash: 'dashStrike',
      dashstrike: 'dashStrike',
      spearswing: 'spearSwing',
      spearbackstab: 'spearBackstab',
      parrydodge: 'parryDodge',
      groundsmash: 'groundSmash'
    };

    const cfgKey = tojiKeyMap[lowerEffect] || lowerEffect;
    const staticEntry = SKILL_EFFECT_SOUNDS.toji?.[lowerEffect];
    const src = CONFIG.toji.sounds?.[cfgKey] || staticEntry?.src;
    if (src) {
      const volume = CONFIG.toji.soundVolumes?.[cfgKey] !== undefined 
        ? CONFIG.toji.soundVolumes[cfgKey] 
        : (staticEntry?.volume ?? 1.0);
      const delay = CONFIG.toji.soundDelays?.[cfgKey] !== undefined 
        ? CONFIG.toji.soundDelays[cfgKey] 
        : (staticEntry?.delay ?? 0);
      const speed = CONFIG.toji.soundSpeeds?.[cfgKey] !== undefined 
        ? CONFIG.toji.soundSpeeds[cfgKey] 
        : (staticEntry?.speed ?? 1.0);
      return { src, volume, delay, speed };
    }
  }

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

  if (effectName === 'wheelclick') {
    const now = Date.now();
    if (typeof window !== 'undefined') {
      if (window._lastMahoragaWheelClickTime && (now - window._lastMahoragaWheelClickTime < 300)) {
        return null; // Throttle duplicate wheel clicks within 300ms
      }
      window._lastMahoragaWheelClickTime = now;
    }
  }

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
