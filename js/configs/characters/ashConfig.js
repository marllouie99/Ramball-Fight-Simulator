// ─────────────────────────────────────────────
// ASH KETCHUM (POKÉMON TRAINER) CHARACTER CONFIG
// Pallet Town's World Monarch & Commander of the 4 Anime Aces
// Features:
// 1. Stationary Honeycomb Forcefield Barrier while Active Pokémon battles
// 2. Mobile Evasion State while waiting for Summon Cooldown after Pokémon faints
// 3. 4 Autonomous Anime Aces: Pikachu (#0025), Charizard (#0006), Greninja (#0658), Lucario (#0448)
// 4. Ultimate: Bond Phenomenon / Mega Evolution (Mega Charizard X & Mega Lucario) + 10,000,000 Volt Thunderbolt
// ─────────────────────────────────────────────

export const ashConfig = {
  id: 'ash',
  name: 'ASH',
  displayName: 'ASH',
  grade: 'SS', // Fighter Grade: 'B' | 'A' | 'S' | 'SS' | 'SSR'
  category: 'Anime & Gaming',
  bossTitle: 'World Coronation Monarch',
  title: 'World Coronation Monarch',

  // Universal Humanoid Baseline (Rule 24 — Toji Reference Standard)
  r: 25,
  radius: 25,
  hp: 360,
  maxHp: 360,
  speed: 5.5,
  moveSpeed: 5.5,
  damage: 24,
  cooldown: 45,
  projectileSpeedMultiplier: 1.0,

  // Theme Palette
  color: '#EF4444',             // Poké Ball Crimson Red
  themeColor: '#FACC15',        // Pikachu Thunderbolt Gold
  secondaryColor: '#2563EB',    // Kanto Trainer Jacket Royal Blue
  damageNumberColor: '#FACC15', // Unified damage number color

  ability: 'Honeycomb Trainer Barrier & Pokémon Aces',
  desc: 'World Coronation Monarch of Pallet Town. Deploys Pikachu, Charizard, Greninja, and Lucario from Poké Balls! Projects an impenetrable Hexagonal Honeycomb Forcefield while his Pokémon battles on the field, resuming mobile evasion when his Pokémon faints until the next summon cooldown.',

  // ──────────────────────────────────────────
  // Core Mechanic: Poké Ball Deployment & Honeycomb Barrier
  // ──────────────────────────────────────────
  initialSummonDelayFrames: 30, // 0.5s at match start before throwing first Poké Ball
  summonCooldownFrames: 210,    // 3.5s mobile evasion window after active Pokémon faints
  pokeballThrowFrames: 18,      // Flight duration of thrown Poké Ball before popping open
  pokeballThrowDistance: 95,    // Distance in front of Ash where Poké Ball lands
  honeycombBarrierRadius: 46,   // Radius of hexagonal honeycomb dome shielding Ash
  honeycombBarrierColor: '#38BDF8',
  honeycombBarrierGold: '#FACC15',

  // ──────────────────────────────────────────
  // Skill 1: Trainer Command — Signature Elemental Move (Thunderbolt / Flamethrower / Water Shuriken / Aura Sphere)
  // ──────────────────────────────────────────
  enableTrainerCommand: true,
  commandCooldownFrames: 150,   // 2.5s cooldown between special move commands
  commandDamageBonus: 1.25,     // +25% damage on commanded signature attacks

  // ──────────────────────────────────────────
  // Ultimate: Bond Awakening & 10,000,000 Volt Barrage
  // ──────────────────────────────────────────
  enableMegaAwakening: true,
  ultimateCooldownFrames: 780,  // 13.0s cooldown
  ultimateDurationFrames: 420,  // 7.0s Mega Evolution / Bond Awakening duration
  ultimateBarrageBolts: 8,      // Multi-spectrum elemental bolts across the arena
  ultimateBoltDamage: 18,
  ultimatePokemonHealRatio: 0.50, // Restores 50% HP to active Pokémon upon awakening

  // ──────────────────────────────────────────
  // Ash's 4 Anime Aces Roster Stats & Movesets (Canonical Empress catalog.bytes specs)
  // ──────────────────────────────────────────
  pokemonOrder: ['pikachu', 'charizard', 'greninja', 'lucario'],
  pokemonRoster: {
    pikachu: {
      id: 'pikachu',
      dexNumber: '0025',
      name: 'PIKACHU',
      themeColor: '#FACC15',
      secondaryColor: '#FEF08A',
      hp: 155,
      radius: 25,
      speed: 5.4,
      scale: 2.00,
      cryKey: 'cryPikachu',
      megaCryKey: 'cryPikachuStarter',

      // ── Dedicated Skills Configuration (Fighter-Standard Schema) ──
      skills: {
        melee: {
          id: 'quickAttack_ironTail',
          name: 'QUICK ATTACK & IRON TAIL',
          damage: 18,
          reach: 64,
          cooldown: 34,
          knockback: 6,
          hitStun: 12,
          dashMultiplier: 1.60,
          meleeSfx: 'ironTail',
          altMeleeSfx: 'quickAttack'
        },
        special: {
          id: 'thunderbolt',
          name: 'THUNDERBOLT!',
          hudLabel: 'THUNDERBOLT',
          cooldown: 135,             // Autonomous Thunderbolt cooldown (2.25s at 60 FPS)
          windupFrames: 20,          // High-voltage cheek charging & spark gathering (~0.33s)
          beamDurationFrames: 55,    // Continuous sustained lightning torrent (~0.92s)
          beamTickRate: 6,           // Multi-tick damage delivered every 6 frames (~9 ticks total)
          beamDamagePerTick: 5,      // Base damage per tick (~45 total damage across full beam)
          beamWidth: 38,             // Width/thickness of crackling electrical beam
          beamRange: 650,            // Screen-spanning reach across arena
          beamKnockbackPerTick: 1.8, // Continuous directional pushback driving enemy along beam
          paralyzeFramesPerTick: 20, // Electric stasis locks enemy inside the lightning stream
          recoilPush: 1.2,           // Kinetic backward recoil kick on Pikachu while firing
          screenShake: 4.5,          // Sustained rumble during active beam discharge
          recoveryFrames: 14,        // Post-beam smoke cooling & recovery settle
          specialSfx: 'thunderbolt',
          // Backward compatibility aliases
          specialDamage: 45,
          specialRadius: 105,
          thunderboltSpeed: 13.8,
          thunderboltRadius: 16,
          specialParalyzeFrames: 36
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get specialName() { return this.skills.special.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get specialDamage() { return this.skills.special.specialDamage; },
      get specialRadius() { return this.skills.special.specialRadius; },
      get thunderboltSpeed() { return this.skills.special.thunderboltSpeed; },
      get thunderboltRadius() { return this.skills.special.thunderboltRadius; },
      get specialParalyzeFrames() { return this.skills.special.specialParalyzeFrames; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get altMeleeSfx() { return this.skills.melee.altMeleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    },
    charizard: {
      id: 'charizard',
      dexNumber: '0006',
      name: 'CHARIZARD',
      megaName: 'MEGA CHARIZARD X',
      themeColor: '#F97316',
      megaColor: '#38BDF8',
      secondaryColor: '#EF4444',
      hp: 210,
      radius: 26,
      speed: 5.0,
      scale: 1.65,
      cryKey: 'cryCharizard',
      megaCryKey: 'cryCharizardMega',

      // ── Dedicated Skills Configuration ──
      skills: {
        melee: {
          id: 'dragonClaw',
          name: 'DRAGON CLAW',
          damage: 24,
          reach: 78,
          cooldown: 42,
          knockback: 8,
          hitStun: 14,
          meleeSfx: 'dragonClaw'
        },
        special: {
          id: 'flamethrower',
          name: 'FLAMETHROWER!',
          hudLabel: 'FLAMETHROWER',
          cooldown: 150,
          windupFrames: 18,
          streamDurationFrames: 45,
          damage: 32,
          specialRadius: 120,
          burnDps: 5,
          burnDurationFrames: 150,
          specialSfx: 'flamethrower'
        },
        megaSpecial: {
          id: 'blueFlareBlitz',
          name: 'BLUE FLARE BLITZ!',
          hudLabel: 'BLUE FLARE BLITZ',
          cooldown: 150,
          windupFrames: 16,
          streamDurationFrames: 50,
          damage: 42,
          specialRadius: 140,
          burnDps: 8,
          burnDurationFrames: 180,
          megaColor: '#38BDF8',
          specialSfx: 'flamethrower'
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get specialName() { return this.skills.special.name; },
      get megaSpecialName() { return this.skills.megaSpecial?.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get megaHudSkillLabel() { return this.skills.megaSpecial?.hudLabel; },
      get specialDamage() { return this.skills.special.damage; },
      get specialRadius() { return this.skills.special.specialRadius; },
      get burnDps() { return this.skills.special.burnDps; },
      get burnDurationFrames() { return this.skills.special.burnDurationFrames; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    },
    greninja: {
      id: 'greninja',
      dexNumber: '0658',
      name: 'ASH-GRENINJA',
      themeColor: '#3B82F6',
      secondaryColor: '#EC4899',
      hp: 165,
      radius: 22,
      speed: 6.8,
      scale: 1.50,
      cryKey: 'cryGreninja',

      // ── Dedicated Skills Configuration ──
      skills: {
        melee: {
          id: 'nightSlash',
          name: 'NIGHT SLASH',
          damage: 20,
          reach: 70,
          cooldown: 30,
          knockback: 6,
          hitStun: 10,
          meleeSfx: 'nightSlash'
        },
        special: {
          id: 'waterShuriken',
          name: 'WATER SHURIKEN!',
          hudLabel: 'WATER SHURIKEN',
          cooldown: 135,
          windupFrames: 14,
          damage: 14,
          shurikenCount: 3,
          shurikenSpeed: 11.5,
          specialRadius: 90,
          specialSfx: 'waterShuriken'
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get specialName() { return this.skills.special.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get specialDamage() { return this.skills.special.damage; },
      get shurikenCount() { return this.skills.special.shurikenCount; },
      get shurikenSpeed() { return this.skills.special.shurikenSpeed; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    },
    lucario: {
      id: 'lucario',
      dexNumber: '0448',
      name: 'LUCARIO',
      megaName: 'MEGA LUCARIO',
      themeColor: '#06B6D4',
      megaColor: '#F43F5E',
      secondaryColor: '#1E40AF',
      hp: 190,
      radius: 23,
      speed: 5.8,
      scale: 1.55,
      cryKey: 'cryLucario',
      megaCryKey: 'cryLucarioMega',

      // ── Dedicated Skills Configuration ──
      skills: {
        melee: {
          id: 'closeCombat',
          name: 'CLOSE COMBAT',
          damage: 22,
          reach: 68,
          cooldown: 35,
          knockback: 9,
          hitStun: 16,
          meleeSfx: 'closeCombat'
        },
        special: {
          id: 'auraSphere',
          name: 'AURA SPHERE!',
          hudLabel: 'AURA SPHERE',
          cooldown: 145,
          windupFrames: 22,
          damage: 30,
          auraSphereSpeed: 9.5,
          radius: 22,
          specialRadius: 100,
          specialSfx: 'auraSphere'
        },
        megaSpecial: {
          id: 'maxAuraSphere',
          name: 'MAX AURA SPHERE!',
          hudLabel: 'MAX AURA SPHERE',
          cooldown: 145,
          windupFrames: 24,
          damage: 44,
          auraSphereSpeed: 11.0,
          radius: 30,
          specialRadius: 130,
          megaColor: '#F43F5E',
          specialSfx: 'auraSphere'
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get specialName() { return this.skills.special.name; },
      get megaSpecialName() { return this.skills.megaSpecial?.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get megaHudSkillLabel() { return this.skills.megaSpecial?.hudLabel; },
      get specialDamage() { return this.skills.special.damage; },
      get auraSphereSpeed() { return this.skills.special.auraSphereSpeed; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    }
  },

  // ──────────────────────────────────────────
  // Registered Assets (Verified by verifyCodebase.js)
  // ──────────────────────────────────────────
  assets: {
    hair: 'Assets/model/ash/Ash-hair.png',
    trainerSprite: 'Assets/model/ash/red.png',
    pikachu: {
      idle: 'Assets/model/ash/pokemon/pikachu/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/pikachu/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/pikachu/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/pikachu/Shock-Anim.png',
      shoot: 'Assets/model/ash/pokemon/pikachu/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/pikachu/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/pikachu/Faint-Anim.png',
      charge: 'Assets/model/ash/pokemon/pikachu/Charge-Anim.png'
    },
    charizard: {
      idle: 'Assets/model/ash/pokemon/charizard/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/charizard/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/charizard/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/charizard/Shoot-Anim.png',
      shoot: 'Assets/model/ash/pokemon/charizard/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/charizard/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/charizard/Faint-Anim.png',
      charge: 'Assets/model/ash/pokemon/charizard/Charge-Anim.png',
      megaIdle: 'Assets/model/ash/pokemon/charizard/mega/Idle-Anim.png',
      megaWalk: 'Assets/model/ash/pokemon/charizard/mega/Walk-Anim.png',
      megaAttack: 'Assets/model/ash/pokemon/charizard/mega/Attack-Anim.png',
      megaSpecial: 'Assets/model/ash/pokemon/charizard/mega/Shoot-Anim.png',
      megaHurt: 'Assets/model/ash/pokemon/charizard/mega/Hurt-Anim.png',
      megaCharge: 'Assets/model/ash/pokemon/charizard/mega/Charge-Anim.png'
    },
    greninja: {
      idle: 'Assets/model/ash/pokemon/greninja/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/greninja/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/greninja/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',
      shoot: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',
      charge: 'Assets/model/ash/pokemon/greninja/Charge-Anim.png'
    },
    lucario: {
      idle: 'Assets/model/ash/pokemon/lucario/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/lucario/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/lucario/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',
      shoot: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',
      hurt: 'Assets/model/ash/pokemon/lucario/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/lucario/Faint-Anim.png',
      charge: 'Assets/model/ash/pokemon/lucario/Charge-Anim.png',
      megaIdle: 'Assets/model/ash/pokemon/lucario/mega/Idle-Anim.png',
      megaWalk: 'Assets/model/ash/pokemon/lucario/mega/Walk-Anim.png',
      megaAttack: 'Assets/model/ash/pokemon/lucario/mega/Attack-Anim.png',
      megaSpecial: 'Assets/model/ash/pokemon/lucario/mega/RearUp-Anim.png',
      megaHurt: 'Assets/model/ash/pokemon/lucario/mega/Hurt-Anim.png',
      megaCharge: 'Assets/model/ash/pokemon/lucario/mega/Charge-Anim.png'
    }
  },

  // ──────────────────────────────────────────
  // Audio Configuration (All SFX removed per user instruction)
  // ──────────────────────────────────────────
  sounds: {},
  soundVolumes: {}
};
