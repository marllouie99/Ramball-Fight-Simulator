// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SKILL SOUND EFFECTS CONFIG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Configure sound effects for fighter skills and abilities.
// Properties:
//   - src:      File path to the audio file
//   - volume:   Playback volume (0.0 to 1.0, can be >1.0 for gain)
//   - delay:    Seconds (or frames, depending on skill logic) to wait before playing the sound

import { CONFIG } from '../core/config.js';

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
    deploy: {
      src: 'Assets/Sound Effects/Skills/repair.mp3',
      volume: 0.40,
      delay: 0
    },
    build: {
      src: 'Assets/Sound Effects/Skills/hammer.mp3',
      volume: 0.30,
      delay: 0
    },
    repair: {
      src: 'Assets/Sound Effects/Skills/repair.mp3',
      volume: 0.40,
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

  // ── Rubbick ─────────────────────────────
  18: {
    telekinesis: {
      src: 'Assets/Sound Effects/Skills/rubbick-telekenesis.mp3',
      volume: 0.85,
      delay: 0
    },
    telekinesisDrop: {
      src: 'Assets/Sound Effects/Skills/rubbick-groundsmash.mp3',
      volume: 0.9,
      delay: 0
    },
    spellSteal: {
      src: 'Assets/Sound Effects/Skills/Rubbick-spellsteal.mp3',
      volume: 0.9,
      delay: 0
    }
  },
  rubbick: {
    telekinesis: {
      src: 'Assets/Sound Effects/Skills/rubbick-telekenesis.mp3',
      volume: 0.85,
      delay: 0
    },
    telekinesisDrop: {
      src: 'Assets/Sound Effects/Skills/rubbick-groundsmash.mp3',
      volume: 0.9,
      delay: 0
    },
    spellSteal: {
      src: 'Assets/Sound Effects/Skills/Rubbick-spellsteal.mp3',
      volume: 0.9,
      delay: 0
    }
  },
  trickster: {
    telekinesis: {
      src: 'Assets/Sound Effects/Skills/rubbick-telekenesis.mp3',
      volume: 0.85,
      delay: 0
    },
    telekinesisDrop: {
      src: 'Assets/Sound Effects/Skills/rubbick-groundsmash.mp3',
      volume: 0.9,
      delay: 0
    },
    spellSteal: {
      src: 'Assets/Sound Effects/Skills/Rubbick-spellsteal.mp3',
      volume: 0.9,
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
    get domain_channel() {
      return {
        src: CONFIG.gojo?.sounds?.domainChannel || 'Assets/Sound Effects/Skills/gojodomain.mp3',
        volume: CONFIG.gojo?.soundVolumes?.domainChannel !== undefined ? CONFIG.gojo.soundVolumes.domainChannel : 0.70,
        delay: CONFIG.gojo?.soundDelays?.domainChannel || 0
      };
    },
    get domainchannel() { return this.domain_channel; },
    get domain_expansion() {
      return {
        src: CONFIG.gojo?.sounds?.domainExpansion || 'Assets/Sound Effects/Skills/gojodomainexpansion.mp3',
        volume: CONFIG.gojo?.soundVolumes?.domainExpansion !== undefined ? CONFIG.gojo.soundVolumes.domainExpansion : 0.70,
        delay: CONFIG.gojo?.soundDelays?.domainExpansion || 0
      };
    },
    get domainexpansion() { return this.domain_expansion; },
    get domain_activate() {
      return {
        src: CONFIG.gojo?.sounds?.domainActivate || 'Assets/Sound Effects/Skills/gojodomaindeploy.mp3',
        volume: CONFIG.gojo?.soundVolumes?.domainActivate !== undefined ? CONFIG.gojo.soundVolumes.domainActivate : 0.70,
        delay: CONFIG.gojo?.soundDelays?.domainActivate !== undefined ? CONFIG.gojo.soundDelays.domainActivate : -0.10
      };
    },
    get domainactivate() { return this.domain_activate; },
    get domain() { return this.domain_activate; },
    get purple_charge() {
      return {
        src: CONFIG.gojo?.sounds?.purpleCharge || 'Assets/Sound Effects/Skills/mixing.mp3',
        volume: CONFIG.gojo?.soundVolumes?.purpleCharge !== undefined ? CONFIG.gojo.soundVolumes.purpleCharge : 0.0,
        delay: CONFIG.gojo?.soundDelays?.purpleCharge !== undefined ? CONFIG.gojo.soundDelays.purpleCharge : -0.10
      };
    },
    get purplecharge() { return this.purple_charge; },
    get purple_flare() {
      return {
        src: CONFIG.gojo?.sounds?.purpleFlare || 'Assets/Sound Effects/Skills/dash3.mp3',
        volume: CONFIG.gojo?.soundVolumes?.purpleFlare !== undefined ? CONFIG.gojo.soundVolumes.purpleFlare : 0.45,
        delay: CONFIG.gojo?.soundDelays?.purpleFlare || 0
      };
    },
    get purpleflare() { return this.purple_flare; },
    get purple_fire() {
      return {
        src: CONFIG.gojo?.sounds?.purpleFire || 'Assets/Sound Effects/Skills/hollowpurple.mp3',
        volume: CONFIG.gojo?.soundVolumes?.purpleFire !== undefined ? CONFIG.gojo.soundVolumes.purpleFire : 0.55,
        delay: CONFIG.gojo?.soundDelays?.purpleFire || 0
      };
    },
    get purplefire() { return this.purple_fire; },
    get hollowpurple() { return this.purple_fire; },
    get purple() { return this.purple_fire; },
    get purple_deploy() {
      return {
        src: CONFIG.gojo?.sounds?.purpleDeploy || 'Assets/Sound Effects/Skills/purpledeploy.mp3',
        volume: CONFIG.gojo?.soundVolumes?.purpleDeploy !== undefined ? CONFIG.gojo.soundVolumes.purpleDeploy : 1.00,
        delay: CONFIG.gojo?.soundDelays?.purpleDeploy || 0
      };
    },
    get purpledeploy() { return this.purple_deploy; },
    get red_charging() {
      return {
        src: CONFIG.gojo?.sounds?.redCharging || 'Assets/Sound Effects/Skills/redcharging.mp3',
        volume: CONFIG.gojo?.soundVolumes?.redCharging !== undefined ? CONFIG.gojo.soundVolumes.redCharging : 0.0,
        delay: CONFIG.gojo?.soundDelays?.redCharging || 0
      };
    },
    get redcharging() { return this.red_charging; },
    get red_channeling() {
      return {
        src: CONFIG.gojo?.sounds?.redChanneling || 'Assets/Sound Effects/Skills/redchanneling.mp3',
        volume: CONFIG.gojo?.soundVolumes?.redChanneling !== undefined ? CONFIG.gojo.soundVolumes.redChanneling : 0.0,
        delay: CONFIG.gojo?.soundDelays?.redChanneling || 0
      };
    },
    get redchanneling() { return this.red_channeling; },
    get red_deploy() {
      return {
        src: CONFIG.gojo?.sounds?.redDeploy || 'Assets/Sound Effects/Skills/reddeploy.mp3',
        volume: CONFIG.gojo?.soundVolumes?.redDeploy !== undefined ? CONFIG.gojo.soundVolumes.redDeploy : 0.0,
        delay: CONFIG.gojo?.soundDelays?.redDeploy || 0
      };
    },
    get reddeploy() { return this.red_deploy; },
    get red_blast() {
      return {
        src: CONFIG.gojo?.sounds?.redBlast || 'Assets/Sound Effects/Skills/redblast.mp3',
        volume: CONFIG.gojo?.soundVolumes?.redBlast !== undefined ? CONFIG.gojo.soundVolumes.redBlast : 0.80,
        delay: CONFIG.gojo?.soundDelays?.redBlast || 0
      };
    },
    get redblast() { return this.red_blast; },
    get reverse_cursed_technique() {
      return {
        src: CONFIG.gojo?.sounds?.reverseCursedTechnique || 'Assets/Sound Effects/Skills/repair.mp3',
        volume: CONFIG.gojo?.soundVolumes?.reverseCursedTechnique !== undefined ? CONFIG.gojo.soundVolumes.reverseCursedTechnique : 0.55,
        delay: CONFIG.gojo?.soundDelays?.reverseCursedTechnique || 0
      };
    },
    get reversecursedtechnique() { return this.reverse_cursed_technique; },
    get rct() { return this.reverse_cursed_technique; },
    get blue_orb() {
      return {
        src: CONFIG.gojo?.sounds?.blueOrb || 'Assets/Sound Effects/Attacks/plasma_drone.mp3',
        volume: CONFIG.gojo?.soundVolumes?.blueOrb !== undefined ? CONFIG.gojo.soundVolumes.blueOrb : 0.35,
        delay: CONFIG.gojo?.soundDelays?.blueOrb || 0
      };
    },
    get blueorb() { return this.blue_orb; },
    get melee_punch() {
      return {
        src: CONFIG.gojo?.sounds?.meleePunch || 'Assets/Sound Effects/Attacks/punch.mp3',
        volume: CONFIG.gojo?.soundVolumes?.meleePunch !== undefined ? CONFIG.gojo.soundVolumes.meleePunch : 0.90,
        delay: CONFIG.gojo?.soundDelays?.meleePunch || 0
      };
    },
    get meleepunch() { return this.melee_punch; },
    get punch() { return this.melee_punch; },
    get teleport_dash() {
      return {
        src: CONFIG.gojo?.sounds?.teleportDash || 'Assets/Sound Effects/Skills/dash3.mp3',
        volume: CONFIG.gojo?.soundVolumes?.teleportDash !== undefined ? CONFIG.gojo.soundVolumes.teleportDash : 0.45,
        delay: CONFIG.gojo?.soundDelays?.teleportDash || 0
      };
    },
    get teleportdash() { return this.teleport_dash; },
    get dash() { return this.teleport_dash; },
    get infinity_collide() {
      return {
        src: CONFIG.gojo?.sounds?.infinityCollide || 'Assets/Sound Effects/Skills/shieldblock2.mp3',
        volume: CONFIG.gojo?.soundVolumes?.infinityCollide !== undefined ? CONFIG.gojo.soundVolumes.infinityCollide : 0.55,
        delay: CONFIG.gojo?.soundDelays?.infinityCollide || 0
      };
    },
    get infinitycollide() { return this.infinity_collide; }
  },

  // ── Sukuna ───────────────────────────
  22: {
    get domain_channel() {
      return {
        src: CONFIG.sukuna?.sounds?.domainChannel || 'Assets/Sound Effects/Skills/domainexpansion.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.domainChannel !== undefined ? CONFIG.sukuna.soundVolumes.domainChannel : 0.75,
        delay: CONFIG.sukuna?.soundDelays?.domainChannel || 0
      };
    },
    get domainchannel() { return this.domain_channel; },
    get domain_activate() {
      return {
        src: CONFIG.sukuna?.sounds?.domainActivate || 'Assets/Sound Effects/Skills/shrine.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.domainActivate !== undefined ? CONFIG.sukuna.soundVolumes.domainActivate : 0.80,
        delay: CONFIG.sukuna?.soundDelays?.domainActivate || 0
      };
    },
    get domainactivate() { return this.domain_activate; },
    get domain() { return this.domain_activate; },
    get domain_expansion() {
      return {
        src: CONFIG.sukuna?.sounds?.domainExpansion || 'Assets/Sound Effects/Skills/shrine.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.domainExpansion !== undefined ? CONFIG.sukuna.soundVolumes.domainExpansion : 0.75,
        delay: CONFIG.sukuna?.soundDelays?.domainExpansion || 0
      };
    },
    get domainexpansion() { return this.domain_expansion; },
    get domain_deploy() {
      return {
        src: CONFIG.sukuna?.sounds?.domainDeploy || 'Assets/Sound Effects/Skills/domainexpansion.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.domainDeploy !== undefined ? CONFIG.sukuna.soundVolumes.domainDeploy : 0.55,
        delay: 0
      };
    },
    get domaindeploy() { return this.domain_deploy; },
    get divineflame() {
      return {
        src: CONFIG.sukuna?.sounds?.fugaIgnite || 'Assets/Sound Effects/Skills/fugaignite.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.fugaIgnite !== undefined ? CONFIG.sukuna.soundVolumes.fugaIgnite : 1.00,
        delay: CONFIG.sukuna?.soundDelays?.fugaIgnite || 0
      };
    },
    get divine_flame() { return this.divineflame; },
    get fugaignite() { return this.divineflame; },
    get fuga_ignite() { return this.divineflame; },
    get fuga_fire() {
      return {
        src: CONFIG.sukuna?.sounds?.fugaChant || 'Assets/Sound Effects/Skills/fuga.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.fugaChant !== undefined ? CONFIG.sukuna.soundVolumes.fugaChant : 0.0,
        delay: CONFIG.sukuna?.soundDelays?.fugaChant || 0
      };
    },
    get fugafire() { return this.fuga_fire; },
    get fugachant() { return this.fuga_fire; },
    get fuga_chant() { return this.fuga_fire; },
    get fuga() { return this.fuga_fire; },
    get fuga_travel() {
      return {
        src: CONFIG.sukuna?.sounds?.fugaTravel || 'Assets/Sound Effects/Skills/fugatravel.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.fugaTravel !== undefined ? CONFIG.sukuna.soundVolumes.fugaTravel : 0.80,
        delay: CONFIG.sukuna?.soundDelays?.fugaTravel || 0
      };
    },
    get fugatravel() { return this.fuga_travel; },
    get fuga_explode() {
      return {
        src: CONFIG.sukuna?.sounds?.fugaExplosion || 'Assets/Sound Effects/Skills/fugaexplode.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.fugaExplosion !== undefined ? CONFIG.sukuna.soundVolumes.fugaExplosion : 0.80,
        delay: CONFIG.sukuna?.soundDelays?.fugaExplosion || 0
      };
    },
    get fugaexplode() { return this.fuga_explode; },
    get fuga_explosion() { return this.fuga_explode; },
    get fugaexplosion() { return this.fuga_explode; },
    get fuga_fireball() {
      return {
        src: CONFIG.sukuna?.sounds?.fugaFireball || 'Assets/Sound Effects/Attacks/flamespray1.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.fugaFireball !== undefined ? CONFIG.sukuna.soundVolumes.fugaFireball : 0.45,
        delay: 0
      };
    },
    get fugafireball() { return this.fuga_fireball; },
    get thermobaric() {
      return {
        src: CONFIG.sukuna?.sounds?.thermobaricExplosion || 'Assets/Sound Effects/Attacks/explosion.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.thermobaricExplosion !== undefined ? CONFIG.sukuna.soundVolumes.thermobaricExplosion : 0.55,
        delay: 0
      };
    },
    get thermobaric_explosion() { return this.thermobaric; },
    get thermobaricexplosion() { return this.thermobaric; },
    get spiderweb() {
      return {
        src: CONFIG.sukuna?.sounds?.spiderweb || 'Assets/Sound Effects/Skills/hookchain.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.spiderweb !== undefined ? CONFIG.sukuna.soundVolumes.spiderweb : 0.40,
        delay: 0
      };
    },
    get reverse_cursed_technique() {
      return {
        src: CONFIG.sukuna?.sounds?.reverseCursedTechnique || 'Assets/Sound Effects/Skills/enhance.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.reverseCursedTechnique !== undefined ? CONFIG.sukuna.soundVolumes.reverseCursedTechnique : 0.55,
        delay: 0
      };
    },
    get reversecursedtechnique() { return this.reverse_cursed_technique; },
    get rct() { return this.reverse_cursed_technique; },
    get rapidslash() {
      return {
        src: CONFIG.sukuna?.sounds?.rapidSlashVoiceline || 'Assets/Sound Effects/Skills/Sukuna-rapidslash-voiceline.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.rapidSlashVoiceline !== undefined ? CONFIG.sukuna.soundVolumes.rapidSlashVoiceline : 0.0,
        delay: 0
      };
    },
    get rapidslash_voiceline() { return this.rapidslash; },
    get rapidslashvoiceline() { return this.rapidslash; },
    get champion_voiceline() {
      return {
        src: CONFIG.sukuna?.sounds?.championVoiceline || 'Assets/Sound Effects/Skills/Sukuna-champion-voiceline.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.championVoiceline !== undefined ? CONFIG.sukuna.soundVolumes.championVoiceline : 1.75,
        delay: CONFIG.sukuna?.soundDelays?.championVoiceline || 68
      };
    },
    get championvoiceline() { return this.champion_voiceline; },
    get punch() {
      return {
        src: CONFIG.sukuna?.sounds?.punch || 'Assets/Sound Effects/Attacks/punch.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.punch !== undefined ? CONFIG.sukuna.soundVolumes.punch : 1.40,
        delay: CONFIG.sukuna?.soundDelays?.punch || 0
      };
    },
    get sword_swing() {
      return {
        src: CONFIG.sukuna?.sounds?.swordSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.swordSwing !== undefined ? CONFIG.sukuna.soundVolumes.swordSwing : 0.50,
        delay: CONFIG.sukuna?.soundDelays?.swordSwing || 0
      };
    },
    get swordswing() { return this.sword_swing; },
    get flesh_slice() {
      return {
        src: CONFIG.sukuna?.sounds?.fleshSlice || 'Assets/Sound Effects/Skills/backstab.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.fleshSlice !== undefined ? CONFIG.sukuna.soundVolumes.fleshSlice : 0.40,
        delay: CONFIG.sukuna?.soundDelays?.fleshSlice || 0
      };
    },
    get fleshslice() { return this.flesh_slice; },
    get teleport_dash() {
      return {
        src: CONFIG.sukuna?.sounds?.teleportDash || 'Assets/Sound Effects/Skills/dash3.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.teleportDash !== undefined ? CONFIG.sukuna.soundVolumes.teleportDash : 0.45,
        delay: CONFIG.sukuna?.soundDelays?.teleportDash || 0
      };
    },
    get teleportdash() { return this.teleport_dash; },
    get dash() { return this.teleport_dash; },
    get ricochet_hit() {
      return {
        src: CONFIG.sukuna?.sounds?.ricochetHit || 'Assets/Sound Effects/Skills/parry.mp3',
        volume: CONFIG.sukuna?.soundVolumes?.ricochetHit !== undefined ? CONFIG.sukuna.soundVolumes.ricochetHit : 0.0,
        delay: CONFIG.sukuna?.soundDelays?.ricochetHit || 0
      };
    },
    get ricochethit() { return this.ricochet_hit; },
    get ricochet() { return this.ricochet_hit; }
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
      src: 'Assets/Sound Effects/Skills/blackflash1.mp3',
      src2: 'Assets/Sound Effects/SkillEffects/blackflash-electric.mp3',
      volume: 1.5,
      delay: 0
    }
  },
  // ── Yuji ──────────────────────────────
  25: {
    blackflash: {
      src: 'Assets/Sound Effects/Skills/blackflash1.mp3',
      src2: 'Assets/Sound Effects/SkillEffects/blackflash-electric.mp3',
      volume: 1.5,
      delay: 0
    }
  },
  // ── Mahoraga ──────────────────────────
  100: {
    get parry() {
      return {
        src: CONFIG.mahoraga?.sounds?.parry || 'Assets/Sound Effects/Skills/shieldblock2.mp3',
        volume: CONFIG.mahoraga?.soundVolumes?.parry !== undefined ? CONFIG.mahoraga.soundVolumes.parry : 0.8,
        delay: CONFIG.mahoraga?.soundDelays?.parry || 0
      };
    },
    get shieldblock() {
      return {
        src: CONFIG.mahoraga?.sounds?.shieldBlock || 'Assets/Sound Effects/Skills/shieldblock2.mp3',
        volume: CONFIG.mahoraga?.soundVolumes?.shieldBlock !== undefined ? CONFIG.mahoraga.soundVolumes.shieldBlock : 0.7,
        delay: CONFIG.mahoraga?.soundDelays?.shieldBlock || 0
      };
    },
    get shout() {
      return {
        src: CONFIG.mahoraga?.sounds?.shout || 'Assets/Sound Effects/Attacks/groundSmash.mp3',
        volume: CONFIG.mahoraga?.soundVolumes?.shout !== undefined ? CONFIG.mahoraga.soundVolumes.shout : 2.2,
        delay: CONFIG.mahoraga?.soundDelays?.shout || 0
      };
    },
    get divineshout() {
      return {
        src: CONFIG.mahoraga?.sounds?.shout || 'Assets/Sound Effects/Attacks/groundSmash.mp3',
        volume: CONFIG.mahoraga?.soundVolumes?.shout !== undefined ? CONFIG.mahoraga.soundVolumes.shout : 2.2,
        delay: CONFIG.mahoraga?.soundDelays?.shout || 0
      };
    }
  },
  // ── Genos ─────────────────────────────
  genos: {
    incinerate_blast: {
      src: 'Assets/Sound Effects/Skills/genos-incenerate-blast.mp3',
      volume: 1.5,
      delay: 0
    },
    incinerate_charge: {
      src: 'Assets/Sound Effects/Skills/genos-incenerate-charging.mp3',
      volume: 1.0,
      delay: 0
    },
    incinerate_voice: {
      src: 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3',
      volume: 3.5,
      delay: 0
    },
    ultimate_charge: {
      src: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
      volume: 2.0,
      delay: 0
    },
    ultimate_blast: {
      src: 'Assets/Sound Effects/Skills/genos-ultimateblast.mp3',
      volume: 2.0,
      delay: 0
    },
    machinegun_voice: {
      src: 'Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3',
      volume: 2.5,
      delay: 0
    },
    recovery: {
      src: 'Assets/Sound Effects/Skills/genos-recovery.mp3',
      volume: 1.5,
      delay: 0
    }
  },

  // ── Ichigo ────────────────────────────
  29: {
    get parry() {
      return {
        src: CONFIG.ichigo?.sounds?.parry || 'Assets/Sound Effects/Skills/shieldblock2.mp3',
        volume: CONFIG.ichigo?.soundVolumes?.parry !== undefined ? CONFIG.ichigo.soundVolumes.parry : 0.8,
        delay: CONFIG.ichigo?.soundDelays?.parry || 0
      };
    },
    get shieldblock() {
      return {
        src: CONFIG.ichigo?.sounds?.parry || 'Assets/Sound Effects/Skills/shieldblock2.mp3',
        volume: CONFIG.ichigo?.soundVolumes?.parry !== undefined ? CONFIG.ichigo.soundVolumes.parry : 0.8,
        delay: CONFIG.ichigo?.soundDelays?.parry || 0
      };
    },
    get bankaiGetsugaVoice() {
      return {
        src: CONFIG.ichigo?.sounds?.bankaiGetsugaVoice || 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3',
        volume: CONFIG.ichigo?.soundVolumes?.bankaiGetsugaVoice !== undefined ? CONFIG.ichigo.soundVolumes.bankaiGetsugaVoice : 3.0,
        delay: 0
      };
    },
    get finalGetsugaVoice() {
      return {
        src: CONFIG.ichigo?.sounds?.finalGetsugaVoice || 'Assets/Sound Effects/Skills/ichigo-getsugatensho-bankai.mp3',
        volume: CONFIG.ichigo?.soundVolumes?.finalGetsugaVoice !== undefined ? CONFIG.ichigo.soundVolumes.finalGetsugaVoice : 3.0,
        delay: 0
      };
    },
    get finalHollowGetsugaVoice() {
      return {
        src: CONFIG.ichigo?.sounds?.finalHollowGetsugaVoice || 'Assets/Sound Effects/Skills/Ichigo-getsugatensho-hollow-voiceline.mp3',
        volume: CONFIG.ichigo?.soundVolumes?.finalHollowGetsugaVoice !== undefined ? CONFIG.ichigo.soundVolumes.finalHollowGetsugaVoice : 3.0,
        delay: 0
      };
    }
  },

  // ── John Wick ─────────────────────────────
  33: {
    pencil: {
      src: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
      volume: 0.55,
      delay: 0
    },
    pencilstab: {
      src: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
      volume: 0.55,
      delay: 0
    },
    backstab: {
      src: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
      volume: 0.55,
      delay: 0
    },
    shell_drop: {
      src: 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3',
      volume: 0.32,
      delay: 0
    },
    gun_drop: {
      src: 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3',
      volume: 0.45,
      delay: 0
    },
    gun_switch: {
      src: 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3',
      volume: 0.48,
      delay: 0
    },
    weaponswitch: {
      src: 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3',
      volume: 0.48,
      delay: 0
    },
    m4_reload: {
      src: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
      volume: 0.48,
      delay: 0
    },
    m4_shot: {
      src: 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
      volume: 0.42,
      delay: 0
    },
    pistol_reload: {
      src: 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3',
      volume: 0.48,
      delay: 0
    },
    pistol_shot: {
      src: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
      volume: 0.45,
      delay: 0
    },
    shotgun_crack: {
      src: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
      volume: 0.45,
      delay: 0
    },
    shotgun_reload: {
      src: 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3',
      volume: 0.45,
      delay: 0
    },
    rollback_voice: {
      src: 'Assets/Sound Effects/Skills/Johnwick-rollback-voiceline.mp3',
      volume: 0.55,
      delay: 0
    },
    switchgun_voice: {
      src: 'Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3',
      volume: 0.55,
      delay: 0
    }
  },
  'john_wick': {
    pencil: {
      src: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
      volume: 0.55,
      delay: 0
    },
    pencilstab: {
      src: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
      volume: 0.55,
      delay: 0
    },
    backstab: {
      src: 'Assets/Sound Effects/Skills/johnwick-pencilstab.mp3',
      volume: 0.55,
      delay: 0
    },
    shell_drop: {
      src: 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3',
      volume: 0.32,
      delay: 0
    },
    gun_drop: {
      src: 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3',
      volume: 0.45,
      delay: 0
    },
    gun_switch: {
      src: 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3',
      volume: 0.48,
      delay: 0
    },
    weaponswitch: {
      src: 'Assets/Sound Effects/Skills/johnwick-gunswitch.mp3',
      volume: 0.48,
      delay: 0
    },
    m4_reload: {
      src: 'Assets/Sound Effects/Skills/johnwick-m4-reload.mp3',
      volume: 0.48,
      delay: 0
    },
    m4_shot: {
      src: 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3',
      volume: 0.42,
      delay: 0
    },
    pistol_reload: {
      src: 'Assets/Sound Effects/Skills/johnwick-pistol-reload.mp3',
      volume: 0.48,
      delay: 0
    },
    pistol_shot: {
      src: 'Assets/Sound Effects/Skills/johnwick-pistol-shot.mp3',
      volume: 0.45,
      delay: 0
    },
    shotgun_crack: {
      src: 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3',
      volume: 0.45,
      delay: 0
    },
    shotgun_reload: {
      src: 'Assets/Sound Effects/Skills/johnwick-shotgun-reload.mp3',
      volume: 0.45,
      delay: 0
    },
    rollback_voice: {
      src: 'Assets/Sound Effects/Skills/Johnwick-rollback-voiceline.mp3',
      volume: 0.55,
      delay: 0
    },
    switchgun_voice: {
      src: 'Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3',
      volume: 0.55,
      delay: 0
    }
  },

  // ── Reze (The Bomb Devil) ───────────────────
  'reze': {
    pinpull: {
      src: 'Assets/Sound Effects/Skills/parry.mp3',
      volume: 0.85,
      delay: 0
    },
    sparkburst: {
      src: 'Assets/Sound Effects/Attacks/flamespray1.mp3',
      volume: 0.70,
      delay: 0
    },
    sparkexplosion: {
      src: 'Assets/Sound Effects/Attacks/explosion.mp3',
      volume: 0.65,
      delay: 0
    },
    decoyblast: {
      src: 'Assets/Sound Effects/Skills/fugaexplode.mp3',
      volume: 0.85,
      delay: 0
    },
    rocketjet: {
      src: 'Assets/Sound Effects/Skills/genos-dash-noise.mp3',
      volume: 0.80,
      delay: 0
    },
    nukecharge: {
      src: 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3',
      volume: 0.90,
      delay: 0
    },
    nukedive: {
      src: 'Assets/Sound Effects/Skills/fugatravel.mp3',
      volume: 0.85,
      delay: 0
    },
    nukeimpact: {
      src: 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3',
      volume: 1.0,
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
    } else if (strKey.includes('genos')) {
      fighterConfig = SKILL_SOUNDS['genos'];
    } else if (strKey.includes('john')) {
      fighterConfig = SKILL_SOUNDS[33] || SKILL_SOUNDS['john_wick'];
    } else if (strKey.includes('ichigo')) {
      fighterConfig = SKILL_SOUNDS[29] || SKILL_SOUNDS['ichigo'];
    } else if (strKey.includes('rubbick') || strKey.includes('trickster')) {
      fighterConfig = SKILL_SOUNDS[18] || SKILL_SOUNDS['rubbick'];
    } else if (strKey.includes('reze')) {
      fighterConfig = SKILL_SOUNDS['reze'];
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

/**
 * Get all skill sound file paths for a specific fighter for high-priority match preloading.
 * @param {number|string} idOrType
 * @returns {string[]}
 */
export function getFighterSkillSoundPaths(idOrType) {
  const paths = [];
  if (idOrType === undefined || idOrType === null) return paths;

  let fighterConfig = SKILL_SOUNDS[idOrType];
  const strKey = String(idOrType).toLowerCase();

  if (!fighterConfig && (typeof idOrType === 'string' || typeof idOrType === 'number')) {
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
    } else if (strKey.includes('genos')) {
      fighterConfig = SKILL_SOUNDS['genos'];
    } else if (strKey.includes('john')) {
      fighterConfig = SKILL_SOUNDS[33] || SKILL_SOUNDS['john_wick'];
    } else if (strKey.includes('ichigo')) {
      fighterConfig = SKILL_SOUNDS[29] || SKILL_SOUNDS['ichigo'];
    } else if (strKey.includes('rubbick') || strKey.includes('trickster')) {
      fighterConfig = SKILL_SOUNDS[18] || SKILL_SOUNDS['rubbick'];
    } else if (strKey.includes('reze')) {
      fighterConfig = SKILL_SOUNDS['reze'];
    }
  }

  if (fighterConfig) {
    for (const skill of Object.values(fighterConfig)) {
      if (Array.isArray(skill)) {
        for (const item of skill) {
          if (item && item.src) paths.push(item.src);
        }
      } else if (skill && skill.src) {
        paths.push(skill.src);
      }
    }
  }

  // Also extract any character-specific sounds from CONFIG[characterId]
  const charConfig = CONFIG && (CONFIG[idOrType] || CONFIG[strKey]);
  if (charConfig) {
    const collectAudioPaths = (obj, depth = 0) => {
      if (!obj || depth > 3) return;
      for (const val of Object.values(obj)) {
        if (typeof val === 'string' && (val.endsWith('.mp3') || val.endsWith('.wav') || val.endsWith('.ogg'))) {
          paths.push(val);
        } else if (Array.isArray(val)) {
          for (const sub of val) {
            if (typeof sub === 'string' && (sub.endsWith('.mp3') || sub.endsWith('.wav') || sub.endsWith('.ogg'))) {
              paths.push(sub);
            }
          }
        } else if (typeof val === 'object') {
          collectAudioPaths(val, depth + 1);
        }
      }
    };
    collectAudioPaths(charConfig);
  }

  return [...new Set(paths)];
}
